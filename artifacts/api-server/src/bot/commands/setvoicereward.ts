import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  EmbedBuilder,
  ChannelType,
} from "discord.js";
import { getVoiceRewardConfig, setVoiceRewardConfig } from "../data/store.js";

export const data = new SlashCommandBuilder()
  .setName("setvoicereward")
  .setDescription("🎙️ ตั้งค่าระบบแจกสปอร์ห้องเสียง (แอดมิน)")
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .addBooleanOption((o) =>
    o.setName("enabled").setDescription("เปิด/ปิดระบบ").setRequired(false)
  )
  .addIntegerOption((o) =>
    o
      .setName("time_loop")
      .setDescription("แจกสปอร์ทุกกี่นาที (เช่น 5 = ทุก 5 นาที)")
      .setMinValue(1)
      .setMaxValue(60)
      .setRequired(false)
  )
  .addIntegerOption((o) =>
    o
      .setName("give_spore")
      .setDescription("จำนวนสปอร์ที่แจกต่อรอบ")
      .setMinValue(1)
      .setMaxValue(10000)
      .setRequired(false)
  )
  .addIntegerOption((o) =>
    o
      .setName("give_exp")
      .setDescription("จำนวน EXP ที่แจกต่อรอบ")
      .setMinValue(0)
      .setMaxValue(1000)
      .setRequired(false)
  )
  .addChannelOption((o) =>
    o
      .setName("notify_channel")
      .setDescription("ห้องแจ้งเตือนเมื่อสมาชิกออกจากห้องเสียง")
      .addChannelTypes(ChannelType.GuildText)
      .setRequired(false)
  );

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply({ ephemeral: true });

  const guild = interaction.guild;
  if (!guild) {
    await interaction.editReply("❌ ใช้ได้เฉพาะในเซิร์ฟเวอร์เท่านั้น");
    return;
  }

  const currentConfig = getVoiceRewardConfig(guild.id);

  // If no args, show current config
  const enabled = interaction.options.getBoolean("enabled");
  const timeLoop = interaction.options.getInteger("time_loop");
  const giveSpore = interaction.options.getInteger("give_spore");
  const giveExp = interaction.options.getInteger("give_exp");
  const notifyChannel = interaction.options.getChannel("notify_channel");

  const hasAnyOption = [enabled, timeLoop, giveSpore, giveExp, notifyChannel].some(
    (v) => v !== null
  );

  if (!hasAnyOption) {
    // Show current config
    const cfg = currentConfig;
    const embed = new EmbedBuilder()
      .setTitle("🎙️ ระบบแจกสปอร์ห้องเสียง — การตั้งค่าปัจจุบัน")
      .setColor(cfg?.enabled ? 0x57f287 : 0xed4245)
      .addFields(
        { name: "สถานะ", value: cfg?.enabled ? "✅ เปิดอยู่" : "❌ ปิดอยู่", inline: true },
        { name: "⏱️ แจกทุกๆ", value: `${cfg?.timeLoopMinutes ?? 5} นาที`, inline: true },
        { name: "🍄 สปอร์/รอบ", value: `${cfg?.giveSpore ?? 50}`, inline: true },
        { name: "⭐ EXP/รอบ", value: `${cfg?.giveExp ?? 5}`, inline: true },
        {
          name: "📢 ห้องแจ้งเตือน",
          value: cfg?.notifyChannelId ? `<#${cfg.notifyChannelId}>` : "ไม่ได้ตั้งค่า",
          inline: true,
        },
        {
          name: "🚫 ห้องที่บล็อค",
          value:
            cfg && cfg.blockedRoomIds.length > 0
              ? cfg.blockedRoomIds.map((id) => `<#${id}>`).join(", ")
              : "ไม่มี",
          inline: false,
        }
      )
      .setFooter({ text: "ใช้ /blockvoiceroom เพื่อบล็อคห้องเสียง" })
      .setTimestamp();
    await interaction.editReply({ embeds: [embed] });
    return;
  }

  // Update config
  const newConfig = {
    enabled: enabled ?? currentConfig?.enabled ?? false,
    timeLoopMinutes: timeLoop ?? currentConfig?.timeLoopMinutes ?? 5,
    giveSpore: giveSpore ?? currentConfig?.giveSpore ?? 50,
    giveExp: giveExp ?? currentConfig?.giveExp ?? 5,
    notifyChannelId: notifyChannel?.id ?? currentConfig?.notifyChannelId,
    blockedRoomIds: currentConfig?.blockedRoomIds ?? [],
  };

  setVoiceRewardConfig(guild.id, newConfig);

  const embed = new EmbedBuilder()
    .setTitle("✅ บันทึกการตั้งค่าระบบห้องเสียงแล้ว")
    .setColor(0x57f287)
    .addFields(
      { name: "สถานะ", value: newConfig.enabled ? "✅ เปิดอยู่" : "❌ ปิดอยู่", inline: true },
      { name: "⏱️ แจกทุกๆ", value: `${newConfig.timeLoopMinutes} นาที`, inline: true },
      { name: "🍄 สปอร์/รอบ", value: `${newConfig.giveSpore}`, inline: true },
      { name: "⭐ EXP/รอบ", value: `${newConfig.giveExp}`, inline: true },
      {
        name: "📢 ห้องแจ้งเตือน",
        value: newConfig.notifyChannelId ? `<#${newConfig.notifyChannelId}>` : "ไม่ได้ตั้งค่า",
        inline: true,
      }
    )
    .setTimestamp();

  await interaction.editReply({ embeds: [embed] });
}
