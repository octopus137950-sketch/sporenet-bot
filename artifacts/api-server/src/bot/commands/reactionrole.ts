import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  PermissionFlagsBits,
  TextChannel,
  ChannelType,
} from "discord.js";
import { savePanel } from "../data/store.js";

export const data = new SlashCommandBuilder()
  .setName("reactionrole")
  .setDescription("สร้างระบบกดอิโมจิรับยศ")
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
  .addStringOption((o) =>
    o.setName("title").setDescription("หัวข้อของแผง").setRequired(true)
  )
  .addStringOption((o) =>
    o.setName("description").setDescription("คำอธิบาย").setRequired(true)
  )
  .addStringOption((o) =>
    o
      .setName("roles")
      .setDescription(
        'รายการอิโมจิ:ยศ เช่น "🍄:RoleA,⚔️:RoleB" (ชื่อยศหรือ ID)'
      )
      .setRequired(true)
  )
  .addBooleanOption((o) =>
    o
      .setName("exclusive")
      .setDescription("ล็อคให้รับได้แค่ยศเดียว (ค่าเริ่มต้น: false)")
      .setRequired(false)
  )
  .addStringOption((o) =>
    o
      .setName("image")
      .setDescription("URL รูปภาพสำหรับแสดงในแผง")
      .setRequired(false)
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

  const title = interaction.options.getString("title", true);
  const description = interaction.options.getString("description", true);
  const rolesInput = interaction.options.getString("roles", true);
  const exclusive = interaction.options.getBoolean("exclusive") ?? false;
  const imageUrl = interaction.options.getString("image") ?? undefined;

  const roleEntries: { emoji: string; roleId: string; roleName: string }[] = [];

  const pairs = rolesInput.split(",").map((s) => s.trim());
  for (const pair of pairs) {
    const idx = pair.indexOf(":");
    if (idx === -1) {
      await interaction.editReply(
        `❌ รูปแบบผิด: "${pair}" — ต้องเป็น emoji:ชื่อยศ`
      );
      return;
    }
    const emoji = pair.slice(0, idx).trim();
    const roleQuery = pair.slice(idx + 1).trim();

    const role =
      guild.roles.cache.find(
        (r) => r.name === roleQuery || r.id === roleQuery
      ) ?? null;

    if (!role) {
      await interaction.editReply(`❌ ไม่พบยศ: "${roleQuery}"`);
      return;
    }

    roleEntries.push({ emoji, roleId: role.id, roleName: role.name });
  }

  if (roleEntries.length === 0) {
    await interaction.editReply("❌ กรุณาระบุอย่างน้อย 1 ยศ");
    return;
  }

  const channel = interaction.channel as TextChannel;

  const descLines = roleEntries
    .map((r) => `${r.emoji} = **@${r.roleName}**`)
    .join("\n");

  const embed = new EmbedBuilder()
    .setTitle(`🎉 | ${title}`)
    .setDescription(`${descLines}\n\n${description}`)
    .setColor(0x5865f2)
    .setFooter({ text: `Reaction Role${exclusive ? " (เลือกได้แค่ยศเดียว)" : ""}` })
    .setTimestamp();

  if (imageUrl) {
    embed.setImage(imageUrl);
  }

  const msg = await channel.send({ embeds: [embed] });

  for (const entry of roleEntries) {
    await msg.react(entry.emoji);
  }

  savePanel({
    guildId: guild.id,
    channelId: channel.id,
    messageId: msg.id,
    title,
    description,
    imageUrl,
    exclusive,
    roles: roleEntries,
  });

  await interaction.editReply(
    `✅ สร้างแผงรับยศสำเร็จ! ดูได้ที่ ${msg.url}\n` +
      `${exclusive ? "⚠️ โหมดล็อค: รับได้แค่ยศเดียว" : "✅ โหมดปกติ: รับได้หลายยศ"}`
  );
}
