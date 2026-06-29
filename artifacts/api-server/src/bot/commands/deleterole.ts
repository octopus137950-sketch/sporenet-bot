import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  TextChannel,
} from "discord.js";
import { getPanel, deletePanel } from "../data/store.js";

export const data = new SlashCommandBuilder()
  .setName("deleterole")
  .setDescription("ลบแผงรับยศ")
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
  .addStringOption((o) =>
    o
      .setName("messageid")
      .setDescription("Message ID ของแผงที่ต้องการลบ")
      .setRequired(true)
  );

export async function execute(
  interaction: ChatInputCommandInteraction
): Promise<void> {
  await interaction.deferReply({ ephemeral: true });

  const guild = interaction.guild;
  if (!guild) {
    await interaction.editReply("❌ ใช้คำสั่งนี้ได้เฉพาะในเซิร์ฟเวอร์เท่านั้น");
    return;
  }

  const messageId = interaction.options.getString("messageid", true);
  const panel = getPanel(messageId);

  if (!panel || panel.guildId !== guild.id) {
    await interaction.editReply(`❌ ไม่พบแผง Message ID: ${messageId}`);
    return;
  }

  try {
    const channel = guild.channels.cache.get(panel.channelId) as TextChannel;
    if (channel) {
      const msg = await channel.messages.fetch(messageId).catch(() => null);
      if (msg) await msg.delete();
    }
  } catch {
    // ignore if message already deleted
  }

  deletePanel(messageId);
  await interaction.editReply(`✅ ลบแผง "${panel.title}" สำเร็จ`);
}
