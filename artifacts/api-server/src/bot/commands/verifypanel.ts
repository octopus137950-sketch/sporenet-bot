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
import { saveVerificationPanel } from "../data/store.js";

export const data = new SlashCommandBuilder()
  .setName("verifypanel")
  .setDescription("สร้างแผงยืนยันตัวตนด้วย modal (สูงสุด 5 ฟิลด์)")
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .addStringOption((o) => o.setName("title").setDescription("หัวข้อของแผง").setRequired(true))
  .addStringOption((o) => o.setName("description").setDescription("คำอธิบาย").setRequired(true))
  .addRoleOption((o) => o.setName("role").setDescription("ยศที่จะมอบให้เมื่อยืนยัน").setRequired(true))
  .addChannelOption((o) =>
    o
      .setName("log_channel")
      .setDescription("ช่องแชทที่จะส่งรายงานผลการยืนยัน (ไม่บังคับ)")
      .setRequired(false)
      .addChannelTypes(ChannelType.GuildText)
  )
  .addStringOption((o) => o.setName("image").setDescription("URL รูปภาพ (ไม่บังคับ)").setRequired(false))
  // field 1..5 (label, placeholder, required)
  .addStringOption((o) => o.setName("field1_label").setDescription("ฟิลด์1 - ชื่อ").setRequired(false))
  .addStringOption((o) => o.setName("field1_placeholder").setDescription("ฟิลด์1 - placeholder").setRequired(false))
  .addBooleanOption((o) => o.setName("field1_required").setDescription("ฟิลด์1 จำเป็นหรือไม่").setRequired(false))

  .addStringOption((o) => o.setName("field2_label").setDescription("ฟิลด์2 - ชื่อ").setRequired(false))
  .addStringOption((o) => o.setName("field2_placeholder").setDescription("ฟิลด์2 - placeholder").setRequired(false))
  .addBooleanOption((o) => o.setName("field2_required").setDescription("ฟิลด์2 จำเป็นหรือไม่").setRequired(false))

  .addStringOption((o) => o.setName("field3_label").setDescription("ฟิลด์3 - ชื่อ").setRequired(false))
  .addStringOption((o) => o.setName("field3_placeholder").setDescription("ฟิลด์3 - placeholder").setRequired(false))
  .addBooleanOption((o) => o.setName("field3_required").setDescription("ฟิลด์3 จำเป็นหรือไม่").setRequired(false))

  .addStringOption((o) => o.setName("field4_label").setDescription("ฟิลด์4 - ชื่อ").setRequired(false))
  .addStringOption((o) => o.setName("field4_placeholder").setDescription("ฟิลด์4 - placeholder").setRequired(false))
  .addBooleanOption((o) => o.setName("field4_required").setDescription("ฟิลด์4 จำเป็นหรือไม่").setRequired(false))

  .addStringOption((o) => o.setName("field5_label").setDescription("ฟิลด์5 - ชื่อ").setRequired(false))
  .addStringOption((o) => o.setName("field5_placeholder").setDescription("ฟิลด์5 - placeholder").setRequired(false))
  .addBooleanOption((o) => o.setName("field5_required").setDescription("ฟิลด์5 จำเป็นหรือไม่").setRequired(false));

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply({ ephemeral: true });

  const guild = interaction.guild;
  if (!guild) {
    await interaction.editReply("❌ ใช้คำสั่งนี้ได้เฉพาะในเซิร์ฟเวอร์เท่านั้น");
    return;
  }

  const title = interaction.options.getString("title", true);
  const description = interaction.options.getString("description", true);
  const role = interaction.options.getRole("role", true);
  const logChannel = interaction.options.getChannel("log_channel");
  const imageUrl = interaction.options.getString("image") ?? undefined;

  const fields: { id: string; label: string; placeholder?: string; required?: boolean }[] = [];
  for (let i = 1; i <= 5; i++) {
    const label = interaction.options.getString(`field${i}_label` as any);
    if (label) {
      fields.push({
        id: `field_${i}`,
        label,
        placeholder: interaction.options.getString(`field${i}_placeholder` as any) ?? undefined,
        required: interaction.options.getBoolean(`field${i}_required` as any) ?? false,
      });
    }
  }

  if (fields.length === 0) {
    await interaction.editReply("❌ กรุณาระบุฟิลด์อย่างน้อย 1 ช่อง (field1_label เป็นต้น)");
    return;
  }

  const channel = interaction.channel as TextChannel;

  const embed = new EmbedBuilder()
    .setTitle(`🛂 ${title}`)
    .setDescription(description)
    .setColor(0x5865f2)
    .setTimestamp();

  if (imageUrl) embed.setImage(imageUrl);

  const msg = await channel.send({ embeds: [embed] });

  const button = new ButtonBuilder()
    .setCustomId(`verify_open_${msg.id}`)
    .setLabel("ยืนยันตัวตน")
    .setStyle(ButtonStyle.Primary);

  await msg.edit({ components: [new ActionRowBuilder<ButtonBuilder>().addComponents(button)] });

  saveVerificationPanel({
    guildId: guild.id,
    channelId: channel.id,
    messageId: msg.id,
    title,
    description,
    imageUrl,
    roleIdToGrant: role.id,
    fields,
    logChannelId: logChannel?.id,
  });

  await interaction.editReply(`✅ สร้างแผงยืนยันตัวตนแล้ว: ${msg.url}`);
}
