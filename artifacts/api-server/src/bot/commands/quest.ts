// ============================================================
// quest.ts — /quest view  |  /quest claim
// ============================================================

import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
} from "discord.js";
import { getPlayer, savePlayer } from "../data/store.js";
import { requireGameChannel } from "../utils/channelGuard.js";
import { getQuestById, DIFFICULTY_EMOJI, DIFFICULTY_LABEL } from "../data/questPool.js";
import { ensureQuestData, incrementQuestProgress } from "../events/questTracker.js";
import { getThaiDateString, msUntilMidnightThai } from "../utils/thaiTime.js";

export const data = new SlashCommandBuilder()
  .setName("quest")
  .setDescription("📋 ดูและรับรางวัลภารกิจประจำวัน")
  .addSubcommand((sub) =>
    sub
      .setName("view")
      .setDescription("📋 ดูภารกิจประจำวันของคุณ พร้อม Progress Bar")
  )
  .addSubcommand((sub) =>
    sub
      .setName("claim")
      .setDescription("🎁 กดรับรางวัลสปอร์จากภารกิจที่สำเร็จแล้ว")
  );

// ── Progress bar helper ──────────────────────────────────────

function progressBar(progress: number, target: number, length = 10): string {
  const pct = Math.min(progress / target, 1);
  const filled = Math.round(pct * length);
  return "█".repeat(filled) + "░".repeat(Math.max(0, length - filled));
}

// ── /quest view ──────────────────────────────────────────────

async function handleView(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!(await requireGameChannel(interaction))) return;
  await interaction.deferReply();

  const userId = interaction.user.id;
  const today = getThaiDateString();
  const data = ensureQuestData(userId, today);

  const msLeft = msUntilMidnightThai();
  const hLeft = Math.floor(msLeft / 3_600_000);
  const mLeft = Math.floor((msLeft % 3_600_000) / 60_000);

  const completedCount = data.quests.filter((q) => q.completed).length;
  const allClaimed = data.quests.every((q) => q.claimed);

  // Build quest field text
  const questFields = data.quests.map((entry, idx) => {
    const def = getQuestById(entry.questId);
    if (!def) return { name: `❓ เควสที่ ${idx + 1}`, value: "ข้อมูลไม่พบ", inline: false };

    const pct = Math.min(Math.floor((entry.progress / def.target) * 100), 100);
    const bar = progressBar(entry.progress, def.target);

    let statusLine = "";
    if (entry.claimed) {
      statusLine = "✅ **รับรางวัลแล้ว**";
    } else if (entry.completed) {
      statusLine = "🎁 **สำเร็จ!** พิมพ์ `/quest claim` เพื่อรับรางวัล";
    } else {
      statusLine = `${bar} **${entry.progress}/${def.target} ${def.unit}** (${pct}%)`;
    }

    const diffLabel = `${DIFFICULTY_EMOJI[def.difficulty]} ${DIFFICULTY_LABEL[def.difficulty]}`;

    return {
      name: `${def.emoji} ภารกิจที่ ${idx + 1} — ${def.description}`,
      value: `ความยาก: ${diffLabel} | รางวัล: **${def.reward.toLocaleString()} สปอร์**\n${statusLine}`,
      inline: false,
    };
  });

  // Overall status
  let headerColor: number;
  let headerTitle: string;
  if (allClaimed && data.quests.length > 0) {
    headerColor = 0xffd700;
    headerTitle = "👑 ทำภารกิจครบทุกข้อวันนี้แล้ว!";
  } else if (completedCount > 0) {
    headerColor = 0x57f287;
    headerTitle = `📋 ภารกิจประจำวัน — สำเร็จแล้ว ${completedCount}/${data.quests.length} ข้อ`;
  } else {
    headerColor = 0x5865f2;
    headerTitle = "📋 ภารกิจประจำวัน";
  }

  const embed = new EmbedBuilder()
    .setTitle(headerTitle)
    .setDescription(
      `สปอร์รวมถ้าทำครบ: **${data.quests
        .reduce((sum, q) => {
          const def = getQuestById(q.questId);
          return sum + (def?.reward ?? 0);
        }, 0)
        .toLocaleString()} สปอร์**\n` +
        `⏰ รีเซ็ตภารกิจใหม่ใน **${hLeft} ชม. ${mLeft} นาที** (เที่ยงคืนไทย)`
    )
    .setColor(headerColor)
    .setThumbnail(interaction.user.displayAvatarURL())
    .addFields(questFields)
    .setFooter({ text: "ภารกิจจะถูกสุ่มใหม่ทุกเที่ยงคืน (เวลาไทย)" })
    .setTimestamp();

  await interaction.editReply({ embeds: [embed] });
}

// ── /quest claim ─────────────────────────────────────────────

async function handleClaim(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!(await requireGameChannel(interaction))) return;
  await interaction.deferReply();

  const userId = interaction.user.id;
  const today = getThaiDateString();
  const questData = ensureQuestData(userId, today);

  const claimable = questData.quests.filter((q) => q.completed && !q.claimed);

  if (claimable.length === 0) {
    const hasCompleted = questData.quests.some((q) => q.completed);
    const embed = new EmbedBuilder()
      .setTitle(hasCompleted ? "✅ รับรางวัลไปแล้วทุกข้อแล้ว!" : "❌ ยังไม่มีภารกิจสำเร็จ")
      .setDescription(
        hasCompleted
          ? "ท่านได้รับรางวัลจากภารกิจทั้งหมดแล้ว รอสุ่มใหม่เที่ยงคืนนี้!"
          : "ทำภารกิจให้ครบก่อนนะ ดูรายละเอียดด้วย `/quest view`"
      )
      .setColor(0xff9900)
      .setThumbnail(interaction.user.displayAvatarURL())
      .setTimestamp();
    await interaction.editReply({ embeds: [embed] });
    return;
  }

  // Calculate total reward
  let totalReward = 0;
  const rewardLines: string[] = [];

  for (const entry of claimable) {
    const def = getQuestById(entry.questId);
    if (!def) continue;
    totalReward += def.reward;
    const diffLabel = `${DIFFICULTY_EMOJI[def.difficulty]} ${DIFFICULTY_LABEL[def.difficulty]}`;
    rewardLines.push(`${def.emoji} **${def.description}** (${diffLabel}) → **+${def.reward.toLocaleString()} สปอร์**`);
    entry.claimed = true;
  }

  // Give spore to player
  const player = getPlayer(userId);
  player.sporePoints += totalReward;
  savePlayer(player);

  // Save updated quest data
  const { savePlayerQuestData } = await import("../data/store.js");
  savePlayerQuestData(questData);

  const allDone = questData.quests.every((q) => q.claimed);

  const embed = new EmbedBuilder()
    .setTitle("🎉 รับรางวัลสำเร็จ!")
    .setDescription(
      `${interaction.user} ได้รับรางวัลจาก **${claimable.length} ภารกิจ**!\n\n` +
        rewardLines.join("\n") +
        `\n\n💰 รวมทั้งหมด: **+${totalReward.toLocaleString()} สปอร์**` +
        (allDone ? "\n\n👑 **ทำภารกิจครบทุกข้อวันนี้แล้ว! ยอดเยี่ยม!**" : "")
    )
    .setColor(allDone ? 0xffd700 : 0x57f287)
    .setThumbnail(interaction.user.displayAvatarURL())
    .addFields(
      {
        name: "🍄 สปอร์รวม",
        value: `**${player.sporePoints.toLocaleString()}** แต้ม`,
        inline: true,
      },
      {
        name: "🎁 ภารกิจที่รับแล้ว",
        value: `**${questData.quests.filter((q) => q.claimed).length}/${questData.quests.length}** ข้อ`,
        inline: true,
      }
    )
    .setFooter({ text: "ภารกิจรีเซ็ตทุกเที่ยงคืน (เวลาไทย)" })
    .setTimestamp();

  await interaction.editReply({ embeds: [embed] });
}

// ── Main execute ─────────────────────────────────────────────

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  const sub = interaction.options.getSubcommand(true);
  if (sub === "claim") {
    await handleClaim(interaction);
  } else {
    await handleView(interaction);
  }
}
