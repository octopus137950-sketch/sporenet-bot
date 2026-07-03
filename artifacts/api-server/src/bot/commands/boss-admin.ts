// ============================================================
// boss-admin.ts — Admin command for managing custom boss pool
// Subcommands: create, delete, list, toggle
// ============================================================

import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  AutocompleteInteraction,
  EmbedBuilder,
  PermissionFlagsBits,
} from "discord.js";
import {
  getCustomBosses,
  addCustomBoss,
  deleteCustomBoss,
  isBossSystemEnabled,
  setBossSystemEnabled,
} from "../data/store.js";
import { BOSS_POOL } from "../data/bossPool.js";
import { isBossActive } from "../events/worldBossHandler.js";

// ─── Difficulty → embed color mapping ────────────────────────

const DIFFICULTY_COLORS: Record<string, number> = {
  ง่าย:      0x57f287, // green
  ปานกลาง:  0xfee75c, // yellow
  ยาก:       0xed4245, // red
  อันตราย:  0xff7b00, // orange
  ตำนาน:    0x9b59b6, // purple
};

// ─── Command definition ───────────────────────────────────────

export const data = new SlashCommandBuilder()
  .setName("boss-admin")
  .setDescription("👹 จัดการ pool บอสโลก (แอดมิน)")
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)

  // ── create ──────────────────────────────────────────────────
  .addSubcommand((sub) =>
    sub
      .setName("create")
      .setDescription("➕ สร้างบอสใหม่เข้า pool ของเซิร์ฟ")
      .addStringOption((o) =>
        o.setName("name").setDescription("ชื่อบอส เช่น มังกรเพลิงนิรันดร์").setRequired(true).setMaxLength(40)
      )
      .addStringOption((o) =>
        o.setName("emoji").setDescription("Emoji ตัวแทนบอส เช่น 🔥").setRequired(true).setMaxLength(8)
      )
      .addStringOption((o) =>
        o
          .setName("difficulty")
          .setDescription("ระดับความยาก")
          .setRequired(true)
          .addChoices(
            { name: "ง่าย", value: "ง่าย" },
            { name: "ปานกลาง", value: "ปานกลาง" },
            { name: "ยาก", value: "ยาก" },
            { name: "อันตราย", value: "อันตราย" },
            { name: "ตำนาน", value: "ตำนาน" }
          )
      )
      .addIntegerOption((o) =>
        o.setName("max_hp").setDescription("HP สูงสุดของบอส เช่น 20000").setRequired(true).setMinValue(100).setMaxValue(1_000_000)
      )
      .addIntegerOption((o) =>
        o.setName("reward_spore").setDescription("รางวัลสปอร์รวมทั้งหมด เช่น 50000").setRequired(true).setMinValue(100).setMaxValue(10_000_000)
      )
      .addStringOption((o) =>
        o.setName("description").setDescription("คำอธิบายบอส (ไม่บังคับ)").setRequired(false).setMaxLength(200)
      )
  )

  // ── delete ──────────────────────────────────────────────────
  .addSubcommand((sub) =>
    sub
      .setName("delete")
      .setDescription("🗑️ ลบบอส custom ออกจาก pool")
      .addStringOption((o) =>
        o
          .setName("boss_id")
          .setDescription("เลือกบอสที่ต้องการลบ")
          .setRequired(true)
          .setAutocomplete(true)
      )
  )

  // ── list ────────────────────────────────────────────────────
  .addSubcommand((sub) =>
    sub.setName("list").setDescription("📋 ดูรายการบอสทั้งหมด (custom + default)")
  )

  // ── toggle ──────────────────────────────────────────────────
  .addSubcommand((sub) =>
    sub
      .setName("toggle")
      .setDescription("🔘 เปิด/ปิดระบบบอสโลกทั้งหมด")
      .addBooleanOption((o) =>
        o.setName("enabled").setDescription("true = เปิด | false = ปิด").setRequired(true)
      )
  );

// ─── Autocomplete ─────────────────────────────────────────────

export async function autocomplete(interaction: AutocompleteInteraction): Promise<void> {
  const guildId = interaction.guildId;
  if (!guildId) return;

  const focused = interaction.options.getFocused().toLowerCase();
  const customs = getCustomBosses(guildId);

  const choices = customs
    .filter(
      (b) =>
        b.name.toLowerCase().includes(focused) ||
        b.bossId.toLowerCase().includes(focused)
    )
    .slice(0, 25)
    .map((b) => ({
      name: `${b.emoji} ${b.name} (${b.difficulty}) — HP ${b.maxHp.toLocaleString()}`,
      value: b.bossId,
    }));

  await interaction.respond(choices);
}

// ─── Execute ──────────────────────────────────────────────────

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply({ ephemeral: true });

  const guildId = interaction.guildId;
  if (!guildId) {
    await interaction.editReply("❌ ใช้ได้เฉพาะในเซิร์ฟเวอร์เท่านั้น");
    return;
  }

  const sub = interaction.options.getSubcommand();

  // ── create ───────────────────────────────────────────────────
  if (sub === "create") {
    const name        = interaction.options.getString("name", true);
    const emoji       = interaction.options.getString("emoji", true);
    const difficulty  = interaction.options.getString("difficulty", true);
    const maxHp       = interaction.options.getInteger("max_hp", true);
    const rewardSpore = interaction.options.getInteger("reward_spore", true);
    const description = interaction.options.getString("description") ?? `${name} — บอสแห่ง ${interaction.guild?.name ?? "เซิร์ฟนี้"}`;

    // Check ซ้ำ
    const existing = getCustomBosses(guildId);
    if (existing.some((b) => b.name.toLowerCase() === name.toLowerCase())) {
      await interaction.editReply(`❌ มีบอสชื่อ **${name}** อยู่แล้วใน pool`);
      return;
    }

    const bossId = Math.random().toString(36).slice(2, 9);
    const color  = DIFFICULTY_COLORS[difficulty] ?? 0x5865f2;

    addCustomBoss(guildId, {
      bossId,
      name,
      emoji,
      difficulty,
      difficultyColor: color,
      maxHp,
      rewardSpore,
      description,
      createdAt: Date.now(),
    });

    const totalCustom = getCustomBosses(guildId).length;

    const embed = new EmbedBuilder()
      .setTitle(`✅ สร้างบอส ${emoji} ${name} แล้ว!`)
      .setColor(color)
      .addFields(
        { name: "🆔 Boss ID", value: `\`${bossId}\``, inline: true },
        { name: "⚔️ ความยาก", value: difficulty, inline: true },
        { name: "❤️ HP", value: maxHp.toLocaleString(), inline: true },
        { name: "💰 รางวัล", value: `${rewardSpore.toLocaleString()} สปอร์`, inline: true },
        { name: "📝 คำอธิบาย", value: description, inline: false },
        {
          name: "📊 Pool ปัจจุบัน",
          value: `บอส custom ทั้งหมด **${totalCustom}** ตัว (ระบบจะสุ่มจาก pool นี้ทั้งหมด)`,
          inline: false,
        }
      )
      .setFooter({ text: "ใช้ /boss-admin list เพื่อดูรายการทั้งหมด" })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
    return;
  }

  // ── delete ───────────────────────────────────────────────────
  if (sub === "delete") {
    const bossId = interaction.options.getString("boss_id", true);
    const customs = getCustomBosses(guildId);
    const target = customs.find((b) => b.bossId === bossId);

    if (!target) {
      await interaction.editReply("❌ ไม่พบบอสที่ระบุ กรุณาเลือกจากรายการ autocomplete");
      return;
    }

    if (isBossActive(guildId)) {
      await interaction.editReply("⚠️ ขณะนี้มีบอสกำลังสู้อยู่ กรุณารอให้จบก่อนแล้วค่อยลบ");
      return;
    }

    deleteCustomBoss(guildId, bossId);

    const remaining = getCustomBosses(guildId).length;
    const fallback  = remaining === 0 ? "\n> ⚠️ pool custom ว่างเปล่า — ระบบจะสุ่มจาก pool มาตรฐานแทน" : "";

    await interaction.editReply(
      `🗑️ ลบบอส **${target.emoji} ${target.name}** ออกแล้ว\n` +
      `📊 pool custom เหลือ **${remaining}** ตัว${fallback}`
    );
    return;
  }

  // ── list ─────────────────────────────────────────────────────
  if (sub === "list") {
    const customs  = getCustomBosses(guildId);
    const enabled  = isBossSystemEnabled(guildId);
    const isActive = isBossActive(guildId);

    const statusLine =
      `**ระบบบอส:** ${enabled ? "🟢 เปิดอยู่" : "🔴 ปิดอยู่"} | ` +
      `**สถานะ:** ${isActive ? "⚔️ กำลังสู้อยู่" : "😴 ไม่มีบอส"}\n\n`;

    let description = statusLine;

    // Cap display เพื่อไม่ให้เกิน Discord embed limit (4096 chars description)
    const MAX_DISPLAY = 12;

    if (customs.length > 0) {
      const shown = customs.slice(0, MAX_DISPLAY);
      const overflow = customs.length - shown.length;
      description +=
        `**🎯 Pool Custom ของเซิร์ฟนี้ (${customs.length} ตัว)**\n` +
        `_ระบบจะสุ่มจาก pool นี้เท่านั้น_\n\n`;
      description += shown
        .map(
          (b, i) =>
            `**${i + 1}. ${b.emoji} ${b.name}** (${b.difficulty})\n` +
            `   \`ID: ${b.bossId}\` | ❤️ ${b.maxHp.toLocaleString()} HP | 💰 ${b.rewardSpore.toLocaleString()} สปอร์\n` +
            `   > ${b.description}`
        )
        .join("\n\n");
      if (overflow > 0) {
        description += `\n\n_... และอีก **${overflow}** ตัว (ใช้ /boss-admin delete เพื่อดู ID ทั้งหมดผ่าน autocomplete)_`;
      }
    } else {
      description +=
        `**🎯 ยังไม่มี Pool Custom**\n` +
        `_ระบบจะสุ่มจาก pool มาตรฐาน ${BOSS_POOL.length} ตัวด้านล่าง_\n\n` +
        `**📦 Pool มาตรฐาน (${BOSS_POOL.length} ตัว)**\n\n` +
        BOSS_POOL.map(
          (b, i) =>
            `**${i + 1}. ${b.emoji} ${b.name}** (${b.difficulty})\n` +
            `   ❤️ ${b.maxHp.toLocaleString()} HP | 💰 ${b.rewardSpore.toLocaleString()} สปอร์\n` +
            `   > ${b.description}`
        ).join("\n\n");
    }

    const embed = new EmbedBuilder()
      .setTitle("👹 รายการบอสโลก")
      .setColor(enabled ? 0x5865f2 : 0x808080)
      .setDescription(description)
      .setFooter({ text: "ใช้ /boss-admin create เพื่อเพิ่มบอส custom | /boss-admin delete เพื่อลบ" })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
    return;
  }

  // ── toggle ───────────────────────────────────────────────────
  if (sub === "toggle") {
    const enabled = interaction.options.getBoolean("enabled", true);

    if (!enabled && isBossActive(guildId)) {
      await interaction.editReply(
        "⚠️ ขณะนี้มีบอสกำลังสู้อยู่ การปิดระบบจะมีผลตั้งแต่ **spawn ครั้งถัดไป**\n" +
        "บอสที่กำลังสู้อยู่จะดำเนินต่อจนจบตามปกติ"
      );
      // ยังคงตั้งค่าต่อ (ปิด spawn ครั้งถัดไป)
    }

    setBossSystemEnabled(guildId, enabled);

    const embed = new EmbedBuilder()
      .setTitle(enabled ? "🟢 เปิดระบบบอสโลกแล้ว" : "🔴 ปิดระบบบอสโลกแล้ว")
      .setColor(enabled ? 0x57f287 : 0xed4245)
      .setDescription(
        enabled
          ? "บอสจะ spawn อัตโนมัติตามตารางที่ตั้งไว้ใน `/setworldboss setup` อีกครั้ง\n" +
            "ยังสามารถใช้ `/setworldboss spawn_now` เพื่อเรียกบอสทันทีได้"
          : "บอสจะ **ไม่ spawn** อัตโนมัติและไม่สามารถใช้ `/setworldboss spawn_now` ได้\n" +
            "ใช้ `/boss-admin toggle enabled:true` เพื่อเปิดใหม่"
      )
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
    return;
  }
}
