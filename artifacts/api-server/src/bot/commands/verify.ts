import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { createVerificationCode, rememberDiscordUsername } from "../data/store.js";

export const data = new SlashCommandBuilder()
  .setName("verify")
  .setDescription("ขอรหัสยืนยันเพื่อเข้าเล่น SporeNet")
  .addStringOption((option) =>
    option.setName("username").setDescription("Discord username ของคุณ").setRequired(false)
  );

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  const username = interaction.options.getString("username")?.trim() || interaction.user.username;
  const code = createVerificationCode(interaction.user.id, username);
  rememberDiscordUsername(username, interaction.user.id);
  try {
    await interaction.user.send(`รหัสยืนยัน SporeNet ของคุณคือ **${code}**\nรหัสหมดอายุใน 10 นาที และใช้ได้ครั้งเดียว`);
    await interaction.reply({ content: "ส่งรหัสยืนยันไปทาง DM แล้ว กรุณานำรหัสไปกรอกในเว็บเกม", ephemeral: true });
  } catch {
    await interaction.reply({ content: "ส่ง DM ไม่ได้ กรุณาเปิดรับข้อความส่วนตัวจากสมาชิกเซิร์ฟเวอร์ก่อน แล้วลอง /verify ใหม่", ephemeral: true });
  }
}
