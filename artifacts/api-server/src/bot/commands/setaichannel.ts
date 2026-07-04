import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  PermissionFlagsBits,
  TextChannel,
} from "discord.js";
import { setAiConfig, getAiConfig } from "../data/store.js";

export const data = new SlashCommandBuilder()
  .setName("setaichannel")
  .setDescription("🤖 กำหนดห้องสำหรับคุยกับ AI ราชาเห็ดสปอร์ (แอดมิน)")
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addChannelOption((o) =>
    o.setName("channel").setDescription("ห้องที่ต้องการให้ AI ตอบกลับข้อความ").setRequired(false)
  );

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply({ ephemeral: true });

  const guild = interaction.guild;
  if (!guild) {
    await interaction.editReply("❌ ใช้ได้เฉพาะในเซิร์ฟเวอร์เท่านั้น");
    return;
  }

  const channel = interaction.options.getChannel("channel") as TextChannel | null;

  if (!channel) {
    const current = getAiConfig(guild.id);
    await interaction.editReply(
      current?.channelId
        ? `🤖 ห้อง AI ปัจจุบัน: <#${current.channelId}>`
        : "🤖 ยังไม่ได้กำหนดห้อง AI"
    );
    return;
  }

  setAiConfig(guild.id, {
    channelId: channel.id,
    enabled: true,
  });

  const embed = new EmbedBuilder()
    .setTitle("✅ กำหนดห้อง AI สำเร็จ")
    .setColor(0x57f287)
    .addFields({ name: "🤖 ห้อง AI", value: `<#${channel.id}>` })
    .setDescription(
      "ผู้เล่นสามารถพิมพ์คุยกับ **ราชาเห็ดสปอร์** ได้โดยตรงในห้องนี้!"
    )
    .setTimestamp();

  await interaction.editReply({ embeds: [embed] });
}
