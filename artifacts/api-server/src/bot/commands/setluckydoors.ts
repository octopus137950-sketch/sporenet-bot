import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChatInputCommandInteraction,
  EmbedBuilder,
  PermissionFlagsBits,
  SlashCommandBuilder,
  TextChannel,
} from "discord.js";

export const data = new SlashCommandBuilder()
  .setName("setluckydoors")
  .setDescription("🚪 สร้างแผงมินิเกมสามประตูเสี่ยงโชค (แอดมิน)")
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addStringOption((o) =>
    o.setName("title").setDescription("หัวข้อแผง (ไม่บังคับ)").setRequired(false),
  )
  .addStringOption((o) =>
    o.setName("description").setDescription("คำอธิบายแผง (ไม่บังคับ)").setRequired(false),
  );

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply({ ephemeral: true });

  const channel = interaction.channel;
  if (!(channel instanceof TextChannel)) {
    await interaction.editReply("❌ คำสั่งนี้ใช้ได้เฉพาะในห้องข้อความเท่านั้น");
    return;
  }

  const title = interaction.options.getString("title") ?? "🚪 Lucky Doors — สามประตูเสี่ยงโชค";
  const description =
    interaction.options.getString("description") ??
    "วางเดิมพัน แล้วเลือก 1 ใน 3 ช่อง\nเลือกถูก รับสปอร์คืน 2 เท่า • เลือกผิด เสียเดิมพัน";

  const embed = new EmbedBuilder()
    .setTitle(title)
    .setDescription(
      `${description}\n\n` +
      "**📋 วิธีเล่น**\n" +
      "1. กดปุ่มวางเดิมพัน\n" +
      "2. ใส่จำนวนสปอร์ที่ต้องการเสี่ยง\n" +
      "3. เลือก 1 ใน 3 ช่อง\n" +
      "4. ถ้าเลือกถูก รับคืน ×2 ของเดิมพัน",
    )
    .setColor(0x5865f2)
    .setFooter({ text: "เดิมพันขั้นต่ำ 10 • สูงสุด 100,000 สปอร์ • มีช่องรางวัลเพียง 1 ช่อง" })
    .setTimestamp();

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId("luckydoors_bet")
      .setLabel("🚪 วางเดิมพัน")
      .setStyle(ButtonStyle.Primary),
  );

  await channel.send({ embeds: [embed], components: [row] });
  await interaction.editReply("✅ สร้างแผง Lucky Doors สำเร็จ!");
}