import { ChatInputCommandInteraction } from "discord.js";

export async function requireVoiceChannel(
  interaction: ChatInputCommandInteraction
): Promise<boolean> {
  const guild = interaction.guild;
  const member = guild?.members.cache.get(interaction.user.id);
  const voiceChannel = member?.voice.channel;

  // Discord voice-channel chat interactions use the voice channel's ID.
  // Requiring both conditions prevents starting the story from a random text
  // channel while the user happens to be connected to voice elsewhere.
  if (!guild || !voiceChannel || interaction.channelId !== voiceChannel.id) {
    await interaction.reply({
      content: !voiceChannel
        ? "❌ ท่านต้องอยู่ในห้องเสียงเพื่อเข้า farm-story\n💬 กรุณาเข้าห้องเสียงก่อน"
        : "❌ กรุณาใช้ /farm-story ในแชทของห้องเสียงที่ท่านกำลังอยู่เท่านั้น",
      ephemeral: true,
    });
    return false;
  }

  return true;
}
