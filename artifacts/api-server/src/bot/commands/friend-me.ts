import { ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder } from "discord.js";
import { getFriendProfile } from "../data/store.js";
import { interestLabels } from "../friendSystem.js";

export const data = new SlashCommandBuilder()
  .setName("friend-me")
  .setDescription("ดูโปรไฟล์ Friend Match ของตัวเอง");

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply({ ephemeral: true });
  const guild = interaction.guild;
  if (!guild) { await interaction.editReply("ใช้ได้เฉพาะในเซิร์ฟเวอร์เท่านั้น"); return; }
  const profile = getFriendProfile(guild.id, interaction.user.id);
  if (!profile) { await interaction.editReply("ยังไม่มีโปรไฟล์ ใช้ `/friend-profile` เพื่อตั้งค่าก่อน"); return; }
  const embed = new EmbedBuilder()
    .setTitle("โปรไฟล์ Friend Match ของคุณ")
    .setColor(0x5865f2)
    .addFields(
      { name: "ความสนใจ", value: interestLabels(profile.interests) || "ยังไม่ได้เลือก" },
      { name: "สไตล์การคุย", value: profile.chatStyle, inline: true },
      { name: "มักออนไลน์", value: profile.availability, inline: true },
      { name: "สถานะ", value: profile.optIn ? "เปิดรับการจับคู่" : "ปิดการจับคู่", inline: true },
    )
    .setFooter({ text: "ใช้ /friend-profile เพื่อแก้ไขโปรไฟล์" });
  await interaction.editReply({ embeds: [embed] });
}
