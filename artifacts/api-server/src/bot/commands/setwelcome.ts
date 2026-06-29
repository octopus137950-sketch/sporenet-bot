import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  PermissionFlagsBits,
  TextChannel,
} from "discord.js";
import { setWelcomeConfig } from "../data/store.js";

export const data = new SlashCommandBuilder()
  .setName("setwelcome")
  .setDescription("ตั้งค่าระบบต้อนรับสมาชิกใหม่ในห้องนี้")
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .addStringOption((o) =>
    o
      .setName("message")
      .setDescription(
        'ข้อความยินดีต้อนรับ ใช้ {user} แทนการ mention, {username} แทนชื่อ, {count} แทนจำนวนสมาชิก'
      )
      .setRequired(true)
  )
  .addStringOption((o) =>
    o
      .setName("image")
      .setDescription("URL รูปภาพสำหรับแสดงในข้อความต้อนรับ")
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

  setWelcomeConfig(guild.id, {
    channelId: channel.id,
    message,
    imageUrl,
    enabled: true,
  });

  const previewEmbed = new EmbedBuilder()
    .setTitle("✅ ตั้งค่าระบบต้อนรับสำเร็จ!")
    .setColor(0x57f287)
    .addFields(
      { name: "📢 ห้องแจ้งเตือน", value: `<#${channel.id}>`, inline: true },
      { name: "📝 ข้อความ", value: message, inline: false }
    )
    .setFooter({ text: "สมาชิกใหม่จะได้รับการต้อนรับในห้องนี้" })
    .setTimestamp();

  if (imageUrl) {
    previewEmbed.addFields({ name: "🖼️ รูปภาพ", value: imageUrl });
  }

  await interaction.editReply({ embeds: [previewEmbed] });
}
