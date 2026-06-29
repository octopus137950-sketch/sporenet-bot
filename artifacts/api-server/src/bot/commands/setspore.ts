import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  PermissionFlagsBits,
  TextChannel,
} from "discord.js";
import { getPlayer, savePlayer, getLogChannel } from "../data/store.js";

export const data = new SlashCommandBuilder()
  .setName("set-spore")
  .setDescription("⚙️ เซ็ตแต้มสปอร์ให้ผู้เล่น (เฉพาะแอดมิน)")
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addUserOption((o) => o.setName("player").setDescription("ผู้เล่นที่ต้องการเซ็ตแต้ม").setRequired(true))
  .addIntegerOption((o) =>
    o.setName("amount").setDescription("จำนวนสปอร์ที่ต้องการเซ็ต").setRequired(true).setMinValue(0)
  )
  .addStringOption((o) =>
    o.setName("reason").setDescription("เหตุผล").setRequired(false)
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
  player.sporePoints = amount;
  savePlayer(player);

  const embed = new EmbedBuilder()
    .setTitle("⚙️ เซ็ตแต้มสปอร์สำเร็จ")
    .setColor(0x5865f2)
    .addFields(
      { name: "👤 ผู้เล่น", value: `<@${target.id}> (${target.username})`, inline: true },
      { name: "📊 ก่อน → หลัง", value: `${before.toLocaleString()} → **${amount.toLocaleString()}**`, inline: true },
      { name: "📝 เหตุผล", value: reason }
    )
    .setTimestamp();

  await interaction.editReply({ embeds: [embed] });

  const logChannelId = getLogChannel(guild.id);
  if (logChannelId) {
    const logChannel = guild.channels.cache.get(logChannelId) as TextChannel | undefined;
    if (logChannel) {
      const logEmbed = new EmbedBuilder()
        .setTitle("⚙️ แอดมินเซ็ตแต้ม")
        .setColor(0xfee75c)
        .addFields(
          { name: "🛡️ แอดมิน", value: `<@${interaction.user.id}> (${interaction.user.username})`, inline: true },
          { name: "👤 ผู้เล่น", value: `<@${target.id}> (${target.username})`, inline: true },
          { name: "📊 ก่อน → หลัง", value: `${before.toLocaleString()} → ${amount.toLocaleString()}`, inline: true },
          { name: "📝 เหตุผล", value: reason }
        )
        .setTimestamp();
      await logChannel.send({ embeds: [logEmbed] }).catch(() => null);
    }
  }
}
