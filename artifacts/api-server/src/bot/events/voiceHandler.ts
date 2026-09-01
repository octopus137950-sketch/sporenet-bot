import {
  Client,
  VoiceState,
  EmbedBuilder,
  Guild,
} from "discord.js";
import {
  getPlayer,
  savePlayer,
  getVoiceRewardConfig,
  tryAcquireVoiceLeaveLock,
  tryAcquireVoiceRewardCycleLock,
  type VoiceRewardConfig,
} from "../data/store.js";
import { onQuestVoiceJoin, onQuestVoiceLeave } from "./questTracker.js";
import { trackStatAndCheck } from "../utils/achievementChecker.js";

interface VoiceSession {
  joinTime: number;
  channelId: string;
  earnedSpore: number;
  earnedExp: number;
  rewardedIntervals: number;
}

// key: `${guildId}:${userId}`
const sessions = new Map<string, VoiceSession>();
// key: guildId, value: timestamp of last distribution
const lastDistribution = new Map<string, number>();

function sessionKey(guildId: string, userId: string): string {
  return `${guildId}:${userId}`;
}

function formatDuration(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h} ชม. ${m} นาที`;
  if (m > 0) return `${m} นาที ${s} วินาที`;
  return `${s} วินาที`;
}

async function sendLeaveNotification(
  guild: Guild,
  userId: string,
  session: VoiceSession,
  leftAt: number,
): Promise<void> {
  // ✅ เฉพาะแจ้งเตือนเมื่อได้ reward จริง
  if (session.earnedSpore === 0 && session.earnedExp === 0) return;

  try {
    const config = getVoiceRewardConfig(guild.id);
    if (!config?.enabled || !config.notifyChannelId) return;

    const ch = await guild.channels.fetch(config.notifyChannelId).catch(() => null);
    if (!ch || !("send" in ch)) return;

    const member = await guild.members.fetch(userId).catch(() => null);
    const username = member?.displayName ?? `User ${userId}`;
    const avatarUrl = member?.user.displayAvatarURL({ size: 128 });

    const embed = new EmbedBuilder()
      .setTitle("🎙️ ออกจากห้องเสียง")
      .setColor(0x5865f2)
      .setAuthor({ name: username, iconURL: avatarUrl })
      .setDescription(`<@${userId}> ออกจากห้องเสียง ได้รับรางวัลสำหรับเซสชันนี้:`)
      .addFields(
        { name: "🍄 สปอร์ที่ได้รับ", value: `**+${session.earnedSpore.toLocaleString()}** สปอร์`, inline: true },
        { name: "⭐ EXP ที่ได้รับ", value: `**+${session.earnedExp.toLocaleString()}** EXP`, inline: true },
        { name: "⏱️ เวลาในห้องเสียง", value: formatDuration(leftAt - session.joinTime), inline: true }
      )
      .setFooter({
        text: "ระบบแจก reward ให้ครบตามรอบเวลาที่กำหนดแล้ว",
      })
      .setTimestamp();

    await ch.send({ embeds: [embed] });
  } catch (e) {
    console.error("Failed to send voice leave notification:", e);
  }
}

function awardPendingVoiceRewards(
  memberId: string,
  session: VoiceSession,
  config: VoiceRewardConfig,
  now: number,
): void {
  const intervalMs = Math.max(1, config.timeLoopMinutes) * 60_000;
  const completedIntervals = Math.floor((now - session.joinTime) / intervalMs);
  const pendingIntervals = completedIntervals - session.rewardedIntervals;
  if (pendingIntervals <= 0) return;

  const player = getPlayer(memberId);
  const earnedSpore = pendingIntervals * config.giveSpore;
  player.sporePoints += earnedSpore;
  player.farmExp += pendingIntervals * config.giveExp;

  while (player.farmExp >= player.farmLevel * 100) {
    player.farmExp -= player.farmLevel * 100;
    player.farmLevel += 1;
  }

  savePlayer(player);
  session.earnedSpore += earnedSpore;
  session.earnedExp += pendingIntervals * config.giveExp;
  session.rewardedIntervals = completedIntervals;
}

export function handleVoiceStateUpdate(
  oldState: VoiceState,
  newState: VoiceState,
  client: Client
): void {
  const member = newState.member ?? oldState.member;
  if (!member || member.user.bot) return;

  const userId = member.id;
  const guildId = newState.guild.id;
  const key = sessionKey(guildId, userId);
  const now = Date.now();

  const joinedVoice = !oldState.channelId && newState.channelId;
  const leftVoice = oldState.channelId && !newState.channelId;

  if (joinedVoice) {
    sessions.set(key, {
      joinTime: now,
      channelId: newState.channelId!,
      earnedSpore: 0,
      earnedExp: 0,
      rewardedIntervals: 0,
    });
    // Quest tracking: record voice join
    onQuestVoiceJoin(guildId, userId);
  } else if (leftVoice) {
    const session = sessions.get(key);
    if (!session) return;
    if (!tryAcquireVoiceLeaveLock(guildId, userId)) {
      // Another bot process is handling the same Discord event.
      sessions.delete(key);
      return;
    }
    sessions.delete(key);
    const config = getVoiceRewardConfig(guildId);
    if (config?.enabled && !config.blockedRoomIds.includes(session.channelId)) {
      awardPendingVoiceRewards(userId, session, config, now);
    }
    sendLeaveNotification(newState.guild, userId, session, now).catch(console.error);

    // Achievement tracking: accumulate voice time in seconds
    const secondsSpent = Math.floor((now - session.joinTime) / 1000);
    if (secondsSpent > 0) {
      trackStatAndCheck(client, guildId, userId, "voiceTimeSeconds", secondsSpent).catch(
        (e) => console.error("[voiceHandler] achievement voice check error:", e)
      );
    }
    // Quest tracking: accumulate minutes on leave
    onQuestVoiceLeave(guildId, userId, client);
  } else if (oldState.channelId && newState.channelId && oldState.channelId !== newState.channelId) {
    const session = sessions.get(key);
    if (session) session.channelId = newState.channelId;
  }
  // Moved between channels — session continues unchanged
}

async function distributeVoiceRewards(client: Client): Promise<void> {
  const now = Date.now();

  for (const [guildId, guild] of client.guilds.cache) {
    const config = getVoiceRewardConfig(guildId);
    if (!config?.enabled) continue;

    const intervalMs = Math.max(1, config.timeLoopMinutes) * 60 * 1000;
    const lastDist = lastDistribution.get(guildId) ?? 0;
    if (now - lastDist < intervalMs) continue;
    const cycleKey = Math.floor(now / intervalMs);
    if (!tryAcquireVoiceRewardCycleLock(guildId, cycleKey, intervalMs + 60_000)) continue;

    lastDistribution.set(guildId, now);

    for (const [, voiceChannel] of guild.channels.cache) {
      if (!voiceChannel.isVoiceBased()) continue;
      if (config.blockedRoomIds.includes(voiceChannel.id)) continue;

      for (const [, member] of voiceChannel.members) {
        if (member.user.bot) continue;

        const key = sessionKey(guildId, member.id);
        let session = sessions.get(key);

        // If no session (user was in channel before bot started), create one now
        if (!session) {
          session = {
            joinTime: now,
            channelId: voiceChannel.id,
            earnedSpore: 0,
            earnedExp: 0,
            rewardedIntervals: 0,
          };
          sessions.set(key, session);
        }

        session.channelId = voiceChannel.id;
        awardPendingVoiceRewards(member.id, session, config, now);
      }
    }
  }
}

export function startVoiceEconomyLoop(client: Client): void {
  // Check every 60 seconds; distribute based on each guild's configured interval
  setInterval(() => {
    distributeVoiceRewards(client).catch((e) =>
      console.error("Voice economy loop error:", e)
    );
  }, 60_000);

  console.log("🎙️ Voice Economy loop started (checks every 60s)");
}
