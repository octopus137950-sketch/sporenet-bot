import { ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder } from "discord.js";
import { getWorldMushroom, saveWorldMushroom } from "../data/store.js";
import { requireGameChannel } from "../utils/channelGuard.js";

export const data = new SlashCommandBuilder()
  .setName("protect")
  .setDescription("🛡️ ปกป้องเห็ดโลกจากศัตรูพืช");

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!(await requireGameChannel(interaction))) return;
  await interaction.deferReply();

  const guildId = interaction.guildId;
  if (!guildId) {
    await interaction.editReply("❌ ใช้ได้เฉพาะในเซิร์ฟเวอร์เท่านั้น");
    return;
  }

  const state = getWorldMushroom(guildId);
  if (!state.activePest || state.activePest.expiresAt <= Date.now()) {
    await interaction.editReply("🌿 ตอนนี้ไม่มีศัตรูพืชบุก เห็ดโลกปลอดภัยดี!");
    return;
  }
  if (state.activePest.protectedBy) {
    await interaction.editReply(`🛡️ ศัตรูพืชถูกขับไล่แล้วโดย <@${state.activePest.protectedBy}>!`);
    return;
  }

  state.activePest.protectedBy = interaction.user.id;
  saveWorldMushroom(guildId, state);

  const embed = new EmbedBuilder()
    .setTitle("🛡️ ปกป้องเห็ดโลกสำเร็จ!")
    .setColor(0x57f287)
    .setDescription(
      `ศัตรูพืชถูกขับไล่โดย ${interaction.user} ภายในเวลา! เห็ดโลกปลอดภัยและไม่เสียเลเวล`,
    )
    .setTimestamp();
  await interaction.editReply({ embeds: [embed] });
}