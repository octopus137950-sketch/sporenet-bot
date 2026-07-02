import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  EmbedBuilder,
} from "discord.js";
import { getWorldBossConfig, setWorldBossConfig } from "../data/store.js";
import { spawnBoss, isBossActive } from "../events/worldBossHandler.js";
import { BOSS_POOL } from "../data/bossPool.js";

export const data = new SlashCommandBuilder()
  .setName("setworldboss")
  .setDescription("👹 ตั้งค่าระบบบอสโลก (แอดมิน)")
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .addSubcommand((sub) =>
    sub
      .setName("setup")
      .setDescription("⚙️ ตั้งค่าการ spawn บอส")
      .addIntegerOption((o) =>
        o
          .setName("interval_days")
          .setDescription("บอส spawn ทุกกี่วัน (เช่น 7 = ทุกสัปดาห์)")
          .setMinValue(1)
          .setMaxValue(30)
          .setRequired(true)
      )
      .addIntegerOption((o) =>
        o
          .setName("spawn_hour")
          .setDescription("เวลา spawn (ชั่วโมง, เวลาไทย 0-23 เช่น 20 = สองทุ่ม)")
          .setMinValue(0)
          .setMaxValue(23)
          .setRequired(true)
      )
      .addIntegerOption((o) =>
        o
          .setName("spawn_minute")
          .setDescription("เวลา spawn (นาที 0-59 เช่น 0 = ตรง)")
          .setMinValue(0)
          .setMaxValue(59)
          .setRequired(false)
      )
      .addIntegerOption((o) =>
        o
          .setName("timeout_minutes")
          .setDescription("เวลาที่ให้ผู้เล่นปราบบอส (นาที, ค่าเริ่มต้น 30)")
          .setMinValue(5)
          .setMaxValue(120)
          .setRequired(false)
      )
      .addIntegerOption((o) =>
        o
          .setName("live_update_seconds")
          .setDescription("อัปเดต panel ทุกกี่วินาที (ค่าเริ่มต้น 10)")
          .setMinValue(5)
          .setMaxValue(60)
          .setRequired(false)
      )
  )
  .addSubcommand((sub) =>
    sub.setName("status").setDescription("📋 ดูการตั้งค่าปัจจุบัน")
  )
  .addSubcommand((sub) =>
    sub
      .setName("spawn_now")
      .setDescription("🔥 เรียกบอสมาทันที (สำหรับทดสอบ)")
  )
  .addSubcommand((sub) =>
    sub.setName("bosses").setDescription("📖 ดูรายการบอสทั้งหมด")
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

  // ── /setworldboss setup ─────────────────────────────────────
  if (sub === "setup") {
    const intervalDays = interaction.options.getInteger("interval_days", true);
    const spawnHour = interaction.options.getInteger("spawn_hour", true);
    const spawnMinute = interaction.options.getInteger("spawn_minute") ?? 0;
    const timeoutMinutes = interaction.options.getInteger("timeout_minutes") ?? 30;
    const liveUpdateSeconds = interaction.options.getInteger("live_update_seconds") ?? 10;

    const { getGameChannel } = await import("../data/store.js");
    const gameChannel = getGameChannel(guild.id);
    if (!gameChannel) {
      await interaction.editReply(
        "❌ ยังไม่ได้ตั้งห้องเกม กรุณาใช้ `/setgamechannel` ก่อน"
      );
      return;
    }

    // Compute nextSpawnAt (Thai time = UTC+7)
    const now = new Date();
    const nextSpawn = new Date(now);
    nextSpawn.setUTCHours(spawnHour - 7, spawnMinute, 0, 0);
    if (nextSpawn.getTime() <= now.getTime()) {
      nextSpawn.setDate(nextSpawn.getDate() + intervalDays);
    }

    setWorldBossConfig(guild.id, {
      intervalDays,
      spawnHour,
      spawnMinute,
      timeoutMinutes,
      liveUpdateSeconds,
      nextSpawnAt: nextSpawn.getTime(),
    });

    const thaiHour = spawnHour.toString().padStart(2, "0");
    const thaiMin = spawnMinute.toString().padStart(2, "0");

    const embed = new EmbedBuilder()
      .setTitle("✅ ตั้งค่าระบบบอสโลกแล้ว")
      .setColor(0x57f287)
      .addFields(
        { name: "📅 spawn ทุกๆ", value: `${intervalDays} วัน`, inline: true },
        { name: "🕐 เวลา spawn", value: `${thaiHour}:${thaiMin} (เวลาไทย)`, inline: true },
        { name: "⏰ เวลาจำกัด", value: `${timeoutMinutes} นาที`, inline: true },
        { name: "🔄 อัปเดต panel", value: `ทุก ${liveUpdateSeconds} วินาที`, inline: true },
        { name: "📢 ห้องประกาศ", value: `<#${gameChannel}>`, inline: true },
        {
          name: "🗓️ spawn ครั้งถัดไป",
          value: `<t:${Math.floor(nextSpawn.getTime() / 1000)}:F>`,
          inline: false,
        }
      )
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
    return;
  }

  // ── /setworldboss status ────────────────────────────────────
  if (sub === "status") {
    const cfg = getWorldBossConfig(guild.id);
    if (!cfg) {
      await interaction.editReply(
        "❌ ยังไม่ได้ตั้งค่าระบบบอสโลก ใช้ `/setworldboss setup` ก่อน"
      );
      return;
    }

    const thaiHour = cfg.spawnHour.toString().padStart(2, "0");
    const thaiMin = cfg.spawnMinute.toString().padStart(2, "0");
    const active = isBossActive(guild.id);

    const embed = new EmbedBuilder()
      .setTitle("👹 สถานะระบบบอสโลก")
      .setColor(active ? 0xed4245 : 0x5865f2)
      .addFields(
        { name: "บอสปัจจุบัน", value: active ? "⚔️ กำลังสู้!" : "😴 ยังไม่ปรากฏ", inline: true },
        { name: "📅 spawn ทุกๆ", value: `${cfg.intervalDays} วัน`, inline: true },
        { name: "🕐 เวลา spawn", value: `${thaiHour}:${thaiMin} (ไทย)`, inline: true },
        { name: "⏰ เวลาจำกัด", value: `${cfg.timeoutMinutes} นาที`, inline: true },
        { name: "🔄 อัปเดต panel", value: `${cfg.liveUpdateSeconds} วินาที`, inline: true },
        {
          name: "🗓️ spawn ครั้งถัดไป",
          value: cfg.nextSpawnAt
            ? `<t:${Math.floor(cfg.nextSpawnAt / 1000)}:F>`
            : "ยังไม่ได้ตั้งค่า",
          inline: false,
        }
      )
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
    return;
  }

  // ── /setworldboss spawn_now ─────────────────────────────────
  if (sub === "spawn_now") {
    if (isBossActive(guild.id)) {
      await interaction.editReply("⚠️ มีบอสกำลังสู้อยู่แล้ว!");
      return;
    }
    const cfg = getWorldBossConfig(guild.id);
    if (!cfg) {
      await interaction.editReply(
        "❌ ยังไม่ได้ตั้งค่าระบบบอส ใช้ `/setworldboss setup` ก่อน"
      );
      return;
    }
    await interaction.editReply("🔥 เรียกบอสแล้ว! ดูที่ห้องเกมได้เลย");
    await spawnBoss(interaction.client, guild.id).catch(console.error);
    return;
  }

  // ── /setworldboss bosses ────────────────────────────────────
  if (sub === "bosses") {
    const lines = BOSS_POOL.map(
      (b, i) =>
        `**${i + 1}. ${b.emoji} ${b.name}** (${b.difficulty})\n` +
        `   ❤️ HP: ${b.maxHp.toLocaleString()} | 💰 รางวัล: ${b.rewardSpore.toLocaleString()} สปอร์\n` +
        `   > ${b.description}`
    );

    const embed = new EmbedBuilder()
      .setTitle("📖 รายการบอสทั้งหมด")
      .setColor(0x9b59b6)
      .setDescription(lines.join("\n\n"))
      .setFooter({ text: "บอสถูกสุ่มเลือกทุก spawn" })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  }
}
