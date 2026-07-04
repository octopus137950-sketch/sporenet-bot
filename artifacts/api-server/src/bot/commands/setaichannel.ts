import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  PermissionFlagsBits,
  TextChannel,
} from "discord.js";
import { setAiChannel, getAiChannel } from "../data/store.js";

export const data = new SlashCommandBuilder()
  .setName("setaichannel")
  .setDescription("🤖 กำหนดห้องสำหรับคุยกับ AI ราชาเห็ดสปอร์ (แอดมิน)")
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addChannelOption((o) =>
    o.setName("channel").setDescription("ห้องที่ต้องการให้เป็นห้องคุยกับ AI").setRequired(false)
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
    const current = getAiChannel(guild.id);
    await interaction.editReply(
      current
        ? `🤖 ห้อง AI ปัจจุบัน: <#${current}>\nพิมพ์อะไรก็ได้ในห้องนั้นเพื่อคุยกับราชาเห็ดสปอร์`
        : "🤖 ยังไม่ได้กำหนดห้อง AI (ใช้ `/setaichannel #ห้อง` เพื่อตั้งค่า)"
    );
    return;
  }

  setAiChannel(guild.id, channel.id);

  const embed = new EmbedBuilder()
    .setTitle("🤖 กำหนดห้อง AI สำเร็จ")
    .setColor(0x9b59b6)
    .addFields({ name: "🤖 ห้องคุยกับ AI", value: `<#${channel.id}>` })
    .setDescription(
      "พิมพ์ข้อความอะไรก็ได้ในห้องนี้เพื่อคุยกับ **ราชาเห็ดสปอร์**\nมี cooldown 20 วินาทีต่อคนต่อข้อความ"
    )
    .setTimestamp();

  await interaction.editReply({ embeds: [embed] });
}
