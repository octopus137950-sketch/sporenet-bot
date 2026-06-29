import { GuildMember, PartialGuildMember, EmbedBuilder, TextChannel } from "discord.js";
import { getGuildConfig } from "../data/store.js";

function formatMessage(
  template: string,
  member: GuildMember | PartialGuildMember,
  count: number
): string {
  const username = member.user?.username ?? "Unknown";
  return template
    .replace(/{user}/g, `<@${member.id}>`)
    .replace(/{username}/g, username)
    .replace(/{count}/g, String(count));
}

function timeInServer(joinedAt: Date | null): string {
  if (!joinedAt) return "ไม่ทราบ";
  const diff = Date.now() - joinedAt.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const months = Math.floor(days / 30);
  const years = Math.floor(days / 365);

  if (years > 0) return `${years} ปี`;
  if (months > 0) return `${months} เดือน`;
  if (days > 0) return `${days} วัน`;
  return "น้อยกว่า 1 วัน";
}

export async function handleMemberRemove(
  member: GuildMember | PartialGuildMember
): Promise<void> {
  const config = getGuildConfig(member.guild.id);
  if (!config.goodbye?.enabled) return;

  const channel = member.guild.channels.cache.get(config.goodbye.channelId) as TextChannel | undefined;
  if (!channel) return;

  const memberCount = member.guild.memberCount;
  const formattedMessage = formatMessage(config.goodbye.message, member, memberCount);
  const avatarUrl = member.user?.displayAvatarURL({ size: 256 }) ?? undefined;
  const duration = timeInServer(member.joinedAt);
  const username = member.user?.username ?? "Unknown";

  const embed = new EmbedBuilder()
    .setAuthor({
      name: `👋 ลาก่อน!`,
      iconURL: member.guild.iconURL() ?? undefined,
    })
    .setDescription(formattedMessage)
    .setThumbnail(avatarUrl ?? null)
    .setColor(0xed4245)
    .addFields(
      {
        name: "👤 สมาชิกที่ลาจาก",
        value: username,
        inline: true,
      },
      {
        name: "👥 เหลือสมาชิก",
        value: `${memberCount} คน`,
        inline: true,
      },
      {
        name: "⏱️ อยู่ในเซิร์ฟเวอร์",
        value: duration,
        inline: true,
      }
    )
    .setFooter({
      text: `ID: ${member.id}`,
    })
    .setTimestamp();

  if (config.goodbye.imageUrl) {
    embed.setImage(config.goodbye.imageUrl);
  }

  await channel.send({ embeds: [embed] });
}
