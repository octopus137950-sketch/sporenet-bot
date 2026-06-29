import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  PermissionFlagsBits,
  TextChannel,
} from "discord.js";
import { getPlayer, savePlayer, getLogChannel } from "../data/store.js";

export const data = new SlashCommandBuilder()
  .setName("give-spore")
  .setDescription("🎁 เสกแต้มสปอร์ให้ผู้เล่น (เฉพาะแอดมิน)")
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addUserOption((o) => o.setName("player").setDescription("ผู้เล่นที่ต้องการให้แต้ม").setRequired(true))
  .addIntegerOption((o) =>
    o.setName("amount").setDescription("จำนวนสปอร์ที่ต้องการให้ (ใส่ลบได้เพื่อหัก)").setRequired(true)
  )
  .addStringOption((o) =>
    o.setName("reason").setDescription("เหตุผลที่ให้แต้ม").setRequired(false)
  );

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply({ ephemeral: true });

  const guild = interaction.guild;
  if (!guild) {
    await interaction.editReply("❌ ใช้ได้เฉพาะในเซิร์ฟเวอร์เท่านั้น");
    return;
  }

  const target = interaction.options.getUser("player", true);
  const amount = interaction.options.getInteger("amount", true);
  const reason = interaction.options.getString("reason") ?? "ไม่ระบุเหตุผล";

  const player = getPlayer(target.id);
  const before = player.sporePoints;
  player.sporePoints = Math.max(0, player.sporePoints + amount);
  savePlayer(player);

  const changeText = amount >= 0 ? `+${amount.toLocaleString()}` : `${amount.toLocaleString()}`;

  const embed = new EmbedBuilder()
    .setTitle(`${amount >= 0 ? "🎁" : "🔻"} ${amount >= 0 ? "ให้" : "หัก"}แต้มสปอร์สำเร็จ`)
    .setColor(amount >= 0 ? 0x57f287 : 0xed4245)
    .addFields(
      { name: "👤 ผู้รับ", value: `<@${target.id}> (${target.username})`, inline: true },
      { name: "💰 แต้มที่เปลี่ยน", value: `**${changeText}** สปอร์`, inline: true },
      { name: "📊 ก่อน → หลัง", value: `${before.toLocaleString()} → **${player.sporePoints.toLocaleString()}**`, inline: false },
      { name: "📝 เหตุผล", value: reason }
    )
    .setTimestamp();

  await interaction.editReply({ embeds: [embed] });

  const logChannelId = getLogChannel(guild.id);
  if (logChannelId) {
    const logChannel = guild.channels.cache.get(logChannelId) as TextChannel | undefined;
    if (logChannel) {
      const logEmbed = new EmbedBuilder()
        .setTitle(`🔑 แอดมิน${amount >= 0 ? "เสก" : "หัก"}แต้ม`)
        .setColor(0xfee75c)
        .addFields(
          { name: "🛡️ แอดมิน", value: `<@${interaction.user.id}> (${interaction.user.username})`, inline: true },
          { name: "👤 ผู้รับ", value: `<@${target.id}> (${target.username})`, inline: true },
          { name: "💰 จำนวน", value: `**${changeText}** สปอร์`, inline: true },
          { name: "📊 ก่อน → หลัง", value: `${before.toLocaleString()} → ${player.sporePoints.toLocaleString()}`, inline: true },
          { name: "📝 เหตุผล", value: reason }
        )
        .setTimestamp();
      await logChannel.send({ embeds: [logEmbed] }).catch(() => null);
    }
  }
}
