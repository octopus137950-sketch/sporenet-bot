import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
} from "discord.js";
import { getShopItems, getPlayer } from "../data/store.js";

export const data = new SlashCommandBuilder()
  .setName("shop")
  .setDescription("🏪 ดูร้านค้าและสินค้าที่แลกได้ด้วยสปอร์");

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply();

  const guild = interaction.guild;
  if (!guild) {
    await interaction.editReply("❌ ใช้ได้เฉพาะในเซิร์ฟเวอร์เท่านั้น");
    return;
  }

  const items = getShopItems(guild.id);
  const player = getPlayer(interaction.user.id);

  const embed = new EmbedBuilder()
    .setTitle("🏪 ร้านค้าสปอร์แห่งราชอาณาจักรเห็ด")
    .setColor(0xf4a460)
    .setFooter({ text: `สปอร์ของคุณ: ${player.sporePoints.toLocaleString()} แต้ม | ใช้ /buy [id] เพื่อซื้อ` })
    .setTimestamp();

  if (items.length === 0) {
    embed.setDescription("ยังไม่มีสินค้าในร้านค้า\n\nแอดมินใช้ `/addshop` เพื่อเพิ่มสินค้า");
  } else {
    const itemLines = items.map((item, i) => {
      const typeIcon = item.type === "role" ? "🎖️" : "🎨";
      const canAfford = player.sporePoints >= item.price ? "✅" : "❌";
      return `**${i + 1}. ${typeIcon} ${item.name}** \`ID: ${item.id}\`\n${item.description}\n💰 ราคา: **${item.price.toLocaleString()} สปอร์** ${canAfford}`;
    });
    embed.setDescription(itemLines.join("\n\n"));
  }

  await interaction.editReply({ embeds: [embed] });
}
