import { ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder } from "discord.js";
import { getMarketplaceHistory } from "../data/store.js";
import { getItemById } from "../data/itemsPool.js";

export const data = new SlashCommandBuilder()
  .setName("market-history")
  .setDescription("📜 ดูประวัติการซื้อขายไอเทมของคุณ");

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply({ ephemeral: true });
  const guild = interaction.guild;
  if (!guild) {
    await interaction.editReply("❌ คำสั่งนี้ใช้ได้เฉพาะในเซิร์ฟเวอร์เท่านั้น");
    return;
  }

  const history = getMarketplaceHistory(guild.id, interaction.user.id, 20);
  const embed = new EmbedBuilder()
    .setTitle("📜 ประวัติตลาดกลาง")
    .setColor(0x5865f2)
    .setFooter({ text: "แสดงรายการล่าสุดไม่เกิน 20 รายการ" })
    .setTimestamp();

  if (history.length === 0) {
    embed.setDescription("ยังไม่มีประวัติการซื้อขายของคุณ");
    await interaction.editReply({ embeds: [embed] });
    return;
  }

  embed.setDescription(
    history.map((entry, index) => {
      const item = getItemById(entry.itemId);
      const itemName = item ? `${item.emoji} ${item.name}` : entry.itemId;
      const action = entry.status === "sold"
        ? entry.buyerId === interaction.user.id
          ? `ซื้อจาก <@${entry.sellerId}>`
          : `ขายให้ <@${entry.buyerId}>`
        : entry.status === "cancelled"
          ? "ยกเลิกรายการขาย"
          : "รายการขายหมดอายุ";
      const status = entry.status === "sold" ? "✅ สำเร็จ" : entry.status === "cancelled" ? "↩️ ยกเลิก" : "⌛ หมดอายุ";
      return `${index + 1}. **${itemName}** — ${action}\n` +
        `${status} • ${entry.price.toLocaleString()} สปอร์ • <t:${Math.floor(entry.completedAt / 1_000)}:R>`;
    }).join("\n\n"),
  );

  await interaction.editReply({ embeds: [embed] });
}