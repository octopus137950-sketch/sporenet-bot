import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
} from "discord.js";
import { getAiConfig, setAiConfig } from "../data/store.js";

export const data = new SlashCommandBuilder()
  .setName("disableai")
  .setDescription("🤖 ปิดระบบ AI ราชาเห็ดสปอร์ (แอดมิน)")
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

export async function execute(
  interaction: ChatInputCommandInteraction
): Promise<void> {
  await interaction.deferReply({ ephemeral: true });

  const guild = interaction.guild;
  if (!guild) {
    await interaction.editReply("❌ ใช้คำสั่งนี้ได้เฉพาะในเซิร์ฟเวอร์เท่านั้น");
    return;
  }

  const current = getAiConfig(guild.id);

  setAiConfig(guild.id, {
    channelId: current?.channelId,
    enabled: false,
  });

  await interaction.editReply("✅ ปิดระบบ AI เรียบร้อยแล้ว");
}
