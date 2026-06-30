import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
} from "discord.js";
import { getTopPlayers } from "../data/store.js";
import { requireGameChannel } from "../utils/channelGuard.js";

export const data = new SlashCommandBuilder()
  .setName("leaderboard")
  .setDescription("🏆 ดูอันดับผู้เล่นที่มีสปอร์มากที่สุด");

const MEDALS = ["🥇", "🥈", "🥉"];

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!(await requireGameChannel(interaction))) return;
  await interaction.deferReply();

  const top = getTopPlayers(10);

  if (top.length === 0) {
    await interaction.editReply("ยังไม่มีผู้เล่นในระบบ ใช้ /farm เพื่อเริ่มต้น!");
    return;
  }

  const lines = top.map((p, i) => {
    const medal = MEDALS[i] ?? `**${i + 1}.**`;
    return `${medal} <@${p.userId}> — **${p.sporePoints.toLocaleString()}** 🍄 | Lv.${p.farmLevel}`;
  });

  const embed = new EmbedBuilder()
    .setTitle("🏆 อันดับนักล่าสปอร์")
    .setDescription(lines.join("\n"))
    .setColor(0xffd700)
    .setFooter({ text: "อัปเดตทุกครั้งที่ฟาร์ม" })
    .setTimestamp();

  await interaction.editReply({ embeds: [embed] });
}
