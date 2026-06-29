import {
  MessageReaction,
  User,
  PartialMessageReaction,
  PartialUser,
  GuildMember,
} from "discord.js";
import { getPanel } from "../data/store.js";

export async function handleReactionRemove(
  reaction: MessageReaction | PartialMessageReaction,
  user: User | PartialUser
): Promise<void> {
  if (user.bot) return;

  if (reaction.partial) {
    try {
      await reaction.fetch();
    } catch {
      return;
    }
  }

  if (reaction.message.partial) {
    try {
      await reaction.message.fetch();
    } catch {
      return;
    }
  }

  const panel = getPanel(reaction.message.id);
  if (!panel) return;

  const guild = reaction.message.guild;
  if (!guild) return;

  const member = await guild.members.fetch(user.id).catch(() => null) as GuildMember | null;
  if (!member) return;

  const emojiKey = reaction.emoji.id
    ? `<:${reaction.emoji.name}:${reaction.emoji.id}>`
    : reaction.emoji.name ?? "";

  const matchedRole = panel.roles.find((r) => r.emoji === emojiKey);
  if (!matchedRole) return;

  const roleToRemove = guild.roles.cache.get(matchedRole.roleId);
  if (!roleToRemove) return;

  await member.roles.remove(roleToRemove).catch(() => null);
}
