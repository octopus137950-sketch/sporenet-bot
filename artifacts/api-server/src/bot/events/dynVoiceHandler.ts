import {
  VoiceState,
  ChannelType,
  PermissionFlagsBits,
  EmbedBuilder,
} from "discord.js";
import { getDynVoiceConfig } from "../data/store.js";

// In-memory map: channelId → ownerId (no need to persist)
const dynRooms = new Map<string, string>();

export function getDynRoomOwner(channelId: string): string | undefined {
  return dynRooms.get(channelId);
}

export function isDynRoom(channelId: string): boolean {
  return dynRooms.has(channelId);
}

export async function handleDynVoice(
  oldState: VoiceState,
  newState: VoiceState
): Promise<void> {
  const guild = newState.guild;
  const member = newState.member ?? oldState.member;
  if (!member || member.user.bot) return;

  const config = getDynVoiceConfig(guild.id);
  if (!config || config.starterChannelIds.length === 0) return;

  // ── JOINED a starter channel ──────────────────────────────────────
  if (
    newState.channelId &&
    config.starterChannelIds.includes(newState.channelId)
  ) {
    const starterChannel = newState.channel;
    const category = starterChannel?.parent ?? undefined;

    const newChannel = await guild.channels.create({
      name: `ห้องของ ${member.displayName}`,
      type: ChannelType.GuildVoice,
      parent: category,
      userLimit: 0,
      permissionOverwrites: [
        {
          id: guild.roles.everyone.id,
          allow: [PermissionFlagsBits.Connect, PermissionFlagsBits.ViewChannel],
        },
        {
          id: member.id,
          allow: [
            PermissionFlagsBits.ManageChannels,
            PermissionFlagsBits.MoveMembers,
            PermissionFlagsBits.MuteMembers,
            PermissionFlagsBits.DeafenMembers,
          ],
        },
      ],
    });

    dynRooms.set(newChannel.id, member.id);

    try {
      await member.voice.setChannel(newChannel);
    } catch {
      // If move fails, keep the room registered
    }

    const embed = new EmbedBuilder()
      .setTitle("🎙️ ห้องเสียงส่วนตัวของคุณพร้อมแล้ว!")
      .setColor(0x5865f2)
      .setDescription(
        `ยินดีต้อนรับ <@${member.id}>! คุณเป็น **เจ้าของห้อง** นี้\n` +
          `ใช้คำสั่งด้านล่างเพื่อปรับแต่งห้องของคุณ (เฉพาะเจ้าของเท่านั้น)`
      )
      .addFields(
        {
          name: "📝 เปลี่ยนชื่อห้อง",
          value: "`/room name ชื่อใหม่`",
          inline: true,
        },
        {
          name: "👥 จำกัดจำนวนคน",
          value: "`/room limit 5`  (0 = ไม่จำกัด)",
          inline: true,
        },
        {
          name: "🔒 ล็อก / ปลดล็อกห้อง",
          value: "`/room lock`",
          inline: true,
        }
      )
      .setFooter({ text: "ห้องจะถูกลบอัตโนมัติเมื่อไม่มีคนอยู่" })
      .setTimestamp();

    try {
      await newChannel.send({ embeds: [embed] });
    } catch {
      // Voice text channel might not be available in all configurations
    }
  }

  // ── LEFT a channel ────────────────────────────────────────────────
  const leftChannelId = oldState.channelId;
  if (leftChannelId && leftChannelId !== newState.channelId) {
    if (dynRooms.has(leftChannelId)) {
      const channel = guild.channels.cache.get(leftChannelId);
      if (channel?.isVoiceBased() && channel.members.size === 0) {
        dynRooms.delete(leftChannelId);
        try {
          await channel.delete("Dynamic voice room — ไม่มีคนอยู่แล้ว");
        } catch {
          // Channel might already be deleted
        }
      }
    }
  }
}
