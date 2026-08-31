import { randomUUID } from "crypto";
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder } from "discord.js";
import { getFriendChannelConfig, getFriendMatch, getFriendMatchBetween, getFriendProfile, getFriendProfiles, saveFriendMatch } from "../data/store.js";
import { candidateScore, interestLabels } from "../friendSystem.js";

export const data = new SlashCommandBuilder()
  .setName("friend-match")
  .setDescription("🔎 หาเพื่อนใหม่ที่มีความสนใจใกล้กัน");

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply({ ephemeral: true });
  const guild = interaction.guild;
  if (!guild) { await interaction.editReply("❌ ใช้ได้เฉพาะในเซิร์ฟเวอร์เท่านั้น"); return; }
  const friendChannel = getFriendChannelConfig(guild.id);
  if (friendChannel && interaction.channelId !== friendChannel.channelId) {
    await interaction.editReply(`ระบบหาเพื่อนเปิดให้ใช้เฉพาะห้อง <#${friendChannel.channelId}> เท่านั้น`);
    return;
  }
  const profile = getFriendProfile(guild.id, interaction.user.id);
  if (!profile) { await interaction.editReply("❌ ตั้งค่าโปรไฟล์ก่อนด้วย `/friend-profile`"); return; }
  if (!profile.optIn) { await interaction.editReply("❌ ตอนนี้คุณปิดการจับคู่ไว้ ให้ใช้ `/friend-profile` และตั้ง `opt-in` เป็น True เพื่อเปิด"); return; }
  const pendingRequest = getFriendProfiles(guild.id)
    .map((candidate) => ({ candidate, match: getFriendMatchBetween(guild.id, interaction.user.id, candidate.userId) }))
    .find(({ match }) => match?.status === "pending" && match.userB === interaction.user.id);
  if (pendingRequest) {
    const member = await guild.members.fetch(pendingRequest.candidate.userId).catch(() => null);
    if (member) {
      const match = getFriendMatch(pendingRequest.match.id) ?? pendingRequest.match;
      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder().setCustomId(`friend_accept:${match.id}`).setLabel("สนใจคุยด้วย").setEmoji("✅").setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId(`friend_decline:${match.id}`).setLabel("ไม่ใช่ตอนนี้").setStyle(ButtonStyle.Danger),
      );
      const embed = new EmbedBuilder().setTitle("มีคำขอหาเพื่อนค้างอยู่").setDescription(`<@${match.userA}> สนใจอยากคุยกับคุณ\n\nความสนใจของอีกฝ่าย: **${interestLabels(pendingRequest.candidate.interests)}**`).setColor(0x5865f2);
      await interaction.editReply({ content: "คุณมีคำขอหาเพื่อนที่รอการตอบรับอยู่", embeds: [embed], components: [row] });
      return;
    }
  }
  const profiles = getFriendProfiles(guild.id).filter((candidate) => {
    if (candidate.userId === interaction.user.id || !candidate.optIn) return false;
    if (profile.excludedUserIds.includes(candidate.userId)) return false;
    const old = getFriendMatchBetween(guild.id, interaction.user.id, candidate.userId);
    return !old || ["declined", "candidate"].includes(old.status);
  });
  const ranked = profiles.sort((a, b) => candidateScore(profile, b) - candidateScore(profile, a));
  const topScore = ranked.length > 0 ? candidateScore(profile, ranked[0]) : 0;
  const fallbackPool = ranked.filter((item) => candidateScore(profile, item) === topScore);
  const ordered = topScore > 0 ? ranked : fallbackPool.sort(() => Math.random() - 0.5);
  let candidate = null as typeof ranked[number] | null;
  let member = null as Awaited<ReturnType<typeof guild.members.fetch>> | null;
  for (const item of ordered) {
    const found = await guild.members.fetch(item.userId).catch(() => null);
    if (found) { candidate = item; member = found; break; }
  }
  if (!candidate || !member) { await interaction.editReply("ตอนนี้ยังไม่มีสมาชิกคนอื่นที่เปิดรับการจับคู่ ลองกลับมาใหม่ภายหลังนะ"); return; }
  const isFallback = candidateScore(profile, candidate) === 0;
  const match = { id: randomUUID(), guildId: guild.id, userA: interaction.user.id, userB: candidate.userId, status: "candidate" as const, createdAt: Date.now() };
  saveFriendMatch(match);
  const shared = profile.interests.filter((interest) => candidate!.interests.includes(interest));
  const embed = new EmbedBuilder()
    .setTitle(isFallback ? "🧑‍🤝‍🧑 แนะนำเพื่อนใหม่ให้คุณ!" : "🧑‍🤝‍🧑 เจอคนที่น่าจะคุยกันได้!")
    .setDescription(`**${member.displayName}** ก็เปิดรับการหาเพื่อนเหมือนกัน${isFallback ? "\n\nยังไม่มีความสนใจที่ตรงกัน ระบบจึงสุ่มแนะนำสมาชิกที่เปิดรับการจับคู่ให้ก่อน" : `\n\nความสนใจที่ตรงกัน: **${interestLabels(shared)}**`}`)
    .setColor(0x5865f2)
    .addFields(
      { name: "💬 สไตล์การคุย", value: candidate.chatStyle, inline: true },
      { name: "🕒 มักออนไลน์", value: candidate.availability, inline: true },
      { name: "🎯 ความสนใจ", value: interestLabels(candidate.interests), inline: false },
    ).setFooter({ text: "การกดสนใจจะส่งคำขอให้อีกฝ่ายเท่านั้น ต้องสนใจกลับทั้งคู่จึงจะ Match" });
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`friend_interest:${match.id}`).setLabel("สนใจคุย").setEmoji("✅").setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(`friend_skip:${match.id}`).setLabel("ขอคนใหม่").setEmoji("🔄").setStyle(ButtonStyle.Secondary),
  );
  await interaction.editReply({ embeds: [embed], components: [row] });
}
