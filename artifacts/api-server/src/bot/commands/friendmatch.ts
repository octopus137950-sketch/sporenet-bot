import { randomUUID } from "crypto";
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder } from "discord.js";
import { getFriendMatchBetween, getFriendProfile, getFriendProfiles, saveFriendMatch } from "../data/store.js";
import { candidateScore, interestLabels } from "../friendSystem.js";

export const data = new SlashCommandBuilder()
  .setName("friend-match")
  .setDescription("🔎 หาเพื่อนใหม่ที่มีความสนใจใกล้กัน");

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply({ ephemeral: true });
  const guild = interaction.guild;
  if (!guild) { await interaction.editReply("❌ ใช้ได้เฉพาะในเซิร์ฟเวอร์เท่านั้น"); return; }
  const profile = getFriendProfile(guild.id, interaction.user.id);
  if (!profile) { await interaction.editReply("❌ ตั้งค่าโปรไฟล์ก่อนด้วย `/friend-profile`"); return; }
  if (!profile.optIn) { await interaction.editReply("❌ ตอนนี้คุณปิดการจับคู่ไว้ ให้ใช้ `/friend-profile` และตั้ง `opt-in` เป็น True เพื่อเปิด"); return; }
  const profiles = getFriendProfiles(guild.id).filter((candidate) => {
    if (candidate.userId === interaction.user.id || !candidate.optIn) return false;
    if (profile.excludedUserIds.includes(candidate.userId)) return false;
    const old = getFriendMatchBetween(guild.id, interaction.user.id, candidate.userId);
    return !old || ["declined", "candidate"].includes(old.status);
  });
  const sorted = profiles.filter((candidate) => profile.interests.some((interest) => candidate.interests.includes(interest)))
    .sort((a, b) => candidateScore(profile, b) - candidateScore(profile, a));
  let candidate = null as typeof sorted[number] | null;
  let member = null as Awaited<ReturnType<typeof guild.members.fetch>> | null;
  for (const item of sorted) {
    const found = await guild.members.fetch(item.userId).catch(() => null);
    if (found) { candidate = item; member = found; break; }
  }
  if (!candidate || !member) { await interaction.editReply("ยังหาเพื่อนที่ตรงกันไม่ได้ ลองกลับมาใหม่ภายหลังนะ"); return; }
  const match = { id: randomUUID(), guildId: guild.id, userA: interaction.user.id, userB: candidate.userId, status: "candidate" as const, createdAt: Date.now() };
  saveFriendMatch(match);
  const shared = profile.interests.filter((interest) => candidate!.interests.includes(interest));
  const embed = new EmbedBuilder()
    .setTitle("🧑‍🤝‍🧑 เจอคนที่น่าจะคุยกันได้!")
    .setDescription(`**${member.displayName}** ก็เปิดรับการหาเพื่อนเหมือนกัน\n\nความสนใจที่ตรงกัน: **${interestLabels(shared)}**`)
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