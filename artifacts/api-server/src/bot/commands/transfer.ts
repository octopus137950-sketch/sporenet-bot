import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  TextChannel,
} from "discord.js";
import { getPlayer, savePlayer, getLogChannel, getInventory, transferItem } from "../data/store.js";
import { getItemById } from "../data/itemsPool.js";
import { requireGameChannel } from "../utils/channelGuard.js";

export const data = new SlashCommandBuilder()
  .setName("transfer")
  .setDescription("💸 โอนสปอร์หรือไอเทมให้ผู้เล่นคนอื่น")
  .addStringOption((o) =>
    o.setName("type")
      .setDescription("ประเภทที่ต้องการโอน")
      .setRequired(true)
      .addChoices(
        { name: "💰 สปอร์", value: "money" },
        { name: "🎒 ไอเทม", value: "item" },
      )
  )
  .addUserOption((o) => o.setName("to").setDescription("ผู้รับ").setRequired(true))
  .addIntegerOption((o) =>
    o.setName("amount").setDescription("จำนวนสปอร์ที่ต้องการโอน (เฉพาะโหมดสปอร์)").setRequired(false).setMinValue(1)
  )
  .addStringOption((o) =>
    o.setName("item_id").setDescription("ID ไอเทมที่ต้องการโอน เช่น magic_basket (เฉพาะโหมดไอเทม)").setRequired(false)
  );

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!(await requireGameChannel(interaction))) return;
  await interaction.deferReply({ ephemeral: true });

  const guild = interaction.guild;
  if (!guild) {
    await interaction.editReply("❌ ใช้ได้เฉพาะในเซิร์ฟเวอร์เท่านั้น");
    return;
  }

  const transferType = interaction.options.getString("type", true) as "money" | "item";
  const target = interaction.options.getUser("to", true);

  if (target.id === interaction.user.id) {
    await interaction.editReply("❌ ไม่สามารถโอนให้ตัวเองได้");
    return;
  }
  if (target.bot) {
    await interaction.editReply("❌ ไม่สามารถโอนให้บอทได้");
    return;
  }

  // ── Money Transfer ─────────────────────────────────────────
  if (transferType === "money") {
    const amount = interaction.options.getInteger("amount");
    if (!amount) {
      await interaction.editReply("❌ กรุณาระบุ `amount` สำหรับการโอนสปอร์");
      return;
    }

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

    const embed = new EmbedBuilder()
      .setTitle("💸 โอนสปอร์สำเร็จ!")
      .setColor(0x57f287)
      .addFields(
        { name: "📤 ผู้โอน", value: `<@${interaction.user.id}>`, inline: true },
        { name: "📥 ผู้รับ", value: `<@${target.id}>`, inline: true },
        { name: "🍄 จำนวน", value: `**${amount.toLocaleString()}** สปอร์`, inline: false },
        { name: "💼 คงเหลือ", value: `**${sender.sporePoints.toLocaleString()}** สปอร์`, inline: true },
      )
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });

    const logId = getLogChannel(guild.id);
    if (logId) {
      const logCh = guild.channels.cache.get(logId) as TextChannel | undefined;
      logCh?.send({
        content: `💸 **${interaction.user.username}** โอน **${amount.toLocaleString()}** สปอร์ ให้ **${target.username}**`,
      }).catch(() => null);
    }
    return;
  }

  // ── Item Transfer ──────────────────────────────────────────
  if (transferType === "item") {
    const itemId = interaction.options.getString("item_id");
    if (!itemId) {
      await interaction.editReply("❌ กรุณาระบุ `item_id` สำหรับการโอนไอเทม\n💡 ตัวอย่าง ID: `magic_basket`, `sage_tome`, `golden_ring`, `poison_blade`, `spore_gauntlet`, `fern_crown`, `mushroom_potion`, `mystic_wand`");
      return;
    }

    const item = getItemById(itemId);
    if (!item) {
      await interaction.editReply("❌ ไม่พบไอเทมนี้ในระบบ กรุณาตรวจสอบ item_id อีกครั้ง");
      return;
    }

    const senderInv = getInventory(interaction.user.id);
    const hasUnequipped = senderInv.some((e) => e.itemId === itemId && !e.isEquipped);
    if (!hasUnequipped) {
      const hasEquipped = senderInv.some((e) => e.itemId === itemId && e.isEquipped);
      if (hasEquipped) {
        await interaction.editReply(`❌ ไอเทม **${item.emoji} ${item.name}** กำลังสวมใส่อยู่!\nกรุณาถอดออกก่อนจึงจะโอนได้ (ใช้คำสั่ง /wallet เพื่อถอด)`);
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

    const embed = new EmbedBuilder()
      .setTitle("🎒 โอนไอเทมสำเร็จ!")
      .setColor(0x5865f2)
      .addFields(
        { name: "📤 ผู้โอน", value: `<@${interaction.user.id}>`, inline: true },
        { name: "📥 ผู้รับ", value: `<@${target.id}>`, inline: true },
        { name: "✨ ไอเทม", value: `${item.emoji} **${item.name}**`, inline: false },
        { name: "🔮 เอฟเฟกต์", value: item.lore, inline: false },
      )
      .setFooter({ text: "ไอเทมที่โอนจะยังไม่สวมใส่โดยอัตโนมัติ — ผู้รับต้องเปิด /wallet เพื่อสวมใส่เอง" })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });

    const logId = getLogChannel(guild.id);
    if (logId) {
      const logCh = guild.channels.cache.get(logId) as TextChannel | undefined;
      logCh?.send({
        content: `🎒 **${interaction.user.username}** โอนไอเทม **${item.emoji} ${item.name}** ให้ **${target.username}**`,
      }).catch(() => null);
    }
  }
}
