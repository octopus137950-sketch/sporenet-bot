import {
  Client,
  EmbedBuilder,
  Guild,
  Role,
  TextChannel,
} from "discord.js";
import {
  getGameChannel,
  getPlayer,
  getWorldMushroom,
  savePlayer,
  saveWorldMushroom,
} from "../data/store.js";
import {
  formatWorldMushroomReset,
  reduceWorldMushroomLevel,
  WORLD_MUSHROOM_SEASON_MS,
} from "../utils/worldMushroom.js";

const PEST_WINDOW_MS = 60_000;
const HIGH_LORD_ROLE_NAME = "👑 High Lord of Mushroom";

let schedulerStarted = false;

async function getGameTextChannel(guild: Guild): Promise<TextChannel | null> {
  const channelId = getGameChannel(guild.id);
  if (!channelId) return null;
  const channel = await guild.channels.fetch(channelId).catch(() => null);
  return channel instanceof TextChannel ? channel : null;
}

async function announcePest(client: Client, guild: Guild): Promise<void> {
  const channel = await getGameTextChannel(guild);
  if (!channel) return;
  const state = getWorldMushroom(guild.id);
  await channel.send({
    content: "@here",
    embeds: [
      new EmbedBuilder()
        .setTitle("⚠️ ศัตรูพืชบุกกัดกินเห็ดโลก!")
        .setColor(0xed4245)
        .setDescription(
          "ต้องการการปกป้องด่วน! ทุกคนมีเวลา **1 นาที**\n" +
          "ใช้คำสั่ง `/protect` เพื่อขับไล่ศัตรูพืช\n\n" +
          `หากไม่มีใครช่วย เห็ดโลกจะถูกลดเลเวลลง 1 ระดับ! (ปัจจุบัน Lv.${state.level})`,
        )
        .setTimestamp(),
    ],
  }).catch(() => undefined);
}

async function resolvePest(client: Client, guildId: string): Promise<void> {
  const state = getWorldMushroom(guildId);
  const pest = state.activePest;
  if (!pest || pest.expiresAt > Date.now()) return;

  const guild = client.guilds.cache.get(guildId);
  if (!guild) return;

  if (pest.protectedBy) {
    delete state.activePest;
    saveWorldMushroom(guildId, state);
    return;
  }

  const previousLevel = state.level;
  reduceWorldMushroomLevel(guildId);
  const nextState = getWorldMushroom(guildId);
  delete nextState.activePest;
  saveWorldMushroom(guildId, nextState);

  const channel = await getGameTextChannel(guild);
  await channel?.send({
    embeds: [
      new EmbedBuilder()
        .setTitle("🐛 ศัตรูพืชกัดกินเห็ดโลกสำเร็จ!")
        .setColor(0xed4245)
        .setDescription(
          `ไม่มีใครใช้ \`/protect\` ทันเวลา เห็ดโลกลดจาก **Lv.${previousLevel}** ` +
          `เหลือ **Lv.${nextState.level}**`,
        )
        .setTimestamp(),
    ],
  }).catch(() => undefined);
}

export async function triggerPest(
  client: Client,
  guildId: string,
): Promise<"started" | "active" | "no-channel"> {
  const guild = client.guilds.cache.get(guildId);
  if (!guild) return "no-channel";

  let state = getWorldMushroom(guild.id);
  if (state.activePest) {
    if (state.activePest.expiresAt > Date.now()) return "active";
    await resolvePest(client, guild.id);
    state = getWorldMushroom(guild.id);
  }
  if (!await getGameTextChannel(guild)) return "no-channel";

  const now = Date.now();
  state.lastPestAt = now;
  state.activePest = { startedAt: now, expiresAt: now + PEST_WINDOW_MS };
  saveWorldMushroom(guild.id, state);
  await announcePest(client, guild);
  return "started";
}

async function grantSeasonRole(guild: Guild): Promise<Role | null> {
  const existing = guild.roles.cache.find((role) => role.name === HIGH_LORD_ROLE_NAME);
  if (existing) return existing;

  return guild.roles.create({
    name: HIGH_LORD_ROLE_NAME,
    color: 0xffd700,
    permissions: [],
    mentionable: false,
    reason: "World Mushroom seasonal top 3 reward",
  }).catch(() => null);
}

async function resetSeason(client: Client, guild: Guild): Promise<void> {
  const state = getWorldMushroom(guild.id);
  if (state.nextResetAt > Date.now()) return;

  const topContributors = Object.entries(state.contributors)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([userId, donatedSpores]) => ({ userId, donatedSpores }));
  const endedAt = Date.now();
  const completedSeason = state.seasonNumber;

  const nextState = {
    level: 1,
    exp: 0,
    seasonNumber: completedSeason + 1,
    seasonStartedAt: endedAt,
    nextResetAt: endedAt + WORLD_MUSHROOM_SEASON_MS,
    contributors: {},
    lastPestAt: 0,
    lastSeasonResult: {
      seasonNumber: completedSeason,
      endedAt,
      topContributors,
    },
  };
  saveWorldMushroom(guild.id, nextState);

  const role = await grantSeasonRole(guild);
  const rewardLines: string[] = [];
  for (const [index, contributor] of topContributors.entries()) {
    const member = await guild.members.fetch(contributor.userId).catch(() => null);
    if (role && member) await member.roles.add(role).catch(() => undefined);
    const player = getPlayer(contributor.userId);
    player.sporePoints += 10_000;
    savePlayer(player);
    rewardLines.push(
      `${index + 1}. <@${contributor.userId}> — **${contributor.donatedSpores.toLocaleString()}** บริจาค ` +
      `• +10,000 สปอร์${member ? "" : " (สมาชิกออฟไลน์)"}`,
    );
  }

  const channel = await getGameTextChannel(guild);
  await channel?.send({
    embeds: [
      new EmbedBuilder()
        .setTitle(`🏆 จบซีซันเห็ดโลกที่ ${completedSeason}!`)
        .setColor(0xffd700)
        .setDescription(
          "ขอแสดงความยินดีกับผู้เพาะเลี้ยงเห็ดโลก Top 3!\n" +
          (rewardLines.length > 0 ? rewardLines.join("\n") : "ซีซันนี้ยังไม่มีผู้บริจาค") +
          "\n\nเห็ดโลกถูกรีเซ็ตกลับสู่ **Lv.1** แล้ว ซีซันใหม่เริ่มต้นขึ้น!",
        )
        .addFields({
          name: "👑 รางวัลพิเศษ",
          value: role
            ? `Top 3 ได้รับยศ **${HIGH_LORD_ROLE_NAME}** และ +10,000 สปอร์`
            : "ไม่สามารถสร้าง/มอบยศได้ โปรดตรวจสอบสิทธิ์ของบอท",
        })
        .setFooter({ text: `ซีซันใหม่รีเซ็ตอีก ${formatWorldMushroomReset(nextState.nextResetAt)}` })
        .setTimestamp(),
    ],
  }).catch(() => undefined);
}

async function processGuild(client: Client, guild: Guild): Promise<void> {
  const state = getWorldMushroom(guild.id);
  if (state.activePest && state.activePest.expiresAt <= Date.now()) {
    await resolvePest(client, guild.id);
  }
  await resetSeason(client, guild);
}

export function startWorldMushroomScheduler(client: Client): void {
  if (schedulerStarted) return;
  schedulerStarted = true;
  setInterval(() => {
    for (const guild of client.guilds.cache.values()) {
      void processGuild(client, guild).catch((error) =>
        console.error(`[WorldMushroom] scheduler error for ${guild.id}:`, error),
      );
    }
  }, 60_000);
  console.log("🍄 World Mushroom scheduler started");
}