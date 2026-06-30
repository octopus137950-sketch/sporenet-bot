import { ChatInputCommandInteraction, EmbedBuilder } from "discord.js";
import { getGameChannel } from "../data/store.js";

export async function requireGameChannel(
  interaction: ChatInputCommandInteraction
): Promise<boolean> {
  const guild = interaction.guild;
  if (!guild) return true;

  const channelId = getGameChannel(guild.id);
  if (!channelId) return true;

  if (interaction.channelId === channelId) return true;

  const embed = new EmbedBuilder()
    .setTitle("❌ ใช้คำสั่งผิดห้อง!")
    .setDescription(`คำสั่งนี้ใช้ได้เฉพาะในห้อง <#${channelId}> เท่านั้น`)
    .setColor(0xed4245);

  if (interaction.deferred) {
    await interaction.editReply({ embeds: [embed] });
  } else {
    await interaction.reply({ embeds: [embed], ephemeral: true });
  }
  return false;
}
