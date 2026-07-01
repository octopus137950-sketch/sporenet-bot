// ============================================================
// achievement.ts — User command: /achievement list
// Shows all achievements; secrets hidden until first discovery.
// ============================================================

import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
} from "discord.js";
import {
  getGuildAchievements,
  getPlayerAchievements,
  AchievementConfig,
} from "../data/store.js";

export const data = new SlashCommandBuilder()
  .setName("achievement")
  .setDescription("🏆 ดูรายการยศความสำเร็จทั้งหมด")
  .addSubcommand((sub) =>
    sub.setName("list").setDescription("แสดงรายการยศความสำเร็จทั้งหมดในเซิร์ฟเวอร์")
  );

function buildTargetLabel(ach: AchievementConfig): string {
  switch (ach.targetType) {
    case "voice_time": {
      const h = Math.floor(ach.targetValue / 3600);
      const m = Math.floor((ach.targetValue % 3600) / 60);
      const s = ach.targetValue % 60;
      const parts: string[] = [];
      if (h > 0) parts.push(`${h} ชม.`);
      if (m > 0) parts.push(`${m} นาที`);
      if (s > 0 && h === 0) parts.push(`${s} วินาที`);
      return `อยู่ในห้องเสียงสะสม ${parts.join(" ")}`;
    }
    case "chat_count":
      return `ส่งข้อความสะสม ${ach.targetValue.toLocaleString()} ครั้ง`;
    case "farm_count":
      return `ฟาร์มเห็ดสะสม ${ach.targetValue.toLocaleString()} ครั้ง`;
  }
}

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!interaction.guild) {
    await interaction.reply({ content: "❌ ใช้ได้เฉพาะในเซิร์ฟเวอร์เท่านั้น", ephemeral: true });
    return;
  }

  await interaction.deferReply();

  const guildId      = interaction.guild.id;
  const userId       = interaction.user.id;
  const achievements = getGuildAchievements(guildId);

  if (achievements.length === 0) {
    await interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setTitle("🏆 ยศความสำเร็จ")
          .setColor(0x5865f2)
          .setDescription("ยังไม่มียศความสำเร็จในเซิร์ฟเวอร์นี้\nรอให้แอดมินสร้างผ่าน `/achievement-admin create` ก่อนนะ!")
          .setTimestamp(),
      ],
    });
    return;
  }

  const unlockedIds = new Set(
    getPlayerAchievements(guildId, userId).map((a) => a.achievementId)
  );

  const lines = achievements.map((ach) => {
    const isUnlocked = unlockedIds.has(ach.achievementId);
    const badge = isUnlocked ? "✅" : "⬜";

    // Secret & not yet discovered → hide everything
    if (ach.isSecret && !ach.isDiscovered) {
      return `${badge} 🔒 **[ยศลับ]** — เงื่อนไข: ???\n` +
             `> _รอผู้บุกเบิกคนแรกมาปลดล็อก..._`;
    }

    const rewardText = ach.sporeReward > 0 ? ` • 🍄 ${ach.sporeReward.toLocaleString()} สปอร์` : "";
    const secretBadge = ach.isSecret ? " 🔓_(เคยลับ)_" : "";
    const firstBy = ach.firstUnlockedBy
      ? `\n> 👑 บุกเบิกโดย: <@${ach.firstUnlockedBy}>`
      : "";

    return (
      `${badge} 🎖️ **${ach.titleName}**${secretBadge}\n` +
      `> 📌 ${buildTargetLabel(ach)}${rewardText}${firstBy}`
    );
  });

  const totalUnlocked = achievements.filter((a) => unlockedIds.has(a.achievementId)).length;
  const totalVisible  = achievements.length;

  const chunks: string[][] = [];
  for (let i = 0; i < lines.length; i += 8) {
    chunks.push(lines.slice(i, i + 8));
  }

  const embeds = chunks.map((chunk, idx) =>
    new EmbedBuilder()
      .setTitle(
        idx === 0
          ? `🏆 ยศความสำเร็จทั้งหมด (${totalUnlocked}/${totalVisible} ที่ปลดล็อก)`
          : "🏆 ยศความสำเร็จ (ต่อ)"
      )
      .setColor(0xffd700)
      .setDescription(chunk.join("\n\n"))
      .setTimestamp()
  );

  if (embeds.length > 0) {
    embeds[embeds.length - 1]!.setFooter({
      text: `${interaction.user.username} • ✅ = ปลดล็อกแล้ว  ⬜ = ยังไม่ได้  🔒 = ยังไม่มีใครค้นพบ`,
      iconURL: interaction.user.displayAvatarURL(),
    });
  }

  await interaction.editReply({ embeds: embeds.slice(0, 10) });
}
