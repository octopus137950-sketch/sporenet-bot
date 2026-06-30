import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionFlagsBits,
  TextChannel,
} from "discord.js";
import { getShopItems } from "../data/store.js";

export const data = new SlashCommandBuilder()
  .setName("setshoppanel")
  .setDescription("🏪 สร้างแผงร้านค้าพร้อมปุ่มซื้อยศในห้องนี้ (แอดมิน)")
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addStringOption((o) =>
    o.setName("title").setDescription("หัวข้อแผงร้านค้า").setRequired(false)
  )
  .addStringOption((o) =>
    o.setName("description").setDescription("คำอธิบายแผง").setRequired(false)
  );

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply({ ephemeral: true });

  const guild = interaction.guild;
  if (!guild) {
    await interaction.editReply("❌ ใช้ได้เฉพาะในเซิร์ฟเวอร์เท่านั้น");
    return;
  }

  const title = interaction.options.getString("title") ?? "🏪 ร้านค้าสปอร์";
  const description =
    interaction.options.getString("description") ??
    "แลกสปอร์รับยศพิเศษและของรางวัลในเซิร์ฟเวอร์!\nกดปุ่มด้านล่างเพื่อดูสินค้าและซื้อ";

  const items = getShopItems(guild.id);
  const channel = interaction.channel as TextChannel;

  const itemPreview =
    items.length > 0
      ? items
          .map((item) => {
            const icon = item.type === "role" ? "🎖️" : "🎨";
            return `${icon} **${item.name}** — ${item.price.toLocaleString()} สปอร์`;
          })
          .join("\n")
      : "*ยังไม่มีสินค้า — แอดมินใช้ /addshop เพื่อเพิ่ม*";

  const embed = new EmbedBuilder()
    .setTitle(title)
    .setDescription(`${description}\n\n**🗂️ สินค้าในร้าน**\n${itemPreview}`)
    .setColor(0xf4a460)
    .setFooter({ text: "กดปุ่มด้านล่างเพื่อดูรายละเอียดและซื้อสินค้า" })
    .setTimestamp();

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId("shop_open")
      .setLabel("🛒 ซื้อยศ / สินค้า")
      .setStyle(ButtonStyle.Success)
  );

  await channel.send({ embeds: [embed], components: [row] });
  await interaction.editReply(
    `✅ สร้างแผงร้านค้าสำเร็จ! ตอนนี้มี **${items.length}** สินค้า`
  );
}
