import { ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder } from "discord.js";
import { incrementFertilizeCount } from "../data/store.js";

export const data = new SlashCommandBuilder()
  .setName("fertilize")
  .setDescription("🌱 ใส่ปุ๋ยให้ธรรมชาติเพิ่มการเกิดสปอร์ในรอบถัดไป");

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  const state = incrementFertilizeCount();
  const embed = new EmbedBuilder()
    .setTitle("🌱 ใส่ปุ๋ยสำเร็จ!")
    .setDescription(
      "ขอบคุณที่ช่วยดูแลธรรมชาติ โบนัสปุ๋ยจะถูกคำนวณตอนเติมสปอร์ต้นชั่วโมง",
    )
    .setColor(0x66bb6a)
    .addFields({
      name: "ปุ๋ยสะสมชั่วโมงนี้",
      value: `**${state.hourlyFertilizeCount.toLocaleString()}** ครั้ง`,
    })
    .setFooter({ text: "ใส่ปุ๋ยได้ฟรีและไม่จำกัดครั้ง" })
    .setTimestamp();
  await interaction.reply({ embeds: [embed] });
}
