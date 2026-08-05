import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  PermissionFlagsBits,
  SlashCommandBuilder,
  TextChannel,
} from "discord.js";
import { getMarketplaceConfig, setMarketplaceConfig } from "../data/store.js";

export const data = new SlashCommandBuilder()
  .setName("marketplace")
  .setDescription("🛒 ตั้งค่าห้องตลาดกลางผู้เล่น (แอดมิน)")
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addChannelOption((option) =>
    option
      .setName("channel")
      .setDescription("ห้องที่จะใช้เป็นตลาดกลาง (ไม่ใส่ = ห้องปัจจุบัน)")
      .setRequired(false),
  );

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply({ ephemeral: true });

  const guild = interaction.guild;
  if (!guild) {
    await interaction.editReply("❌ คำสั่งนี้ใช้ได้เฉพาะในเซิร์ฟเวอร์เท่านั้น");
    return;
  }

  const selected = interaction.options.getChannel("channel");
  const channel = (selected ?? interaction.channel) as TextChannel | null;
  if (!(channel instanceof TextChannel)) {
    await interaction.editReply("❌ กรุณาเลือกห้องข้อความที่ใช้เป็นตลาดกลาง");
    return;
  }

  const previous = getMarketplaceConfig(guild.id);
  setMarketplaceConfig(guild.id, {
    channelId: channel.id,
    enabled: true,
    listingDurationMs: 7 * 24 * 60 * 60 * 1_000,
    feePercent: 5,
  });

  const embed = new EmbedBuilder()
    .setTitle("🛒 ตลาดกลางผู้เล่นพร้อมใช้งาน")
    .setColor(0x57f287)
    .setDescription(
      "ตลาดนี้ใช้สำหรับซื้อขายไอเทมระหว่างผู้เล่น\n\n" +
      "📤 ผู้ขายใช้ `/market-sell` ในห้องนี้เพื่อประกาศไอเทม\n" +
      "🛍️ ผู้ซื้อกดปุ่ม **ซื้อไอเทม** ใต้ประกาศได้ทันที\n" +
      "📜 ใช้ `/market-history` เพื่อดูประวัติการซื้อขายของตัวเอง",
    )
    .addFields(
      { name: "📍 ห้องตลาด", value: `<#${channel.id}>`, inline: true },
      { name: "🏦 ค่าธรรมเนียม", value: "5% จากราคาขาย", inline: true },
      { name: "⏳ อายุประกาศ", value: "7 วัน", inline: true },
    )
    .setFooter({
      text: previous?.channelId === channel.id
        ? "อัปเดตการตั้งค่าตลาดแล้ว"
        : "รายการขายแล้ว/ยกเลิกจะถูกลบหลังผ่านไป 1 ชั่วโมง",
    })
    .setTimestamp();

  await channel.send({ embeds: [embed] });
  await interaction.editReply(`✅ ตั้งห้องตลาดกลางเป็น <#${channel.id}> เรียบร้อยแล้ว`);
}