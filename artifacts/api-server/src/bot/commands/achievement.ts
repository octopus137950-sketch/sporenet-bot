// ============================================================
// achievement.ts — User command: /achievement list
// Shows achievement book with personal progress for each entry.
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
  PlayerStats,
} from "../data/store.js";

export const data = new SlashCommandBuilder()
  .setName("achievement")
  .setDescription("🏆 ดูรายการยศความสำเร็จทั้งหมด")
  .addSubcommand((sub) =>
    sub.setName("list").setDescription("เปิดสมุดยศความสำเร็จของคุณ")
  );

// ─── Helpers ─────────────────────────────────────────────────

function getCurrentProgress(stats: PlayerStats, ach: AchievementConfig): number {
  switch (ach.targetType) {
    case "voice_time":  return stats.voiceTimeSeconds;
    case "chat_count":  return stats.chatCount;
    case "farm_count":  return stats.farmCount;
  }
}

function formatProgressLabel(current: number, ach: AchievementConfig): string {
  switch (ach.targetType) {
    case "voice_time": {
      const curH = Math.floor(current / 3600);
      const curM = Math.floor((current % 3600) / 60);
      const tarH = Math.floor(ach.targetValue / 3600);
      const tarM = Math.floor((ach.targetValue % 3600) / 60);

      const curStr = curH > 0 ? `${curH} ชม. ${curM} นาที` : `${curM} นาที`;
      const tarStr = tarH > 0 ? `${tarH} ชม.` : `${tarM} นาที`;
      return `อยู่ในห้องเสียง ${curStr}/${tarStr}`;
    }
    case "chat_count":
      return `ส่งข้อความ ${current.toLocaleString()}/${ach.targetValue.toLocaleString()} ครั้ง`;
    case "farm_count":
      return `ฟาร์มเห็ด ${current.toLocaleString()}/${ach.targetValue.toLocaleString()} ครั้ง`;
  }
}

function progressBar(current: number, target: number, length = 8): string {
  const pct = Math.min(current / target, 1);
  const filled = Math.round(pct * length);
  return "█".repeat(filled) + "░".repeat(length - filled) + ` ${Math.floor(pct * 100)}%`;
}

function buildAchievementLine(
  ach: AchievementConfig,
  isUnlocked: boolean,
  stats: PlayerStats
): string {
  // ── Case 1: Player already unlocked this achievement ──────────
  if (isUnlocked) {
    return (
      `🟢 **${ach.titleName}**\n` +
      `> ✅ ปลดล็อกแล้ว` +
      (ach.sporeReward > 0 ? ` • 🍄 ${ach.sporeReward.toLocaleString()} สปอร์` : "")
    );
  }

  // ── Case 2: Secret — no one has discovered it yet ─────────────
  if (ach.isSecret && !ach.isDiscovered) {
    return (
      `❓🔒 **[ ยศลับที่ยังไม่ถูกค้นพบ ]**\n` +
      `> เงื่อนไข: ???`
    );
  }

  // ── Case 3: Not yet unlocked (normal OR discovered-secret) ────
  const current = getCurrentProgress(stats, ach);
  const progressLabel = formatProgressLabel(current, ach);
  const bar = progressBar(current, ach.targetValue);
  const secretNote = ach.isSecret && ach.isDiscovered ? " _(เคยลับ)_" : "";
  const firstBy = ach.firstUnlockedBy
    ? `\n> 👑 บุกเบิกโดย: <@${ach.firstUnlockedBy}>`
    : "";
  const rewardText = ach.sporeReward > 0 ? ` • 🍄 ${ach.sporeReward.toLocaleString()} สปอร์` : "";

  return (
    `🔒 **${ach.titleName}**${secretNote}\n` +
    `> เงื่อนไข: ${progressLabel}${rewardText}\n` +
    `> \`${bar}\`` +
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
  const totalVisible  = achievements.length;

  // Split into pages of 8 per embed
  const chunks: string[][] = [];
  for (let i = 0; i < lines.length; i += 8) {
    chunks.push(lines.slice(i, i + 8));
  }

  const embeds = chunks.map((chunk, idx) => {
    const e = new EmbedBuilder()
      .setColor(0xffd700)
      .setDescription(chunk.join("\n\n"));

    if (idx === 0) {
      e.setTitle(`🏆 สมุดยศความสำเร็จ (${totalUnlocked}/${totalVisible} ปลดล็อก)`)
       .setThumbnail(interaction.user.displayAvatarURL());
    } else {
      e.setTitle("🏆 สมุดยศความสำเร็จ (ต่อ)");
    }
    return e;
  });

  // Footer on last embed
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
