import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  PermissionFlagsBits,
  TextChannel,
} from "discord.js";
import { getPanel, savePanel } from "../data/store.js";

export const data = new SlashCommandBuilder()
  .setName("addrole")
  .setDescription("➕ เพิ่มอิโมจิ-ยศเข้าในแผงรับยศที่มีอยู่แล้ว")
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
  .addStringOption((o) =>
    o.setName("messageid").setDescription("Message ID ของแผงรับยศ (คลิกขวา > Copy Message ID)").setRequired(true)
  )
  .addStringOption((o) =>
    o.setName("emoji").setDescription("อิโมจิที่ต้องการเพิ่ม เช่น 🌟").setRequired(true)
  )
  .addRoleOption((o) =>
    o.setName("role").setDescription("ยศที่ต้องการผูกกับอิโมจินี้").setRequired(true)
  );

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply({ ephemeral: true });

  const guild = interaction.guild;
  if (!guild) {
    await interaction.editReply("❌ ใช้ได้เฉพาะในเซิร์ฟเวอร์เท่านั้น");
    return;
  }

  const messageId = interaction.options.getString("messageid", true).trim();
  const emoji = interaction.options.getString("emoji", true).trim();
  const role = interaction.options.getRole("role", true);

  const panel = getPanel(messageId);
  if (!panel) {
    await interaction.editReply(
      `❌ ไม่พบแผงรับยศ ID: \`${messageId}\`\nลองใช้ /listroles เพื่อดู Message ID ทั้งหมด`
    );
    return;
  }

  if (panel.roles.some((r) => r.emoji === emoji)) {
    await interaction.editReply(`❌ อิโมจิ ${emoji} มีในแผงนี้แล้ว`);
    return;
  }

  const channel = guild.channels.cache.get(panel.channelId) as TextChannel | undefined;
  if (!channel) {
    await interaction.editReply("❌ ไม่พบห้องของแผงนี้");
    return;
  }

  const message = await channel.messages.fetch(messageId).catch(() => null);
  if (!message) {
    await interaction.editReply("❌ ไม่พบข้อความของแผงนี้ อาจถูกลบไปแล้ว");
    return;
  }

  panel.roles.push({ emoji, roleId: role.id, roleName: role.name });

  const descLines = panel.roles.map((r) => `${r.emoji} = **@${r.roleName}**`).join("\n");
  const updatedEmbed = new EmbedBuilder()
    .setTitle(`🎉 | ${panel.title}`)
    .setDescription(`${descLines}\n\n${panel.description}`)
    .setColor(0x5865f2)
    .setFooter({ text: `Reaction Role${panel.exclusive ? " (เลือกได้แค่ยศเดียว)" : ""}` })
    .setTimestamp();

  if (panel.imageUrl) updatedEmbed.setImage(panel.imageUrl);

  await message.edit({ embeds: [updatedEmbed] });
  await message.react(emoji);
  savePanel(panel);

  await interaction.editReply(
    `✅ เพิ่ม ${emoji} → **@${role.name}** เข้าในแผงสำเร็จ!\nตอนนี้แผงมี ${panel.roles.length} ยศ`
  );
}
