import { randomUUID } from "crypto";
import { ChatInputCommandInteraction, EmbedBuilder, PermissionFlagsBits, SlashCommandBuilder, User } from "discord.js";
import { getFriendProfile, saveFriendMatch } from "../data/store.js";
import { matchRow, notifyUser } from "../friendSystem.js";

export const data = new SlashCommandBuilder()
  .setName("friend-force-match")
  .setDescription("บังคับจับคู่สมาชิกสองคนเพื่อทดสอบระบบ (แอดมิน)")
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addUserOption((option) => option.setName("member").setDescription("สมาชิกที่ต้องการจับคู่กับคุณ").setRequired(true));

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply({ ephemeral: true });
  const guild = interaction.guild;
  const target = interaction.options.getUser("member", true) as User;
  if (!guild) { await interaction.editReply("ใช้ได้เฉพาะในเซิร์ฟเวอร์เท่านั้น"); return; }
  if (target.id === interaction.user.id) { await interaction.editReply("ไม่สามารถจับคู่ตัวเองได้"); return; }

  const targetMember = await guild.members.fetch(target.id).catch(() => null);
  if (!targetMember) { await interaction.editReply("ไม่พบสมาชิกคนนี้ในเซิร์ฟเวอร์"); return; }

  const forceMatch = {
    id: randomUUID(), guildId: guild.id, userA: interaction.user.id, userB: target.id,
    status: "matched" as const, createdAt: Date.now(), matchedAt: Date.now(),
  };
  saveFriendMatch(forceMatch);

  const profile = getFriendProfile(guild.id, target.id);
  const embed = new EmbedBuilder()
    .setTitle("จับคู่สำเร็จ")
    .setDescription(`<@${interaction.user.id}> และ <@${target.id}> ถูกจับคู่เพื่อทดสอบระบบแล้ว\n\nเมื่อพร้อม ให้เลือกเข้าห้องเสียงหรือไว้คุยทีหลัง`)
    .setColor(0x57f287)
    .addFields(
      { name: "สไตล์การคุย", value: profile?.chatStyle ?? "ไม่ระบุ", inline: true },
      { name: "มักออนไลน์", value: profile?.availability ?? "ไม่ระบุ", inline: true },
      { name: "ความสนใจ", value: profile?.interests.join(", ") ?? "ไม่ระบุ" },
    );

  await interaction.editReply({ content: `ส่งการจับคู่ทดสอบให้ <@${target.id}> แล้ว`, embeds: [embed], components: [matchRow(forceMatch.id)] });
  await notifyUser(guild, target.id, `<@${interaction.user.id}> สร้าง Match ทดสอบกับคุณแล้ว`, forceMatch);
}
