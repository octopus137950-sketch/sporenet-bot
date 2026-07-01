import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  TextChannel,
  ChannelType,
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
  .addChannelOption((o) =>
    o
      .setName("log_channel")
      .setDescription("ห้องบันทึกผลยืนยันตัวตนใหม่ (ปล่อยว่างไม่แก้)")
      .setRequired(false)
      .addChannelTypes(ChannelType.GuildText)
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
  const newLogChannel = interaction.options.getChannel("log_channel");
  const newImage = interaction.options.getString("image");

  const panel = getVerificationPanel(messageId);
  if (!panel) {
    await interaction.editReply("❌ ไม่พบแผงยืนยันตัวตนนี้ในระบบ");
    return;
  }

  const updatedPanel: VerificationPanel = {
    ...panel,
    title: newTitle ?? panel.title,
    description: newDescription ?? panel.description,
    imageUrl: newImage ?? panel.imageUrl,
    roleIdToGrant: newRole?.id ?? panel.roleIdToGrant,
    logChannelId: newLogChannel?.id ?? panel.logChannelId,
  };

  try {
    const channel = interaction.guild?.channels.cache.get(panel.channelId) as TextChannel;
    if (!channel) {
      await interaction.editReply("❌ ไม่พบช่องแชท");
      return;
    }

    const msg = await channel.messages.fetch(messageId);

    const embed = new EmbedBuilder()
      .setTitle(`🛂 ${updatedPanel.title}`)
      .setDescription(updatedPanel.description)
      .setColor(0x5865f2)
      .setTimestamp();

    if (updatedPanel.imageUrl) embed.setImage(updatedPanel.imageUrl);

    const button = new ButtonBuilder()
      .setCustomId(`verify_open_${messageId}`)
      .setLabel("ยืนยันตัวตน")
      .setStyle(ButtonStyle.Primary);

    await msg.edit({ embeds: [embed], components: [new ActionRowBuilder<ButtonBuilder>().addComponents(button)] });

    saveVerificationPanel(updatedPanel);

    const changes: string[] = [];
    if (newTitle) changes.push(`- หัวข้อ: ✏️ เปลี่ยนเป็น "${newTitle}"`);
    if (newDescription) changes.push(`- คำอธิบาย: ✏️ เปลี่ยนแล้ว`);
    if (newRole) changes.push(`- ยศ: ✏️ เปลี่ยนเป็น <@&${newRole.id}>`);
    if (newLogChannel) changes.push(`- ห้อง log: ✏️ เปลี่ยนเป็น <#${newLogChannel.id}>`);
    if (newImage) changes.push(`- รูปภาพ: ✏️ เปลี่ยนแล้ว`);

    const summary = changes.length > 0 ? changes.join("\n") : "ไม่มีการเปลี่ยนแปลง";
    await interaction.editReply(`✅ แก้ไขแผงสำเร็จ:\n${summary}`);
  } catch (err) {
    console.error("Error editing panel:", err);
    await interaction.editReply("❌ เกิดข้อผิดพลาดในการแก้ไข");
  }
}
