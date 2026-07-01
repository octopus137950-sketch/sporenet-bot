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
  .setDescription("🎙️ จัดการห้องตั้งต้นสำหรับระบบห้องเสียงส่วนตัว (แอดมิน)")
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .addSubcommand((sub) =>
    sub
      .setName("add")
      .setDescription("➕ เพิ่มห้องตั้งต้น")
      .addChannelOption((o) =>
        o
          .setName("channel")
          .setDescription("ห้องเสียงที่จะใช้เป็นห้องตั้งต้น")
          .addChannelTypes(ChannelType.GuildVoice)
          .setRequired(true)
      )
  )
  .addSubcommand((sub) =>
    sub
      .setName("remove")
      .setDescription("➖ ลบห้องตั้งต้นออก")
      .addChannelOption((o) =>
        o
          .setName("channel")
          .setDescription("ห้องเสียงที่ต้องการลบออกจากรายการ")
          .addChannelTypes(ChannelType.GuildVoice)
          .setRequired(true)
      )
  )
  .addSubcommand((sub) =>
    sub.setName("list").setDescription("📋 ดูรายการห้องตั้งต้นทั้งหมด")
  )
  .addSubcommand((sub) =>
    sub.setName("clear").setDescription("🗑️ ลบห้องตั้งต้นทั้งหมด (ปิดระบบ)")
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

  const sub = interaction.options.getSubcommand();
  const cfg = getDynVoiceConfig(guild.id);
  const currentIds: string[] = cfg?.starterChannelIds ?? [];

  // ── /setdynvoice add ────────────────────────────────────────────
  if (sub === "add") {
    const ch = interaction.options.getChannel("channel", true);

    if (currentIds.includes(ch.id)) {
      await interaction.editReply(`⚠️ <#${ch.id}> เป็นห้องตั้งต้นอยู่แล้ว`);
      return;
    }

    const newIds = [...currentIds, ch.id];
    setDynVoiceConfig(guild.id, { starterChannelIds: newIds });

    const embed = new EmbedBuilder()
      .setTitle("✅ เพิ่มห้องตั้งต้นแล้ว")
      .setColor(0x57f287)
      .addFields(
        { name: "ห้องที่เพิ่ม", value: `<#${ch.id}>`, inline: true },
        { name: "ห้องตั้งต้นทั้งหมด", value: `${newIds.length} ห้อง`, inline: true }
      )
      .setDescription(
        "รายการห้องตั้งต้นปัจจุบัน:\n" +
          newIds.map((id) => `• <#${id}>`).join("\n")
      )
      .setTimestamp();
    await interaction.editReply({ embeds: [embed] });
    return;
  }

  // ── /setdynvoice remove ─────────────────────────────────────────
  if (sub === "remove") {
    const ch = interaction.options.getChannel("channel", true);

    if (!currentIds.includes(ch.id)) {
      await interaction.editReply(
        `⚠️ <#${ch.id}> ไม่ได้อยู่ในรายการห้องตั้งต้น`
      );
      return;
    }

    const newIds = currentIds.filter((id) => id !== ch.id);
    setDynVoiceConfig(guild.id, { starterChannelIds: newIds });

    const embed = new EmbedBuilder()
      .setTitle("✅ ลบห้องตั้งต้นแล้ว")
      .setColor(0xed4245)
      .addFields(
        { name: "ห้องที่ลบ", value: `<#${ch.id}>`, inline: true },
        { name: "ห้องตั้งต้นที่เหลือ", value: `${newIds.length} ห้อง`, inline: true }
      )
      .setDescription(
        newIds.length > 0
          ? "รายการห้องตั้งต้นปัจจุบัน:\n" + newIds.map((id) => `• <#${id}>`).join("\n")
          : "ยังไม่มีห้องตั้งต้น (ระบบถูกปิด)"
      )
      .setTimestamp();
    await interaction.editReply({ embeds: [embed] });
    return;
  }

  // ── /setdynvoice list ───────────────────────────────────────────
  if (sub === "list") {
    const embed = new EmbedBuilder()
      .setTitle("🎙️ ระบบห้องเสียงส่วนตัวอัตโนมัติ")
      .setColor(currentIds.length > 0 ? 0x57f287 : 0xed4245)
      .addFields(
        {
          name: "สถานะ",
          value: currentIds.length > 0 ? "✅ เปิดอยู่" : "❌ ปิดอยู่",
          inline: true,
        },
        {
          name: "จำนวนห้องตั้งต้น",
          value: `${currentIds.length} ห้อง`,
          inline: true,
        }
      )
      .setDescription(
        currentIds.length > 0
          ? "**ห้องตั้งต้นทั้งหมด:**\n" +
              currentIds.map((id, i) => `${i + 1}. <#${id}>`).join("\n")
          : "ยังไม่มีห้องตั้งต้น ใช้ `/setdynvoice add` เพื่อเพิ่ม"
      )
      .setFooter({
        text: "ใช้ /setdynvoice add/remove เพื่อจัดการห้องตั้งต้น",
      })
      .setTimestamp();
    await interaction.editReply({ embeds: [embed] });
    return;
  }

  // ── /setdynvoice clear ──────────────────────────────────────────
  if (sub === "clear") {
    setDynVoiceConfig(guild.id, { starterChannelIds: [] });
    await interaction.editReply(
      "✅ ลบห้องตั้งต้นทั้งหมดแล้ว ระบบ Dynamic Voice ถูกปิดแล้ว"
    );
  }
}
