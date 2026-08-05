import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
} from "discord.js";
import { getPlayer } from "../data/store.js";
import {
  isBossActive,
  processBossAttack,
  handleVictory,
  getBossSnapshot,
} from "../events/worldBossHandler.js";

export const data = new SlashCommandBuilder()
  .setName("attack")
  .setDescription("⚔️ โจมตีบอสโลก! (ใช้ได้เฉพาะตอนบอสปรากฏตัว)");

const ATTACK_MEDALS = ["", "🥇", "🥈", "🥉"];

export async function execute(
  interaction: ChatInputCommandInteraction
): Promise<void> {
  const guild = interaction.guild;
  if (!guild) {
    await interaction.reply({ content: "❌ ใช้ได้เฉพาะในเซิร์ฟเวอร์", ephemeral: true });
    return;
  }

  // If no active boss, reply silently
  if (!isBossActive(guild.id)) {
    await interaction.reply({
      content: "🌙 ตอนนี้ยังไม่มีบอสปรากฏตัว รอประกาศจากบอทได้เลย!",
      ephemeral: true,
    });
    return;
  }

  const player = getPlayer(interaction.user.id);
  const result = processBossAttack(guild.id, interaction.user.id, player.farmLevel);

  if (!result.hit) {
    await interaction.reply({ content: "❌ เกิดข้อผิดพลาด ลองใหม่อีกครั้ง", ephemeral: true });
    return;
  }

  // Check if boss just died
  if (result.dead) {
    await interaction.reply({
      content: `💥 **${interaction.user.displayName}** โจมตี **${result.damage.toLocaleString()}** ดาเมจ — **บอสถูกกำจัดแล้ว!** 🎉`,
    });
    await handleVictory(interaction.client, guild.id).catch(console.error);
    return;
  }

  // Build attack reply
  const boss = getBossSnapshot(guild.id);
  const hpPct = boss ? ((boss.currentHp / boss.maxHp) * 100).toFixed(1) : "?";
  const timeLeft = boss ? Math.max(0, boss.expiresAt - Date.now()) : 0;

  // Determine personal rank
  let rankLine = "";
  if (boss) {
    const sorted = [...boss.damageLogs.entries()].sort((a, b) => b[1] - a[1]);
    const rank = sorted.findIndex(([uid]) => uid === interaction.user.id) + 1;
    const medal = rank <= 3 ? ATTACK_MEDALS[rank] : `#${rank}`;
    const myDmg = boss.damageLogs.get(interaction.user.id) ?? 0;
    rankLine = `\n${medal} อันดับของคุณ: **${rank}** | ดาเมจสะสม: **${myDmg.toLocaleString()}**`;
  }

  const embed = new EmbedBuilder()
    .setColor(0xe74c3c)
    .setDescription(
      `⚔️ <@${interaction.user.id}> โจมตี **${result.damage.toLocaleString()}** ดาเมจ!\n` +
      `❤️ HP บอสเหลือ **${result.remaining.toLocaleString()}** (${hpPct}%)\n` +
      `⏰ เวลาที่เหลือ: ${Math.floor(timeLeft / 60000)} นาที ${Math.floor((timeLeft % 60000) / 1000)} วินาที` +
      rankLine
    )
    .setTimestamp();

  await interaction.reply({ embeds: [embed] });
}
