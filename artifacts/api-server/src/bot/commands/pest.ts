import {
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";
import { triggerPest } from "../events/worldMushroomScheduler.js";

export const data = new SlashCommandBuilder()
  .setName("pest")
  .setDescription("🐛 เรียกอีเวนต์ศัตรูพืชบุกเห็ดโลก")
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  const guildId = interaction.guildId;
  if (!guildId) {
    await interaction.reply({ content: "❌ ใช้ได้เฉพาะในเซิร์ฟเวอร์เท่านั้น", ephemeral: true });
    return;
  }

  await interaction.deferReply({ ephemeral: true });
  const result = await triggerPest(interaction.client, guildId);

  if (result === "active") {
    await interaction.editReply("⚠️ ตอนนี้มีศัตรูพืชกำลังบุกอยู่แล้ว");
    return;
  }
  if (result === "no-channel") {
    await interaction.editReply("❌ ยังไม่ได้ตั้งห้องเกม หรือบอทไม่สามารถเข้าถึงห้องเกมได้");
    return;
  }

  await interaction.editReply("✅ เรียกศัตรูพืชสำเร็จ! ประกาศถูกส่งไปที่ห้องเกมแล้ว");
}