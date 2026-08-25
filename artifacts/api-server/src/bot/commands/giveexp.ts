import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, PermissionFlagsBits, TextChannel } from "discord.js";
import { getPlayer, savePlayer, getLogChannel } from "../data/store.js";

export const data = new SlashCommandBuilder()
  .setName("give-exp")
  .setDescription("🎁 เสก EXP ให้ผู้เล่น (เฉพาะแอดมิน)")
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addUserOption((o) => o.setName("player").setDescription("ผู้เล่นที่ต้องการให้ EXP").setRequired(true))
  .addIntegerOption((o) => o.setName("amount").setDescription("จำนวน EXP ที่ต้องการให้ (ใส่ลบได้เพื่อหัก)").setRequired(true))
  .addStringOption((o) => o.setName("reason").setDescription("เหตุผลที่ให้ EXP").setRequired(false));

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply({ ephemeral: true });
  const guild = interaction.guild;
  if (!guild) { await interaction.editReply("❌ ใช้ได้เฉพาะในเซิร์ฟเวอร์เท่านั้น"); return; }
  const target = interaction.options.getUser("player", true);
  const amount = interaction.options.getInteger("amount", true);
  const reason = (interaction.options.getString("reason") ?? "ไม่ระบุเหตุผล").slice(0, 1024);
  const player = getPlayer(target.id);
  const beforeLevel = player.farmLevel, beforeExp = player.farmExp;
  player.farmExp = Math.max(0, player.farmExp + amount);
  let levelsGained = 0;
  while (amount > 0 && player.farmExp >= player.farmLevel * 100) { player.farmExp -= player.farmLevel * 100; player.farmLevel += 1; levelsGained += 1; }
  savePlayer(player);
  const changeText = amount >= 0 ? `+${amount.toLocaleString()}` : amount.toLocaleString();
  const embed = new EmbedBuilder().setTitle(`${amount >= 0 ? "🎁" : "🔻"} ${amount >= 0 ? "ให้" : "หัก"} EXP สำเร็จ`).setColor(amount >= 0 ? 0x57f287 : 0xed4245)
    .addFields(
      { name: "👤 ผู้รับ", value: `<@${target.id}> (${target.username})`, inline: true },
      { name: "⭐ EXP ที่เปลี่ยน", value: `**${changeText}** EXP`, inline: true },
      { name: "📊 EXP ก่อน → หลัง", value: `เลเวล ${beforeLevel} **${beforeExp.toLocaleString()}** → เลเวล ${player.farmLevel} **${player.farmExp.toLocaleString()}/${(player.farmLevel * 100).toLocaleString()}**` },
      { name: "📝 เหตุผล", value: reason },
    ).setTimestamp();
  if (levelsGained > 0) embed.setDescription(`🎊 เลเวลอัป **${levelsGained}** ระดับ!`);
  await interaction.editReply({ embeds: [embed] });
  const logChannelId = getLogChannel(guild.id);
  if (logChannelId) {
    const logChannel = guild.channels.cache.get(logChannelId) as TextChannel | undefined;
    if (logChannel) {
      const logEmbed = new EmbedBuilder().setTitle(`🔑 แอดมิน${amount >= 0 ? "เสก" : "หัก"} EXP`).setColor(0xfee75c)
        .addFields(
          { name: "🛡️ แอดมิน", value: `<@${interaction.user.id}> (${interaction.user.username})`, inline: true },
          { name: "👤 ผู้รับ", value: `<@${target.id}> (${target.username})`, inline: true },
          { name: "⭐ จำนวน", value: `**${changeText}** EXP`, inline: true },
          { name: "📊 เลเวล / EXP หลังแก้", value: `เลเวล ${player.farmLevel} • ${player.farmExp}/${player.farmLevel * 100}`, inline: true },
          { name: "📝 เหตุผล", value: reason },
        ).setTimestamp();
      await logChannel.send({ embeds: [logEmbed] }).catch(() => null);
    }
  }
}
