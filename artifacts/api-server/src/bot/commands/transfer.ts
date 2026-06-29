import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  TextChannel,
} from "discord.js";
import { getPlayer, savePlayer, getLogChannel } from "../data/store.js";

export const data = new SlashCommandBuilder()
  .setName("transfer")
  .setDescription("💸 โอนสปอร์ให้ผู้เล่นคนอื่น")
  .addUserOption((o) => o.setName("to").setDescription("ผู้รับสปอร์").setRequired(true))
  .addIntegerOption((o) =>
    o.setName("amount").setDescription("จำนวนสปอร์ที่ต้องการโอน").setRequired(true).setMinValue(1)
  );

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply({ ephemeral: true });

  const guild = interaction.guild;
  if (!guild) {
    await interaction.editReply("❌ ใช้ได้เฉพาะในเซิร์ฟเวอร์เท่านั้น");
    return;
  }

  const target = interaction.options.getUser("to", true);
  const amount = interaction.options.getInteger("amount", true);

  if (target.id === interaction.user.id) {
    await interaction.editReply("❌ ไม่สามารถโอนสปอร์ให้ตัวเองได้");
    return;
  }
  if (target.bot) {
    await interaction.editReply("❌ ไม่สามารถโอนสปอร์ให้บอทได้");
    return;
  }

  const sender = getPlayer(interaction.user.id);
  if (sender.sporePoints < amount) {
    await interaction.editReply(
      `❌ สปอร์ไม่พอ!\nคุณมี **${sender.sporePoints.toLocaleString()}** สปอร์\nต้องการโอน **${amount.toLocaleString()}** สปอร์`
    );
    return;
  }

  const receiver = getPlayer(target.id);
  sender.sporePoints -= amount;
  receiver.sporePoints += amount;
  savePlayer(sender);
  savePlayer(receiver);

  const embed = new EmbedBuilder()
    .setTitle("💸 โอนสปอร์สำเร็จ!")
    .setColor(0x57f287)
    .addFields(
      { name: "📤 ผู้โอน", value: `<@${interaction.user.id}>`, inline: true },
      { name: "📥 ผู้รับ", value: `<@${target.id}>`, inline: true },
      { name: "💰 จำนวนที่โอน", value: `**${amount.toLocaleString()} สปอร์**`, inline: false },
      { name: "🍄 คงเหลือ (ของคุณ)", value: `${sender.sporePoints.toLocaleString()} สปอร์`, inline: true },
      { name: "🍄 สปอร์ใหม่ (ผู้รับ)", value: `${receiver.sporePoints.toLocaleString()} สปอร์`, inline: true }
    )
    .setTimestamp();

  await interaction.editReply({ embeds: [embed] });

  const logChannelId = getLogChannel(guild.id);
  if (logChannelId) {
    const logChannel = guild.channels.cache.get(logChannelId) as TextChannel | undefined;
    if (logChannel) {
      const logEmbed = new EmbedBuilder()
        .setTitle("💸 มีการโอนสปอร์")
        .setColor(0x5865f2)
        .addFields(
          { name: "📤 ผู้โอน", value: `<@${interaction.user.id}> (${interaction.user.username})`, inline: true },
          { name: "📥 ผู้รับ", value: `<@${target.id}> (${target.username})`, inline: true },
          { name: "💰 จำนวน", value: `${amount.toLocaleString()} สปอร์`, inline: true }
        )
        .setTimestamp();
      await logChannel.send({ embeds: [logEmbed] }).catch(() => null);
    }
  }
}
