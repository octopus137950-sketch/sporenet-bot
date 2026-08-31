import { SlashCommandBuilder, ChatInputCommandInteraction, ChannelType, EmbedBuilder } from "discord.js";
import { getVoiceShareConfig } from "../data/store.js";

const categories = ["เกม", "ศิลปะ", "หนัง", "อนิเมะ", "เพลง", "พูดคุย", "การเรียน", "อื่นๆ"] as const;
export const data = new SlashCommandBuilder()
  .setName("voice-share")
  .setDescription("แชร์ห้องเสียงที่คุณกำลังอยู่ให้คนอื่นเข้าร่วม")
  .addStringOption((o) => o.setName("activity").setDescription("กำลังทำอะไรหรือชวนคนมาทำอะไร").setRequired(true).setMaxLength(180))
  .addStringOption((o) => o.setName("category").setDescription("หมวดหมู่กิจกรรม").setRequired(true).addChoices(...categories.map((name) => ({ name, value: name }))));

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  const voice = interaction.member && "voice" in interaction.member ? interaction.member.voice : null;
  if (!voice?.channelId || !interaction.guild) { await interaction.reply({ content: "คุณต้องอยู่ในห้องเสียงก่อนใช้คำสั่งนี้", ephemeral: true }); return; }
  const config = getVoiceShareConfig(interaction.guild.id);
  const target = config ? interaction.guild.channels.cache.get(config.channelId) : null;
  if (!target || target.type !== ChannelType.GuildText) { await interaction.reply({ content: "ยังไม่ได้ตั้งค่าห้องแชร์ ใช้ `/set-voice-share-channel` ก่อน", ephemeral: true }); return; }
  const activity = interaction.options.getString("activity", true);
  const category = interaction.options.getString("category", true);
  const embed = new EmbedBuilder().setTitle("กำลังชวนคนเข้าห้องเสียง").setColor(0x5865f2).setDescription(activity).addFields({ name: "หมวดหมู่", value: category, inline: true }, { name: "ห้องเสียง", value: `<#${voice.channelId}>`, inline: true }, { name: "ผู้แชร์", value: `<@${interaction.user.id}>`, inline: true }).setFooter({ text: "โพสต์นี้จะหายไปเมื่อผู้แชร์ออกจากห้อง" }).setTimestamp();
  const message = await target.send({ embeds: [embed] });
  registerVoiceShare(voice.channelId, interaction.user.id, message.id, target.id);
  await interaction.reply({ content: `แชร์ห้องเสียงไปที่ <#${target.id}> แล้ว`, ephemeral: true });
}

const activeShares = new Map<string, { ownerId: string; messageId: string; targetChannelId: string }>();
export function registerVoiceShare(channelId: string, ownerId: string, messageId: string, targetChannelId: string): void { activeShares.set(`${channelId}:${ownerId}`, { ownerId, messageId, targetChannelId }); }
export function removeShare(channelId: string, ownerId: string): { ownerId: string; messageId: string; targetChannelId: string } | undefined { const key = `${channelId}:${ownerId}`; const item = activeShares.get(key); activeShares.delete(key); return item; }
