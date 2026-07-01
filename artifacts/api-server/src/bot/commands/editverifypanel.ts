import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  TextChannel,
} from "discord.js";
import {
  getVerificationPanel,
  saveVerificationPanel,
  VerificationPanel,
} from "../data/store.js";

export const data = new SlashCommandBuilder()
  .setName("editverifypanel")
  .setDescription("แก้ไขแผงยืนยันตัวตนที่มีอยู่")
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .addStringOption((o) =>
    o
      .setName("message_id")
      .setDescription("ID ของข้อความแผง (คลิกข้อความ → Copy Message ID)")
      .setRequired(true)
  )
  .addStringOption((o) =>
    o.setName("title").setDescription("หัวข้อใหม่ (ปล่อยว่างไม่แก้)").setRequired(false)
  )
  .addStringOption((o) =>
    o.setName("description").setDescription("คำอธิบายใหม่ (ปล่อยว่างไม่แก้)").setRequired(false)
  )
  .addRoleOption((o) =>
    o.setName("role").setDescription("ยศใหม่ (ปล่อยว่างไม่แก้)").setRequired(false)
  )
  .addStringOption((o) =>
    o.setName("image").setDescription("รูปภาพใหม่ (ปล่อยว่างไม่แก้)").setRequired(false)
  );

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply({ ephemeral: true });

  const messageId = interaction.options.getString("message_id", true);
  const newTitle = interaction.options.getString("title");
  const newDescription = interaction.options.getString("description");
  const newRole = interaction.options.getRole("role");
  const newImage = interaction.options.getString("image");

  // ตรวจสอบว่ามีแผงในระบบหรือไม่
  const panel = getVerificationPanel(messageId);
  if (!panel) {
    await interaction.editReply("❌ ไม่พบแผงยืนยันตัวตนนี้ในระบบ");
    return;
  }

  // อัปเดตข้อมูล
  const updatedPanel: VerificationPanel = {
    ...panel,
    title: newTitle ?? panel.title,
    description: newDescription ?? panel.description,
    imageUrl: newImage ?? panel.imageUrl,
    roleIdToGrant: newRole?.id ?? panel.roleIdToGrant,
  };

  try {
    // ดึงข้อความเดิมมาแก้ไข
    const channel = interaction.guild?.channels.cache.get(panel.channelId) as TextChannel;
    if (!channel) {
      await interaction.editReply("❌ ไม่พบช่องแชท");
      return;
    }

    const msg = await channel.messages.fetch(messageId);

    // สร้าง embed ใหม่
    const embed = new EmbedBuilder()
      .setTitle(`🛂 ${updatedPanel.title}`)
      .setDescription(updatedPanel.description)
      .setColor(0x5865f2)
      .setTimestamp();

    if (updatedPanel.imageUrl) embed.setImage(updatedPanel.imageUrl);

    // อัปเดตข้อความ
    const button = new ButtonBuilder()
      .setCustomId(`verify_open_${messageId}`)
      .setLabel("ยืนยันตัวตน")
      .setStyle(ButtonStyle.Primary);

    await msg.edit({ embeds: [embed], components: [new ActionRowBuilder<ButtonBuilder>().addComponents(button)] });

    // บันทึกไป store
    saveVerificationPanel(updatedPanel);

    await interaction.editReply(
      `✅ แก้ไขแผงสำเร็จ:\n- หัวข้อ: ${newTitle ? "✏️ เปลี่ยน" : "ไม่เปลี่ยน"}\n- คำอธิบาย: ${newDescription ? "✏️ เปลี่ยน" : "ไม่เปลี่ยน"}\n- ยศ: ${newRole ? "✏️ เปลี่ยน" : "ไม่เปลี่ยน"}\n- รูป: ${newImage ? "✏️ เปลี่ยน" : "ไม่เปลี่ยน"}`
    );
  } catch (err) {
    console.error("Error editing panel:", err);
    await interaction.editReply("❌ เกิดข้อผิดพลาดในการแก้ไข");
  }
}
