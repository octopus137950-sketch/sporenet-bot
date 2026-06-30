import {
  ButtonInteraction,
  ModalSubmitInteraction,
  ModalBuilder,
  ActionRowBuilder,
  TextInputBuilder,
  TextInputStyle,
  EmbedBuilder,
} from "discord.js";
import { getPlayer, savePlayer } from "../data/store.js";

const MIN_BET = 10;
const MAX_BET = 50_000;

const SYMBOLS = [
  { emoji: "💎", weight: 3 },
  { emoji: "👑", weight: 6 },
  { emoji: "🍄", weight: 10 },
  { emoji: "⭐", weight: 14 },
  { emoji: "🔮", weight: 18 },
  { emoji: "🍀", weight: 22 },
  { emoji: "🍋", weight: 27 },
];

function rollSymbol(): string {
  const total = SYMBOLS.reduce((s, sym) => s + sym.weight, 0);
  let roll = Math.random() * total;
  for (const sym of SYMBOLS) {
    roll -= sym.weight;
    if (roll <= 0) return sym.emoji;
  }
  return SYMBOLS[SYMBOLS.length - 1]!.emoji;
}

interface PayoutResult {
  multiplier: number;
  label: string;
  color: number;
  isWin: boolean;
}

function calcPayout(reels: [string, string, string], bet: number): PayoutResult {
  const [a, b, c] = reels;

  if (a === b && b === c) {
    const map: Record<string, PayoutResult> = {
      "💎": { multiplier: 25, label: "💎 MEGA JACKPOT!! 💎", color: 0xffd700, isWin: true },
      "👑": { multiplier: 15, label: "👑 แจ็คพอต! 👑", color: 0xffa500, isWin: true },
      "🍄": { multiplier: 12, label: "🍄 สามเห็ดมงคล! ปังมาก!", color: 0x9b59b6, isWin: true },
      "⭐": { multiplier: 8, label: "⭐ สามดาวส่องฟ้า!", color: 0xf1c40f, isWin: true },
      "🔮": { multiplier: 6, label: "🔮 สามคริสตัลเวทมนตร์!", color: 0x3498db, isWin: true },
      "🍀": { multiplier: 4, label: "🍀 โคลเวอร์โชคดี!", color: 0x2ecc71, isWin: true },
      "🍋": { multiplier: 3, label: "🍋 สามเลมอนหวาน!", color: 0xf9ca24, isWin: true },
    };
    return map[a!] ?? { multiplier: 3, label: "ถูกรางวัล!", color: 0x2ecc71, isWin: true };
  }

  const sorted = [...reels].sort().join("");
  if (["🍄⭐💎", "🍄💎⭐", "⭐🍄💎", "⭐💎🍄", "💎🍄⭐", "💎⭐🍄"].includes(sorted) ||
    (reels.includes("🍄") && reels.includes("⭐") && reels.includes("💎"))) {
    return { multiplier: 2, label: "🌟 SporeNet Combo! 🌟", color: 0x5865f2, isWin: true };
  }

  if (a === b || b === c || a === c) {
    return { multiplier: 1.5, label: "✨ สองตัวเข้า! ได้คืน 150%", color: 0x00b4d8, isWin: true };
  }

  return { multiplier: 0, label: "💨 เสียเดิมพัน... โชคหน้ามาใหม่นะ!", color: 0xed4245, isWin: false };
}

export async function handleCasinoButton(interaction: ButtonInteraction): Promise<void> {
  const modal = new ModalBuilder()
    .setCustomId("casino_bet_modal")
    .setTitle("🎰 วางเดิมพันสล็อต");

  const betInput = new TextInputBuilder()
    .setCustomId("bet_amount")
    .setLabel(`จำนวนสปอร์ที่ต้องการวางเดิมพัน (${MIN_BET}–${MAX_BET.toLocaleString()})`)
    .setStyle(TextInputStyle.Short)
    .setPlaceholder("เช่น 100")
    .setMinLength(1)
    .setMaxLength(6)
    .setRequired(true);

  modal.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(betInput));
  await interaction.showModal(modal);
}

export async function handleCasinoModal(interaction: ModalSubmitInteraction): Promise<void> {
  await interaction.deferReply({ ephemeral: true });

  const betStr = interaction.fields.getTextInputValue("bet_amount").trim();
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

  player.sporePoints -= bet;
  savePlayer(player);

  const spinningEmbed = new EmbedBuilder()
    .setTitle("🎰 กำลังหมุน...")
    .setDescription("```\n[ 🌀 | 🌀 | 🌀 ]\n```")
    .setColor(0xffa500)
    .addFields({ name: "💰 เดิมพัน", value: `${bet.toLocaleString()} สปอร์`, inline: true });

  const spinMsg = await interaction.editReply({ embeds: [spinningEmbed] });

  await new Promise((r) => setTimeout(r, 1500));

  const reels: [string, string, string] = [rollSymbol(), rollSymbol(), rollSymbol()];
  const payout = calcPayout(reels, bet);
  const rawWin = Math.floor(bet * payout.multiplier);
  const netGain = rawWin - bet;

  player.sporePoints += rawWin;
  savePlayer(player);

  const reelDisplay = `[ ${reels[0]} | ${reels[1]} | ${reels[2]} ]`;

  const resultEmbed = new EmbedBuilder()
    .setTitle(`🎰 ${payout.label}`)
    .setDescription(`\`\`\`\n${reelDisplay}\n\`\`\``)
    .setColor(payout.color)
    .addFields(
      { name: "💰 วางเดิมพัน", value: `${bet.toLocaleString()} สปอร์`, inline: true },
      {
        name: payout.isWin ? "🏆 ชนะ" : "💸 แพ้",
        value: payout.isWin
          ? `+${netGain.toLocaleString()} สปอร์ (×${payout.multiplier})`
          : `-${bet.toLocaleString()} สปอร์`,
        inline: true,
      },
      { name: "🍄 สปอร์คงเหลือ", value: `${player.sporePoints.toLocaleString()} สปอร์`, inline: true }
    )
    .setFooter({
      text: `${interaction.user.username} • กดปุ่มวางเดิมพันเพื่อเล่นใหม่`,
      iconURL: interaction.user.displayAvatarURL(),
    })
    .setTimestamp();

  await interaction.editReply({ embeds: [resultEmbed] });
}
