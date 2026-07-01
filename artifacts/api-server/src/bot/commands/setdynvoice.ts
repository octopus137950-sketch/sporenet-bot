import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  EmbedBuilder,
  ChannelType,
} from "discord.js";
import { getDynVoiceConfig, setDynVoiceConfig } from "../data/store.js";

export const data = new SlashCommandBuilder()
  .setName("setdynvoice")
  .setDescription("🎙️ ตั้งค่าระบบห้องเสียงส่วนตัวอัตโนมัติ (แอดมิน)")
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .addChannelOption((o) =>
    o
      .setName("starter_channel")
      .setDescription("ห้องเสียง 'ตั้งต้น' ที่เมื่อกดเข้าจะสร้างห้องใหม่")
      .addChannelTypes(ChannelType.GuildVoice)
      .setRequired(false)
  )
  .addStringOption((o) =>
    o
      .setName("disable")
      .setDescription("ปิดระบบ Dynamic Voice")
      .addChoices({ name: "ปิดระบบ", value: "yes" })
      .setRequired(false)
  );

export async function execute(
  interaction: ChatInputCommandInteraction
): Promise<void> {
  await interaction.deferReply({ ephemeral: true });

  const guild = interaction.guild;
  if (!guild) {
    await interaction.editReply("❌ ใช้ได้เฉพาะในเซิร์ฟเวอร์เท่านั้น");
    return;
  }

  const disable = interaction.options.getString("disable");
  if (disable === "yes") {
    setDynVoiceConfig(guild.id, null);
    await interaction.editReply("✅ ปิดระบบ Dynamic Voice เรียบร้อยแล้ว");
    return;
  }

  const starterChannel = interaction.options.getChannel("starter_channel");

  if (!starterChannel) {
    // Show current config
    const cfg = getDynVoiceConfig(guild.id);
    const embed = new EmbedBuilder()
      .setTitle("🎙️ ระบบห้องเสียงส่วนตัวอัตโนมัติ")
      .setColor(cfg ? 0x57f287 : 0xed4245)
      .addFields(
        {
          name: "สถานะ",
          value: cfg ? "✅ เปิดอยู่" : "❌ ปิดอยู่",
          inline: true,
        },
        {
          name: "ห้องตั้งต้น",
          value: cfg ? `<#${cfg.starterChannelId}>` : "ยังไม่ได้ตั้งค่า",
          inline: true,
        }
      )
      .setFooter({
        text: "ใช้ /setdynvoice starter_channel:#ห้อง เพื่อตั้งค่า",
      })
      .setTimestamp();
    await interaction.editReply({ embeds: [embed] });
    return;
  }

  setDynVoiceConfig(guild.id, { starterChannelId: starterChannel.id });

  const embed = new EmbedBuilder()
    .setTitle("✅ ตั้งค่าระบบห้องเสียงส่วนตัวแล้ว")
    .setColor(0x57f287)
    .addFields({
      name: "ห้องตั้งต้น",
      value: `<#${starterChannel.id}>`,
      inline: true,
    })
    .setDescription(
      "เมื่อสมาชิกกดเข้าห้องนี้ บอทจะสร้างห้องใหม่ให้อัตโนมัติ\n" +
        "และลบห้องอัตโนมัติเมื่อไม่มีคนอยู่"
    )
    .setTimestamp();

  await interaction.editReply({ embeds: [embed] });
}
