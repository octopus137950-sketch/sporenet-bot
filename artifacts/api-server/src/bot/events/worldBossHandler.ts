// ============================================================
// worldBossHandler.ts — World Boss System
// Handles: spawn scheduling, /attack processing, live panel,
// victory/timeout resolution, and spore reward distribution.
// ============================================================

import {
  Client,
  EmbedBuilder,
  TextChannel,
  Guild,
} from "discord.js";
import { BOSS_POOL, BossTemplate } from "../data/bossPool.js";
import { ITEMS_POOL } from "../data/itemsPool.js";
import {
  getWorldBossConfig,
  setWorldBossConfig,
  getPlayer,
  savePlayer,
  addItemToInventory,
} from "../data/store.js";

/** สุ่มไอเทมดรอปจากบอส — โอกาส 2% (สูงกว่าฟาร์มปกติ 0.75%) */
function rollBossItemDrop(): typeof ITEMS_POOL[number] | null {
  if (Math.random() * 100 >= 2) return null;
  return ITEMS_POOL[Math.floor(Math.random() * ITEMS_POOL.length)]!;
}

// ─── In-memory state per guild ────────────────────────────────

interface ActiveBoss {
  template: BossTemplate;
  currentHp: number;
  maxHp: number;
  rewardSpore: number;
  spawnedAt: number;
  expiresAt: number;
  channelId: string;
  panelMessageId?: string;
  damageLogs: Map<string, number>; // userId → total damage
}

const activeBosses = new Map<string, ActiveBoss>(); // guildId → boss
const liveIntervals = new Map<string, NodeJS.Timeout>(); // guildId → interval
const bossTimers = new Map<string, NodeJS.Timeout>();   // guildId → timeout

// ─── Helpers ─────────────────────────────────────────────────

function hpBar(current: number, max: number, len = 18): string {
  const ratio = Math.max(0, current / max);
  const filled = Math.round(ratio * len);
  const empty = len - filled;
  return "█".repeat(filled) + "░".repeat(empty) + ` ${(ratio * 100).toFixed(1)}%`;
}

function formatMs(ms: number): string {
  if (ms <= 0) return "0 วินาที";
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return m > 0 ? `${m} นาที ${sec} วินาที` : `${sec} วินาที`;
}

function topDamagersText(logs: Map<string, number>, limit = 5): string {
  const sorted = [...logs.entries()].sort((a, b) => b[1] - a[1]);
  if (sorted.length === 0) return "ยังไม่มีผู้เข้าร่วม";
  return sorted
    .slice(0, limit)
    .map(([uid, dmg], i) => `${i + 1}. <@${uid}> — **${dmg.toLocaleString()}** ดาเมจ`)
    .join("\n");
}

// ─── Build Embeds ─────────────────────────────────────────────

function buildSpawnEmbed(boss: ActiveBoss): EmbedBuilder {
  const template = boss.template;
  return new EmbedBuilder()
    .setTitle(`${template.emoji} บอสโลกปรากฏตัว! — ${template.name}`)
    .setColor(template.difficultyColor)
    .setDescription(
      `**${template.description}**\n\n` +
      `ระดับความยาก: **${template.difficulty}**\n` +
      `ใช้คำสั่ง \`/attack\` เพื่อโจมตี! (ไม่มี cooldown)\n\n` +
      `> 🎯 ดาเมจ = สุ่ม 1 ถึง \`10 + (5 × level - 1)\`\n` +
      `> 💰 รางวัลแบ่งตามสัดส่วนดาเมจที่ทำได้`
    )
    .addFields(
      {
        name: "❤️ HP บอส",
        value: `${hpBar(boss.currentHp, boss.maxHp)}\n**${boss.currentHp.toLocaleString()} / ${boss.maxHp.toLocaleString()}**`,
        inline: false,
      },
      {
        name: "💰 รางวัลรวม",
        value: `**${boss.rewardSpore.toLocaleString()}** สปอร์`,
        inline: true,
      },
      {
        name: "⏰ หมดเวลา",
        value: formatMs(boss.expiresAt - Date.now()),
        inline: true,
      }
    )
    .setFooter({ text: "บอสจะหลบหนีถ้าไม่ถูกกำจัดทันเวลา! ไม่มีรางวัลหากพลาด" })
    .setTimestamp();
}

function buildLiveEmbed(boss: ActiveBoss): EmbedBuilder {
  const template = boss.template;
  const timeLeft = boss.expiresAt - Date.now();
  return new EmbedBuilder()
    .setTitle(`${template.emoji} ${template.name} — กำลังสู้!`)
    .setColor(template.difficultyColor)
    .addFields(
      {
        name: "❤️ HP บอส",
        value: `${hpBar(boss.currentHp, boss.maxHp)}\n**${boss.currentHp.toLocaleString()} / ${boss.maxHp.toLocaleString()}**`,
        inline: false,
      },
      {
        name: "⏰ เวลาที่เหลือ",
        value: timeLeft > 0 ? formatMs(timeLeft) : "กำลังหมดเวลา...",
        inline: true,
      },
      {
        name: "⚔️ ผู้เข้าร่วม",
        value: `${boss.damageLogs.size} คน`,
        inline: true,
      },
      {
        name: "🏆 อันดับดาเมจ",
        value: topDamagersText(boss.damageLogs, 3),
        inline: false,
      }
    )
    .setFooter({ text: "อัปเดตทุกๆ สักครู่ — พิมพ์ /attack เพื่อโจมตีต่อ!" })
    .setTimestamp();
}

// ─── Core: Spawn ─────────────────────────────────────────────

export async function spawnBoss(client: Client, guildId: string): Promise<void> {
  // Don't spawn if already active
  if (activeBosses.has(guildId)) return;

  const cfg = getWorldBossConfig(guildId);
  if (!cfg) return;

  const guild = client.guilds.cache.get(guildId);
  if (!guild) return;

  // Get game channel for the guild (reuse setgamechannel setting)
  const { getGameChannel } = await import("../data/store.js");
  const channelId = getGameChannel(guildId);
  if (!channelId) {
    console.warn(`[WorldBoss] guild ${guildId} has no game channel set`);
    return;
  }

  const channel = guild.channels.cache.get(channelId) as TextChannel | undefined;
  if (!channel) return;

  // Pick random boss
  const template = BOSS_POOL[Math.floor(Math.random() * BOSS_POOL.length)]!;
  const now = Date.now();
  const timeoutMs = cfg.timeoutMinutes * 60_000;

  const boss: ActiveBoss = {
    template,
    currentHp: template.maxHp,
    maxHp: template.maxHp,
    rewardSpore: template.rewardSpore,
    spawnedAt: now,
    expiresAt: now + timeoutMs,
    channelId,
    damageLogs: new Map(),
  };

  activeBosses.set(guildId, boss);

  // Send spawn embed
  try {
    const msg = await channel.send({
      content: "@here ⚠️ **บอสโลกปรากฏตัว!** ทุกคนรีบมาช่วยกัน!",
      embeds: [buildSpawnEmbed(boss)],
    });
    boss.panelMessageId = msg.id;
  } catch (e) {
    console.error("[WorldBoss] failed to send spawn message", e);
  }

  // Live panel update every N seconds
  const updateSec = cfg.liveUpdateSeconds * 1000;
  const liveInterval = setInterval(async () => {
    const b = activeBosses.get(guildId);
    if (!b) return;
    try {
      const ch = guild.channels.cache.get(b.channelId) as TextChannel | undefined;
      if (!ch || !b.panelMessageId) return;
      const msg = await ch.messages.fetch(b.panelMessageId).catch(() => null);
      if (msg) await msg.edit({ embeds: [buildLiveEmbed(b)] });
    } catch {}
  }, updateSec);
  liveIntervals.set(guildId, liveInterval);

  // Timeout: boss escapes
  const bossTimer = setTimeout(() => {
    handleTimeout(client, guildId).catch(console.error);
  }, timeoutMs);
  bossTimers.set(guildId, bossTimer);

  // Schedule next spawn
  scheduleNextSpawn(guildId, cfg.intervalDays, cfg.spawnHour, cfg.spawnMinute);
}

// ─── Core: Attack ─────────────────────────────────────────────

export function processBossAttack(
  guildId: string,
  userId: string,
  userLevel: number
): { hit: boolean; damage: number; remaining: number; dead: boolean } {
  const boss = activeBosses.get(guildId);
  if (!boss) return { hit: false, damage: 0, remaining: 0, dead: false };

  const maxDmg = 10 + 5 * (userLevel - 1);
  const dmg = Math.max(1, Math.floor(Math.random() * maxDmg) + 1);

  boss.currentHp = Math.max(0, boss.currentHp - dmg);
  boss.damageLogs.set(userId, (boss.damageLogs.get(userId) ?? 0) + dmg);

  return {
    hit: true,
    damage: dmg,
    remaining: boss.currentHp,
    dead: boss.currentHp <= 0,
  };
}

export function isBossActive(guildId: string): boolean {
  return activeBosses.has(guildId);
}

export function getBossSnapshot(guildId: string): ActiveBoss | undefined {
  return activeBosses.get(guildId);
}

// ─── Core: Victory ───────────────────────────────────────────

export async function handleVictory(client: Client, guildId: string): Promise<void> {
  const boss = activeBosses.get(guildId);
  if (!boss) return;

  clearInterval(liveIntervals.get(guildId));
  clearTimeout(bossTimers.get(guildId));
  liveIntervals.delete(guildId);
  bossTimers.delete(guildId);
  activeBosses.delete(guildId);

  const guild = client.guilds.cache.get(guildId);
  if (!guild) return;

  const channel = guild.channels.cache.get(boss.channelId) as TextChannel | undefined;
  if (!channel) return;

  // Calculate total damage done
  const totalDmg = [...boss.damageLogs.values()].reduce((a, b) => a + b, 0);
  const pool = boss.rewardSpore;

  // Sort participants by damage
  const sorted = [...boss.damageLogs.entries()].sort((a, b) => b[1] - a[1]);

  // Distribute rewards proportionally
  const rewards: Array<{ userId: string; damage: number; pct: number; earned: number }> = [];
  for (const [uid, dmg] of sorted) {
    const pct = totalDmg > 0 ? dmg / totalDmg : 0;
    const earned = Math.floor(pct * pool);
    if (earned > 0) {
      const player = getPlayer(uid);
      player.sporePoints += earned;
      savePlayer(player);
    }
    rewards.push({ userId: uid, damage: dmg, pct, earned });
  }

  // ── Item drop สำหรับ Top 3 ดาเมจ (2% ต่อคน) ─────────────────
  const itemDropResults: Array<{ userId: string; item: typeof ITEMS_POOL[number] }> = [];
  const top3 = rewards.slice(0, 3);
  for (const r of top3) {
    const dropped = rollBossItemDrop();
    if (dropped) {
      addItemToInventory(r.userId, dropped.id);
      itemDropResults.push({ userId: r.userId, item: dropped });
    }
  }

  // Build top 5 leaderboard
  const top5 = rewards.slice(0, 5);
  const medals = ["🥇", "🥈", "🥉", "4️⃣", "5️⃣"];
  const lbLines = top5.map((r, i) => {
    const drop = itemDropResults.find((d) => d.userId === r.userId);
    const dropTag = drop ? ` ✨ +${drop.item.emoji}${drop.item.name}` : "";
    return `${medals[i]} <@${r.userId}> — **${r.damage.toLocaleString()}** ดาเมจ (**${(r.pct * 100).toFixed(1)}%**) → **+${r.earned.toLocaleString()}** 🍄${dropTag}`;
  });

  const duration = Date.now() - boss.spawnedAt;

  // Build item drop summary field (only if someone got a drop)
  const dropSummaryLines = itemDropResults.map(
    (d) => `<@${d.userId}> ได้รับ ${d.item.emoji} **${d.item.name}**!`
  );

  const embed = new EmbedBuilder()
    .setTitle(`🎉 ${boss.template.emoji} ชัยชนะ! ${boss.template.name} ถูกกำจัดแล้ว!`)
    .setColor(0x57f287)
    .setDescription(
      `ผู้เล่น **${sorted.length} คน** ร่วมกันสู้ และปราบบอสสำเร็จใน **${formatMs(duration)}**!\n\n` +
      `💰 รางวัลรวม **${pool.toLocaleString()}** สปอร์ถูกแจกตามสัดส่วนดาเมจแล้ว\n` +
      `🎒 Top 3 ดาเมจมีโอกาส **2%** ดรอปไอเทมหายาก!`
    )
    .addFields(
      {
        name: "🏆 Top 5 ผู้ทำดาเมจสูงสุด",
        value: lbLines.length > 0 ? lbLines.join("\n") : "ไม่มีข้อมูล",
        inline: false,
      },
      ...(dropSummaryLines.length > 0
        ? [{
            name: "✨ ไอเทมดรอปจากบอส!",
            value: dropSummaryLines.join("\n"),
            inline: false,
          }]
        : []),
      {
        name: "📊 ดาเมจรวม",
        value: `**${totalDmg.toLocaleString()}** ดาเมจ`,
        inline: true,
      },
      {
        name: "👥 ผู้เข้าร่วม",
        value: `**${sorted.length}** คน`,
        inline: true,
      }
    )
    .setFooter({
      text: sorted.length > 5
        ? `ผู้เล่นอันดับ 6 ขึ้นไป: สปอร์โอนเข้าบัญชีแล้ว ใช้ /wallet เพื่อเช็คยอด`
        : "ขอบคุณทุกคนที่ร่วมสู้!",
    })
    .setTimestamp();

  await channel.send({ content: "🎊 @here", embeds: [embed] }).catch(console.error);
}

// ─── Core: Timeout ────────────────────────────────────────────

async function handleTimeout(client: Client, guildId: string): Promise<void> {
  const boss = activeBosses.get(guildId);
  if (!boss) return;

  clearInterval(liveIntervals.get(guildId));
  liveIntervals.delete(guildId);
  bossTimers.delete(guildId);
  activeBosses.delete(guildId);

  const guild = client.guilds.cache.get(guildId);
  if (!guild) return;
  const channel = guild.channels.cache.get(boss.channelId) as TextChannel | undefined;
  if (!channel) return;

  const hpLeft = boss.currentHp;
  const pct = (hpLeft / boss.maxHp) * 100;

  const embed = new EmbedBuilder()
    .setTitle(`💀 ${boss.template.emoji} ${boss.template.name} หลบหนีไปแล้ว!`)
    .setColor(0xed4245)
    .setDescription(
      `หมดเวลา! บอสหลบหนีไปพร้อมกับ **${pct.toFixed(1)}%** HP ที่เหลืออยู่\n\n` +
      `😢 **ไม่มีผู้เล่นคนใดได้รับรางวัลเลย** เตรียมตัวให้ดีสำหรับครั้งหน้า!`
    )
    .addFields(
      {
        name: "❤️ HP ที่เหลือตอนหนี",
        value: `${hpBar(hpLeft, boss.maxHp)}\n**${hpLeft.toLocaleString()} / ${boss.maxHp.toLocaleString()}**`,
        inline: false,
      },
      {
        name: "⚔️ ผู้เข้าร่วม",
        value: `${boss.damageLogs.size} คน (ไม่ได้รับรางวัล)`,
        inline: true,
      }
    )
    .setFooter({ text: "บอสจะกลับมาในรอบถัดไป!" })
    .setTimestamp();

  await channel.send({ embeds: [embed] }).catch(console.error);
}

// ─── Scheduler ────────────────────────────────────────────────

function scheduleNextSpawn(
  guildId: string,
  intervalDays: number,
  spawnHour: number,
  spawnMinute: number
): void {
  const cfg = getWorldBossConfig(guildId);
  if (!cfg) return;

  // Calculate next spawn time in Thai time (UTC+7)
  const now = new Date();
  const nextSpawn = new Date(now);

  // Set to today's spawn time in Thai time
  nextSpawn.setUTCHours(spawnHour - 7, spawnMinute, 0, 0);
  // If it's already past today's time, add intervalDays
  if (nextSpawn.getTime() <= now.getTime()) {
    nextSpawn.setDate(nextSpawn.getDate() + intervalDays);
  }

  cfg.nextSpawnAt = nextSpawn.getTime();
  setWorldBossConfig(guildId, cfg);
  console.log(`[WorldBoss] guild ${guildId} next boss spawn: ${nextSpawn.toISOString()}`);
}

export function initWorldBossScheduler(client: Client): void {
  // Check every 60 seconds if it's time to spawn
  setInterval(async () => {
    const now = Date.now();
    for (const [guildId] of client.guilds.cache) {
      const cfg = getWorldBossConfig(guildId);
      if (!cfg || !cfg.nextSpawnAt) continue;
      if (activeBosses.has(guildId)) continue; // boss already active
      if (now >= cfg.nextSpawnAt) {
        console.log(`[WorldBoss] spawning boss for guild ${guildId}`);
        await spawnBoss(client, guildId).catch((e) =>
          console.error(`[WorldBoss] spawn error for ${guildId}:`, e)
        );
      }
    }
  }, 60_000);

  console.log("👹 World Boss scheduler started");
}
