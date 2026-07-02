// ============================================================
// sporeCrashHandler.ts — Spore Crash Mini-game
// Single-player crash betting game.
// Flow: crash_bet button → modal → ephemeral live embed → cashout or crash
// ============================================================

import {
  ButtonInteraction,
  ModalSubmitInteraction,
  ModalBuilder,
  ActionRowBuilder,
  TextInputBuilder,
  TextInputStyle,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} from "discord.js";
import { getPlayer, savePlayer } from "../data/store.js";
import { logger } from "../../lib/logger.js";

const MIN_BET = 10;
const MAX_BET = 100_000;
/** อัตราเพิ่มตัวคูณต่อ tick (6% ต่อ 0.8 วินาที) */
const GROWTH_RATE = 1.06;
const TICK_MS = 800;

// ─── Crash Point Generator ────────────────────────────────────
// ใช้ Logarithmic Inverse-CDF ให้ตรงตารางความน่าจะเป็น:
//   P(survive x=1.50) ≈ 50%, x=2.00 ≈ 40%, x=5.00 ≈ 20%, x=10.00 ≈ 1-2%
function generateCrashPoint(): number {
  const u = Math.random();
  const raw = Math.exp((u - 0.3965) / 0.2555);
  return Math.max(1.01, parseFloat(raw.toFixed(2)));
}

/** คำนวณตัวคูณ ณ tick ที่ n */
function multiplierAt(tick: number): number {
  return parseFloat(Math.pow(GROWTH_RATE, tick).toFixed(2));
}

// ─── Active Game State ────────────────────────────────────────

interface CrashGame {
  userId: string;
  bet: number;
  crashPoint: number;
  currentMultiplier: number;
  tick: number;
  interval: NodeJS.Timeout;
  modalInteraction: ModalSubmitInteraction;
  gameOver: boolean;
}

const activeGames = new Map<string, CrashGame>(); // userId → game

// ─── Build Components ─────────────────────────────────────────

function buildCashOutRow(userId: string, multiplier: number, bet: number): ActionRowBuilder<ButtonBuilder> {
  const potential = Math.floor(bet * multiplier);
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`crash_cashout:${userId}`)
      .setLabel(`🛑 กดถอนเงินรางวัล  (ตอนนี้ได้ ~${potential.toLocaleString()} สปอร์)`)
      .setStyle(ButtonStyle.Danger)
  );
}

function buildLiveEmbed(game: CrashGame): EmbedBuilder {
  const potential = Math.floor(game.bet * game.currentMultiplier);
  const bar = "▓".repeat(Math.min(20, Math.floor(game.tick * 0.7))) + "░".repeat(Math.max(0, 20 - Math.floor(game.tick * 0.7)));
  return new EmbedBuilder()
    .setTitle("🚀 ยานสปอร์กำลังพุ่งทะยาน...")
    .setColor(0xffa500)
    .setDescription(
      `\`\`\`\n🚀  [ x${game.currentMultiplier.toFixed(2)} ]\n\`\`\`` +
      `${bar}`
    )
    .addFields(
      { name: "💰 เดิมพัน", value: `**${game.bet.toLocaleString()}** สปอร์`, inline: true },
      { name: "📈 ถ้าถอนตอนนี้", value: `**${potential.toLocaleString()}** สปอร์`, inline: true },
    )
    .setFooter({ text: "⚠️ กดถอนให้ทันก่อนยานระเบิด!" });
}

function buildWinEmbed(game: CrashGame, payout: number, cashOutAt: number): EmbedBuilder {
  const profit = payout - game.bet;
  return new EmbedBuilder()
    .setTitle("✅ ถอนเงินสำเร็จ! คุณรอดแล้ว 🎉")
    .setColor(0x57f287)
    .setDescription(
      `\`\`\`\n🏆  [ x${cashOutAt.toFixed(2)} ]\n\`\`\`` +
      `ยานระเบิดที่ **x${game.crashPoint.toFixed(2)}** — คุณถอนทันก่อนนั้น!`
    )
    .addFields(
      { name: "💰 เดิมพัน", value: `${game.bet.toLocaleString()} สปอร์`, inline: true },
      { name: "🏆 ได้รับ", value: `**+${profit.toLocaleString()}** สปอร์ (×${cashOutAt.toFixed(2)})`, inline: true },
      { name: "💼 รวมได้คืน", value: `${payout.toLocaleString()} สปอร์`, inline: true },
    )
    .setTimestamp();
}

function buildCrashEmbed(game: CrashGame): EmbedBuilder {
  return new EmbedBuilder()
    .setTitle("💥 ยานระเบิด! เสียเดิมพัน...")
    .setColor(0xed4245)
    .setDescription(
      `\`\`\`\n💥  [ x${game.crashPoint.toFixed(2)} ]\n\`\`\`` +
      `ยานสปอร์ระเบิดกลางชั้นบรรยากาศที่ **x${game.crashPoint.toFixed(2)}**\nนายกดถอนเงินไม่ทัน เสียเงินเดิมพันทั้งหมดในรอบนี้!`
    )
    .addFields(
      { name: "💸 เสียไป", value: `**${game.bet.toLocaleString()}** สปอร์`, inline: true },
      { name: "📈 ตัวคูณสุดท้าย", value: `x${game.currentMultiplier.toFixed(2)}`, inline: true },
    )
    .setFooter({ text: "กดปุ่มวางเดิมพันเพื่อลองใหม่อีกครั้ง" })
    .setTimestamp();
}

// ─── Handlers ─────────────────────────────────────────────────

/** ผู้เล่นกดปุ่ม "วางเดิมพัน" บนแผง → เปิด Modal */
export async function handleCrashBetButton(interaction: ButtonInteraction): Promise<void> {
  // ถ้ามีเกมที่กำลังเล่นอยู่แล้วห้ามเปิดใหม่
  if (activeGames.has(interaction.user.id)) {
    await interaction.reply({
      content: "⚠️ คุณมีเกมที่กำลังเล่นอยู่! กรุณาถอนเงินหรือรอให้เกมจบก่อน",
      ephemeral: true,
    });
    return;
  }

  const modal = new ModalBuilder()
    .setCustomId("crash_bet_modal")
    .setTitle("🚀 Spore Crash — วางเดิมพัน");

  const betInput = new TextInputBuilder()
    .setCustomId("crash_bet_amount")
    .setLabel(`จำนวนสปอร์ที่ต้องการเดิมพัน (${MIN_BET}–${MAX_BET.toLocaleString()})`)
    .setStyle(TextInputStyle.Short)
    .setPlaceholder("เช่น 500")
    .setMinLength(1)
    .setMaxLength(7)
    .setRequired(true);

  modal.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(betInput));
  await interaction.showModal(modal);
}

/** ผู้เล่นส่ง Modal → ตรวจสอบ, หักเงิน, เริ่มเกม */
export async function handleCrashBetModal(interaction: ModalSubmitInteraction): Promise<void> {
  await interaction.deferReply({ ephemeral: true });

  // ป้องกัน double-submit
  if (activeGames.has(interaction.user.id)) {
    await interaction.editReply("⚠️ คุณมีเกมที่กำลังเล่นอยู่แล้ว!");
    return;
  }

  const betStr = interaction.fields.getTextInputValue("crash_bet_amount").trim();
  const bet = parseInt(betStr, 10);

  if (isNaN(bet) || bet < MIN_BET || bet > MAX_BET) {
    await interaction.editReply(
      `❌ จำนวนเดิมพันไม่ถูกต้อง\nต้องเป็นตัวเลขระหว่าง **${MIN_BET}** – **${MAX_BET.toLocaleString()}** สปอร์`
    );
    return;
  }

  const player = getPlayer(interaction.user.id);
  if (player.sporePoints < bet) {
    await interaction.editReply(
      `❌ สปอร์ไม่พอ!\nคุณมี **${player.sporePoints.toLocaleString()}** สปอร์\nต้องการ **${bet.toLocaleString()}** สปอร์`
    );
    return;
  }

  // หักเงินเดิมพัน
  player.sporePoints -= bet;
  savePlayer(player);

  const crashPoint = generateCrashPoint();
  const userId = interaction.user.id;

  // สร้างสถานะเกมเบื้องต้น (interval จะถูก assign หลัง)
  const game: CrashGame = {
    userId,
    bet,
    crashPoint,
    currentMultiplier: 1.00,
    tick: 0,
    interval: null as unknown as NodeJS.Timeout,
    modalInteraction: interaction,
    gameOver: false,
  };

  // แสดง embed เริ่มต้น
  await interaction.editReply({
    embeds: [buildLiveEmbed(game)],
    components: [buildCashOutRow(userId, 1.00, bet)],
  });

  // เริ่ม Live Loop
  const interval = setInterval(async () => {
    if (game.gameOver) return;

    game.tick++;
    game.currentMultiplier = multiplierAt(game.tick);

    // ถึงจุดระเบิด
    if (game.currentMultiplier >= game.crashPoint) {
      game.gameOver = true;
      clearInterval(game.interval);
      activeGames.delete(userId);

      const disabledRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId(`crash_cashout:${userId}`)
          .setLabel(`💥 ระเบิดที่ x${game.crashPoint.toFixed(2)}`)
          .setStyle(ButtonStyle.Danger)
          .setDisabled(true)
      );

      await interaction.editReply({
        embeds: [buildCrashEmbed(game)],
        components: [disabledRow],
      }).catch((err) => logger.error({ err }, "[SporeCrash] ไม่สามารถ edit crash embed"));
      return;
    }

    // อัปเดต embed ปกติ
    await interaction.editReply({
      embeds: [buildLiveEmbed(game)],
      components: [buildCashOutRow(userId, game.currentMultiplier, bet)],
    }).catch((err) => logger.error({ err }, "[SporeCrash] ไม่สามารถ edit live embed"));
  }, TICK_MS);

  game.interval = interval;
  activeGames.set(userId, game);
}

/** ผู้เล่นกดปุ่ม "กดถอนเงินรางวัล" */
export async function handleCrashCashOut(interaction: ButtonInteraction): Promise<void> {
  const userId = interaction.customId.split(":")[1];

  // ป้องกันคนอื่นกดปุ่ม
  if (interaction.user.id !== userId) {
    await interaction.reply({ content: "❌ นี่ไม่ใช่เกมของคุณ!", ephemeral: true });
    return;
  }

  const game = activeGames.get(userId);
  if (!game || game.gameOver) {
    // เกมจบไปแล้ว (ระเบิดก่อนกด)
    await interaction.deferUpdate().catch(() => null);
    return;
  }

  // หยุดเกมทันที (ต้อง set gameOver ก่อน clearInterval เสมอ)
  const cashOutMultiplier = game.currentMultiplier;
  game.gameOver = true;
  clearInterval(game.interval);
  activeGames.delete(userId);

  // จ่ายรางวัล
  const payout = Math.floor(game.bet * cashOutMultiplier);
  const player = getPlayer(userId);
  player.sporePoints += payout;
  savePlayer(player);

  const disabledRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`crash_cashout:${userId}`)
      .setLabel(`✅ ถอนที่ x${cashOutMultiplier.toFixed(2)} — ได้ ${payout.toLocaleString()} สปอร์`)
      .setStyle(ButtonStyle.Success)
      .setDisabled(true)
  );

  await interaction.update({
    embeds: [buildWinEmbed(game, payout, cashOutMultiplier)],
    components: [disabledRow],
  });
}
