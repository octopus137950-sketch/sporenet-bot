import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits, ChannelType } from "discord.js";
import { getVoiceShareConfig, setVoiceShareConfig } from "../data/store.js";

export const data = new SlashCommandBuilder()
  .setName("set-voice-share-channel")
  .setDescription("กำหนดห้องแชทสำหรับโพสต์แชร์ห้องเสียง")
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .addChannelOption((o) => o.setName("channel").setDescription("ห้องแชทปลายทาง").addChannelTypes(ChannelType.GuildText).setRequired(true));

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  const channel = interaction.options.getChannel("channel", true);
  setVoiceShareConfig(interaction.guildId!, channel.id);
  await interaction.reply({ content: `ตั้งห้องแชร์ห้องเสียงเป็น <#${channel.id}> แล้ว`, ephemeral: true });
}

export function getConfiguredChannelId(guildId: string): string | undefined {
  return getVoiceShareConfig(guildId)?.channelId;
}
