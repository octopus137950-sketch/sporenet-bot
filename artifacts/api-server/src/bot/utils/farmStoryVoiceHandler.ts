import { Client, EmbedBuilder, TextChannel, VoiceState } from "discord.js";
import { getGameChannel, getInventory, getPlayer } from "../data/store.js";
import { getItemById } from "../data/itemsPool.js";
import { getSession, saveSession, type FarmStorySession } from "../data/farmStoryStore.js";

export function handleVoiceLeaveWithFarmStory(
  oldState: VoiceState,
  newState: VoiceState,
  client: Client,
): void {
  const member = newState.member ?? oldState.member;
  if (!member || member.user.bot || !oldState.channelId || newState.channelId) return;

  const session = getSession(member.id, newState.guild.id);
  if (!session) return;

  session.lastAction = "voice_leave";
  const player = getPlayer(member.id);
  session.currentSpore = player.sporePoints;
  session.currentExp = player.farmExp;
  saveSession(session);
  void sendSessionSummary(client, newState.guild.id, member.id, session);
}

async function sendSessionSummary(
  client: Client,
  guildId: string,
  userId: string,
  session: FarmStorySession,
): Promise<void> {
  const channelId = getGameChannel(guildId);
  if (!channelId) return;
  const guild = client.guilds.cache.get(guildId);
  if (!guild) return;
  const channel = guild?.channels.cache.get(channelId);
  if (!channel || !(channel instanceof TextChannel)) return;

  const player = getPlayer(userId);
  const member = await guild.members.fetch(userId).catch(() => null);
  const storyInventory = session.inventory.length
    ? session.inventory.map((item) => `${item.emoji ?? "🎁"} ${item.name} ×${item.quantity}`).join("\n")
    : "ว่างเปล่า";
  const walletInventory = getInventory(userId).map((entry) => {
    const item = getItemById(entry.itemId);
    return `${item?.emoji ?? "🎁"} ${item?.name ?? entry.itemId}${entry.isEquipped ? " (สวมใส่)" : ""}`;
  });

  const embed = new EmbedBuilder()
    .setTitle("💾 บันทึก Farm Story เมื่อออกจากห้องเสียง")
    .setColor(0x5865f2)
    .setAuthor({ name: member?.displayName ?? `User ${userId}`, iconURL: member?.user.displayAvatarURL() })
    .setDescription("เกมหยุดชั่วคราวและ autosave session แล้ว ใช้ `/farm-story` ในแชทของห้องเสียงเพื่อเล่นต่อ")
    .addFields(
      { name: "📍 Chapter", value: String(session.chapter), inline: true },
      { name: "⚔️ อาวุธ", value: `${session.weapon.emoji} ${session.weapon.name}`, inline: true },
      { name: "❤️ HP", value: `${session.currentHP}/${session.maxHP}`, inline: true },
      { name: "💙 MP", value: `${session.currentMP}/${session.maxMP}`, inline: true },
      { name: "🍄 สปอร์ / Wallet", value: player.sporePoints.toLocaleString(), inline: true },
      { name: "⭐ EXP", value: `${player.farmExp} · Lv.${player.farmLevel}`, inline: true },
      { name: "📦 Story inventory", value: storyInventory, inline: false },
      { name: "🎁 Wallet inventory", value: walletInventory.length ? walletInventory.join("\n") : "ว่างเปล่า", inline: false },
      { name: "📌 สถานะ", value: session.battle ? `กำลังสู้กับ ${session.battle.monster.name}` : session.pendingEvent?.title ?? "พร้อมเดินทางต่อ", inline: false },
    )
    .setFooter({ text: `บันทึกล่าสุด <t:${Math.floor(session.lastSavedAt / 1000)}:R>` })
    .setTimestamp();

  await channel.send({ embeds: [embed] }).catch((error) => {
    console.error("[farmStoryVoiceHandler] Could not send summary:", error);
  });
}
