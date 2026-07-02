import {
  StringSelectMenuInteraction,
  ButtonInteraction,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
} from "discord.js";
import {
  getInventory,
  getEquippedCount,
  equipItem,
  unequipItem,
} from "../data/store.js";
import { getItemById, ITEMS_POOL } from "../data/itemsPool.js";

// ─── Build inventory select menu ─────────────────────────────

export function buildInventorySelectMenu(userId: string): ActionRowBuilder<StringSelectMenuBuilder> | null {
  const inv = getInventory(userId);
  if (inv.length === 0) return null;

  // Group by itemId and count
  const grouped = new Map<string, { count: number; equipped: number }>();
  for (const entry of inv) {
    const cur = grouped.get(entry.itemId) ?? { count: 0, equipped: 0 };
    cur.count += 1;
    if (entry.isEquipped) cur.equipped += 1;
    grouped.set(entry.itemId, cur);
  }

  const options = Array.from(grouped.entries()).map(([itemId, { count, equipped }]) => {
    const item = getItemById(itemId);
    if (!item) return null;
    const label = `${item.emoji} ${item.name}`;
    const equippedLabel = equipped > 0 ? ` (สวมใส่ ${equipped}/${count})` : ` (มี ${count} ชิ้น)`;
    return new StringSelectMenuOptionBuilder()
      .setLabel(label + equippedLabel)
      .setDescription(item.lore)
      .setValue(itemId);
  }).filter(Boolean) as StringSelectMenuOptionBuilder[];

  if (options.length === 0) return null;

  const menu = new StringSelectMenuBuilder()
    .setCustomId(`inv_select:${userId}`)
    .setPlaceholder("🎒 เลือกไอเทมเพื่อดูรายละเอียด")
    .addOptions(options);

  return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu);
}

// ─── Handle inventory select ──────────────────────────────────

export async function handleInventorySelect(interaction: StringSelectMenuInteraction): Promise<void> {
  const [, ownerId] = interaction.customId.split(":");
  if (interaction.user.id !== ownerId) {
    await interaction.reply({ content: "❌ นี่ไม่ใช่กระเป๋าของคุณ", ephemeral: true });
    return;
  }

  const itemId = interaction.values[0]!;
  const item = getItemById(itemId);
  if (!item) {
    await interaction.reply({ content: "❌ ไม่พบไอเทมนี้", ephemeral: true });
    return;
  }

  const userId = interaction.user.id;
  const inv = getInventory(userId);
  const ownedEntries = inv.filter((e) => e.itemId === itemId);
  const equippedEntries = ownedEntries.filter((e) => e.isEquipped);
  const isEquipped = equippedEntries.length > 0;
  const equippedCount = getEquippedCount(userId);

  const statusText = isEquipped
    ? "🟢 กำลังสวมใส่อยู่"
    : equippedCount >= 3
    ? "❌ ถอดออก (ช่องสวมใส่เต็มแล้ว 3/3)"
    : "❌ ถอดออก";

  const buffTypeLabel: Record<string, string> = {
    spore_percent: "📈 โบนัสสปอร์ (%)",
    spore_flat:    "💰 โบนัสสปอร์ (คงที่)",
    exp_percent:   "📚 โบนัส EXP (%)",
    attack_percent:"⚔️ โบนัสโจมตีบอส (%)",
  };

  const embed = new EmbedBuilder()
    .setTitle(`${item.emoji} ${item.name}`)
    .setDescription(item.description)
    .setColor(isEquipped ? 0x57f287 : 0x5865f2)
    .addFields(
      { name: "✨ เอฟเฟกต์", value: item.lore, inline: false },
      { name: buffTypeLabel[item.buffType] ?? "บัฟ", value: `+${item.buffValue}${item.buffType.includes("percent") ? "%" : ""}`, inline: true },
      { name: "📦 จำนวนที่มี", value: `${ownedEntries.length} ชิ้น`, inline: true },
      { name: "🔰 สถานะ", value: statusText, inline: true },
      {
        name: "ℹ️ กฎการสวมใส่",
        value: "สวมได้สูงสุด **3 ชิ้น** พร้อมกัน | ไอเทมชื่อเดียวกันไม่ stack บัฟ",
        inline: false,
      }
    )
    .setFooter({ text: "SporeNet • ระบบกระเป๋าของ" });

  const canEquip = !isEquipped && equippedCount < 3;
  const canUnequip = isEquipped;

  const equipBtn = new ButtonBuilder()
    .setCustomId(`inv_equip:${itemId}:${userId}`)
    .setLabel("สวมใส่")
    .setEmoji("🟢")
    .setStyle(ButtonStyle.Success)
    .setDisabled(!canEquip);

  const unequipBtn = new ButtonBuilder()
    .setCustomId(`inv_unequip:${itemId}:${userId}`)
    .setLabel("ถอดออก")
    .setEmoji("❌")
    .setStyle(ButtonStyle.Danger)
    .setDisabled(!canUnequip);

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(equipBtn, unequipBtn);

  await interaction.update({ embeds: [embed], components: [row] });
}

// ─── Handle equip button ──────────────────────────────────────

export async function handleInventoryEquip(interaction: ButtonInteraction): Promise<void> {
  const [, itemId, ownerId] = interaction.customId.split(":");
  if (interaction.user.id !== ownerId) {
    await interaction.reply({ content: "❌ นี่ไม่ใช่กระเป๋าของคุณ", ephemeral: true });
    return;
  }
  if (!itemId) return;

  const userId = interaction.user.id;
  const equippedCount = getEquippedCount(userId);
  if (equippedCount >= 3) {
    await interaction.reply({ content: "❌ ช่องสวมใส่เต็มแล้ว (3/3) — กรุณาถอดไอเทมออกก่อน", ephemeral: true });
    return;
  }

  const success = equipItem(userId, itemId);
  if (!success) {
    await interaction.reply({ content: "❌ ไม่สามารถสวมใส่ไอเทมนี้ได้", ephemeral: true });
    return;
  }

  const item = getItemById(itemId);
  await interaction.reply({
    content: `✅ สวมใส่ **${item?.emoji} ${item?.name}** เรียบร้อยแล้ว! บัฟจะมีผลทันที`,
    ephemeral: true,
  });
}

// ─── Handle unequip button ────────────────────────────────────

export async function handleInventoryUnequip(interaction: ButtonInteraction): Promise<void> {
  const [, itemId, ownerId] = interaction.customId.split(":");
  if (interaction.user.id !== ownerId) {
    await interaction.reply({ content: "❌ นี่ไม่ใช่กระเป๋าของคุณ", ephemeral: true });
    return;
  }
  if (!itemId) return;

  const success = unequipItem(interaction.user.id, itemId);
  if (!success) {
    await interaction.reply({ content: "❌ ไม่พบไอเทมที่สวมใส่อยู่", ephemeral: true });
    return;
  }

  const item = getItemById(itemId);
  await interaction.reply({
    content: `✅ ถอด **${item?.emoji} ${item?.name}** ออกแล้ว บัฟถูกยกเลิก`,
    ephemeral: true,
  });
}
