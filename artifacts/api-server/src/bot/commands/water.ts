import { ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder } from "discord.js";
import { getPlayer, getWorldMushroom, savePlayer } from "../data/store.js";
import { requireGameChannel } from "../utils/channelGuard.js";
import {
  addWorldMushroomExp,
  formatWorldMushroomReset,
  getWorldMushroomBonuses,
  worldMushroomExpForNextLevel,
} from "../utils/worldMushroom.js";

export const data = new SlashCommandBuilder()
  .setName("water")
  .setDescription("💧 บริจาคสปอร์เพื่อพัฒนาเห็ดโลก")
  .addIntegerOption((o) =>
    o.setName("amount").setDescription("จำนวนสปอร์ที่ต้องการบริจาค").setRequired(true).setMinValue(1),
  );

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!(await requireGameChannel(interaction))) return;
  await interaction.deferReply();

  const guildId = interaction.guildId;
  if (!guildId) {
    await interaction.editReply("❌ ใช้ได้เฉพาะในเซิร์ฟเวอร์เท่านั้น");
    return;
  }

  const amount = interaction.options.getInteger("amount", true);
  const player = getPlayer(interaction.user.id);
  if (player.sporePoints < amount) {
    await interaction.editReply(
      `❌ สปอร์ของคุณไม่พอ มี **${player.sporePoints.toLocaleString()}** แต่ต้องการ **${amount.toLocaleString()}** สปอร์`,
    );
    return;
  }

  player.sporePoints -= amount;
  savePlayer(player);
  const { state, levelsGained } = addWorldMushroomExp(guildId, amount, interaction.user.id);
  const bonuses = getWorldMushroomBonuses(state.level);
  const nextExp = worldMushroomExpForNextLevel(state.level);
  const levelText = levelsGained > 0 ? `\n🎊 เห็ดโลกเลเวลอัป **+${levelsGained}** ครั้ง!` : "";

  const embed = new EmbedBuilder()
    .setTitle("💧 บริจาคให้เห็ดโลกสำเร็จ!")
    .setColor(0x57f287)
    .setDescription(
      `${interaction.user} บริจาค **${amount.toLocaleString()} สปอร์** ให้เห็ดโลก${levelText}`,
    )
    .addFields(
      { name: "🍄 เห็ดโลก", value: `**Lv.${state.level}**`, inline: true },
      { name: "📈 EXP ซีซันนี้", value: `**${state.exp.toLocaleString()} / ${nextExp.toLocaleString()}**`, inline: true },
      { name: "🍄 สปอร์คงเหลือ", value: `**${player.sporePoints.toLocaleString()}**`, inline: true },
      { name: "🌱 โบนัสสปอร์ทั่วเซิร์ฟ", value: `**+${bonuses.sporeBonusPercent}%**`, inline: true },
      { name: "⚔️ โบนัสความเสียหายบอส", value: `**+${bonuses.bossDamageBonusPercent}%**`, inline: true },
      { name: "🔄 รีเซ็ตซีซัน", value: formatWorldMushroomReset(state.nextResetAt), inline: true },
    )
    .setFooter({ text: `ซีซันที่ ${state.seasonNumber} • 1 สปอร์ = 1 EXP` })
    .setTimestamp();

  await interaction.editReply({ embeds: [embed] });
}