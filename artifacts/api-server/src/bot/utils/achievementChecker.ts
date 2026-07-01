// ============================================================
// achievementChecker.ts — Achievement system core logic
// Tracks cumulative player stats and grants achievement roles
// + spore rewards when thresholds are met.
// ============================================================

import {
  Client,
  Guild,
  EmbedBuilder,
  TextBasedChannel,
  TextChannel,
} from "discord.js";
import {
  getGameChannel,
  getPlayer,
  savePlayer,
  getGuildAchievements,
  markAchievementDiscovered,
  getPlayerAchievements,
  addPlayerAchievement,
  incrementPlayerStat,
  AchievementConfig,
  AchievementTargetType,
  PlayerStats,
} from "../data/store.js";

// ─── Public API ───────────────────────────────────────────────

/** Increment a cumulative stat and immediately check all achievements. */
export async function trackStatAndCheck(
  client: Client,
  guildId: string,
  userId: string,
  statField: keyof Omit<PlayerStats, "userId" | "guildId">,
  amount: number
): Promise<void> {
  const updatedStats = incrementPlayerStat(guildId, userId, statField, amount);
  await checkAchievements(client, guildId, userId, updatedStats);
}

// ─── Core checker ────────────────────────────────────────────

async function checkAchievements(
  client: Client,
  guildId: string,
  userId: string,
  stats: PlayerStats
): Promise<void> {
  const achievements = getGuildAchievements(guildId);
  if (achievements.length === 0) return;

  const guild = client.guilds.cache.get(guildId);
  if (!guild) return;

  const unlockedIds = new Set(
    getPlayerAchievements(guildId, userId).map((a) => a.achievementId)
  );

  for (const ach of achievements) {
    if (unlockedIds.has(ach.achievementId)) continue;

    const statValue = resolveStatValue(stats, ach.targetType);
    if (statValue < ach.targetValue) continue;

    // Player just crossed the threshold — grant the achievement!
    await grantAchievement(client, guild, userId, ach).catch((e) =>
      console.error("[achievementChecker] grantAchievement error:", e)
    );
  }
}

function resolveStatValue(stats: PlayerStats, type: AchievementTargetType): number {
  switch (type) {
    case "voice_time":  return stats.voiceTimeSeconds;
    case "chat_count":  return stats.chatCount;
    case "farm_count":  return stats.farmCount;
  }
}

// ─── Grant logic ─────────────────────────────────────────────

async function grantAchievement(
  client: Client,
  guild: Guild,
  userId: string,
  ach: AchievementConfig
): Promise<void> {
  // Grant Discord role if configured
  if (ach.discordRoleId) {
    try {
      const member = await guild.members.fetch(userId).catch(() => null);
      if (member) await member.roles.add(ach.discordRoleId);
    } catch { /* role may have been deleted */ }
  }

  // Grant spore reward
  if (ach.sporeReward > 0) {
    const player = getPlayer(userId);
    player.sporePoints += ach.sporeReward;
    savePlayer(player);
  }

  // Record unlock
  addPlayerAchievement({
    userId,
    guildId: guild.id,
    achievementId: ach.achievementId,
    unlockedAt: Date.now(),
  });

  const isFirstDiscovery = !ach.isDiscovered;

  if (isFirstDiscovery) {
    markAchievementDiscovered(guild.id, ach.achievementId, userId);
    await sendFirstDiscoveryAnnouncement(guild, userId, ach);
  } else {
    await sendQuietNotification(guild, userId, ach);
  }
}

// ─── Announcement helpers ─────────────────────────────────────

function buildTargetLabel(ach: AchievementConfig): string {
  switch (ach.targetType) {
    case "voice_time": {
      const h = Math.floor(ach.targetValue / 3600);
      const m = Math.floor((ach.targetValue % 3600) / 60);
      const parts: string[] = [];
      if (h > 0) parts.push(`${h} ชั่วโมง`);
      if (m > 0) parts.push(`${m} นาที`);
      const label = parts.length ? parts.join(" ") : `${ach.targetValue} วินาที`;
      return `อยู่ในห้องเสียงสะสม ${label}`;
    }
    case "chat_count":
      return `ส่งข้อความสะสม ${ach.targetValue.toLocaleString()} ครั้ง`;
    case "farm_count":
      return `ฟาร์มเห็ดสะสม ${ach.targetValue.toLocaleString()} ครั้ง`;
  }
}

async function getGameTextChannel(guild: Guild): Promise<TextBasedChannel | null> {
  const channelId = getGameChannel(guild.id);
  if (!channelId) return null;
  const ch = guild.channels.cache.get(channelId);
  if (!ch || !("send" in ch)) return null;
  return ch as TextBasedChannel;
}

async function sendFirstDiscoveryAnnouncement(
  guild: Guild,
  userId: string,
  ach: AchievementConfig
): Promise<void> {
  const ch = await getGameTextChannel(guild);
  if (!ch) return;

  const targetLabel = buildTargetLabel(ach);

  const embed = new EmbedBuilder()
    .setTitle("🏆 ตำนานถูกเปิดเผย! ยศลับถูกค้นพบครั้งแรก!")
    .setColor(0xffd700)
    .setDescription(
      `✨ <@${userId}> คือ **ผู้บุกเบิก** คนแรกที่ปลดล็อกยศลับ!\n\n` +
      `🎖️ **ยศ:** ${ach.titleName}\n` +
      `🔓 **เงื่อนไขที่เปิดเผย:** ${targetLabel}\n` +
      `🍄 **รางวัลพิเศษ:** +${ach.sporeReward.toLocaleString()} สปอร์\n\n` +
      `_ประวัติศาสตร์ถูกสร้างขึ้นแล้ว... ยศนี้จะไม่เป็นความลับอีกต่อไป_ 🌟`
    )
    .setTimestamp()
    .setFooter({ text: `${guild.name} • ระบบยศความสำเร็จ` });

  try {
    const msg = await (ch as TextChannel).send({
      content: "@everyone",
      embeds: [embed],
    });

    // Pin the announcement
    await msg.pin().catch(() => null);

    // Auto-unpin after 24 hours
    setTimeout(() => {
      msg.unpin().catch(() => null);
    }, 24 * 60 * 60 * 1000);
  } catch (e) {
    console.error("[achievementChecker] failed to send first-discovery announcement:", e);
  }
}

async function sendQuietNotification(
  guild: Guild,
  userId: string,
  ach: AchievementConfig
): Promise<void> {
  const ch = await getGameTextChannel(guild);
  if (!ch) return;

  const embed = new EmbedBuilder()
    .setTitle("🎖️ ได้รับยศความสำเร็จ!")
    .setColor(0x57f287)
    .setDescription(
      `<@${userId}> ปลดล็อกยศ **${ach.titleName}** สำเร็จแล้ว! 🎉\n` +
      (ach.sporeReward > 0 ? `รางวัล: **+${ach.sporeReward.toLocaleString()} สปอร์**` : "")
    )
    .setTimestamp();

  await (ch as TextChannel).send({ embeds: [embed] }).catch(() => null);
}
