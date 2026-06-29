import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  PermissionFlagsBits,
} from "discord.js";
import { getAllPanels, deletePanel } from "../data/store.js";

export const data = new SlashCommandBuilder()
  .setName("listroles")
  .setDescription("แสดงรายการแผงรับยศทั้งหมดในเซิร์ฟเวอร์นี้")
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles);

export async function execute(
  interaction: ChatInputCommandInteraction
): Promise<void> {
  await interaction.deferReply({ ephemeral: true });

  const guild = interaction.guild;
  if (!guild) {
    await interaction.editReply("❌ ใช้คำสั่งนี้ได้เฉพาะในเซิร์ฟเวอร์เท่านั้น");
    return;
  }

  const panels = getAllPanels().filter((p) => p.guildId === guild.id);

  if (panels.length === 0) {
    await interaction.editReply("ยังไม่มีแผงรับยศในเซิร์ฟเวอร์นี้");
    return;
  }

  const embed = new EmbedBuilder()
    .setTitle("📋 แผงรับยศทั้งหมด")
    .setColor(0x5865f2)
    .setTimestamp();

  for (const panel of panels) {
    const roleList = panel.roles.map((r) => `${r.emoji} @${r.roleName}`).join(", ");
    embed.addFields({
      name: `🎉 ${panel.title}${panel.exclusive ? " (ล็อค)" : ""}`,
      value: `Channel: <#${panel.channelId}>\nMessage: ${panel.messageId}\nยศ: ${roleList}`,
    });
  }

  await interaction.editReply({ embeds: [embed] });
}
