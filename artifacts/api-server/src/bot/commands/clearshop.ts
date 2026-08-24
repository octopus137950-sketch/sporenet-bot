import {
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";
import { clearShopItems } from "../data/store.js";

export const data = new SlashCommandBuilder()
  .setName("clearshop")
  .setDescription("🗑️ ลบสินค้าซื้อยศทั้งหมดออกจากร้านค้า")
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

export async function execute(
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  await interaction.deferReply({ ephemeral: true });

  const guild = interaction.guild;

  if (!guild) {
    await interaction.editReply("❌ ใช้ได้เฉพาะในเซิร์ฟเวอร์เท่านั้น");
    return;
  }

  const removedCount = clearShopItems(guild.id);

  await interaction.editReply(
    removedCount > 0
      ? `✅ ลบสินค้าออกจากร้านค้าทั้งหมดแล้ว ${removedCount} รายการ`
      : "ℹ️ ไม่มีสินค้าในร้านค้าให้ลบ",
  );
}
