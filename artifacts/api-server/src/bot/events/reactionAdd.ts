import {
  MessageReaction,
  User,
  PartialMessageReaction,
  PartialUser,
  GuildMember,
} from "discord.js";
import { getPanel } from "../data/store.js";

export async function handleReactionAdd(
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

  const roleToAdd = guild.roles.cache.get(matchedRole.roleId);
  if (!roleToAdd) return;

  if (panel.exclusive) {
    for (const entry of panel.roles) {
      if (entry.roleId === matchedRole.roleId) continue;
      const otherRole = guild.roles.cache.get(entry.roleId);
      if (otherRole && member.roles.cache.has(entry.roleId)) {
        await member.roles.remove(otherRole).catch(() => null);

        try {
          const msg = reaction.message;
          const existingReaction = msg.reactions.cache.find(
            (r) => (r.emoji.id ? `<:${r.emoji.name}:${r.emoji.id}>` : r.emoji.name) === entry.emoji
          );
          if (existingReaction) {
            await existingReaction.users.remove(user.id).catch(() => null);
          }
        } catch {
          // ignore
        }
      }
    }
  }

  await member.roles.add(roleToAdd).catch(() => null);
}
