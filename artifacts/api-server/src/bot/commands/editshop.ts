import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  PermissionFlagsBits,
} from "discord.js";
import { getShopItems, updateShopItem } from "../data/store.js";

export const data = new SlashCommandBuilder()
  .setName("editshop")
  .setDescription("⚙️ แก้ไขรายการสินค้าในร้านค้า (แอดมิน)")
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addStringOption((o) =>
    o
      .setName("id")
      .setDescription("ID ของสินค้าที่ต้องการแก้ไข เช่น hunter")
      .setRequired(true)
  )
  .addStringOption((o) =>
    o
      .setName("name")
      .setDescription("ชื่อสินค้าใหม่ (เว้นว่างเพื่อคงเดิม)")
      .setRequired(false)
  )
  .addStringOption((o) =>
    o
      .setName("description")
      .setDescription("คำอธิบายใหม่ (เว้นว่างเพื่อคงเดิม)")
      .setRequired(false)
  )
  .addIntegerOption((o) =>
    o
      .setName("price")
      .setDescription("ราคาใหม่ (สปอร์) (เว้นว่างเพื่อคงเดิม)")
      .setRequired(false)
      .setMinValue(1)
  )
  .addRoleOption((o) =>
    o
      .setName("role")
      .setDescription("ยศใหม่ที่จะมอบให้ (สำหรับสินค้าประเภท role เท่านั้น)")
      .setRequired(false)
  );

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply({ ephemeral: true });

  const guild = interaction.guild;
  if (!guild) {
    await interaction.editReply("❌ ใช้ได้เฉพาะในเซิร์ฟเวอร์เท่านั้น");
    return;
  }

  const id = interaction.options.getString("id", true).toLowerCase().trim();
  const items = getShopItems(guild.id);
  const item = items.find((i) => i.id === id);

  if (!item) {
    const idList = items.length > 0
      ? items.map((i) => `\`${i.id}\``).join(", ")
      : "*(ยังไม่มีสินค้า)*";
    await interaction.editReply(
      `❌ ไม่พบสินค้า ID: \`${id}\`\n\n📦 สินค้าที่มีอยู่: ${idList}`
    );
    return;
  }

  // รวบรวมเฉพาะ field ที่ผู้ใช้ระบุมา
  const newName = interaction.options.getString("name") ?? null;
  const newDescription = interaction.options.getString("description") ?? null;
  const newPrice = interaction.options.getInteger("price") ?? null;
  const newRole = interaction.options.getRole("role") ?? null;

  if (!newName && !newDescription && newPrice === null && !newRole) {
    await interaction.editReply(
      "⚠️ กรุณาระบุอย่างน้อยหนึ่ง field ที่ต้องการแก้ไข\n" +
      "`name` / `description` / `price` / `role`"
    );
    return;
  }

  if (newRole && item.type !== "role") {
    await interaction.editReply(
      `❌ สินค้า \`${id}\` เป็นประเภท **custom** ไม่สามารถตั้งค่า role ได้\n` +
      "ใช้ `/addshop remove` แล้วเพิ่มใหม่เป็นประเภท role แทน"
    );
    return;
  }

  // บันทึกค่าเดิมเพื่อแสดง changelog
  const before = { ...item };

  const updates: { name?: string; description?: string; price?: number; roleId?: string } = {};
  if (newName) updates.name = newName;
  if (newDescription) updates.description = newDescription;
  if (newPrice !== null) updates.price = newPrice;
  if (newRole) updates.roleId = newRole.id;

  const success = updateShopItem(guild.id, id, updates);
  if (!success) {
    await interaction.editReply("❌ เกิดข้อผิดพลาดในการบันทึก กรุณาลองใหม่อีกครั้ง");
    return;
  }

  // สร้าง changelog
  const changes: string[] = [];
  if (newName) changes.push(`📦 **ชื่อ:** ${before.name} → **${newName}**`);
  if (newDescription) changes.push(`📝 **คำอธิบาย:** ${before.description} → **${newDescription}**`);
  if (newPrice !== null) changes.push(`💰 **ราคา:** ${before.price.toLocaleString()} → **${newPrice.toLocaleString()}** สปอร์`);
  if (newRole) changes.push(`🎖️ **ยศ:** <@&${before.roleId ?? "ไม่มี"}> → <@&${newRole.id}>`);

  const embed = new EmbedBuilder()
    .setTitle("✅ แก้ไขสินค้าสำเร็จ!")
    .setColor(0x5865f2)
    .addFields(
      { name: "🏷️ ID", value: `\`${id}\``, inline: true },
      { name: "🔖 ประเภท", value: item.type === "role" ? "🎖️ ยศอัตโนมัติ" : "🎨 Custom", inline: true },
      { name: "📋 รายการที่เปลี่ยน", value: changes.join("\n") }
    )
    .setTimestamp()
    .setFooter({ text: `แก้ไขโดย ${interaction.user.username}` });

  await interaction.editReply({ embeds: [embed] });
}
