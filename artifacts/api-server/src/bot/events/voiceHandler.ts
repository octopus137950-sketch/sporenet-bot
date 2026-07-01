import {
  Client,
  VoiceState,
  EmbedBuilder,
  TextBasedChannel,
  Guild,
} from "discord.js";
import { getPlayer, savePlayer, getVoiceRewardConfig } from "../data/store.js";

interface VoiceSession {
  joinTime: number;
  earnedSpore: number;
  earnedExp: number;
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
  session: VoiceSession
): Promise<void> {
  try {
    const config = getVoiceRewardConfig(guild.id);
    if (!config?.enabled || !config.notifyChannelId) return;
    if (session.earnedSpore === 0 && session.earnedExp === 0) return;

    const ch = await guild.channels.fetch(config.notifyChannelId).catch(() => null);
    if (!ch || !(ch as TextBasedChannel).send) return;

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
        { name: "⏱️ เวลาในห้องเสียง", value: formatDuration(Date.now() - session.joinTime), inline: true }
      )
      .setTimestamp();

    await (ch as TextBasedChannel).send({ embeds: [embed] });
  } catch (e) {
    console.error("Failed to send voice leave notification:", e);
  }
}

export function handleVoiceStateUpdate(oldState: VoiceState, newState: VoiceState): void {
  const member = newState.member ?? oldState.member;
  if (!member || member.user.bot) return;

  const userId = member.id;
  const guildId = newState.guild.id;
  const key = sessionKey(guildId, userId);

  const joinedVoice = !oldState.channelId && newState.channelId;
  const leftVoice = oldState.channelId && !newState.channelId;

  if (joinedVoice) {
    sessions.set(key, { joinTime: Date.now(), earnedSpore: 0, earnedExp: 0 });
  } else if (leftVoice) {
    const session = sessions.get(key);
    sessions.delete(key);
    if (session) {
      sendLeaveNotification(newState.guild, userId, session).catch(console.error);
    }
  }
  // Moved between channels — session continues unchanged
}

async function distributeVoiceRewards(client: Client): Promise<void> {
  const now = Date.now();

  for (const [guildId, guild] of client.guilds.cache) {
    const config = getVoiceRewardConfig(guildId);
    if (!config?.enabled) continue;

    const intervalMs = config.timeLoopMinutes * 60 * 1000;
    const lastDist = lastDistribution.get(guildId) ?? 0;
    if (now - lastDist < intervalMs) continue;

    lastDistribution.set(guildId, now);

    for (const [, voiceChannel] of guild.channels.cache) {
      if (!voiceChannel.isVoiceBased()) continue;
      if (config.blockedRoomIds.includes(voiceChannel.id)) continue;

      for (const [, member] of voiceChannel.members) {
        if (member.user.bot) continue;

        const player = getPlayer(member.id);
        player.sporePoints += config.giveSpore;
        player.farmExp += config.giveExp;

        const expNeeded = player.farmLevel * 100;
        if (player.farmExp >= expNeeded) {
          player.farmExp -= expNeeded;
          player.farmLevel += 1;
        }

        savePlayer(player);

        // Update session accumulator
        const key = sessionKey(guildId, member.id);
        const session = sessions.get(key);
        if (session) {
          session.earnedSpore += config.giveSpore;
          session.earnedExp += config.giveExp;
        } else {
          // User was in voice before bot started tracking
          sessions.set(key, {
            joinTime: now,
            earnedSpore: config.giveSpore,
            earnedExp: config.giveExp,
          });
        }
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
