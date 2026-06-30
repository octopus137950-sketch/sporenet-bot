import {
  ButtonInteraction,
  ModalSubmitInteraction,
  ModalBuilder,
  ActionRowBuilder,
  TextInputBuilder,
  TextInputStyle,
  EmbedBuilder,
  GuildMember,
  TextBasedChannel,
} from "discord.js";
import {
  getVerificationPanel,
  getGuildConfig,
  saveVerificationSubmission,
} from "../data/store.js";

function makeId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export async function handleVerifyButton(interaction: ButtonInteraction): Promise<void> {
  const id = interaction.customId;
  if (!id.startsWith("verify_open_")) return;
  const messageId = id.replace("verify_open_", "");
  const panel = getVerificationPanel(messageId);
  if (!panel) {
    await interaction.reply({ content: "❌ แผงนี้ไม่พบหรือถูกลบแล้ว", ephemeral: true });
    return;
  }

  const modal = new ModalBuilder()
    .setCustomId(`verify_modal_${messageId}`)
    .setTitle(panel.title ?? "ยืนยันตัวตน");

  for (const f of panel.fields) {
    const input = new TextInputBuilder()
      .setCustomId(f.id)
      .setLabel(f.label)
      .setStyle(TextInputStyle.Short)
      .setPlaceholder(f.placeholder ?? "")
      .setRequired(!!f.required)
      .setMaxLength(200);
    modal.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(input));
  }

  await interaction.showModal(modal);
}

export async function handleVerifyModal(interaction: ModalSubmitInteraction): Promise<void> {
  await interaction.deferReply({ ephemeral: true });

  const messageId = interaction.customId.replace("verify_modal_", "");
  const panel = getVerificationPanel(messageId);
  if (!panel) {
    await interaction.editReply("❌ แผงไม่พบหรือถูกลบแล้ว");
    return;
  }

  const values: Record<string, string> = {};
  for (const f of panel.fields) {
    try {
      const v = interaction.fields.getTextInputValue(f.id).trim();
      if (f.required && !v) {
        await interaction.editReply(`❌ ช่อง "${f.label}" จำเป็นต้องกรอก`);
        return;
      }
      values[f.label] = v;
    } catch (e) {
      values[f.label] = "";
    }
  }

  // save submission
  try {
    const sub = {
      id: makeId(),
      panelMessageId: messageId,
      userId: interaction.user.id,
      values,
      createdAt: Date.now(),
    };
    saveVerificationSubmission(sub);
  } catch (e) {
    console.error("Failed to save verification submission:", e);
  }

  // grant role
  const member = interaction.member as GuildMember | null;
  if (!member || !member.roles) {
    await interaction.editReply("❌ ไม่สามารถเข้าถึงข้อมูลสมาชิกได้");
    return;
  }

  if (!panel.roleIdToGrant) {
    await interaction.editReply("❌ ไม่มียศที่กำหนดให้ในแผงนี้");
    return;
  }

  try {
    await member.roles.add(panel.roleIdToGrant);
  } catch (err) {
    console.error("Error granting role:", err);
    await interaction.editReply("❌ ไม่สามารถมอบยศได้ (ตรวจสอบสิทธิ์ของบอทและตำแหน่งยศ)");
    return;
  }

  // optional: send a log to configured log channel
  const guildCfg = getGuildConfig(panel.guildId);
  if (guildCfg.logChannelId && interaction.guild) {
    try {
      const ch = await interaction.guild.channels.fetch(guildCfg.logChannelId);
      if (ch && (ch as TextBasedChannel).send) {
        const embed = new EmbedBuilder()
          .setTitle("✅ สมาชิกยืนยันตัวตน")
          .setDescription(`ผู้ใช้: ${interaction.user.tag} (${interaction.user.id})\nยศ: <@&${panel.roleIdToGrant}>\nช่องที่กรอก: ${Object.keys(values).length}`)
          .setColor(0x2ecc71)
          .setTimestamp();
        await (ch as TextBasedChannel).send({ embeds: [embed] });
      }
    } catch (e) {
      console.error("Failed to send verification log:", e);
    }
  }

  await interaction.editReply({ content: `✅ ยืนยันตัวตนสำเร็จแล้ว คุณได้รับยศ <@&${panel.roleIdToGrant}>` });
}
