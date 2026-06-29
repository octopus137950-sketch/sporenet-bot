import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  PermissionFlagsBits,
  TextChannel,
} from "discord.js";
import { setGoodbyeConfig } from "../data/store.js";

export const data = new SlashCommandBuilder()
  .setName("setgoodbye")
  .setDescription("ตั้งค่าระบบแจ้งเตือนเมื่อสมาชิกออกจากเซิร์ฟเวอร์ในห้องนี้")
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .addStringOption((o) =>
    o
      .setName("message")
      .setDescription(
        'ข้อความลาก่อน ใช้ {user} แทนการ mention, {username} แทนชื่อ, {count} แทนจำนวนสมาชิก'
      )
      .setRequired(true)
  )
  .addStringOption((o) =>
    o
      .setName("image")
      .setDescription("URL รูปภาพสำหรับแสดงในข้อความลาก่อน")
      .setRequired(false)
  );

export async function execute(
  interaction: ChatInputCommandInteraction
): Promise<void> {
  await interaction.deferReply({ ephemeral: true });

  const guild = interaction.guild;
  if (!guild) {
    await interaction.editReply("❌ ใช้คำสั่งนี้ได้เฉพาะในเซิร์ฟเวอร์เท่านั้น");
    return;
  }

  const message = interaction.options.getString("message", true);
  const imageUrl = interaction.options.getString("image") ?? undefined;
  const channel = interaction.channel as TextChannel;

  setGoodbyeConfig(guild.id, {
    channelId: channel.id,
    message,
    imageUrl,
    enabled: true,
  });

  const previewEmbed = new EmbedBuilder()
    .setTitle("✅ ตั้งค่าระบบลาก่อนสำเร็จ!")
    .setColor(0xed4245)
    .addFields(
      { name: "📢 ห้องแจ้งเตือน", value: `<#${channel.id}>`, inline: true },
      { name: "📝 ข้อความ", value: message, inline: false }
    )
    .setFooter({ text: "จะแจ้งเตือนเมื่อสมาชิกออกจากเซิร์ฟเวอร์" })
    .setTimestamp();

  if (imageUrl) {
    previewEmbed.addFields({ name: "🖼️ รูปภาพ", value: imageUrl });
  }

  await interaction.editReply({ embeds: [previewEmbed] });
}
