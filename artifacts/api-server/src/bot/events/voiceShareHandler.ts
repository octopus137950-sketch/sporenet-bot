import { VoiceState } from "discord.js";
import { getShare, removeShare } from "../commands/voiceshare.js";

export async function handleVoiceShareState(oldState: VoiceState, newState: VoiceState): Promise<void> {
  if (!oldState.channelId || oldState.channelId === newState.channelId || oldState.member?.user.bot) return;
  const share = removeShare(oldState.channelId, oldState.id);
  if (!share) return;
  const channel = oldState.guild.channels.cache.get(oldState.channelId);
  if (!channel?.isVoiceBased()) return;
  const messageChannel = oldState.guild.channels.cache.get(share.targetChannelId);
  if (messageChannel?.isTextBased()) {
    await messageChannel.messages.fetch(share.messageId).then((message) => message.delete("ผู้แชร์ออกจากห้องเสียงแล้ว")).catch(() => null);
  }
}
