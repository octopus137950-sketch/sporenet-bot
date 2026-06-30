import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  PermissionFlagsBits,
  TextChannel,
} from "discord.js";
import { setGameChannel, getGameChannel } from "../data/store.js";

export const data = new SlashCommandBuilder()
  .setName("setgamechannel")
  .setDescription("📍 กำหนดห้องสำหรับใช้คำสั่งเกม /farm /daily /transfer /wallet /leaderboard (แอดมิน)")
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addChannelOption((o) =>
    o.setName("channel").setDescription("ห้องที่ต้องการให้ใช้คำสั่งเกม").setRequired(false)
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
    const current = getGameChannel(guild.id);
    await interaction.editReply(
      current
        ? `📍 ห้องเกมปัจจุบัน: <#${current}>`
        : "📍 ยังไม่ได้กำหนดห้องเกม (ใช้คำสั่งได้ทุกห้อง)"
    );
    return;
  }

  setGameChannel(guild.id, channel.id);

  const embed = new EmbedBuilder()
    .setTitle("✅ กำหนดห้องเกมสำเร็จ")
    .setColor(0x57f287)
    .addFields({ name: "📍 ห้องเกม", value: `<#${channel.id}>` })
    .setDescription(
      "คำสั่ง /farm /daily /transfer /wallet /leaderboard จะใช้ได้เฉพาะในห้องนี้เท่านั้น"
    )
    .setTimestamp();

  await interaction.editReply({ embeds: [embed] });
}
