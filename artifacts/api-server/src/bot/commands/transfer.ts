import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  AutocompleteInteraction,
  EmbedBuilder,
  TextChannel,
} from "discord.js";
import { getPlayer, savePlayer, getLogChannel, getInventory, transferItem } from "../data/store.js";
import { getItemById } from "../data/itemsPool.js";
import { requireGameChannel } from "../utils/channelGuard.js";

export const data = new SlashCommandBuilder()
  .setName("transfer")
  .setDescription("💸 โอนสปอร์และ/หรือไอเทมให้ผู้เล่นคนอื่น")
  .addUserOption((o) =>
    o.setName("to").setDescription("ผู้รับ").setRequired(true)
  )
  .addIntegerOption((o) =>
    o.setName("amount")
      .setDescription("จำนวนสปอร์ที่ต้องการโอน (ไม่ต้องใส่ถ้าไม่โอนสปอร์)")
      .setRequired(false)
      .setMinValue(1)
  )
  .addStringOption((o) =>
    o.setName("item")
      .setDescription("ไอเทมที่ต้องการโอน (พิมพ์เพื่อค้นหาจากกระเป๋าของคุณ)")
      .setRequired(false)
      .setAutocomplete(true)
  );

/** Autocomplete: แสดงไอเทมที่ไม่ได้สวมใส่จากกระเป๋าของผู้ใช้ */
export async function autocomplete(interaction: AutocompleteInteraction): Promise<void> {
  const focused = interaction.options.getFocused().toLowerCase();
  const inv = getInventory(interaction.user.id);

  // กรองเฉพาะไอเทมที่ไม่ได้ equipped และ dedupe ตาม itemId
  const seen = new Set<string>();
  const choices: { name: string; value: string }[] = [];

  for (const entry of inv) {
    if (entry.isEquipped) continue;
    if (seen.has(entry.itemId)) continue;
    seen.add(entry.itemId);

    const item = getItemById(entry.itemId);
    if (!item) continue;

    const label = `${item.emoji} ${item.name} — ${item.lore}`;
    if (focused === "" || item.name.toLowerCase().includes(focused) || item.id.toLowerCase().includes(focused)) {
      choices.push({ name: label.slice(0, 100), value: item.id });
    }
  }

  await interaction.respond(choices.slice(0, 25));
}

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!(await requireGameChannel(interaction))) return;
  await interaction.deferReply({ ephemeral: true });

  const guild = interaction.guild;
  if (!guild) {
    await interaction.editReply("❌ ใช้ได้เฉพาะในเซิร์ฟเวอร์เท่านั้น");
    return;
  }

  const target = interaction.options.getUser("to", true);
  const amount = interaction.options.getInteger("amount");
  const itemId = interaction.options.getString("item");

  if (target.id === interaction.user.id) {
    await interaction.editReply("❌ ไม่สามารถโอนให้ตัวเองได้");
    return;
  }
  if (target.bot) {
    await interaction.editReply("❌ ไม่สามารถโอนให้บอทได้");
    return;
  }
  if (!amount && !itemId) {
    await interaction.editReply("❌ กรุณาระบุ **จำนวนสปอร์** หรือ **ไอเทม** ที่ต้องการโอนอย่างน้อยหนึ่งอย่าง");
    return;
  }

  const resultFields: { name: string; value: string; inline?: boolean }[] = [
    { name: "📤 ผู้โอน", value: `<@${interaction.user.id}>`, inline: true },
    { name: "📥 ผู้รับ", value: `<@${target.id}>`, inline: true },
  ];

  // ── โอนสปอร์ ──────────────────────────────────────────────────
  if (amount) {
    const sender = getPlayer(interaction.user.id);
    if (sender.sporePoints < amount) {
      await interaction.editReply(
        `❌ สปอร์ไม่พอ!\nคุณมี **${sender.sporePoints.toLocaleString()}** สปอร์\nต้องการโอน **${amount.toLocaleString()}** สปอร์`
      );
      return;
    }

    const receiver = getPlayer(target.id);
    sender.sporePoints -= amount;
    receiver.sporePoints += amount;
    savePlayer(sender);
    savePlayer(receiver);

    resultFields.push(
      { name: "🍄 สปอร์ที่โอน", value: `**${amount.toLocaleString()}** สปอร์`, inline: false },
      { name: "💼 สปอร์คงเหลือ", value: `**${sender.sporePoints.toLocaleString()}** สปอร์`, inline: true }
    );

    const logId = getLogChannel(guild.id);
    if (logId) {
      const logCh = guild.channels.cache.get(logId) as TextChannel | undefined;
      logCh?.send({
        content: `💸 **${interaction.user.username}** โอน **${amount.toLocaleString()}** สปอร์ ให้ **${target.username}**`,
      }).catch(() => null);
    }
  }

  // ── โอนไอเทม ──────────────────────────────────────────────────
  if (itemId) {
    const item = getItemById(itemId);
    if (!item) {
      await interaction.editReply("❌ ไม่พบไอเทมนี้ในระบบ กรุณาเลือกจากรายการที่แสดงในช่อง `item`");
      return;
    }

    const senderInv = getInventory(interaction.user.id);
    const hasUnequipped = senderInv.some((e) => e.itemId === itemId && !e.isEquipped);
    if (!hasUnequipped) {
      const hasEquipped = senderInv.some((e) => e.itemId === itemId && e.isEquipped);
      if (hasEquipped) {
        await interaction.editReply(
          `❌ ไอเทม **${item.emoji} ${item.name}** กำลังสวมใส่อยู่!\nกรุณาถอดออกก่อนจึงจะโอนได้ (ใช้คำสั่ง /wallet เพื่อถอด)`
        );
      } else {
        await interaction.editReply(`❌ คุณไม่มีไอเทม **${item.emoji} ${item.name}** ในกระเป๋า`);
      }
      return;
    }

    const success = transferItem(interaction.user.id, target.id, itemId);
    if (!success) {
      await interaction.editReply("❌ เกิดข้อผิดพลาดในการโอนไอเทม");
      return;
    }

    resultFields.push(
      { name: "✨ ไอเทมที่โอน", value: `${item.emoji} **${item.name}**`, inline: false },
      { name: "🔮 เอฟเฟกต์", value: item.lore, inline: false }
    );

    const logId = getLogChannel(guild.id);
    if (logId) {
      const logCh = guild.channels.cache.get(logId) as TextChannel | undefined;
      logCh?.send({
        content: `🎒 **${interaction.user.username}** โอนไอเทม **${item.emoji} ${item.name}** ให้ **${target.username}**`,
      }).catch(() => null);
    }
  }

  // ── สรุปผล ─────────────────────────────────────────────────────
  const title = amount && itemId
    ? "💸🎒 โอนสปอร์และไอเทมสำเร็จ!"
    : amount
    ? "💸 โอนสปอร์สำเร็จ!"
    : "🎒 โอนไอเทมสำเร็จ!";

  const embed = new EmbedBuilder()
    .setTitle(title)
    .setColor(amount && itemId ? 0xfee75c : amount ? 0x57f287 : 0x5865f2)
    .addFields(resultFields)
    .setTimestamp();

  if (itemId) {
    embed.setFooter({ text: "ไอเทมที่โอนจะยังไม่สวมใส่โดยอัตโนมัติ — ผู้รับต้องเปิด /wallet เพื่อสวมใส่เอง" });
  }

  await interaction.editReply({ embeds: [embed] });
}
