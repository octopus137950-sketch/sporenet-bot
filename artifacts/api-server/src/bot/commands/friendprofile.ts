import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from "discord.js";
import { getFriendProfile, saveFriendProfile } from "../data/store.js";
import { AVAILABILITIES, CHAT_STYLES, FRIEND_INTERESTS, FRIEND_ROLE_PREFIX, interestLabels, parseInterests } from "../friendSystem.js";

export const data = new SlashCommandBuilder()
  .setName("friend-profile")
  .setDescription("🧑‍🤝‍🧑 ตั้งค่าโปรไฟล์สำหรับหาเพื่อนคุย")
  .addStringOption((o) => o.setName("interests").setDescription("ความสนใจคั่นด้วยจุลภาค เช่น เพลง,อนิเมะ,หนัง").setRequired(true).setMaxLength(200))
  .addStringOption((o) => o.setName("style").setDescription("สไตล์การคุยที่ชอบ").setRequired(true).addChoices(...CHAT_STYLES.map((value) => ({ name: value, value }))))
  .addStringOption((o) => o.setName("availability").setDescription("ช่วงเวลาที่มักออนไลน์").setRequired(true).addChoices(...AVAILABILITIES.map((value) => ({ name: value, value }))))
  .addBooleanOption((o) => o.setName("opt-in").setDescription("เปิดให้ระบบจับคู่หรือไม่ (ค่าเริ่มต้น: เปิด)").setRequired(false));

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply({ ephemeral: true });
  const guild = interaction.guild;
  if (!guild) { await interaction.editReply("❌ ใช้ได้เฉพาะในเซิร์ฟเวอร์เท่านั้น"); return; }
  const interests = parseInterests(interaction.options.getString("interests", true));
  if (interests.length === 0) { await interaction.editReply(`❌ ไม่พบความสนใจที่รองรับ ลองใช้: ${FRIEND_INTERESTS.map((item) => item.label).join(", ")}`); return; }
  const previous = getFriendProfile(guild.id, interaction.user.id);
  const profile = {
    guildId: guild.id, userId: interaction.user.id, interests,
    chatStyle: interaction.options.getString("style", true),
    availability: interaction.options.getString("availability", true),
    optIn: interaction.options.getBoolean("opt-in") ?? true,
    excludedUserIds: previous?.excludedUserIds ?? [], updatedAt: Date.now(),
  };
  saveFriendProfile(profile);
  const member = await guild.members.fetch(interaction.user.id);
  const targetRoleNames = new Set(interests.map((value) => FRIEND_ROLE_PREFIX + (FRIEND_INTERESTS.find((item) => item.value === value)?.label ?? value)));
  const managedRoles = guild.roles.cache.filter((role) => role.name.startsWith(FRIEND_ROLE_PREFIX));
  const oldRoles = managedRoles.filter((role) => !targetRoleNames.has(role.name));
  await member.roles.remove([...oldRoles.values()]).catch(() => null);
  const assigned: string[] = [];
  let roleError = false;
  for (const value of interests) {
    const item = FRIEND_INTERESTS.find((interest) => interest.value === value);
    if (!item) continue;
    let role = guild.roles.cache.find((candidate) => candidate.name === FRIEND_ROLE_PREFIX + item.label);
    if (!role) role = await guild.roles.create({ name: FRIEND_ROLE_PREFIX + item.label, color: item.color, reason: "Friend Match interest role" }).catch(() => null);
    if (!role) { roleError = true; continue; }
    if (!member.roles.cache.has(role.id)) await member.roles.add(role).catch(() => { roleError = true; });
    assigned.push(role.name);
  }
  const embed = new EmbedBuilder().setTitle("✅ ตั้งค่าโปรไฟล์หาเพื่อนแล้ว").setColor(0x57f287)
    .setDescription(profile.optIn ? "ตอนนี้คุณอยู่ในระบบ Friend Match แล้ว" : "บันทึกโปรไฟล์แล้ว แต่คุณปิดการจับคู่ไว้")
    .addFields(
      { name: "🎯 ความสนใจ", value: interestLabels(interests), inline: false },
      { name: "💬 สไตล์การคุย", value: profile.chatStyle, inline: true },
      { name: "🕒 มักออนไลน์", value: profile.availability, inline: true },
      { name: "🏷️ ยศที่ได้รับ", value: assigned.join(", ") || "ยังเพิ่มยศไม่ได้", inline: false },
    ).setFooter({ text: roleError ? "บอทเพิ่มยศไม่ได้ ตรวจสอบสิทธิ์ Manage Roles และลำดับยศของบอท" : "ใช้ /friend-match เพื่อหาเพื่อนที่มีความสนใจใกล้กัน" });
  await interaction.editReply({ embeds: [embed] });
}