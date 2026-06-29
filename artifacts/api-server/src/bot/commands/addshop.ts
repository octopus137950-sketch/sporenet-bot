import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  PermissionFlagsBits,
} from "discord.js";
import { addShopItem, removeShopItem, getShopItems } from "../data/store.js";
import type { ShopItem } from "../data/store.js";

export const data = new SlashCommandBuilder()
  .setName("addshop")
  .setDescription("⚙️ จัดการร้านค้า (แอดมิน)")
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addSubcommand((sub) =>
    sub
      .setName("role")
      .setDescription("เพิ่มสินค้าประเภทยศ (แลกสปอร์แล้วได้ยศอัตโนมัติ)")
      .addStringOption((o) => o.setName("id").setDescription("ID สั้นสำหรับสินค้า เช่น hunter").setRequired(true))
      .addStringOption((o) => o.setName("name").setDescription("ชื่อสินค้า").setRequired(true))
      .addStringOption((o) => o.setName("description").setDescription("คำอธิบายสินค้า").setRequired(true))
      .addIntegerOption((o) => o.setName("price").setDescription("ราคา (สปอร์)").setRequired(true).setMinValue(1))
      .addRoleOption((o) => o.setName("role").setDescription("ยศที่จะมอบให้").setRequired(true))
  )
  .addSubcommand((sub) =>
    sub
      .setName("custom")
      .setDescription("เพิ่มสินค้าประเภท Manual (แจ้งเตือนแอดมินทำให้)")
      .addStringOption((o) => o.setName("id").setDescription("ID สั้นสำหรับสินค้า เช่น color").setRequired(true))
      .addStringOption((o) => o.setName("name").setDescription("ชื่อสินค้า").setRequired(true))
      .addStringOption((o) => o.setName("description").setDescription("คำอธิบายสินค้า").setRequired(true))
      .addIntegerOption((o) => o.setName("price").setDescription("ราคา (สปอร์)").setRequired(true).setMinValue(1))
  )
  .addSubcommand((sub) =>
    sub
      .setName("remove")
      .setDescription("ลบสินค้าออกจากร้าน")
      .addStringOption((o) => o.setName("id").setDescription("ID ของสินค้าที่ต้องการลบ").setRequired(true))
  );

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply({ ephemeral: true });

  const guild = interaction.guild;
  if (!guild) {
    await interaction.editReply("❌ ใช้ได้เฉพาะในเซิร์ฟเวอร์เท่านั้น");
    return;
  }

  const sub = interaction.options.getSubcommand();

  if (sub === "remove") {
    const id = interaction.options.getString("id", true);
    const removed = removeShopItem(guild.id, id);
    await interaction.editReply(removed ? `✅ ลบสินค้า \`${id}\` สำเร็จ` : `❌ ไม่พบสินค้า ID: \`${id}\``);
    return;
  }

  const id = interaction.options.getString("id", true).toLowerCase().replace(/\s+/g, "-");
  const existing = getShopItems(guild.id).find((i) => i.id === id);
  if (existing) {
    await interaction.editReply(`❌ มีสินค้า ID \`${id}\` อยู่แล้ว ใช้ /addshop remove ก่อน`);
    return;
  }

  const item: ShopItem = {
    id,
    name: interaction.options.getString("name", true),
    description: interaction.options.getString("description", true),
    price: interaction.options.getInteger("price", true),
    type: sub as "role" | "custom",
  };

  if (sub === "role") {
    const role = interaction.options.getRole("role", true);
    item.roleId = role.id;
  }

  addShopItem(guild.id, item);

  const embed = new EmbedBuilder()
    .setTitle("✅ เพิ่มสินค้าสำเร็จ!")
    .setColor(0x57f287)
    .addFields(
      { name: "🏷️ ID", value: `\`${item.id}\``, inline: true },
      { name: "📦 ชื่อ", value: item.name, inline: true },
      { name: "💰 ราคา", value: `${item.price.toLocaleString()} สปอร์`, inline: true },
      { name: "📝 คำอธิบาย", value: item.description },
      { name: "🔖 ประเภท", value: sub === "role" ? `ยศ: <@&${item.roleId}>` : "Custom (แอดมินดำเนินการ)", inline: true }
    )
    .setTimestamp();

  await interaction.editReply({ embeds: [embed] });
}
