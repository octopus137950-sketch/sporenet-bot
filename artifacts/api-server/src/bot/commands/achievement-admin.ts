// ============================================================
// achievement-admin.ts — Admin commands for achievement system
// /achievement-admin create | edit | delete | list
// Supports multi-condition achievements.
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
  parseConditionsString,
  AchievementConfig,
  AchievementCondition,
  AchievementConditionType,
} from "../data/store.js";
import { conditionLabel } from "../utils/achievementChecker.js";

export const data = new SlashCommandBuilder()
  .setName("achievement-admin")
  .setDescription("⚙️ จัดการระบบยศความสำเร็จ (เฉพาะแอดมิน)")
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)

  // ── create ────────────────────────────────────────────────
  .addSubcommand((sub) =>
    sub
      .setName("create")
      .setDescription("สร้างยศความสำเร็จใหม่ (รองรับหลายเงื่อนไข)")
      .addStringOption((opt) =>
        opt
          .setName("title_name")
          .setDescription("ชื่อยศ/ฉายา เช่น 'นักสุดโหด'")
          .setRequired(true)
          .setMaxLength(50)
      )
      .addStringOption((opt) =>
        opt
          .setName("conditions")
          .setDescription("Ex: chat_count:3000,farm_count:200 | types: voice_time/chat_count/farm_count/quest_completed")
          .setRequired(true)
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

  // ── edit ──────────────────────────────────────────────────
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
      .addStringOption((opt) =>
        opt
          .setName("conditions")
          .setDescription("Ex: chat_count:3000,farm_count:200 — แทนที่เงื่อนไขเดิมทั้งหมด")
          .setRequired(false)
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

  // ── delete ────────────────────────────────────────────────
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

  // ── list ──────────────────────────────────────────────────
  .addSubcommand((sub) =>
    sub
      .setName("list")
      .setDescription("ดูรายการยศความสำเร็จทั้งหมด (Admin View พร้อม ID)")
  );

// ─── Helpers ─────────────────────────────────────────────────

function generateId(): string {
  return `ach_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

function conditionTypeEmoji(type: AchievementConditionType): string {
  switch (type) {
    case "voice_time":      return "⏱️";
    case "chat_count":      return "💬";
    case "farm_count":      return "🍄";
    case "quest_completed": return "📋";
  }
}

function conditionShortLabel(cond: AchievementCondition): string {
  const emoji = conditionTypeEmoji(cond.type);
  switch (cond.type) {
    case "voice_time": {
      const h = Math.floor(cond.value / 3600);
      const m = Math.floor((cond.value % 3600) / 60);
      const parts: string[] = [];
      if (h > 0) parts.push(`${h} ชม.`);
      if (m > 0) parts.push(`${m} นาที`);
      return `${emoji} เสียง: ${cond.value.toLocaleString()} วินาที (${parts.join(" ") || `${cond.value}s`})`;
    }
    case "chat_count":
      return `${emoji} แชท: ${cond.value.toLocaleString()} ครั้ง`;
    case "farm_count":
      return `${emoji} ฟาร์ม: ${cond.value.toLocaleString()} ครั้ง`;
    case "quest_completed":
      return `${emoji} เควส: ${cond.value.toLocaleString()} ครั้ง`;
  }
}

const CONDITION_FORMAT_HELP =
  "**รูปแบบเงื่อนไข:** `ประเภท:ค่า,ประเภท:ค่า,...`\n" +
  "**ประเภทที่รองรับ:**\n" +
  "• `voice_time` — เวลาห้องเสียง (วินาที)\n" +
  "• `chat_count` — จำนวนข้อความ\n" +
  "• `farm_count` — จำนวนการฟาร์ม\n" +
  "• `quest_completed` — จำนวนเควสสำเร็จ\n\n" +
  "**ตัวอย่าง:** `chat_count:3000,farm_count:200`\n" +
  "**50 ชั่วโมงในห้องเสียง:** `voice_time:180000`";

// ─── Execute ─────────────────────────────────────────────────

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!interaction.guild) {
    await interaction.reply({ content: "❌ ใช้ได้เฉพาะในเซิร์ฟเวอร์เท่านั้น", ephemeral: true });
    return;
  }

  const sub = interaction.options.getSubcommand();
  if (sub === "create")      await handleCreate(interaction);
  else if (sub === "edit")   await handleEdit(interaction);
  else if (sub === "delete") await handleDelete(interaction);
  else if (sub === "list")   await handleAdminList(interaction);
}

// ─── /achievement-admin create ───────────────────────────────

async function handleCreate(interaction: ChatInputCommandInteraction): Promise<void> {
  const guildId          = interaction.guild!.id;
  const titleName        = interaction.options.getString("title_name", true);
  const conditionsRaw    = interaction.options.getString("conditions", true);
  const sporeReward      = interaction.options.getInteger("spore_reward", true);
  const isSecret         = interaction.options.getBoolean("is_secret", true);
  const roleIdRaw        = interaction.options.getString("discord_role_id");

  const conditions = parseConditionsString(conditionsRaw);
  if (!conditions) {
    await interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle("❌ รูปแบบเงื่อนไขไม่ถูกต้อง")
          .setColor(0xed4245)
          .setDescription(
            `ไม่สามารถอ่านเงื่อนไข \`${conditionsRaw}\` ได้\n\n` +
            CONDITION_FORMAT_HELP
          ),
      ],
      ephemeral: true,
    });
    return;
  }

  const ach: AchievementConfig = {
    achievementId:   generateId(),
    guildId,
    titleName,
    conditions,
    sporeReward,
    isSecret,
    isDiscovered:    false,
    firstUnlockedBy: null,
    discordRoleId:   roleIdRaw ?? undefined,
    createdAt:       Date.now(),
  };

  saveAchievement(ach);

  const embed = new EmbedBuilder()
    .setTitle("✅ สร้างยศความสำเร็จใหม่สำเร็จ!")
    .setColor(0x5865f2)
    .addFields(
      { name: "🆔 Achievement ID", value: `\`${ach.achievementId}\``, inline: false },
      { name: "🎖️ ชื่อยศ", value: titleName, inline: true },
      { name: "🔒 ยศลับ", value: isSecret ? "ใช่" : "ไม่ใช่", inline: true },
      { name: "🍄 รางวัลสปอร์", value: sporeReward.toLocaleString(), inline: true },
      {
        name: `🎯 เงื่อนไข (${conditions.length} ข้อ — ต้องทำครบทุกข้อ)`,
        value: conditions.map((c) => `• ${conditionShortLabel(c)}`).join("\n"),
        inline: false,
      },
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

  const newTitle         = interaction.options.getString("title_name");
  const newConditionsRaw = interaction.options.getString("conditions");
  const newReward        = interaction.options.getInteger("spore_reward");
  const newSecret        = interaction.options.getBoolean("is_secret");
  const newRoleRaw       = interaction.options.getString("discord_role_id");

  if (newTitle  !== null) ach.titleName  = newTitle;
  if (newReward !== null) ach.sporeReward = newReward;
  if (newSecret !== null) ach.isSecret   = newSecret;
  if (newRoleRaw !== null) {
    ach.discordRoleId = newRoleRaw.toLowerCase() === "none" ? undefined : newRoleRaw;
  }

  if (newConditionsRaw !== null) {
    const parsed = parseConditionsString(newConditionsRaw);
    if (!parsed) {
      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle("❌ รูปแบบเงื่อนไขไม่ถูกต้อง")
            .setColor(0xed4245)
            .setDescription(
              `ไม่สามารถอ่านเงื่อนไข \`${newConditionsRaw}\` ได้\n\n` +
              CONDITION_FORMAT_HELP
            ),
        ],
        ephemeral: true,
      });
      return;
    }
    ach.conditions = parsed;
  }

  saveAchievement(ach);

  const embed = new EmbedBuilder()
    .setTitle("✏️ แก้ไขยศความสำเร็จสำเร็จ!")
    .setColor(0xfee75c)
    .addFields(
      { name: "🆔 Achievement ID", value: `\`${ach.achievementId}\``, inline: false },
      { name: "🎖️ ชื่อยศ", value: ach.titleName, inline: true },
      { name: "🔒 ยศลับ", value: ach.isSecret ? "ใช่" : "ไม่ใช่", inline: true },
      { name: "🍄 รางวัลสปอร์", value: ach.sporeReward.toLocaleString(), inline: true },
      {
        name: `🎯 เงื่อนไข (${ach.conditions.length} ข้อ — ต้องทำครบทุกข้อ)`,
        value: ach.conditions.map((c) => `• ${conditionShortLabel(c)}`).join("\n"),
        inline: false,
      },
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
  for (let i = 0; i < achievements.length; i += 8) {
    chunks.push(achievements.slice(i, i + 8));
  }

  const embeds = chunks.map((chunk, chunkIdx) =>
    new EmbedBuilder()
      .setTitle(
        chunkIdx === 0
          ? `⚙️ รายการยศความสำเร็จทั้งหมด (${achievements.length} รายการ)`
          : "⚙️ ต่อ..."
      )
      .setColor(0x5865f2)
      .setDescription(
        chunk.map((ach) => {
          const condLines = ach.conditions
            .map((c) => `> • ${conditionShortLabel(c)}`)
            .join("\n");
          const discovered = ach.isDiscovered ? "✅ ค้นพบแล้ว" : "❓ยังไม่ค้นพบ";
          const firstBy = ach.firstUnlockedBy
            ? `\n> 👑 บุกเบิก: <@${ach.firstUnlockedBy}>`
            : "";
          return [
            `**${ach.titleName}** ${ach.isSecret ? "🔒" : "🔓"} ${discovered}`,
            `> 🆔 \`${ach.achievementId}\``,
            `> 🍄 ${ach.sporeReward.toLocaleString()} สปอร์${ach.discordRoleId ? ` | 🏷️ <@&${ach.discordRoleId}>` : ""}`,
            `> 🎯 เงื่อนไข (${ach.conditions.length} ข้อ):`,
            condLines,
            firstBy,
          ]
            .filter(Boolean)
            .join("\n");
        }).join("\n\n")
      )
      .setFooter({ text: "ใช้ ID เพื่อแก้ไข/ลบผ่าน /achievement-admin edit หรือ delete" })
  );

  await interaction.editReply({ embeds: embeds.slice(0, 10) });
}
