import { ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder } from "discord.js";
import { incrementFertilizeCount } from "../data/store.js";
import {
  FERTILIZER_TIME_REDUCTION_MS,
  formatCountdown,
  getCycleReductionMs,
  getNextCycleAt,
} from "../utils/ecosystem.js";

export const data = new SlashCommandBuilder()
  .setName("fertilize")
  .setDescription("🌱 ใส่ปุ๋ยให้ธรรมชาติเพิ่มการเกิดสปอร์ในรอบถัดไป");

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  const state = incrementFertilizeCount();
  const reductionMinutes = FERTILIZER_TIME_REDUCTION_MS / 60_000;
  const totalReductionMinutes = getCycleReductionMs(state) / 60_000;
  const embed = new EmbedBuilder()
    .setTitle("🌱 ใส่ปุ๋ยสำเร็จ!")
    .setDescription(
      "ขอบคุณที่ช่วยดูแลธรรมชาติ โบนัสปุ๋ยจะถูกคำนวณตอนเติมสปอร์รอบถัดไป",
    )
    .setColor(0x66bb6a)
    .addFields({
      name: "ปุ๋ยสะสมรอบนี้",
      value: `**${state.hourlyFertilizeCount.toLocaleString()}** ครั้ง`,
    })
    .addFields({
      name: "⏱️ เวลารอที่ลดลง",
      value: `ครั้งนี้ลดเวลา **${reductionMinutes} นาที**\nลดรวมแล้ว **${totalReductionMinutes.toLocaleString()} นาที** ในรอบนี้\nรอบถัดไปในประมาณ **${formatCountdown(getNextCycleAt(state))}**`,
    })
    .setFooter({ text: "ใส่ปุ๋ยได้ฟรีและไม่จำกัดครั้ง" })
    .setTimestamp();
  await interaction.reply({ embeds: [embed] });
}
