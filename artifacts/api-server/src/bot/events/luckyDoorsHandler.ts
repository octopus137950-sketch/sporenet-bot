import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  EmbedBuilder,
  ModalBuilder,
  ModalSubmitInteraction,
  TextInputBuilder,
  TextInputStyle,
} from "discord.js";
import { getPlayer, savePlayer } from "../data/store.js";

const MIN_BET = 10;
const MAX_BET = 100_000;
const DOOR_COUNT = 3;

interface LuckyDoorsGame {
  userId: string;
  bet: number;
  winningDoor: number;
}

const activeGames = new Map<string, LuckyDoorsGame>();

function buildDoorRow(userId: string): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    ...Array.from({ length: DOOR_COUNT }, (_, index) =>
      new ButtonBuilder()
        .setCustomId(`luckydoors_pick:${userId}:${index}`)
        .setLabel(`🚪 ช่องที่ ${index + 1}`)
        .setStyle(ButtonStyle.Primary),
    ),
  );
}

export async function handleLuckyDoorsButton(interaction: ButtonInteraction): Promise<void> {
  const modal = new ModalBuilder()
    .setCustomId("luckydoors_bet_modal")
    .setTitle("🚪 วางเดิมพันสามประตู");

  const betInput = new TextInputBuilder()
    .setCustomId("bet_amount")
    .setLabel(`จำนวนสปอร์ (${MIN_BET}–${MAX_BET.toLocaleString()})`)
    .setStyle(TextInputStyle.Short)
    .setPlaceholder("เช่น 100")
    .setMinLength(1)
    .setMaxLength(6)
    .setRequired(true);

  modal.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(betInput));
  await interaction.showModal(modal);
}

export async function handleLuckyDoorsModal(interaction: ModalSubmitInteraction): Promise<void> {
  await interaction.deferReply({ ephemeral: true });

  if (activeGames.has(interaction.user.id)) {
    await interaction.editReply("⚠️ คุณมีเกมสามประตูที่กำลังรอเลือกอยู่แล้ว กรุณาเลือกช่องจากเกมเดิมก่อน");
    return;
  }

  const bet = Number.parseInt(interaction.fields.getTextInputValue("bet_amount").trim(), 10);
  if (!Number.isInteger(bet) || bet < MIN_BET || bet > MAX_BET) {
    await interaction.editReply(
      `❌ จำนวนเดิมพันไม่ถูกต้อง ต้องเป็นตัวเลขระหว่าง **${MIN_BET.toLocaleString()}** – **${MAX_BET.toLocaleString()}** สปอร์`,
    );
    return;
  }

  const player = getPlayer(interaction.user.id);
  if (player.sporePoints < bet) {
    await interaction.editReply(
      `❌ สปอร์ไม่พอ!\nคุณมี **${player.sporePoints.toLocaleString()}** สปอร์\nต้องการ **${bet.toLocaleString()}** สปอร์`,
    );
    return;
  }

  player.sporePoints -= bet;
  savePlayer(player);

  activeGames.set(interaction.user.id, {
    userId: interaction.user.id,
    bet,
    winningDoor: Math.floor(Math.random() * DOOR_COUNT),
  });

  const embed = new EmbedBuilder()
    .setTitle("🚪 สามประตูเสี่ยงโชค")
    .setDescription(
      "มี 1 ช่องที่ซ่อนรางวัลอยู่ เลือกให้ถูกเพื่อรับสปอร์คืน **2 เท่า**!\n" +
      "เลือกผิดจะเสียเดิมพันรอบนี้",
    )
    .setColor(0x5865f2)
    .addFields(
      { name: "💰 เดิมพัน", value: `**${bet.toLocaleString()}** สปอร์`, inline: true },
      { name: "🎁 รางวัลถ้าชนะ", value: `**${(bet * 2).toLocaleString()}** สปอร์`, inline: true },
    )
    .setFooter({ text: `${interaction.user.username} • เลือกได้เพียง 1 ช่อง` })
    .setTimestamp();

  await interaction.editReply({ embeds: [embed], components: [buildDoorRow(interaction.user.id)] });
}

export async function handleLuckyDoorsPick(interaction: ButtonInteraction): Promise<void> {
  const [, userId, doorRaw] = interaction.customId.split(":");
  if (userId !== interaction.user.id) {
    await interaction.reply({ content: "❌ ปุ่มนี้เป็นเกมของผู้เล่นคนอื่น", ephemeral: true });
    return;
  }

  const game = activeGames.get(userId);
  if (!game) {
    await interaction.reply({ content: "⚠️ เกมนี้จบไปแล้ว หรือไม่พบการเดิมพัน", ephemeral: true });
    return;
  }

  const selectedDoor = Number.parseInt(doorRaw ?? "", 10);
  if (!Number.isInteger(selectedDoor) || selectedDoor < 0 || selectedDoor >= DOOR_COUNT) {
    await interaction.reply({ content: "❌ ช่องที่เลือกไม่ถูกต้อง", ephemeral: true });
    return;
  }

  activeGames.delete(userId);
  const won = selectedDoor === game.winningDoor;
  const player = getPlayer(userId);
  const payout = won ? game.bet * 2 : 0;

  if (won) {
    player.sporePoints += payout;
    savePlayer(player);
  }

  const doorDisplay = Array.from({ length: DOOR_COUNT }, (_, index) => {
    if (index === game.winningDoor) return "🎁";
    if (index === selectedDoor) return won ? "🎁" : "💥";
    return "🚪";
  }).join("  ");

  const resultEmbed = new EmbedBuilder()
    .setTitle(won ? "🎉 เปิดถูกช่อง! รับรางวัล 2 เท่า!" : "💥 เปิดผิดช่อง!")
    .setDescription(`\`\`\`\n${doorDisplay}\n\`\`\``)
    .setColor(won ? 0x57f287 : 0xed4245)
    .addFields(
      { name: "🚪 ช่องที่เลือก", value: `ช่องที่ ${selectedDoor + 1}`, inline: true },
      { name: "✅ ช่องรางวัล", value: `ช่องที่ ${game.winningDoor + 1}`, inline: true },
      {
        name: won ? "🏆 ได้รับ" : "💸 เสียเดิมพัน",
        value: won ? `+${payout.toLocaleString()} สปอร์ (×2)` : `-${game.bet.toLocaleString()} สปอร์`,
        inline: true,
      },
      { name: "🍄 สปอร์คงเหลือ", value: player.sporePoints.toLocaleString(), inline: true },
    )
    .setFooter({ text: `${interaction.user.username} • เล่นใหม่ได้จากปุ่มด้านบน` })
    .setTimestamp();

  await interaction.update({ embeds: [resultEmbed], components: [] });
}

export { MIN_BET as LUCKY_DOORS_MIN_BET, MAX_BET as LUCKY_DOORS_MAX_BET };