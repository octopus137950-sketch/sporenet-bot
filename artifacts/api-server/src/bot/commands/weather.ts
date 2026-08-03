import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { buildEcosystemEmbed } from "../utils/ecosystem.js";

export const data = new SlashCommandBuilder()
  .setName("weather")
  .setDescription("🌦️ ตรวจสภาพอากาศและสถานะสปอร์ในธรรมชาติ");

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.reply({ embeds: [buildEcosystemEmbed()] });
}
