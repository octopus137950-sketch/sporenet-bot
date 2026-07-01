// ============================================================
// questTracker.ts — Quest progress tracking
// Handles: chat message counting, voice minute accumulation,
// and farm increment calls forwarded from farm.ts.
// ============================================================

import { Client, Guild, TextBasedChannel, EmbedBuilder, Message } from "discord.js";
import {
  getPlayerQuestData,
  savePlayerQuestData,
  getGameChannel,
  PlayerQuestData,
} from "../data/store.js";
import {
  getQuestById,
  rollQuests,
  QuestType,
  DIFFICULTY_EMOJI,
  DIFFICULTY_LABEL,
} from "../data/questPool.js";
import { getThaiDateString } from "../utils/thaiTime.js";

// ─── Voice session tracking (separate from voiceHandler.ts) ──
// key = `${guildId}:${userId}`, value = timestamp of last quest-tick
const questVoiceSessions = new Map<string, number>();

export function onQuestVoiceJoin(guildId: string, userId: string): void {
  questVoiceSessions.set(`${guildId}:${userId}`, Date.now());
}

export function onQuestVoiceLeave(
  guildId: string,
  userId: string,
  client: Client
): void {
  const key = `${guildId}:${userId}`;
  const lastTick = questVoiceSessions.get(key);
  questVoiceSessions.delete(key);
  if (lastTick == null) return;

  const minutesSpent = Math.floor((Date.now() - lastTick) / 60_000);
  if (minutesSpent <= 0) return;

  incrementQuestProgress(client, guildId, userId, "voice", minutesSpent).catch(
    (e) => console.error("[questTracker] voice leave error:", e)
  );
}

// Called by startQuestVoiceLoop every minute for every active voice session
export function startQuestVoiceLoop(client: Client): void {
  setInterval(() => {
    const now = Date.now();
    for (const [key, lastTick] of questVoiceSessions) {
      const minutesSinceTick = Math.floor((now - lastTick) / 60_000);
      if (minutesSinceTick < 1) continue;

      const parts = key.split(":");
      const guildId = parts[0]!;
      const userId = parts[1]!;

      // Advance the tick by the integer minutes consumed
      questVoiceSessions.set(key, lastTick + minutesSinceTick * 60_000);

      incrementQuestProgress(client, guildId, userId, "voice", minutesSinceTick).catch(
        (e) => console.error("[questTracker] voice loop error:", e)
      );
    }
  }, 60_000);

  console.log("📋 Quest voice tracker loop started (ticks every 60s)");
}

// ─── Chat message handler ─────────────────────────────────────

export async function onQuestMessage(message: Message, client: Client): Promise<void> {
  // Ignore bots, DMs, and system messages
  if (message.author.bot || !message.guild || !message.author) return;

  await incrementQuestProgress(
    client,
    message.guild.id,
    message.author.id,
    "chat",
    1
  );
}

// ─── Core progress updater ────────────────────────────────────

/** Call this every time a player does a quest-trackable activity.
 *  Rolls fresh quests if the player has none for today.
 *  Sends a game-channel notification when a quest is completed. */
export async function incrementQuestProgress(
  client: Client,
  guildId: string,
  userId: string,
  type: QuestType,
  amount: number
): Promise<void> {
  const today = getThaiDateString();
  let data = ensureQuestData(userId, today);

  let changed = false;
  const guild = client.guilds.cache.get(guildId);

  for (const entry of data.quests) {
    if (entry.completed) continue;

    const def = getQuestById(entry.questId);
    if (!def || def.type !== type) continue;

    const before = entry.progress;
    entry.progress = Math.min(entry.progress + amount, def.target);

    if (before < def.target && entry.progress >= def.target) {
      entry.completed = true;
      // Fire-and-forget completion notification
      if (guild) {
        sendCompletionNotification(guild, userId, def.description, def.reward).catch(
          (e) => console.error("[questTracker] notification error:", e)
        );
      }
    }
    changed = true;
  }

  if (changed) savePlayerQuestData(data);
}

// ─── Helpers ─────────────────────────────────────────────────

/** Returns existing quest data for today, or creates (and saves) fresh data. */
export function ensureQuestData(userId: string, today: string): PlayerQuestData {
  const existing = getPlayerQuestData(userId);
  if (existing && existing.date === today) return existing;

  // Roll 3 new quests for the new day
  const defs = rollQuests(3);
  const freshData: PlayerQuestData = {
    userId,
    date: today,
    quests: defs.map((d) => ({
      questId: d.id,
      progress: 0,
      completed: false,
      claimed: false,
    })),
  };
  savePlayerQuestData(freshData);
  return freshData;
}

async function sendCompletionNotification(
  guild: Guild,
  userId: string,
  description: string,
  reward: number
): Promise<void> {
  try {
    const channelId = getGameChannel(guild.id);
    if (!channelId) return;

    const ch = guild.channels.cache.get(channelId) as TextBasedChannel | undefined;
    if (!ch || !("send" in ch)) return;

    const embed = new EmbedBuilder()
      .setTitle("✅ ภารกิจสำเร็จ!")
      .setDescription(
        `<@${userId}> ทำภารกิจ **${description}** สำเร็จแล้ว! 🎉\n` +
          `พิมพ์ \`/quest claim\` เพื่อรับรางวัล **${reward.toLocaleString()} สปอร์**`
      )
      .setColor(0x57f287)
      .setTimestamp();

    await ch.send({ embeds: [embed] });
  } catch { /* ignore send failures */ }
}

// Re-export for convenience (used by quest.ts command)
export { DIFFICULTY_EMOJI, DIFFICULTY_LABEL };
