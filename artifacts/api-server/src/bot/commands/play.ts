// /play — ส่งลิงก์เปิดเว็บเกม SporeNet mushroom adventure
import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from "discord.js";

export const data = new SlashCommandBuilder()
  .setName("play")
  .setDescription("🎮 เปิดเกม SporeNet mushroom adventure บนเว็บ");

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  const gameUrl = process.env["GAME_BASE_URL"];

  if (!gameUrl) {
    await interaction.reply({
      content: "❌ ยังไม่ได้ตั้งค่า `GAME_BASE_URL` env — แอดมินต้องตั้งค่าก่อน",
      ephemeral: true,
    });
    return;
  }

  const embed = new EmbedBuilder()
    .setTitle("🎮 SporeNet — Mushroom Adventure")
    .setDescription(
      "เกมผจญภัยเห็ด voxel 3D ที่เชื่อมต่อกับบอทโดยตรง!\n\n" +
      "🍄 **ฟีเจอร์เด่น**\n" +
      "• ล็อกอินด้วย Discord (ต้องเป็นสมาชิกเซิร์ฟเวอร์)\n" +
      "• สปอร์ เลเวล EXP และไอเทม sync กับบอท\n" +
      "• เก็บเห็ด สู้มอนสเตอร์ เปิดกล่องสมบัติ\n" +
      "• ใช้น้ำยาฟื้นฟู HP และไอเทมบัฟ\n\n" +
      `🚀 **กดลิงก์เพื่อเริ่มเล่น:** [เปิดเกม](${gameUrl})`
    )
    .setColor(0x7cfc00)
    .setThumbnail("https://emojigraph.org/media/twitter/mushroom_1f344.png")
    .setFooter({ text: "SporeNet mushroom adventure" })
    .setTimestamp();

  await interaction.reply({ embeds: [embed] });
}
