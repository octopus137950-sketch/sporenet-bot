import { ActionRowBuilder, ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder, StringSelectMenuBuilder, StringSelectMenuInteraction } from "discord.js";
import { getFriendProfile, saveFriendProfile } from "../data/store.js";
import { AVAILABILITIES, CHAT_STYLES, FRIEND_INTERESTS, FRIEND_ROLE_PREFIX, interestLabels } from "../friendSystem.js";

export const data = new SlashCommandBuilder()
  .setName("friend-profile")
  .setDescription("ตั้งค่าโปรไฟล์สำหรับหาเพื่อนคุย")
  .addStringOption((o) => o.setName("style").setDescription("สไตล์การคุยที่ชอบ").setRequired(true).addChoices(...CHAT_STYLES.map((value) => ({ name: value, value }))))
  .addStringOption((o) => o.setName("availability").setDescription("ช่วงเวลาที่มักออนไลน์").setRequired(true).addChoices(...AVAILABILITIES.map((value) => ({ name: value, value }))))
  .addBooleanOption((o) => o.setName("opt-in").setDescription("เปิดให้ระบบจับคู่หรือไม่ (ค่าเริ่มต้น: เปิด)").setRequired(false));

export function interestMenu(style: string, availability: string, optIn: boolean) {
  const styleIndex = CHAT_STYLES.indexOf(style as typeof CHAT_STYLES[number]);
  const availabilityIndex = AVAILABILITIES.indexOf(availability as typeof AVAILABILITIES[number]);
  return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(`friend_interests:${styleIndex}:${availabilityIndex}:${optIn ? "1" : "0"}`)
      .setPlaceholder("เลือกความสนใจของคุณ (เลือกได้ 1–5 หัวข้อ)")
      .setMinValues(1)
      .setMaxValues(5)
      .addOptions(FRIEND_INTERESTS.map(({ value, label }) => ({ label, value }))),
  );
}

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply({ ephemeral: true });
  const guild = interaction.guild;
  if (!guild) { await interaction.editReply("ใช้ได้เฉพาะในเซิร์ฟเวอร์เท่านั้น"); return; }
  await interaction.editReply({
    content: "เลือกหัวข้อที่คุณสนใจได้เลย ระบบจะใช้หัวข้อเหล่านี้ในการจับคู่",
    components: [interestMenu(interaction.options.getString("style", true), interaction.options.getString("availability", true), interaction.options.getBoolean("opt-in") ?? true)],
  });
}

export async function handleInterestSelect(interaction: StringSelectMenuInteraction): Promise<void> {
  await interaction.deferUpdate();
  const guild = interaction.guild;
  if (!guild) return;
  const [, styleIndex, availabilityIndex, optInValue] = interaction.customId.split(":");
  const interests = [...new Set(interaction.values)].filter((value) => FRIEND_INTERESTS.some((item) => item.value === value)).slice(0, 5);
  const previous = getFriendProfile(guild.id, interaction.user.id);
  const profile = { guildId: guild.id, userId: interaction.user.id, interests, chatStyle: CHAT_STYLES[Number(styleIndex)] ?? CHAT_STYLES[0], availability: AVAILABILITIES[Number(availabilityIndex)] ?? AVAILABILITIES[0], optIn: optInValue === "1", excludedUserIds: previous?.excludedUserIds ?? [], updatedAt: Date.now() };
  saveFriendProfile(profile);
  const member = await guild.members.fetch(interaction.user.id);
  const targetRoleNames = new Set(interests.map((value) => FRIEND_ROLE_PREFIX + (FRIEND_INTERESTS.find((item) => item.value === value)?.label ?? value)));
  const managedRoles = guild.roles.cache.filter((role) => role.name.startsWith(FRIEND_ROLE_PREFIX));
  await member.roles.remove([...managedRoles.filter((role) => !targetRoleNames.has(role.name)).values()]).catch(() => null);
  const assigned: string[] = [];
  for (const value of interests) {
    const item = FRIEND_INTERESTS.find((interest) => interest.value === value);
    if (!item) continue;
    let role = guild.roles.cache.find((candidate) => candidate.name === FRIEND_ROLE_PREFIX + item.label);
    if (!role) role = await guild.roles.create({ name: FRIEND_ROLE_PREFIX + item.label, color: item.color, reason: "Friend Match interest role" }).catch(() => null);
    if (role) { await member.roles.add(role).catch(() => null); assigned.push(role.name); }
  }
  const embed = new EmbedBuilder().setTitle("ตั้งค่าโปรไฟล์หาเพื่อนแล้ว").setColor(0x57f287)
    .setDescription(profile.optIn ? "ตอนนี้คุณอยู่ในระบบ Friend Match แล้ว" : "บันทึกโปรไฟล์แล้ว แต่คุณปิดการจับคู่ไว้")
    .addFields({ name: "ความสนใจ", value: interestLabels(interests) }, { name: "สไตล์การคุย", value: profile.chatStyle, inline: true }, { name: "มักออนไลน์", value: profile.availability, inline: true }, { name: "ยศที่ได้รับ", value: assigned.join(", ") || "ยังเพิ่มยศไม่ได้" })
    .setFooter({ text: "ใช้ /friend-match เพื่อหาเพื่อนที่มีความสนใจใกล้กัน" });
  await interaction.editReply({ content: "", embeds: [embed], components: [] });
}
