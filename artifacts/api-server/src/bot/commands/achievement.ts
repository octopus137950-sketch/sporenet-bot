// ============================================================
// achievement.ts — User command: /achievement list
// Shows achievement book with personal progress per condition.
// ============================================================

import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
} from "discord.js";
import {
  getGuildAchievements,
  getPlayerAchievements,
  getPlayerStats,
  AchievementConfig,
  AchievementCondition,
  PlayerStats,
} from "../data/store.js";

export const data = new SlashCommandBuilder()
  .setName("achievement")
  .setDescription("🏆 ดูรายการยศความสำเร็จทั้งหมด")
  .addSubcommand((sub) =>
    sub.setName("list").setDescription("เปิดสมุดยศความสำเร็จของคุณ")
  );

// ─── Helpers ─────────────────────────────────────────────────

function getCurrentProgress(stats: PlayerStats, cond: AchievementCondition): number {
  switch (cond.type) {
    case "voice_time":       return stats.voiceTimeSeconds;
    case "chat_count":       return stats.chatCount;
    case "farm_count":       return stats.farmCount;
    case "quest_completed":  return stats.questCompletedCount;
  }
}

function formatConditionProgress(stats: PlayerStats, cond: AchievementCondition): string {
  const current = getCurrentProgress(stats, cond);
  switch (cond.type) {
    case "voice_time": {
      const curH = Math.floor(current / 3600);
      const curM = Math.floor((current % 3600) / 60);
      const tarH = Math.floor(cond.value / 3600);
      const tarM = Math.floor((cond.value % 3600) / 60);
      const curStr = curH > 0 ? `${curH} ชม. ${curM} นาที` : `${curM} นาที`;
      const tarStr = tarH > 0 ? `${tarH} ชม.` : `${tarM} นาที`;
      return `⏱️ อยู่ห้องเสียง ${curStr}/${tarStr}`;
    }
    case "chat_count":
      return `💬 ส่งข้อความ ${current.toLocaleString()}/${cond.value.toLocaleString()} ครั้ง`;
    case "farm_count":
      return `🍄 ฟาร์มเห็ด ${current.toLocaleString()}/${cond.value.toLocaleString()} ครั้ง`;
    case "quest_completed":
      return `📋 ทำเควสสำเร็จ ${current.toLocaleString()}/${cond.value.toLocaleString()} ครั้ง`;
  }
}

function progressBar(current: number, target: number, length = 8): string {
  const pct = Math.min(current / target, 1);
  const filled = Math.round(pct * length);
  return "█".repeat(filled) + "░".repeat(length - filled) + ` ${Math.floor(pct * 100)}%`;
}

/** Worst (lowest %) progress bar across all conditions */
function overallProgressBar(stats: PlayerStats, conditions: AchievementCondition[]): string {
  const lowestPct = conditions.reduce((min, cond) => {
    const pct = Math.min(getCurrentProgress(stats, cond) / cond.value, 1);
    return pct < min ? pct : min;
  }, 1);
  const filled = Math.round(lowestPct * 8);
  return "█".repeat(filled) + "░".repeat(8 - filled) + ` ${Math.floor(lowestPct * 100)}%`;
}

function buildAchievementLine(
  ach: AchievementConfig,
  isUnlocked: boolean,
  stats: PlayerStats
): string {
  // ── Case 1: Player already unlocked ───────────────────────
  if (isUnlocked) {
    return (
      `🟢 **${ach.titleName}**\n` +
      `> ✅ ปลดล็อกแล้ว` +
      (ach.sporeReward > 0 ? ` • 🍄 ${ach.sporeReward.toLocaleString()} สปอร์` : "")
    );
  }

  // ── Case 2: Secret — no one has discovered it yet ─────────
  if (ach.isSecret && !ach.isDiscovered) {
    return (
      `❓🔒 **[ ยศลับที่ยังไม่ถูกค้นพบ ]**\n` +
      `> เงื่อนไข: ???`
    );
  }

  // ── Case 3: Not yet unlocked (normal OR discovered-secret) ─
  const secretNote = ach.isSecret && ach.isDiscovered ? " _(เคยลับ)_" : "";
  const rewardText = ach.sporeReward > 0 ? ` • 🍄 ${ach.sporeReward.toLocaleString()} สปอร์` : "";
  const firstBy    = ach.firstUnlockedBy
    ? `\n> 👑 บุกเบิกโดย: <@${ach.firstUnlockedBy}>`
    : "";

  const multiCond = ach.conditions.length > 1;

  // Single condition — show inline
  if (!multiCond) {
    const cond    = ach.conditions[0]!;
    const current = getCurrentProgress(stats, cond);
    const bar     = progressBar(current, cond.value);
    const label   = formatConditionProgress(stats, cond);
    return (
      `🔒 **${ach.titleName}**${secretNote}\n` +
      `> เงื่อนไข: ${label}${rewardText}\n` +
      `> \`${bar}\`` +
      firstBy
    );
  }

  // Multi-condition — list each + overall bar
  const condLines = ach.conditions
    .map((cond) => {
      const current = getCurrentProgress(stats, cond);
      const met     = current >= cond.value;
      const bar     = progressBar(current, cond.value);
      return (
        `> ${met ? "✅" : "🔲"} ${formatConditionProgress(stats, cond)}\n` +
        `> \`${bar}\``
      );
    })
    .join("\n");

  const overallBar = overallProgressBar(stats, ach.conditions);

  return (
    `🔒 **${ach.titleName}**${secretNote} _(${ach.conditions.length} เงื่อนไข — ต้องทำครบทุกข้อ)_${rewardText}\n` +
    condLines +
    `\n> **ภาพรวม:** \`${overallBar}\`` +
    firstBy
  );
}

// ─── Execute ─────────────────────────────────────────────────

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!interaction.guild) {
    await interaction.reply({ content: "❌ ใช้ได้เฉพาะในเซิร์ฟเวอร์เท่านั้น", ephemeral: true });
    return;
  }

  await interaction.deferReply();

  const guildId      = interaction.guild.id;
  const userId       = interaction.user.id;
  const achievements = getGuildAchievements(guildId);

  if (achievements.length === 0) {
    await interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setTitle("🏆 สมุดยศความสำเร็จ")
          .setColor(0x5865f2)
          .setDescription(
            "ยังไม่มียศความสำเร็จในเซิร์ฟเวอร์นี้\n" +
            "รอให้แอดมินสร้างผ่าน `/achievement-admin create` ก่อนนะ!"
          )
          .setTimestamp(),
      ],
    });
    return;
  }

  const unlockedIds = new Set(
    getPlayerAchievements(guildId, userId).map((a) => a.achievementId)
  );
  const stats = getPlayerStats(guildId, userId);

  const lines = achievements.map((ach) =>
    buildAchievementLine(ach, unlockedIds.has(ach.achievementId), stats)
  );

  const totalUnlocked = achievements.filter((a) => unlockedIds.has(a.achievementId)).length;

  const chunks: string[][] = [];
  for (let i = 0; i < lines.length; i += 6) {
    chunks.push(lines.slice(i, i + 6));
  }

  const embeds = chunks.map((chunk, idx) => {
    const e = new EmbedBuilder()
      .setColor(0xffd700)
      .setDescription(chunk.join("\n\n"));

    if (idx === 0) {
      e.setTitle(`🏆 สมุดยศความสำเร็จ (${totalUnlocked}/${achievements.length} ปลดล็อก)`)
       .setThumbnail(interaction.user.displayAvatarURL());
    } else {
      e.setTitle("🏆 สมุดยศความสำเร็จ (ต่อ)");
    }
    return e;
  });

  if (embeds.length > 0) {
    embeds[embeds.length - 1]!
      .setFooter({
        text: `🟢 ปลดล็อกแล้ว  🔒 ยังไม่ปลดล็อก  ❓🔒 ยังไม่มีผู้บุกเบิก • ${interaction.user.username}`,
        iconURL: interaction.user.displayAvatarURL(),
      })
      .setTimestamp();
  }

  await interaction.editReply({ embeds: embeds.slice(0, 10) });
}
