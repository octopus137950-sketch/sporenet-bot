import { GuildMember, EmbedBuilder, TextChannel } from "discord.js";
import { getGuildConfig } from "../data/store.js";

function formatMessage(template: string, member: GuildMember, count: number): string {
  return template
    .replace(/{user}/g, `<@${member.id}>`)
    .replace(/{username}/g, member.user.username)
    .replace(/{count}/g, String(count));
}

function timeAgo(date: Date): string {
  const now = Date.now();
  const diff = now - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const months = Math.floor(days / 30);
  const years = Math.floor(days / 365);

  if (years > 0) return `${years} ปีที่แล้ว`;
  if (months > 0) return `${months} เดือนที่แล้ว`;
  if (days > 0) return `${days} วันที่แล้ว`;
  return "วันนี้";
}

export async function handleMemberAdd(member: GuildMember): Promise<void> {
  const config = getGuildConfig(member.guild.id);
  if (!config.welcome?.enabled) return;

  const channel = member.guild.channels.cache.get(config.welcome.channelId) as TextChannel | undefined;
  if (!channel) return;

  const memberCount = member.guild.memberCount;
  const formattedMessage = formatMessage(config.welcome.message, member, memberCount);
  const avatarUrl = member.user.displayAvatarURL({ size: 256 });
  const accountAge = timeAgo(member.user.createdAt);

  const embed = new EmbedBuilder()
    .setAuthor({
      name: `🎉 ยินดีต้อนรับสู่ ${member.guild.name}!`,
      iconURL: member.guild.iconURL() ?? undefined,
    })
    .setDescription(formattedMessage)
    .setThumbnail(avatarUrl)
    .setColor(0x57f287)
    .addFields(
      {
        name: "👤 สมาชิกใหม่",
        value: member.user.username,
        inline: true,
      },
      {
        name: "👥 สมาชิกคนที่",
        value: `${memberCount} คน`,
        inline: true,
      },
      {
        name: "📅 เข้าร่วม Discord",
        value: accountAge,
        inline: true,
      }
    )
    .setFooter({
      text: `ID: ${member.id}`,
      iconURL: avatarUrl,
    })
    .setTimestamp();

  if (config.welcome.imageUrl) {
    embed.setImage(config.welcome.imageUrl);
  }

  await channel.send({ embeds: [embed] });
}
