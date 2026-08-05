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
  SlashCommandSubcommandBuilder,
} from "discord.js";
import {
  getGuildAchievements,
  getAchievementById,
  saveAchievement,
  deleteAchievement,
  AchievementConfig,
  AchievementCondition,
  AchievementConditionType,
} from "../data/store.js";
import { conditionLabel } from "../utils/achievementChecker.js";

const CONDITION_TYPE_CHOICES: { name: string; value: AchievementConditionType }[] = [
  { name: "💬 จำนวนข้อความ", value: "chat_count" },
  { name: "🍄 จำนวนครั้งที่ฟาร์ม", value: "farm_count" },
  { name: "⏱️ เวลาในห้องเสียง (วินาที)", value: "voice_time" },
  { name: "📋 จำนวนเควสที่ทำสำเร็จ", value: "quest_completed" },
];

function addConditionOptions(
  sub: SlashCommandSubcommandBuilder,
  index: number,
  required: boolean,
): SlashCommandSubcommandBuilder {
  sub.addStringOption((opt) =>
    opt
      .setName(`condition${index}_type`)
      .setDescription(`ประเภทเงื่อนไขข้อที่ ${index}`)
      .setRequired(required)
      .addChoices(...CONDITION_TYPE_CHOICES)
  );
  sub.addIntegerOption((opt) =>
    opt
      .setName(`condition${index}_value`)
      .setDescription(`จำนวนเป้าหมายของเงื่อนไขข้อที่ ${index}`)
      .setRequired(required)
      .setMinValue(1)
  );
  return sub;
}

export const data = new SlashCommandBuilder()
  .setName("achievement-admin")
  .setDescription("⚙️ จัดการระบบยศความสำเร็จ (เฉพาะแอดมิน)")
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)

  // ── create ────────────────────────────────────────────────
  .addSubcommand((sub) => {
    sub
      .setName("create")
      .setDescription("สร้างยศความสำเร็จใหม่ (รองรับหลายเงื่อนไข)")
      .addStringOption((opt) =>
        opt
          .setName("title_name")
          .setDescription("ชื่อยศ/ฉายา เช่น 'นักสุดโหด'")
          .setRequired(true)
          .setMaxLength(50)
      );
    addConditionOptions(sub, 1, true);
    sub
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
      .addRoleOption((opt) =>
        opt
          .setName("discord_role")
          .setDescription("(ไม่บังคับ) เลือกยศ Discord ที่จะมอบให้เมื่อปลดล็อก")
          .setRequired(false)
      );
    addConditionOptions(sub, 2, false);
    addConditionOptions(sub, 3, false);
    return sub;
  })

  // ── edit ──────────────────────────────────────────────────
  .addSubcommand((sub) => {
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
      );
    addConditionOptions(sub, 1, false);
    addConditionOptions(sub, 2, false);
    addConditionOptions(sub, 3, false);
    sub
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
      .addRoleOption((opt) =>
        opt
          .setName("discord_role")
          .setDescription("เลือกยศ Discord ใหม่ (ถ้าไม่ใส่จะคงค่าเดิม)")
          .setRequired(false)
      )
      .addBooleanOption((opt) =>
        opt
          .setName("remove_discord_role")
          .setDescription("เอายศ Discord ที่ผูกไว้ออกหรือไม่")
          .setRequired(false)
      );
    return sub;
  })

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

  // ── delete-secret ─────────────────────────────────────────
  .addSubcommand((sub) =>
    sub
      .setName("delete-secret")
      .setDescription("ลบยศลับ (isSecret=true) ออกทั้งหมดในเซิร์ฟเวอร์นี้")
      .addBooleanOption((opt) =>
        opt
          .setName("confirm")
          .setDescription("พิมพ์ true เพื่อยืนยันการลบ — ไม่สามารถกู้คืนได้!")
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
  "กรุณาเลือกประเภทเงื่อนไขและใส่จำนวนเป้าหมายให้ครบเป็นคู่\n" +
  "เพิ่มได้สูงสุด 3 เงื่อนไข และผู้เล่นต้องทำครบทุกข้อ";

function getConditionsFromOptions(
  interaction: ChatInputCommandInteraction,
  requiredFirst: boolean,
): AchievementCondition[] | null {
  const conditions: AchievementCondition[] = [];

  for (let index = 1; index <= 3; index += 1) {
    const type = interaction.options.getString(`condition${index}_type`);
    const value = interaction.options.getInteger(`condition${index}_value`);

    if (type === null && value === null) {
      if (index === 1 && requiredFirst) return null;
      continue;
    }
    if (type === null || value === null) return null;
    conditions.push({ type: type as AchievementConditionType, value });
  }

  return conditions.length > 0 ? conditions : null;
}

async function getAssignableRole(
  roleId: string,
  interaction: ChatInputCommandInteraction,
) {
  const role = await interaction.guild?.roles.fetch(roleId).catch(() => null);
  if (!role || role.managed || role.id === interaction.guildId) return null;
  const member = await interaction.guild?.members.fetchMe().catch(() => null);
  if (!member || role.position >= member.roles.highest.position) return null;
  return role;
}

// ─── Execute ─────────────────────────────────────────────────

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!interaction.guild) {
    await interaction.reply({ content: "❌ ใช้ได้เฉพาะในเซิร์ฟเวอร์เท่านั้น", ephemeral: true });
    return;
  }

  const sub = interaction.options.getSubcommand();
  if (sub === "create")              await handleCreate(interaction);
  else if (sub === "edit")           await handleEdit(interaction);
  else if (sub === "delete")         await handleDelete(interaction);
  else if (sub === "delete-secret")  await handleDeleteSecret(interaction);
  else if (sub === "list")           await handleAdminList(interaction);
}

// ─── /achievement-admin create ───────────────────────────────

async function handleCreate(interaction: ChatInputCommandInteraction): Promise<void> {
  const guildId          = interaction.guild!.id;
  const titleName        = interaction.options.getString("title_name", true);
  const sporeReward      = interaction.options.getInteger("spore_reward", true);
  const isSecret         = interaction.options.getBoolean("is_secret", true);
  const selectedRole     = interaction.options.getRole("discord_role");

  const conditions = getConditionsFromOptions(interaction, true);
  if (!conditions) {
    await interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle("❌ รูปแบบเงื่อนไขไม่ถูกต้อง")
          .setColor(0xed4245)
          .setDescription(
            "ต้องเลือกประเภทและใส่จำนวนของเงื่อนไขข้อที่ 1 ให้ครบ\n\n" +
            CONDITION_FORMAT_HELP
          ),
      ],
      ephemeral: true,
    });
    return;
  }

  const assignableRole = selectedRole
    ? await getAssignableRole(selectedRole.id, interaction)
    : null;
  if (selectedRole && !assignableRole) {
    await interaction.reply({
      content: "❌ ยศนี้เป็นยศระบบ/ยศ Integration หรืออยู่สูงกว่ายศบอท จึงมอบให้ผู้เล่นไม่ได้",
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
    discordRoleId:   assignableRole?.id,
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
      { name: "🏷️ ยศ Discord", value: assignableRole ? `<@&${assignableRole.id}>` : "ไม่ได้กำหนด", inline: true },
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
  const newReward        = interaction.options.getInteger("spore_reward");
  const newSecret        = interaction.options.getBoolean("is_secret");
  const newRole          = interaction.options.getRole("discord_role");
  const removeRole       = interaction.options.getBoolean("remove_discord_role") ?? false;

  let replacementRoleId: string | undefined = ach.discordRoleId;
  if (removeRole) {
    replacementRoleId = undefined;
  } else if (newRole) {
    const assignableRole = await getAssignableRole(newRole.id, interaction);
    if (!assignableRole) {
      await interaction.reply({
        content: "❌ ยศนี้เป็นยศระบบ/ยศ Integration หรืออยู่สูงกว่ายศบอท จึงมอบให้ผู้เล่นไม่ได้",
        ephemeral: true,
      });
      return;
    }
    replacementRoleId = assignableRole.id;
  }

  let replacementConditions: AchievementCondition[] | undefined;
  const conditionOptionsUsed = [1, 2, 3].some((index) =>
    interaction.options.getString(`condition${index}_type`) !== null ||
    interaction.options.getInteger(`condition${index}_value`) !== null
  );
  if (conditionOptionsUsed) {
    const parsed = getConditionsFromOptions(interaction, false);
    if (!parsed) {
      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle("❌ รูปแบบเงื่อนไขไม่ถูกต้อง")
            .setColor(0xed4245)
            .setDescription(
              "กรุณาเลือกประเภทและใส่จำนวนของทุกเงื่อนไขให้ครบเป็นคู่\n\n" +
              CONDITION_FORMAT_HELP
            ),
        ],
        ephemeral: true,
      });
      return;
    }
    replacementConditions = parsed;
  }

  if (newTitle !== null) ach.titleName = newTitle;
  if (newReward !== null) ach.sporeReward = newReward;
  if (newSecret !== null) ach.isSecret = newSecret;
  ach.discordRoleId = replacementRoleId;
  if (replacementConditions) ach.conditions = replacementConditions;

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
      { name: "🏷️ ยศ Discord", value: ach.discordRoleId ? `<@&${ach.discordRoleId}>` : "ไม่ได้กำหนด", inline: true },
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

// ─── /achievement-admin delete-secret ────────────────────────

async function handleDeleteSecret(interaction: ChatInputCommandInteraction): Promise<void> {
  const guildId = interaction.guild!.id;
  const confirm = interaction.options.getBoolean("confirm", true);

  if (!confirm) {
    await interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle("⚠️ ยกเลิกการลบ")
          .setColor(0xfee75c)
          .setDescription("ไม่ได้ยืนยัน — ยศลับยังคงอยู่ครบ\nถ้าต้องการลบจริงให้เลือก `confirm: True`"),
      ],
      ephemeral: true,
    });
    return;
  }

  const all     = getGuildAchievements(guildId);
  const secrets = all.filter((a) => a.isSecret);

  if (secrets.length === 0) {
    await interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle("📋 ไม่มียศลับในเซิร์ฟเวอร์นี้")
          .setColor(0x5865f2)
          .setDescription("ไม่พบยศที่มีสถานะ `isSecret = true` เลยครับ"),
      ],
      ephemeral: true,
    });
    return;
  }

  // Delete every secret achievement
  for (const ach of secrets) {
    deleteAchievement(guildId, ach.achievementId);
  }

  const nameList = secrets
    .map((a, i) => `${i + 1}. **${a.titleName}** (\`${a.achievementId}\`)`)
    .join("\n");

  await interaction.reply({
    embeds: [
      new EmbedBuilder()
        .setTitle(`🗑️ ลบยศลับทั้งหมดสำเร็จ (${secrets.length} รายการ)`)
        .setColor(0xed4245)
        .setDescription(
          `ยศลับต่อไปนี้ถูกลบออกจากระบบแล้ว:\n\n${nameList}\n\n` +
          `_ยศปกติ (isSecret = false) ยังคงอยู่ครบถ้วน_`
        )
        .setFooter({ text: `ดำเนินการโดย ${interaction.user.username}` })
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
