import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionFlagsBits,
  TextChannel,
} from "discord.js";

export const data = new SlashCommandBuilder()
  .setName("setsporecrash")
  .setDescription("🚀 สร้างแผงมินิเกม Spore Crash ในห้องนี้ (แอดมิน)")
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addStringOption((o) =>
    o.setName("title").setDescription("หัวข้อแผง (ไม่บังคับ)").setRequired(false)
  )
  .addStringOption((o) =>
    o.setName("description").setDescription("คำอธิบายแผง (ไม่บังคับ)").setRequired(false)
  );

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply({ ephemeral: true });

  const title = interaction.options.getString("title") ?? "🚀 Spore Crash — วัดใจสายซิ่ง";
  const description =
    interaction.options.getString("description") ??
    "เดิมพันสปอร์ แล้วกดถอนให้ทันก่อนยานระเบิด!\nยิ่งรอนาน ยิ่งได้เยอะ — แต่เสี่ยงกว่า";

  const channel = interaction.channel as TextChannel;

  const embed = new EmbedBuilder()
    .setTitle(title)
    .setDescription(
      `${description}\n\n` +
      "**📊 ตารางโอกาสรอด (โดยประมาณ)**\n" +
      "🟢 **x1.20** — ~60%  (สายเพลย์เซฟ)\n" +
      "🟡 **x1.50** — ~50%  (ระดับต่ำ)\n" +
      "🟠 **x2.00** — ~40%  (วัดใจครึ่งต่อครึ่ง)\n" +
      "🔴 **x5.00** — ~20%  (โซนเสี่ยงสูง)\n" +
      "💀 **x10.0** — ~1-2% (แจ็กพอตแตก)\n\n"
    )
    .setColor(0xffa500)
    .setFooter({ text: "เดิมพันขั้นต่ำ 10 • สูงสุด 100,000 สปอร์ | ระบบ Fair Play — ไม่ระเบิดที่ x1.00" })
    .setTimestamp();

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId("crash_bet")
      .setLabel("🚀 วางเดิมพัน")
      .setStyle(ButtonStyle.Primary)
  );

  await channel.send({ embeds: [embed], components: [row] });
  await interaction.editReply("✅ สร้างแผง Spore Crash สำเร็จ!");
}
