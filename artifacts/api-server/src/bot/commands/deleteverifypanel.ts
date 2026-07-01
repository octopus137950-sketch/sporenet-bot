import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  ChannelType,
} from "discord.js";
import { deleteVerificationPanel, getVerificationPanel } from "../data/store.js";

export const data = new SlashCommandBuilder()
  .setName("deleteverifypanel")
  .setDescription("ลบแผงยืนยันตัวตนออกจากข้อความ")
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .addChannelOption((o) =>
    o
      .setName("channel")
      .setDescription("ช่องที่เก็บแผง")
      .setRequired(true)
      .addChannelTypes(ChannelType.GuildText)
  )
  .addStringOption((o) =>
    o
      .setName("message_id")
      .setDescription("ID ของข้อความแผง (คลิกข้อความ → Copy Message ID)")
      .setRequired(true)
  );

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply({ ephemeral: true });

  const channel = interaction.options.getChannel("channel", true);
  const messageId = interaction.options.getString("message_id", true);

  // ตรวจสอบว่ามีแผงในระบบหรือไม่
  const panel = getVerificationPanel(messageId);
  if (!panel) {
    await interaction.editReply("❌ ไม่พบแผงยืนยันตัวตนนี้ในระบบ");
    return;
  }

  try {
    // ลบข้อความในแชท
    const msg = await channel.messages.fetch(messageId);
    await msg.delete();
  } catch (err) {
    console.error("Error deleting message:", err);
    await interaction.editReply("❌ ไม่สามารถลบข้อความได้ (อาจถูกลบไปแล้ว)");
    return;
  }

  // ลบจากระบบ
  try {
    deleteVerificationPanel(messageId);
  } catch (err) {
    console.error("Error deleting panel from store:", err);
  }

  await interaction.editReply(`✅ ลบแผงยืนยันตัวตนสำเร็จ (ID: ${messageId})`);
}
