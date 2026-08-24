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
      .setDescription("เพิ่มสินค้ายศ (เลือกยศ + ใส่ราคา เท่านั้น)")
      .addRoleOption((o) =>
        o.setName("role").setDescription("เลือกยศ").setRequired(true)
      )
      .addIntegerOption((o) =>
        o.setName("price").setDescription("ราคา (สปอร์)").setRequired(true).setMinValue(1)
      )
      .addStringOption((o) =>
        o.setName("name").setDescription("ชื่อสินค้า (ถ้าไม่ใส่ใช้ชื่อยศ)")
      )
      .addStringOption((o) =>
        o.setName("description").setDescription("คำอธิบาย (optional)")
      )
  )
  .addSubcommand((sub) =>
    sub
      .setName("custom")
      .setDescription("เพิ่มสินค้า Manual (แจ้งเตือนแอดมิน)")
      .addStringOption((o) =>
        o.setName("id").setDescription("ID สั้น เช่น color").setRequired(true)
      )
      .addStringOption((o) =>
        o.setName("name").setDescription("ชื่อสินค้า").setRequired(true)
      )
      .addStringOption((o) =>
        o.setName("description").setDescription("คำอธิบายสินค้า").setRequired(true)
      )
      .addIntegerOption((o) =>
        o.setName("price").setDescription("ราคา (สปอร์)").setRequired(true).setMinValue(1)
      )
  )
  .addSubcommand((sub) =>
    sub
      .setName("remove")
      .setDescription("ลบสินค้าออกจากร้าน")
      .addStringOption((o) =>
        o.setName("id").setDescription("ID สินค้าที่ต้องการลบ").setRequired(true)
      )
  );

export async function execute(
  interaction: ChatInputCommandInteraction
): Promise<void> {
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
    await interaction.editReply(
      removed
        ? "✅ ลบสินค้า `" + id + "` สำเร็จ"
        : "❌ ไม่พบสินค้า ID: `" + id + "`"
    );
    return;
  }

  let item: ShopItem;

  if (sub === "role") {
    const role = interaction.options.getRole("role", true);
    const name = interaction.options.getString("name") ?? role.name;
    const id = role.name.toLowerCase().replace(/\s+/g, "-");

    const existing = getShopItems(guild.id).find((i) => i.id === id);
    if (existing) {
      await interaction.editReply(
        "❌ มีสินค้า ID `" + id + "` อยู่แล้ว ใช้ /addshop remove ก่อน"
      );
      return;
    }

    item = {
      id,
      name,
      description: interaction.options.getString("description") ?? "",
      price: interaction.options.getInteger("price", true),
      type: "role",
      roleId: role.id,
    };
  } else {
    const id = interaction.options.getString("id", true).toLowerCase().replace(/\s+/g, "-");

    const existing = getShopItems(guild.id).find((i) => i.id === id);
    if (existing) {
      await interaction.editReply(
        "❌ มีสินค้า ID `" + id + "` อยู่แล้ว ใช้ /addshop remove ก่อน"
      );
      return;
    }

    item = {
      id,
      name: interaction.options.getString("name", true),
      description: interaction.options.getString("description", true),
      price: interaction.options.getInteger("price", true),
      type: "custom",
    };
  }

  addShopItem(guild.id, item);

  const embed = new EmbedBuilder()
    .setTitle("✅ เพิ่มสินค้าสำเร็จ!")
    .setColor(0x57f287)
    .addFields(
      { name: "🏷️ ID", value: "`" + item.id + "`", inline: true },
      { name: "📦 ชื่อ", value: item.name, inline: true },
      { name: "💰 ราคา", value: item.price.toLocaleString() + " สปอร์", inline: true },
      { name: "📝 คำอธิบาย", value: item.description || "—" }
    );

  if (item.type === "role" && item.roleId) {
    embed.addFields({
      name: "🔖 ประเภท",
      value: "ยศ: <@&" + item.roleId + ">",
      inline: true,
    });
  } else {
    embed.addFields({
      name: "🔖 ประเภท",
      value: "Custom (แอดมินดำเนินการ)",
      inline: true,
    });
  }

  embed.setTimestamp();
  await interaction.editReply({ embeds: [embed] });
}
