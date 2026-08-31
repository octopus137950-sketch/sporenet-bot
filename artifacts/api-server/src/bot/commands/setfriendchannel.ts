import { ChannelType, ChatInputCommandInteraction, PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import { deleteFriendChannelConfig, getFriendChannelConfig, saveFriendChannelConfig } from "../data/store.js";

export const data = new SlashCommandBuilder()
  .setName("set-friend-channel")
  .setDescription("ตั้งค่าห้องสำหรับหาเพื่อนโดยเฉพาะ (แอดมิน)")
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .addSubcommand((sub) => sub.setName("set").setDescription("ตั้งห้องหาเพื่อน").addChannelOption((o) => o.setName("channel").setDescription("ห้องที่อนุญาตให้ใช้ Friend Match").addChannelTypes(ChannelType.GuildText).setRequired(true)))
  .addSubcommand((sub) => sub.setName("show").setDescription("ดูห้องหาเพื่อนปัจจุบัน"))
  .addSubcommand((sub) => sub.setName("clear").setDescription("ยกเลิกการจำกัดห้อง"));

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply({ ephemeral: true });
  const guild = interaction.guild;
  if (!guild) { await interaction.editReply("ใช้ได้เฉพาะในเซิร์ฟเวอร์เท่านั้น"); return; }
  const sub = interaction.options.getSubcommand();
  if (sub === "set") {
    const channel = interaction.options.getChannel("channel", true);
    saveFriendChannelConfig({ guildId: guild.id, channelId: channel.id, updatedAt: Date.now() });
    await interaction.editReply(`ตั้งห้องหาเพื่อนเป็น <#${channel.id}> แล้ว เมื่อมีการตั้งค่านี้จะใช้ /friend-match ได้เฉพาะห้องนี้`);
    return;
  }
  if (sub === "clear") {
    deleteFriendChannelConfig(guild.id);
    await interaction.editReply("ยกเลิกการจำกัดห้องหาเพื่อนแล้ว สามารถใช้ /friend-match ได้ทุกห้อง");
    return;
  }
  const config = getFriendChannelConfig(guild.id);
  await interaction.editReply(config ? `ห้องหาเพื่อนปัจจุบันคือ <#${config.channelId}>` : "ยังไม่ได้ตั้งห้องหาเพื่อน");
}
