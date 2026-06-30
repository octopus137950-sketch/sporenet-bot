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
  .setName("setcasino")
  .setDescription("🎰 สร้างแผงคาสิโนในห้องนี้ (แอดมิน)")
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addStringOption((o) =>
    o.setName("title").setDescription("หัวข้อแผงคาสิโน").setRequired(false)
  )
  .addStringOption((o) =>
    o.setName("description").setDescription("คำอธิบายแผง").setRequired(false)
  );

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply({ ephemeral: true });

  const title = interaction.options.getString("title") ?? "🎰 SporeNet Casino";
  const description =
    interaction.options.getString("description") ??
    "ลองดวงกับเครื่องสล็อตสปอร์!\nกดปุ่มด้านล่างเพื่อวางเดิมพัน";

  const channel = interaction.channel as TextChannel;

  const embed = new EmbedBuilder()
    .setTitle(title)
    .setDescription(
      `${description}\n\n` +
        "**📋 ตารางรางวัล**\n" +
        "💎💎💎 — ×25 (MEGA JACKPOT!)\n" +
        "👑👑👑 — ×15\n" +
        "🍄🍄🍄 — ×12\n" +
        "⭐⭐⭐ — ×8\n" +
        "🔮🔮🔮 — ×6\n" +
        "🍀🍀🍀 — ×4\n" +
        "🍋🍋🍋 — ×3\n" +
        "🍄⭐💎 — ×2 (SporeNet Combo!)\n" +
        "สองตัวเข้า — ×1.5\n" +
        "ไม่มีอะไรเลย — ×0 (เสียเดิมพัน)"
    )
    .setColor(0xffd700)
    .setFooter({ text: "เดิมพันขั้นต่ำ 10 สปอร์ • ใช้สปอร์จากกระเป๋าของคุณ" })
    .setTimestamp();

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId("casino_bet")
      .setLabel("🎰 วางเดิมพัน")
      .setStyle(ButtonStyle.Primary)
  );

  await channel.send({ embeds: [embed], components: [row] });
  await interaction.editReply("✅ สร้างแผงคาสิโนสำเร็จ!");
}
