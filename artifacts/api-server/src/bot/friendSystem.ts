import {
  ActionRowBuilder, ButtonBuilder, ButtonInteraction, ButtonStyle, ChannelType, EmbedBuilder,
  PermissionFlagsBits, VoiceState,
} from "discord.js";
import {
  FriendMatch, FriendProfile, getFriendMatch, getFriendMatchByVoiceChannel, getFriendProfile, saveFriendMatch,
  saveFriendProfile,
} from "./data/store.js";

export const FRIEND_ROLE_PREFIX = "เพื่อน・";
export const FRIEND_INTERESTS = [
  { value: "music", label: "เพลง", color: 0xe91e63 },
  { value: "movies", label: "หนัง/ซีรีส์", color: 0x9c27b0 },
  { value: "anime", label: "อนิเมะ", color: 0xff9800 },
  { value: "books", label: "หนังสือ", color: 0x795548 },
  { value: "tech", label: "เทคโนโลยี", color: 0x2196f3 },
  { value: "art", label: "ศิลปะ", color: 0xe91e63 },
  { value: "food", label: "อาหาร", color: 0xff5722 },
  { value: "travel", label: "ท่องเที่ยว", color: 0x00bcd4 },
  { value: "fitness", label: "สุขภาพ/ออกกำลัง", color: 0x4caf50 },
  { value: "language", label: "ภาษา", color: 0x3f51b5 },
  { value: "games", label: "เกม", color: 0x673ab7 },
  { value: "pets", label: "สัตว์เลี้ยง", color: 0x8bc34a },
] as const;
export const CHAT_STYLES = ["ชิล ๆ", "เล่นมุก", "คุยจริงจัง", "แลกเปลี่ยนความรู้"] as const;
export const AVAILABILITIES = ["กลางวัน", "เย็น", "ดึก", "ไม่แน่นอน"] as const;

export function parseInterests(raw: string): string[] {
  const tokens = raw.split(",").map((token) => token.trim().toLowerCase()).filter(Boolean);
  const values = tokens.map((token) => {
    const found = FRIEND_INTERESTS.find((item) => item.value === token || item.label.toLowerCase() === token);
    return found?.value;
  }).filter((value): value is string => Boolean(value));
  return [...new Set(values)].slice(0, 5);
}

export function interestLabels(values: string[]): string {
  return values.map((value) => FRIEND_INTERESTS.find((item) => item.value === value)?.label ?? value).join(", ");
}

export function candidateScore(a: FriendProfile, b: FriendProfile): number {
  const shared = a.interests.filter((interest) => b.interests.includes(interest)).length;
  return shared * 2 + (a.chatStyle === b.chatStyle ? 2 : 0) + (a.availability === b.availability ? 1 : 0);
}

function otherUser(match: FriendMatch, userId: string): string {
  return match.userA === userId ? match.userB : match.userA;
}

export function matchRow(matchId: string): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`friend_voice:${matchId}`).setLabel("เข้าห้องเสียง").setEmoji("🎙️").setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(`friend_later:${matchId}`).setLabel("ไว้คุยทีหลัง").setEmoji("💬").setStyle(ButtonStyle.Secondary),
  );
}

function matchedEmbed(guild: any, match: FriendMatch): EmbedBuilder {
  const memberA = guild.members.cache.get(match.userA);
  const memberB = guild.members.cache.get(match.userB);
  return new EmbedBuilder()
    .setTitle("🎉 Match สำเร็จ!")
    .setDescription(`เอ้ย **${memberA?.displayName ?? "เพื่อนคนหนึ่ง"}** กับ **${memberB?.displayName ?? "เพื่อนอีกคน"}** สนใจจะคุยกันเหมือนกันนะ!\n\nสนใจเข้าไปคุยในห้องเสียงด้วยกันไหม?`)
    .setColor(0x57f287)
    .addFields({ name: "👥 คนที่ match กัน", value: `<@${match.userA}>  ↔  <@${match.userB}>` })
    .setTimestamp();
}


function pendingRow(matchId: string): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`friend_accept:${matchId}`).setLabel("สนใจคุยด้วย").setEmoji("✅").setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(`friend_decline:${matchId}`).setLabel("ยังไม่สะดวก").setEmoji("ข").setStyle(ButtonStyle.Secondary),
  );
}

function pendingEmbed(guild: any, match: FriendMatch): EmbedBuilder {
  const memberA = guild.members.cache.get(match.userA);
  const profile = getFriendProfile(match.guildId, match.userA);
  return new EmbedBuilder().setTitle("👋 มีคนอยากรู้จักคุณ!").setDescription(`<@${match.userA}> สนใจจะคุยกับคุณเหมือนกันนะ\n\nถ้าคุณกดสนใจกลับ จะเป็น **Match** และบอทจะแจ้งให้ทั้งคู่ทราบ`).setColor(0x5865f2).addFields(
    { name: "👤 คนที่สนใจ", value: `<@${match.userA}> (${memberA?.displayName ?? "สมาชิก"})` },
    { name: "💬 สไตล์การคุย", value: profile?.chatStyle ?? "ไม่ระบุ", inline: true },
    { name: "🕒 มักออนไลน์", value: profile?.availability ?? "ไม่ระบุ", inline: true },
    { name: "🎯 ความสนใจ", value: profile ? interestLabels(profile.interests) : "ไม่ระบุ" },
  ).setTimestamp();
}

export async function notifyUser(guild: any, userId: string, content: string, match?: FriendMatch, pending = false): Promise<void> {
  const member = await guild.members.fetch(userId).catch(() => null);
  if (!member) return;
  await member.send({
    content,
    ...(pending && match ? { embeds: [pendingEmbed(guild, match)], components: [pendingRow(match.id)] } : {}),
    allowedMentions: { users: match ? [match.userA, match.userB] : [userId] },
  }).catch(() => null);
}

function voiceRequestRow(matchId: string): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`friend_voice:${matchId}`).setLabel("เข้าห้องเสียง").setEmoji("🎙️").setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(`friend_later:${matchId}`).setLabel("ไว้คุยทีหลัง").setEmoji("💬").setStyle(ButtonStyle.Secondary),
  );
}

async function notifyVoiceRequest(guild: any, userId: string, match: FriendMatch): Promise<void> {
  const member = await guild.members.fetch(userId).catch(() => null);
  if (!member) return;
  await member.send({
    content: `<@${match.voiceRequestedBy}> ขอชวนคุณเข้าห้องเสียง เมื่อคุณกดเข้าร่วมแล้วระบบจะสร้างห้องให้ทั้งคู่`,
    embeds: [matchedEmbed(guild, match)],
    components: [voiceRequestRow(match.id)],
    allowedMentions: { users: [match.voiceRequestedBy ?? userId] },
  }).catch(() => null);
}

async function createMatchVoice(guild: any, match: FriendMatch): Promise<any> {
  const existing = match.voiceChannelId ? guild.channels.cache.get(match.voiceChannelId) : null;
  if (existing?.isVoiceBased()) return existing;
  const memberA = await guild.members.fetch(match.userA).catch(() => null);
  const memberB = await guild.members.fetch(match.userB).catch(() => null);
  const channel = await guild.channels.create({
    name: `🤝 match-${(memberA?.displayName ?? "เพื่อน").slice(0, 18)}-${(memberB?.displayName ?? "เพื่อน").slice(0, 18)}`.slice(0, 100),
    type: ChannelType.GuildVoice,
    permissionOverwrites: [
      { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect] },
      { id: match.userA, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect] },
      { id: match.userB, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect] },
    ],
    position: 9999,
  });
  match.voiceChannelId = channel.id;
  match.status = "voice";
  saveFriendMatch(match);
  for (const member of [memberA, memberB]) {
    if (member?.voice.channelId) await member.voice.setChannel(channel).catch(() => null);
  }
  return channel;
}

const friendActionLocks = new Set<string>();

export async function handleFriendButton(interaction: ButtonInteraction): Promise<void> {
  const [action, matchId] = interaction.customId.split(":");
  const lockKey = `${interaction.user.id}:${action}:${matchId}`;
  if (friendActionLocks.has(lockKey)) {
    await interaction.reply({ content: "ปุ่มนี้กำลังถูกประมวลผลอยู่ กรุณารอสักครู่", ephemeral: true }).catch(() => null);
    return;
  }
  friendActionLocks.add(lockKey);
  setTimeout(() => friendActionLocks.delete(lockKey), 10_000);
  await interaction.deferUpdate().catch(() => null);
  if (!matchId) return;
  const match = getFriendMatch(matchId);
  if (!match) { await interaction.editReply({ content: "❌ ไม่พบข้อมูล match นี้แล้ว", ephemeral: true }); return; }
  const guild = interaction.client.guilds.cache.get(match.guildId);
  if (!guild) { await interaction.editReply({ content: "❌ ไม่พบเซิร์ฟเวอร์ของ match นี้", ephemeral: true }); return; }
  if (action === "friend_skip") {
    if (interaction.user.id !== match.userA || match.status !== "candidate") { await interaction.editReply({ content: "❌ ปุ่มนี้ใช้ไม่ได้แล้ว", ephemeral: true }); return; }
    match.status = "declined"; saveFriendMatch(match);
    await interaction.editReply({ content: "ข้ามคนนี้แล้ว ลองกด `/friend-match` เพื่อหาคนใหม่ได้เลย", embeds: [], components: [] });
    return;
  }
  if (action === "friend_interest") {
    if (interaction.user.id !== match.userA || match.status !== "candidate") { await interaction.editReply({ content: "❌ ปุ่มนี้ใช้ไม่ได้แล้ว", ephemeral: true }); return; }
    match.status = "pending"; saveFriendMatch(match);
    await notifyUser(guild, match.userB, `มีคนสนใจอยากคุยกับคุณแล้ว! <@${match.userA}> กำลังรอว่าคุณจะสนใจคุยด้วยไหม`, match, true);
    await interaction.editReply({ content: "✅ ส่งคำขอให้เขาแล้ว ถ้าเขาสนใจกลับ บอทจะแจ้งให้คุณทราบ", embeds: [], components: [] });
    return;
  }
  if (action === "friend_accept") {
    if (interaction.user.id !== match.userB || match.status !== "pending") { await interaction.editReply({ content: "❌ ปุ่มนี้ใช้ไม่ได้แล้ว", ephemeral: true }); return; }
    match.status = "matched"; match.matchedAt = Date.now(); saveFriendMatch(match);
    await interaction.editReply({ content: "จับคู่สำเร็จแล้ว เมื่อพร้อมคุยให้เลือกการดำเนินการต่อจากข้อความนี้", embeds: [], components: [matchRow(match.id)] });
    await notifyUser(guild, match.userA, `<@${match.userB}> ตอบรับการจับคู่แล้ว เมื่อพร้อมคุยให้เลือกเข้าห้องเสียงหรือไว้คุยทีหลัง`);
    return;
  }
  if (action === "friend_decline") {
    if (interaction.user.id !== match.userB || match.status !== "pending") { await interaction.editReply({ content: "❌ ปุ่มนี้ใช้ไม่ได้แล้ว", ephemeral: true }); return; }
    match.status = "declined"; saveFriendMatch(match);
    await interaction.editReply({ content: "รับทราบแล้ว ไม่ได้แจ้งรายละเอียดเพิ่มเติมให้อีกฝ่าย", embeds: [], components: [] });
    await notifyUser(guild, match.userA, "อีกฝ่ายยังไม่สะดวก match ในครั้งนี้ ลองหาเพื่อนคนใหม่ได้เลย");
    return;
  }
  if (action === "friend_voice") {
    if (![match.userA, match.userB].includes(interaction.user.id) || !["matched", "later"].includes(match.status)) { await interaction.editReply({ content: "❌ ปุ่มนี้ใช้ไม่ได้แล้ว", ephemeral: true }); return; }
    if (match.voiceRequestedBy === interaction.user.id) { await interaction.editReply({ content: "ส่งคำขอเข้าห้องเสียงไปแล้ว กรุณารออีกฝ่ายตอบรับ", embeds: [], components: [] }); return; }
    if (match.voiceRequestedBy && match.voiceRequestedBy !== interaction.user.id) {
      const channel = await createMatchVoice(guild, match);
      await interaction.editReply({ content: `อีกฝ่ายตอบรับแล้ว เข้ามาคุยกันได้เลย ${channel}`, embeds: [], components: [] });
      await notifyUser(guild, match.voiceRequestedBy, `อีกฝ่ายตอบรับคำขอเข้าห้องเสียงแล้ว เข้ามาคุยกันได้เลย ${channel}`);
      return;
    }
    match.voiceRequestedBy = interaction.user.id;
    saveFriendMatch(match);
    const otherId = otherUser(match, interaction.user.id);
    await interaction.editReply({ content: "ส่งคำขอเข้าห้องเสียงให้อีกฝ่ายแล้ว รอการตอบรับก่อนนะ", embeds: [], components: [] });
    await notifyVoiceRequest(guild, otherId, match);
    return;
  }
  if (action === "friend_later") {
    if (![match.userA, match.userB].includes(interaction.user.id) || !["matched", "later"].includes(match.status)) { await interaction.editReply({ content: "❌ ปุ่มนี้ใช้ไม่ได้แล้ว", ephemeral: true }); return; }
    if (match.laterBy === interaction.user.id) { await interaction.editReply({ content: "เลือกไว้คุยทีหลังไปแล้ว ไม่ต้องกดซ้ำ", embeds: [], components: [] }); return; }
    if (match.voiceRequestedBy === interaction.user.id) { match.voiceRequestedBy = undefined; }
    if (match.voiceRequestedBy && match.voiceRequestedBy !== interaction.user.id) {
      match.laterBy = interaction.user.id;
      match.status = "later"; saveFriendMatch(match);
      await interaction.editReply({ content: "รับทราบแล้ว อีกฝ่ายได้รับแจ้งว่าคุณยังไม่สะดวกเข้าห้องเสียง", embeds: [], components: [] });
      await notifyUser(guild, match.voiceRequestedBy, "อีกฝ่ายอาจยังไม่สะดวกเข้าห้องเสียงตอนนี้ ลองทักแชตคุยกันก่อนได้นะ", match);
      return;
    }
    match.laterBy = interaction.user.id;
    match.status = "later"; saveFriendMatch(match);
    await interaction.editReply({ content: "บันทึกไว้คุยทีหลังแล้ว ลองทักแชตคุยกันได้เลย", embeds: [], components: [] });
    await notifyUser(guild, otherUser(match, interaction.user.id), "พวกคุณ Match กันแล้ว อีกฝ่ายขอไว้คุยทีหลัง ลองทักแชตคุยกันดูนะ", match);
  }
}

export async function handleFriendVoiceState(oldState: VoiceState, newState: VoiceState): Promise<void> {
  const leftChannelId = oldState.channelId && oldState.channelId !== newState.channelId ? oldState.channelId : null;
  if (!leftChannelId) return;
  const match = getFriendMatchByVoiceChannel(leftChannelId);
  if (!match) return;
  const channel = oldState.guild.channels.cache.get(leftChannelId);
  if (channel?.isVoiceBased() && channel.members.size === 0) {
    try { await channel.delete("Friend match voice room is empty"); } catch { /* already deleted */ }
    match.voiceChannelId = undefined; match.status = "matched"; saveFriendMatch(match);
  }
}
