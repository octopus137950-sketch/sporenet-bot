import { ButtonInteraction, EmbedBuilder } from "discord.js";
import { getPlayer, savePlayer } from "../data/store.js";
import { getPendingBattle, clearPendingBattle } from "../data/monsterState.js";

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export async function handleMonsterFight(interaction: ButtonInteraction): Promise<void> {
  const userId = interaction.user.id;
  const battle = getPendingBattle(userId);

  if (!battle) {
    await interaction.reply({ content: "⏰ หมดเวลาต่อสู้แล้ว! กลับมาฟาร์มใหม่เถอะ", ephemeral: true });
    return;
  }

  clearPendingBattle(userId);
  await interaction.deferUpdate();

  const player = getPlayer(userId);
  const won = Math.random() * 100 < battle.winChance;

  let embed: EmbedBuilder;
  if (won) {
    const gain = randInt(battle.winMin, battle.winMax);
    player.sporePoints += gain;
    savePlayer(player);

    embed = new EmbedBuilder()
      .setTitle(`⚔️ ชนะ! ${battle.monsterEmoji} ${battle.monsterName} พ่ายแพ้!`)
      .setDescription(
        `ท่านฟาดดาบสุดแรงใส่ **${battle.monsterName}** จนมันหนีหัวซุกหัวซุน!\n\n` +
        `💰 ได้รับ **+${gain} สปอร์** จากการปล้นสะดมสมบัติมันมา!`
      )
      .setColor(0x00ff88)
      .addFields({ name: "🍄 สปอร์ปัจจุบัน", value: `**${player.sporePoints.toLocaleString()}** แต้ม`, inline: true })
      .setThumbnail(interaction.user.displayAvatarURL())
      .setFooter({ text: `${interaction.user.username} • ชนะการต่อสู้!` })
      .setTimestamp();
  } else {
    const loss = randInt(battle.lossMin, battle.lossMax);
    const actual = Math.min(loss, player.sporePoints);
    player.sporePoints = Math.max(0, player.sporePoints - actual);
    savePlayer(player);

    embed = new EmbedBuilder()
      .setTitle(`💀 แพ้! ${battle.monsterEmoji} ${battle.monsterName} ชนะ!`)
      .setDescription(
        `ท่านสู้กับ **${battle.monsterName}** ไม่ไหว ถูกทำร้ายจนหนีสโต๊ะไป!\n\n` +
        `💸 เสีย **-${actual} สปอร์** ไปกับการแพ้ครั้งนี้`
      )
      .setColor(0xff4444)
      .addFields({ name: "🍄 สปอร์ปัจจุบัน", value: `**${player.sporePoints.toLocaleString()}** แต้ม`, inline: true })
      .setThumbnail(interaction.user.displayAvatarURL())
      .setFooter({ text: `${interaction.user.username} • พ่ายแพ้การต่อสู้` })
      .setTimestamp();
  }

  await interaction.editReply({ embeds: [interaction.message.embeds[0]!, embed], components: [] });
}

export async function handleMonsterFlee(interaction: ButtonInteraction): Promise<void> {
  const userId = interaction.user.id;
  const battle = getPendingBattle(userId);

  if (!battle) {
    await interaction.reply({ content: "⏰ หมดเวลาต่อสู้แล้ว!", ephemeral: true });
    return;
  }

  clearPendingBattle(userId);
  await interaction.deferUpdate();

  const embed = new EmbedBuilder()
    .setTitle(`🏃 หนีสำเร็จ! ${battle.monsterEmoji} ${battle.monsterName} ไล่ตามไม่ทัน`)
    .setDescription(
      `ท่านรีบวิ่งหนี **${battle.monsterName}** อย่างรวดเร็ว!\n` +
      `โชคดีที่รอดมาได้ แต่ก็ไม่ได้สปอร์อะไรกลับมา 😅`
    )
    .setColor(0xffcc00)
    .setThumbnail(interaction.user.displayAvatarURL())
    .setFooter({ text: `${interaction.user.username} • หนีสำเร็จ` })
    .setTimestamp();

  await interaction.editReply({ embeds: [interaction.message.embeds[0]!, embed], components: [] });
}
