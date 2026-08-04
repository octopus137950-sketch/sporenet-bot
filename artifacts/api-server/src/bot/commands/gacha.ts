import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  TextChannel,
  SlashCommandBuilder,
} from "discord.js";
import {
  getGameChannel,
  getPlayer,
  savePlayer,
} from "../data/store.js";
import { requireGameChannel } from "../utils/channelGuard.js";
import { getThaiDateString, msUntilMidnightThai } from "../utils/thaiTime.js";

type GachaTier = {
  level: number;
  emoji: string;
  name: string;
  sporeMin: number;
  sporeMax: number;
  expMin: number;
  expMax: number;
};

type LuckResult = {
  emoji: string;
  name: string;
  description: string;
  minPercent: number;
  maxPercent: number;
  critical: boolean;
};

const GACHA_TIERS: GachaTier[] = [
  { level: 2, emoji: "🥉", name: "Wooden Box", sporeMin: 300, sporeMax: 800, expMin: 10, expMax: 25 },
  { level: 10, emoji: "🥈", name: "Iron Box", sporeMin: 1_000, sporeMax: 2_500, expMin: 30, expMax: 80 },
  { level: 20, emoji: "🥇", name: "Gold Box", sporeMin: 3_000, sporeMax: 7_500, expMin: 100, expMax: 250 },
  { level: 30, emoji: "💎", name: "Diamond Box", sporeMin: 8_000, sporeMax: 20_000, expMin: 250, expMax: 600 },
  { level: 40, emoji: "👑", name: "Crown Box", sporeMin: 20_000, sporeMax: 50_000, expMin: 600, expMax: 1_500 },
  { level: 50, emoji: "🔮", name: "Rune Box", sporeMin: 50_000, sporeMax: 120_000, expMin: 1_500, expMax: 3_500 },
  { level: 60, emoji: "⚡", name: "Mythic Box", sporeMin: 120_000, sporeMax: 300_000, expMin: 3_500, expMax: 8_000 },
  { level: 70, emoji: "🌌", name: "Celestial Box", sporeMin: 300_000, sporeMax: 750_000, expMin: 8_000, expMax: 18_000 },
  { level: 80, emoji: "🐲", name: "Ancient Box", sporeMin: 750_000, sporeMax: 1_800_000, expMin: 18_000, expMax: 40_000 },
  { level: 90, emoji: "🌠", name: "Cosmic Box", sporeMin: 1_800_000, sporeMax: 4_000_000, expMin: 40_000, expMax: 90_000 },
  { level: 100, emoji: "🌌", name: "Godlike Box", sporeMin: 4_000_000, sporeMax: 10_000_000, expMin: 100_000, expMax: 250_000 },
];

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getTier(level: number): GachaTier {
  const cappedLevel = Math.min(level, 100);
  return GACHA_TIERS.filter((tier) => tier.level <= cappedLevel).at(-1)!;
}

function getNextTier(level: number): GachaTier | undefined {
  return GACHA_TIERS.find((tier) => tier.level > level && tier.level <= 100);
}

function rollLuck(): LuckResult {
  const roll = Math.random();
  if (roll < 0.6) {
    return {
      emoji: "🟢",
      name: "Normal",
      description: "โชคปกติ",
      minPercent: 0.3,
      maxPercent: 0.6,
      critical: false,
    };
  }
  if (roll < 0.9) {
    return {
      emoji: "🔵",
      name: "Great",
      description: "โชคดีมาก",
      minPercent: 0.6,
      maxPercent: 0.9,
      critical: false,
    };
  }
  return {
    emoji: "🔴",
    name: "CRITICAL JACKPOT!",
    description: "ดวงมหาเฮง รับรางวัลสูงสุดของกล่อง!",
    minPercent: 1,
    maxPercent: 1,
    critical: true,
  };
}

function rollReward(min: number, max: number, luck: LuckResult): number {
  if (luck.critical) return max;
  const rangeMin = Math.ceil(min + (max - min) * luck.minPercent);
  const rangeMax = Math.floor(min + (max - min) * luck.maxPercent);
  return randomInt(rangeMin, Math.max(rangeMin, rangeMax));
}

function formatUntilReset(): string {
  const msLeft = msUntilMidnightThai();
  const hours = Math.floor(msLeft / 3_600_000);
  const minutes = Math.floor((msLeft % 3_600_000) / 60_000);
  return `${hours} ชม. ${minutes} นาที`;
}

export const data = new SlashCommandBuilder()
  .setName("gacha")
  .setDescription("🎁 เปิดกล่องกาชาประจำวันตามเลเวลของคุณ");

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!(await requireGameChannel(interaction))) return;
  await interaction.deferReply({ ephemeral: true });

  const player = getPlayer(interaction.user.id);
  if (player.farmLevel < 2) {
    const embed = new EmbedBuilder()
      .setTitle("🔒 กาชายังไม่ปลดล็อก")
      .setDescription(
        "คุณต้องมี **Level 2** ขึ้นไปก่อนถึงจะเริ่มสุ่มกาชาประจำวันได้!\n" +
        "ให้ไปใช้คำสั่ง `/farm` หรือร่วมกิจกรรมในเซิร์ฟเพื่ออัปเลเวลก่อนนะ!",
      )
      .setColor(0xed4245)
      .addFields({ name: "⭐ เลเวลปัจจุบัน", value: `**Lv.${player.farmLevel}**`, inline: true })
      .setTimestamp();
    await interaction.editReply({ embeds: [embed] });
    return;
  }

  const today = getThaiDateString();
  if (player.lastGachaTime && getThaiDateString(player.lastGachaTime) === today) {
    const embed = new EmbedBuilder()
      .setTitle("⏳ เปิดกาชาวันนี้ไปแล้ว")
      .setDescription(`กลับมาเปิดกล่องใหม่ได้ในอีก **${formatUntilReset()}** (เที่ยงคืนไทย)`)
      .setColor(0xff9900)
      .setTimestamp();
    await interaction.editReply({ embeds: [embed] });
    return;
  }

  const tier = getTier(player.farmLevel);
  const luck = rollLuck();
  const sporeReward = rollReward(tier.sporeMin, tier.sporeMax, luck);
  const expReward = rollReward(tier.expMin, tier.expMax, luck);

  player.sporePoints += sporeReward;
  player.farmExp += expReward;
  player.lastGachaTime = Date.now();

  let levelUps = 0;
  while (player.farmExp >= player.farmLevel * 100) {
    player.farmExp -= player.farmLevel * 100;
    player.farmLevel += 1;
    levelUps += 1;
  }
  savePlayer(player);

  const nextTier = getNextTier(player.farmLevel);
  const progressText = nextTier
    ? `อีก **${Math.max(0, nextTier.level - player.farmLevel)} เลเวล** จะปลดล็อก ${nextTier.emoji} **${nextTier.name}**`
    : "คุณปลดล็อกกล่องระดับสูงสุดแล้ว!";
  const levelUpText = levelUps > 0
    ? `\n🎊 เลเวลอัป **+${levelUps}** ครั้ง! ตอนนี้อยู่ที่ **Lv.${player.farmLevel}**`
    : "";

  const embed = new EmbedBuilder()
    .setTitle(`${luck.critical ? "🔴 CRITICAL JACKPOT!" : "🎁 เปิดกาชาสำเร็จ!"}`)
    .setDescription(
      `${interaction.user} เปิด **${tier.emoji} ${tier.name}** แล้ว!\n` +
      `${luck.emoji} **${luck.name}** — ${luck.description}${levelUpText}`,
    )
    .setColor(luck.critical ? 0xff1f3d : luck.name === "Great" ? 0x3498db : 0x57f287)
    .setThumbnail(interaction.user.displayAvatarURL())
    .addFields(
      { name: "🍄 สปอร์ที่ได้รับ", value: `**+${sporeReward.toLocaleString()}**`, inline: true },
      { name: "⭐ EXP ที่ได้รับ", value: `**+${expReward.toLocaleString()}**`, inline: true },
      { name: "📦 กล่องที่เปิด", value: `${tier.emoji} ${tier.name} (ปลดล็อก Lv.${tier.level})`, inline: false },
      { name: "📈 ความก้าวหน้า", value: progressText, inline: false },
      { name: "⏳ กาชาครั้งถัดไป", value: "หลังเที่ยงคืนไทย", inline: true },
    )
    .setFooter({ text: `สปอร์รวม ${player.sporePoints.toLocaleString()} • Lv.${player.farmLevel}` })
    .setTimestamp();

  await interaction.editReply({ embeds: [embed] });

  if (luck.critical && interaction.guild) {
    const gameChannelId = getGameChannel(interaction.guild.id);
    if (gameChannelId) {
      const channel = await interaction.guild.channels.fetch(gameChannelId).catch(() => null);
      if (channel && channel instanceof TextChannel) {
        await channel.send({
          content: `🎉 ขอแสดงความยินดีกับ <@${interaction.user.id}> ที่เปิดได้ **CRITICAL JACKPOT!**`,
          embeds: [embed],
        }).catch(() => undefined);
      }
    }
  }
}