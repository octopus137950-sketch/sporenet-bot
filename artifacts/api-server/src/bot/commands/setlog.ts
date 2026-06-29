import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  PermissionFlagsBits,
  TextChannel,
} from "discord.js";
import { setLogChannel } from "../data/store.js";

export const data = new SlashCommandBuilder()
  .setName("setlog")
  .setDescription("📋 ตั้งค่าห้อง Log สำหรับบันทึกการซื้อของและคำสั่งแอดมิน")
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addChannelOption((o) =>
    o.setName("channel").setDescription("ห้องที่ต้องการให้ส่ง Log").setRequired(true)
  );

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply({ ephemeral: true });

  const guild = interaction.guild;
  if (!guild) {
    await interaction.editReply("❌ ใช้ได้เฉพาะในเซิร์ฟเวอร์เท่านั้น");
    return;
  }

  const channel = interaction.options.getChannel("channel", true) as TextChannel;
  setLogChannel(guild.id, channel.id);

  const embed = new EmbedBuilder()
    .setTitle("✅ ตั้งค่าห้อง Log สำเร็จ")
    .setColor(0x57f287)
    .addFields({ name: "📋 ห้อง Log", value: `<#${channel.id}>` })
    .setDescription("บอทจะส่งบันทึกการซื้อของและคำสั่งแอดมินมาที่ห้องนี้")
    .setTimestamp();

  await interaction.editReply({ embeds: [embed] });
}
