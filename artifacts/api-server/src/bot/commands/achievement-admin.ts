// ============================================================
// achievement-admin.ts — Admin commands for achievement system
// /achievement-admin create | edit | delete | list
// Restricted to Administrator permission only.
// ============================================================

import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  PermissionFlagsBits,
} from "discord.js";
import {
  getGuildAchievements,
  getAchievementById,
  saveAchievement,
  deleteAchievement,
  AchievementConfig,
  AchievementTargetType,
} from "../data/store.js";

export const data = new SlashCommandBuilder()
  .setName("achievement-admin")
  .setDescription("⚙️ จัดการระบบยศความสำเร็จ (เฉพาะแอดมิน)")
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addSubcommand((sub) =>
    sub
      .setName("create")
      .setDescription("สร้างยศความสำเร็จใหม่")
      .addStringOption((opt) =>
        opt
          .setName("title_name")
          .setDescription("ชื่อยศ/ฉายา เช่น 'นักพูดตัวยง'")
          .setRequired(true)
          .setMaxLength(50)
      )
      .addStringOption((opt) =>
        opt
          .setName("target_type")
          .setDescription("ประเภทกิจกรรมที่ตรวจสอบ")
          .setRequired(true)
          .addChoices(
            { name: "⏱️ เวลาในห้องเสียง (วินาที)", value: "voice_time" },
            { name: "💬 จำนวนข้อความที่ส่ง", value: "chat_count" },
            { name: "🍄 จำนวนครั้งที่ฟาร์มเห็ด", value: "farm_count" }
          )
      )
      .addIntegerOption((opt) =>
        opt
          .setName("target_value")
          .setDescription("ค่าตัวเลขที่ต้องสะสมให้ถึง (เช่น 3600 = 1 ชม. ในห้องเสียง)")
          .setRequired(true)
          .setMinValue(1)
      )
      .addIntegerOption((opt) =>
        opt
          .setName("spore_reward")
          .setDescription("รางวัลแต้มสปอร์เมื่อปลดล็อกสำเร็จ")
          .setRequired(true)
          .setMinValue(0)
      )
      .addBooleanOption((opt) =>
        opt
          .setName("is_secret")
          .setDescription("ซ่อนชื่อและเงื่อนไขจากผู้เล่นจนกว่าจะมีคนปลดล็อก?")
          .setRequired(true)
      )
      .addStringOption((opt) =>
        opt
          .setName("discord_role_id")
          .setDescription("(ไม่บังคับ) ID ของยศ Discord ที่จะมอบให้เมื่อปลดล็อก")
          .setRequired(false)
      )
  )
  .addSubcommand((sub) =>
    sub
      .setName("edit")
      .setDescription("แก้ไขยศความสำเร็จที่มีอยู่")
      .addStringOption((opt) =>
        opt
          .setName("achievement_id")
          .setDescription("ID ของยศความสำเร็จ (ดูได้จาก /achievement-admin list)")
          .setRequired(true)
      )
      .addStringOption((opt) =>
        opt
          .setName("title_name")
          .setDescription("ชื่อยศใหม่ (ถ้าต้องการเปลี่ยน)")
          .setRequired(false)
          .setMaxLength(50)
      )
      .addIntegerOption((opt) =>
        opt
          .setName("target_value")
          .setDescription("ค่าเงื่อนไขใหม่ (ถ้าต้องการเปลี่ยน)")
          .setRequired(false)
          .setMinValue(1)
      )
      .addIntegerOption((opt) =>
        opt
          .setName("spore_reward")
          .setDescription("รางวัลสปอร์ใหม่ (ถ้าต้องการเปลี่ยน)")
          .setRequired(false)
          .setMinValue(0)
      )
      .addBooleanOption((opt) =>
        opt
          .setName("is_secret")
          .setDescription("เปลี่ยนสถานะความลับ")
          .setRequired(false)
      )
      .addStringOption((opt) =>
        opt
          .setName("discord_role_id")
          .setDescription("ID ยศ Discord ใหม่ (พิมพ์ 'none' เพื่อลบออก)")
          .setRequired(false)
      )
  )
  .addSubcommand((sub) =>
    sub
      .setName("delete")
      .setDescription("ลบยศความสำเร็จออกจากระบบ")
      .addStringOption((opt) =>
        opt
          .setName("achievement_id")
          .setDescription("ID ของยศความสำเร็จที่ต้องการลบ")
          .setRequired(true)
      )
  )
  .addSubcommand((sub) =>
    sub
      .setName("list")
      .setDescription("ดูรายการยศความสำเร็จทั้งหมด (Admin View พร้อม ID)")
  );

// ─── Helpers ─────────────────────────────────────────────────

function generateId(): string {
  return `ach_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

function targetTypeLabel(type: AchievementTargetType): string {
  switch (type) {
    case "voice_time":  return "⏱️ เวลาห้องเสียง (วินาที)";
    case "chat_count":  return "💬 จำนวนข้อความ";
    case "farm_count":  return "🍄 จำนวนการฟาร์ม";
  }
}

function buildTargetDisplay(ach: AchievementConfig): string {
  if (ach.targetType === "voice_time") {
    const h = Math.floor(ach.targetValue / 3600);
    const m = Math.floor((ach.targetValue % 3600) / 60);
    const s = ach.targetValue % 60;
    const parts: string[] = [];
    if (h > 0) parts.push(`${h} ชม.`);
    if (m > 0) parts.push(`${m} นาที`);
    if (s > 0) parts.push(`${s} วินาที`);
    return `${ach.targetValue.toLocaleString()} วินาที (${parts.join(" ")})`;
  }
  return ach.targetValue.toLocaleString();
}

// ─── Execute ─────────────────────────────────────────────────

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!interaction.guild) {
    await interaction.reply({ content: "❌ ใช้ได้เฉพาะในเซิร์ฟเวอร์เท่านั้น", ephemeral: true });
    return;
  }

  const sub = interaction.options.getSubcommand();

  if (sub === "create") await handleCreate(interaction);
  else if (sub === "edit") await handleEdit(interaction);
  else if (sub === "delete") await handleDelete(interaction);
  else if (sub === "list") await handleAdminList(interaction);
}

// ─── /achievement-admin create ───────────────────────────────

async function handleCreate(interaction: ChatInputCommandInteraction): Promise<void> {
  const guildId = interaction.guild!.id;
  const titleName   = interaction.options.getString("title_name", true);
  const targetType  = interaction.options.getString("target_type", true) as AchievementTargetType;
  const targetValue = interaction.options.getInteger("target_value", true);
  const sporeReward = interaction.options.getInteger("spore_reward", true);
  const isSecret    = interaction.options.getBoolean("is_secret", true);
  const roleIdRaw   = interaction.options.getString("discord_role_id");

  const ach: AchievementConfig = {
    achievementId:  generateId(),
    guildId,
    titleName,
    targetType,
    targetValue,
    sporeReward,
    isSecret,
    isDiscovered:   false,
    firstUnlockedBy: null,
    discordRoleId:  roleIdRaw ?? undefined,
    createdAt:      Date.now(),
  };

  saveAchievement(ach);

  const embed = new EmbedBuilder()
    .setTitle("✅ สร้างยศความสำเร็จใหม่สำเร็จ!")
    .setColor(0x5865f2)
    .addFields(
      { name: "🆔 Achievement ID", value: `\`${ach.achievementId}\``, inline: false },
      { name: "🎖️ ชื่อยศ", value: titleName, inline: true },
      { name: "📊 ประเภท", value: targetTypeLabel(targetType), inline: true },
      { name: "🎯 เงื่อนไข", value: buildTargetDisplay(ach), inline: true },
      { name: "🍄 รางวัลสปอร์", value: sporeReward.toLocaleString(), inline: true },
      { name: "🔒 ยศลับ", value: isSecret ? "ใช่" : "ไม่ใช่", inline: true },
      { name: "🏷️ Discord Role ID", value: roleIdRaw ?? "ไม่ได้กำหนด", inline: true },
    )
    .setFooter({ text: "บันทึก ID ไว้เพื่อใช้แก้ไขหรือลบในภายหลัง" })
    .setTimestamp();

  await interaction.reply({ embeds: [embed], ephemeral: true });
}

// ─── /achievement-admin edit ─────────────────────────────────

async function handleEdit(interaction: ChatInputCommandInteraction): Promise<void> {
  const guildId       = interaction.guild!.id;
  const achievementId = interaction.options.getString("achievement_id", true).trim();
  const ach = getAchievementById(guildId, achievementId);

  if (!ach) {
    await interaction.reply({
      content: `❌ ไม่พบ Achievement ID \`${achievementId}\` ในเซิร์ฟเวอร์นี้\nดู ID ที่ถูกต้องได้จาก \`/achievement-admin list\``,
      ephemeral: true,
    });
    return;
  }

  const newTitle    = interaction.options.getString("title_name");
  const newValue    = interaction.options.getInteger("target_value");
  const newReward   = interaction.options.getInteger("spore_reward");
  const newSecret   = interaction.options.getBoolean("is_secret");
  const newRoleRaw  = interaction.options.getString("discord_role_id");

  if (newTitle  !== null) ach.titleName    = newTitle;
  if (newValue  !== null) ach.targetValue  = newValue;
  if (newReward !== null) ach.sporeReward  = newReward;
  if (newSecret !== null) ach.isSecret     = newSecret;
  if (newRoleRaw !== null) {
    ach.discordRoleId = newRoleRaw.toLowerCase() === "none" ? undefined : newRoleRaw;
  }

  saveAchievement(ach);

  const embed = new EmbedBuilder()
    .setTitle("✏️ แก้ไขยศความสำเร็จสำเร็จ!")
    .setColor(0xfee75c)
    .addFields(
      { name: "🆔 Achievement ID", value: `\`${ach.achievementId}\``, inline: false },
      { name: "🎖️ ชื่อยศ", value: ach.titleName, inline: true },
      { name: "📊 ประเภท", value: targetTypeLabel(ach.targetType), inline: true },
      { name: "🎯 เงื่อนไข", value: buildTargetDisplay(ach), inline: true },
      { name: "🍄 รางวัลสปอร์", value: ach.sporeReward.toLocaleString(), inline: true },
      { name: "🔒 ยศลับ", value: ach.isSecret ? "ใช่" : "ไม่ใช่", inline: true },
      { name: "🏷️ Discord Role ID", value: ach.discordRoleId ?? "ไม่ได้กำหนด", inline: true },
    )
    .setTimestamp();

  await interaction.reply({ embeds: [embed], ephemeral: true });
}

// ─── /achievement-admin delete ───────────────────────────────

async function handleDelete(interaction: ChatInputCommandInteraction): Promise<void> {
  const guildId       = interaction.guild!.id;
  const achievementId = interaction.options.getString("achievement_id", true).trim();
  const ach = getAchievementById(guildId, achievementId);

  if (!ach) {
    await interaction.reply({
      content: `❌ ไม่พบ Achievement ID \`${achievementId}\`\nดู ID ที่ถูกต้องได้จาก \`/achievement-admin list\``,
      ephemeral: true,
    });
    return;
  }

  deleteAchievement(guildId, achievementId);

  await interaction.reply({
    embeds: [
      new EmbedBuilder()
        .setTitle("🗑️ ลบยศความสำเร็จแล้ว")
        .setColor(0xed4245)
        .setDescription(`ยศ **${ach.titleName}** (\`${achievementId}\`) ถูกลบออกจากระบบแล้ว`)
        .setTimestamp(),
    ],
    ephemeral: true,
  });
}

// ─── /achievement-admin list ─────────────────────────────────

async function handleAdminList(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply({ ephemeral: true });

  const guildId      = interaction.guild!.id;
  const achievements = getGuildAchievements(guildId);

  if (achievements.length === 0) {
    await interaction.editReply({
      content: "📋 ยังไม่มียศความสำเร็จในเซิร์ฟเวอร์นี้ ใช้ `/achievement-admin create` เพื่อสร้าง",
    });
    return;
  }

  const chunks: AchievementConfig[][] = [];
  for (let i = 0; i < achievements.length; i += 10) {
    chunks.push(achievements.slice(i, i + 10));
  }

  const embeds = chunks.map((chunk, chunkIdx) =>
    new EmbedBuilder()
      .setTitle(chunkIdx === 0 ? `⚙️ รายการยศความสำเร็จทั้งหมด (${achievements.length} รายการ)` : "ต่อ...")
      .setColor(0x5865f2)
      .setDescription(
        chunk.map((ach) =>
          [
            `**${ach.titleName}** ${ach.isSecret ? "🔒" : "🔓"} ${ach.isDiscovered ? "✅ค้นพบแล้ว" : "❓ยังไม่ค้นพบ"}`,
            `> 🆔 \`${ach.achievementId}\``,
            `> 📊 ${targetTypeLabel(ach.targetType)} | 🎯 ${buildTargetDisplay(ach)} | 🍄 ${ach.sporeReward.toLocaleString()} สปอร์`,
            ach.firstUnlockedBy ? `> 👑 บุกเบิก: <@${ach.firstUnlockedBy}>` : "",
          ]
            .filter(Boolean)
            .join("\n")
        ).join("\n\n")
      )
      .setFooter({ text: "ใช้ ID เพื่อแก้ไข/ลบผ่าน /achievement-admin edit หรือ delete" })
  );

  await interaction.editReply({ embeds: embeds.slice(0, 10) });
}
