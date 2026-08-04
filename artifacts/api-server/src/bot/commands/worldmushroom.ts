import { ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder } from "discord.js";
import { getWorldMushroom } from "../data/store.js";
import { requireGameChannel } from "../utils/channelGuard.js";
import {
  formatWorldMushroomReset,
  getWorldMushroomBonuses,
  worldMushroomExpForNextLevel,
} from "../utils/worldMushroom.js";

export const data = new SlashCommandBuilder()
  .setName("worldmushroom")
  .setDescription("🍄 ดูสถานะเห็ดโลก เลเวล บัฟ และอันดับผู้บริจาค");

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!(await requireGameChannel(interaction))) return;
  await interaction.deferReply();

  const guildId = interaction.guildId;
  if (!guildId) {
    await interaction.editReply("❌ ใช้ได้เฉพาะในเซิร์ฟเวอร์เท่านั้น");
    return;
  }

  const state = getWorldMushroom(guildId);
  const bonuses = getWorldMushroomBonuses(state.level);
  const nextExp = worldMushroomExpForNextLevel(state.level);
  const top = Object.entries(state.contributors)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([userId, amount], index) => `${index + 1}. <@${userId}> — **${amount.toLocaleString()}** สปอร์`)
    .join("\n");

  const pestText = state.activePest
    ? `⚠️ ศัตรูพืชกำลังบุก! เหลือเวลา **${Math.max(0, Math.ceil((state.activePest.expiresAt - Date.now()) / 1_000))} วินาที**`
    : "✅ ไม่มีศัตรูพืชกำลังบุก";

  const embed = new EmbedBuilder()
    .setTitle("🍄 สถานะเห็ดโลก")
    .setColor(state.activePest ? 0xed4245 : 0x57f287)
    .setDescription(
      `เห็ดโลกของเซิร์ฟเวอร์อยู่ที่ **Lv.${state.level}** • ซีซันที่ **${state.seasonNumber}**\n${pestText}`,
    )
    .addFields(
      { name: "📈 EXP เลเวลถัดไป", value: `**${state.exp.toLocaleString()} / ${nextExp.toLocaleString()}**`, inline: true },
      { name: "🌱 โบนัสสปอร์", value: `**+${bonuses.sporeBonusPercent}%**`, inline: true },
      { name: "⚔️ โบนัสโจมตีบอสโลก", value: `**+${bonuses.bossDamageBonusPercent}%**`, inline: true },
      { name: "🔄 รีเซ็ตซีซัน", value: formatWorldMushroomReset(state.nextResetAt), inline: true },
      { name: "🏆 Top 5 ผู้บริจาคซีซันนี้", value: top || "ยังไม่มีผู้บริจาค", inline: false },
    )
    .setFooter({ text: "ใช้ /water amount:<จำนวน> เพื่อบริจาค • 1 สปอร์ = 1 EXP" })
    .setTimestamp();

  await interaction.editReply({ embeds: [embed] });
}