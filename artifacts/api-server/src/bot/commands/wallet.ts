import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  GuildMember,
} from "discord.js";
import { getPlayer, getInventory } from "../data/store.js";
import { buildInventorySelectMenu } from "../events/inventoryHandler.js";
import { requireGameChannel } from "../utils/channelGuard.js";

export const data = new SlashCommandBuilder()
  .setName("wallet")
  .setDescription("👛 ดูกระเป๋าสปอร์และสถิติการฟาร์มของคุณ")
  .addUserOption((o) =>
    o.setName("player").setDescription("ดูกระเป๋าของผู้เล่นคนอื่น").setRequired(false)
  );

function expBar(current: number, max: number, length = 12): string {
  const filled = Math.round((current / max) * length);
  return "█".repeat(Math.max(0, filled)) + "░".repeat(Math.max(0, length - filled));
}

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!(await requireGameChannel(interaction))) return;
  await interaction.deferReply({ ephemeral: true });

  const target = interaction.options.getUser("player") ?? interaction.user;
  const player = getPlayer(target.id);
  const expNeeded = player.farmLevel * 100;
  const expPct = Math.round((player.farmExp / expNeeded) * 100);

  let memberDisplayName = target.username;
  if (interaction.guild) {
    const member = await interaction.guild.members.fetch(target.id).catch(() => null) as GuildMember | null;
    if (member) memberDisplayName = member.displayName;
  }

  const inv = getInventory(target.id);
  const totalItems = inv.length;
  const equippedItems = inv.filter((e) => e.isEquipped).length;
  const invText = totalItems > 0
    ? `มีไอเทม **${totalItems}** ชิ้น (สวมใส่ **${equippedItems}/3** ช่อง)`
    : "กระเป๋าว่างเปล่า — ลองฟาร์มหาไอเทมหายากดู!";

  const embed = new EmbedBuilder()
    .setAuthor({ name: `👛 กระเป๋าของ ${memberDisplayName}`, iconURL: target.displayAvatarURL() })
    .setThumbnail(target.displayAvatarURL({ size: 256 }))
    .setColor(0x5865f2)
    .addFields(
      { name: "🍄 สปอร์สะสม", value: `**${player.sporePoints.toLocaleString()}** แต้ม`, inline: true },
      { name: "⭐ เลเวลฟาร์ม", value: `**Lv.${player.farmLevel}**`, inline: true },
      { name: "🎯 โบนัสต่อครั้ง", value: `**+${(player.farmLevel - 1) * 2}** แต้ม`, inline: true },
      {
        name: `📊 EXP ${player.farmExp}/${expNeeded} (${expPct}%)`,
        value: `${expBar(player.farmExp, expNeeded)} `,
        inline: false,
      },
      { name: "🎒 กระเป๋าไอเทม", value: invText, inline: false },
    )
    .setFooter({ text: "ใช้ /farm เพื่อหาสปอร์ และโอกาสได้ไอเทมหายาก! | /transfer เพื่อโอนของ" })
    .setTimestamp();

  // Build inventory select menu (only for the user's own wallet)
  const isOwnWallet = target.id === interaction.user.id;
  const menuRow = isOwnWallet ? buildInventorySelectMenu(target.id) : null;

  const components = menuRow ? [menuRow] : [];
  await interaction.editReply({ embeds: [embed], components });
}
