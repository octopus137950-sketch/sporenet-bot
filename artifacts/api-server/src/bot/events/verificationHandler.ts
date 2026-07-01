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

  // send log to panel's log channel (panel.logChannelId takes priority)
  const logChannelId = panel.logChannelId;
  if (logChannelId && interaction.guild) {
    try {
      const ch = await interaction.guild.channels.fetch(logChannelId);
      if (ch && (ch as TextBasedChannel).send) {
        const user = interaction.user;
        const avatarUrl = user.displayAvatarURL({ size: 128 });

        // Build embed with each field value shown
        const embed = new EmbedBuilder()
          .setAuthor({ name: user.displayName ?? user.username, iconURL: avatarUrl })
          .setThumbnail(avatarUrl)
          .setColor(0x5865f2)
          .setFooter({ text: `ID: ${user.id}` })
          .setTimestamp();

        for (const [label, value] of Object.entries(values)) {
          embed.addFields({ name: label, value: value || "-", inline: false });
        }

        // Message: mention + "ได้รับยศเรียบร้อยแล้ว"
        await (ch as TextBasedChannel).send({
          content: `<@${user.id}> ✅ ได้รับยศเรียบร้อยแล้ว`,
          embeds: [embed],
        });
      }
    } catch (e) {
      console.error("Failed to send verification log:", e);
    }
  }

  await interaction.editReply({ content: `✅ ยืนยันตัวตนสำเร็จแล้ว คุณได้รับยศ <@&${panel.roleIdToGrant}>` });
}
