import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
} from "discord.js";
import { getPlayer, savePlayer } from "../data/store.js";
import { requireGameChannel } from "../utils/channelGuard.js";

export const data = new SlashCommandBuilder()
  .setName("daily")
  .setDescription("📅 เช็คอินรายวันรับสปอร์! สะสมสตรีคยิ่งได้มาก");

const THAI_OFFSET_MS = 7 * 60 * 60 * 1000;

function getThaiDay(ts: number): string {
  const d = new Date(ts + THAI_OFFSET_MS);
  return `${d.getUTCFullYear()}-${d.getUTCMonth()}-${d.getUTCDate()}`;
}

function getDailyReward(streak: number): number {
  return streak * 25;
}

function msUntilMidnightThai(): number {
  const now = Date.now();
  const thaiNow = now + THAI_OFFSET_MS;
  const d = new Date(thaiNow);
  const nextMidnight = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1);
  return nextMidnight - thaiNow;
}

function streakBar(streak: number): string {
  const milestones = [1, 2, 3, 7, 14, 30];
  const next = milestones.find((m) => m > streak) ?? streak + 1;
  const prev = milestones.filter((m) => m <= streak).pop() ?? 0;
  const length = 10;
  const filled = Math.round(((streak - prev) / (next - prev)) * length);
  return "█".repeat(Math.max(0, filled)) + "░".repeat(Math.max(0, length - filled));
}

function nextMilestone(streak: number): number {
  const milestones = [7, 14, 30, 60, 100];
  return milestones.find((m) => m > streak) ?? streak + 1;
}

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!(await requireGameChannel(interaction))) return;
  await interaction.deferReply();

  const userId = interaction.user.id;
  const player = getPlayer(userId);
  const now = Date.now();

  const todayStr = getThaiDay(now);
  const lastDayStr = player.lastDailyTime ? getThaiDay(player.lastDailyTime) : null;

  if (lastDayStr === todayStr) {
    const msLeft = msUntilMidnightThai();
    const hLeft = Math.floor(msLeft / 3_600_000);
    const mLeft = Math.floor((msLeft % 3_600_000) / 60_000);

    const embed = new EmbedBuilder()
      .setTitle("⏳ เช็คอินแล้ววันนี้!")
      .setDescription(
        `ท่านเช็คอินวันนี้ไปแล้ว\nรีเซ็ตอีก **${hLeft} ชม. ${mLeft} นาที** (เที่ยงคืนไทย)`
      )
      .setColor(0xff9900)
      .addFields(
        { name: "🔥 สตรีคปัจจุบัน", value: `**${player.dailyStreak} วัน**`, inline: true },
        { name: "🍄 สปอร์สะสม", value: `**${player.sporePoints.toLocaleString()}**`, inline: true }
      )
      .setThumbnail(interaction.user.displayAvatarURL())
      .setTimestamp();
    await interaction.editReply({ embeds: [embed] });
    return;
  }

  const yesterday = getThaiDay(now - 86_400_000);
  if (lastDayStr && lastDayStr !== yesterday) {
    player.dailyStreak = 0;
  }

  player.dailyStreak += 1;
  const reward = getDailyReward(player.dailyStreak);
  player.sporePoints += reward;
  player.lastDailyTime = now;
  savePlayer(player);

  const streak = player.dailyStreak;
  const isStreak = streak > 1;
  const next = nextMilestone(streak);
  const daysToNext = next - streak;

  const embed = new EmbedBuilder()
    .setTitle(streak === 1 ? "📅 เช็คอินสำเร็จ!" : `🔥 สตรีค ${streak} วัน!`)
    .setDescription(
      `${interaction.user} ได้รับ **+${reward} สปอร์** จากการเช็คอิน!\n` +
        (isStreak
          ? `เยี่ยม! สตรีคต่อเนื่อง **${streak} วัน** แล้ว 🔥`
          : `เริ่มสตรีคใหม่แล้ว! รักษาไว้นะ 💪`)
    )
    .setColor(streak >= 30 ? 0xffd700 : streak >= 7 ? 0xff7c00 : 0x57f287)
    .setThumbnail(interaction.user.displayAvatarURL())
    .addFields(
      { name: "🍄 สปอร์ที่ได้", value: `**+${reward}**`, inline: true },
      { name: "💰 สปอร์ทั้งหมด", value: `**${player.sporePoints.toLocaleString()}**`, inline: true },
      { name: "🔥 สตรีค", value: `**${streak} วัน**`, inline: true },
      {
        name: `📊 ถึงไมล์สโตน ${next} วัน (อีก ${daysToNext} วัน)`,
        value: `${streakBar(streak)} +${getDailyReward(next)} สปอร์/วัน`,
      }
    )
    .addFields({
      name: "📋 ตารางรางวัลสตรีค",
      value:
        [
          [1, 25], [2, 50], [3, 75], [7, 175], [14, 350], [30, 750],
        ]
          .map(([d, s]) => {
            const icon = streak >= d ? "✅" : streak === d - 1 ? "⏭️" : "🔒";
            return `${icon} วันที่ ${d}: **+${s}** สปอร์`;
          })
          .join("\n"),
    })
    .setFooter({ text: "รีเซ็ตทุกเที่ยงคืน (เวลาไทย) • ขาดแม้วันเดียว สตรีคเริ่มใหม่!" })
    .setTimestamp();

  await interaction.editReply({ embeds: [embed] });
}
