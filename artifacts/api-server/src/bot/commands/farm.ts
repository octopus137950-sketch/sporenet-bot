import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  TextChannel,
} from "discord.js";
import { getPlayer, savePlayer, getLogChannel } from "../data/store.js";
import { requireGameChannel } from "../utils/channelGuard.js";
import { setPendingBattle } from "../data/monsterState.js";
import { incrementQuestProgress } from "../events/questTracker.js";
import { trackStatAndCheck } from "../utils/achievementChecker.js";

export const data = new SlashCommandBuilder()
  .setName("farm")
  .setDescription("🍄 ออกไปฟาร์มเห็ดในป่าเวทมนตร์!");

const COOLDOWN_SECONDS = 60;
const EXP_PER_FARM = 5;
const MONSTER_CHANCE = 25;

interface FarmEvent {
  emoji: string;
  name: string;
  description: string;
  type: "gain" | "lose" | "percent";
  min: number;
  max: number;
  weight: number;
  color: number;
}

interface MonsterDef {
  emoji: string;
  name: string;
  description: string;
  winChance: number;
  winMin: number;
  winMax: number;
  lossMin: number;
  lossMax: number;
  weight: number;
  color: number;
}

const EVENTS: FarmEvent[] = [
  {
    emoji: "🍄",
    name: "เห็ดฟางธรรมดา",
    description: "ท่านพบ **เห็ดฟางธรรมดา** ข้างขอนไม้ผุ บดทำยาได้เล็กน้อย!",
    type: "gain",
    min: 10,
    max: 15,
    weight: 45,
    color: 0xa8e063,
  },
  {
    emoji: "✨",
    name: "เห็ดเรืองแสงเวทมนตร์",
    description: "ยินดีด้วย! ท่านขุดพบ **เห็ดเรืองแสงเวทมนตร์** ในถ้ำลึก!",
    type: "gain",
    min: 25,
    max: 40,
    weight: 30,
    color: 0x7cfc00,
  },
  {
    emoji: "👑",
    name: "เห็ดทองคำโบราณ",
    description: "ปังมาก! ท่านบังเอิญเจอ **เห็ดทองคำโบราณ** ยอดเห็ดหายากแห่งราชวงศ์!",
    type: "gain",
    min: 100,
    max: 150,
    weight: 5,
    color: 0xffd700,
  },
  {
    emoji: "🕷️",
    name: "แมงมุมซุ่มโจมตี",
    description: "แย่แล้ว! ท่านโดน**แมงมุมป่าเห็ด**ซุ่มโจมตีจนตกใจทำตะกร้าคว่ำ!",
    type: "lose",
    min: 15,
    max: 25,
    weight: 15,
    color: 0xff4500,
  },
  {
    emoji: "🦉",
    name: "นกฮูกขโมยของ",
    description: "โชคร้ายจริง! **นกฮูกลึกลับ**บินโฉบขโมยตะกร้าเห็ดของท่านไปต่อหน้าต่อตา!",
    type: "percent",
    min: 10,
    max: 10,
    weight: 5,
    color: 0x8b4513,
  },
];

const MONSTERS: MonsterDef[] = [
  {
    emoji: "🐛",
    name: "หนอนเขียวป่า",
    description: "หนอนยักษ์สีเขียวน่าเกลียดโผล่ขึ้นมาจากดินขวางหน้า!",
    winChance: 65,
    winMin: 20,
    winMax: 35,
    lossMin: 10,
    lossMax: 15,
    weight: 50,
    color: 0x90ee90,
  },
  {
    emoji: "🦇",
    name: "ค้างคาวเห็ดพิษ",
    description: "ฝูงค้างคาวกินเห็ดพิษบินลงมาจู่โจมท่านจากความมืด!",
    winChance: 55,
    winMin: 40,
    winMax: 60,
    lossMin: 20,
    lossMax: 30,
    weight: 30,
    color: 0x9370db,
  },
  {
    emoji: "🐗",
    name: "หมูป่าบ้าเลือด",
    description: "หมูป่าขนาดมหึมาพุ่งออกมาจากพุ่มไม้ตาแดงฉาน!",
    winChance: 45,
    winMin: 70,
    winMax: 100,
    lossMin: 30,
    lossMax: 50,
    weight: 15,
    color: 0xcd5c5c,
  },
  {
    emoji: "🐉",
    name: "มังกรเห็ดโบราณ",
    description: "มังกรตำนานแห่งป่าเห็ดปรากฏตัวขึ้น — โอกาสเจอหายากมาก!",
    winChance: 30,
    winMin: 150,
    winMax: 220,
    lossMin: 60,
    lossMax: 90,
    weight: 5,
    color: 0xff4500,
  },
];

function rollEvent(): FarmEvent {
  const total = EVENTS.reduce((s, e) => s + e.weight, 0);
  let roll = Math.random() * total;
  for (const event of EVENTS) {
    roll -= event.weight;
    if (roll <= 0) return event;
  }
  return EVENTS[0]!;
}

function rollMonster(): MonsterDef {
  const total = MONSTERS.reduce((s, m) => s + m.weight, 0);
  let roll = Math.random() * total;
  for (const m of MONSTERS) {
    roll -= m.weight;
    if (roll <= 0) return m;
  }
  return MONSTERS[0]!;
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function expBar(current: number, max: number, length = 10): string {
  const filled = Math.round((current / max) * length);
  return "█".repeat(filled) + "░".repeat(length - filled);
}

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!(await requireGameChannel(interaction))) return;
  await interaction.deferReply();

  const userId = interaction.user.id;
  const guild = interaction.guild;
  const player = getPlayer(userId);
  const now = Date.now();
  const elapsed = Math.floor((now - player.lastFarmTime) / 1000);

  if (elapsed < COOLDOWN_SECONDS) {
    const remaining = COOLDOWN_SECONDS - elapsed;
    const embed = new EmbedBuilder()
      .setTitle("⏳ ยังฟาร์มไม่ได้!")
      .setDescription(`ท่านเพิ่งกลับจากป่ามาหมาดๆ!\nรออีก **${remaining} วินาที** แล้วออกไปใหม่ได้เลย 🍄`)
      .setColor(0xff9900)
      .setThumbnail(interaction.user.displayAvatarURL());
    await interaction.editReply({ embeds: [embed] });
    return;
  }

  const event = rollEvent();
  const levelBonus = (player.farmLevel - 1) * 2;
  let pointChange = 0;
  let resultText = "";

  if (event.type === "gain") {
    const base = randInt(event.min, event.max);
    pointChange = base + levelBonus;
    resultText = `**+${pointChange} สปอร์** ${levelBonus > 0 ? `(+${levelBonus} โบนัสเลเวล)` : ""}`;
  } else if (event.type === "lose") {
    const base = randInt(event.min, event.max);
    pointChange = -Math.min(base, player.sporePoints);
    resultText = `**${pointChange} สปอร์**`;
  } else if (event.type === "percent") {
    const stolen = Math.floor(player.sporePoints * 0.1);
    pointChange = -stolen;
    resultText = stolen > 0 ? `**-${stolen} สปอร์** (10% ที่มี)` : "**ท่านไม่มีแต้มให้ขโมย!**";
  }

  player.sporePoints = Math.max(0, player.sporePoints + pointChange);
  player.farmExp += EXP_PER_FARM;
  player.lastFarmTime = now;

  const expNeeded = player.farmLevel * 100;
  let levelUpText = "";
  if (player.farmExp >= expNeeded) {
    player.farmExp -= expNeeded;
    player.farmLevel += 1;
    levelUpText = `\n\n🎊 **เลเวลอัป!** ตอนนี้เลเวล **${player.farmLevel}** แล้ว! โบนัสแต้มต่อครั้ง: **+${(player.farmLevel - 1) * 2}**`;
  }

  savePlayer(player);

  // ── Quest tracking: increment farm quest progress ────────────
  if (guild) {
    incrementQuestProgress(interaction.client, guild.id, userId, "farm", 1).catch(
      (e) => console.error("[farm] quest increment error:", e)
    );

    // ── Achievement tracking: increment cumulative farm count ──
    trackStatAndCheck(interaction.client, guild.id, userId, "farmCount", 1).catch(
      (e) => console.error("[farm] achievement check error:", e)
    );
  }

  const newExpNeeded = player.farmLevel * 100;
  const farmEmbed = new EmbedBuilder()
    .setTitle(`${event.emoji} ${event.name}`)
    .setDescription(`${event.description}\n\n${resultText}${levelUpText}`)
    .setColor(event.color)
    .setThumbnail(interaction.user.displayAvatarURL())
    .addFields(
      { name: "🍄 สปอร์ทั้งหมด", value: `**${player.sporePoints.toLocaleString()}** แต้ม`, inline: true },
      { name: "⭐ เลเวล", value: `**${player.farmLevel}**`, inline: true },
      {
        name: `📊 EXP [${player.farmExp}/${newExpNeeded}]`,
        value: expBar(player.farmExp, newExpNeeded),
        inline: false,
      }
    )
    .setFooter({ text: `${interaction.user.username} • ฟาร์มอีกครั้งในอีก 60 วินาที` })
    .setTimestamp();

  const hasMonster = Math.random() * 100 < MONSTER_CHANCE;

  if (!hasMonster) {
    await interaction.editReply({ embeds: [farmEmbed] });

    if (guild && pointChange !== 0) {
      const logId = getLogChannel(guild.id);
      if (logId) {
        const logCh = guild.channels.cache.get(logId) as TextChannel | undefined;
        logCh?.send({ content: `📋 **${interaction.user.username}** ฟาร์มได้ **${pointChange > 0 ? "+" : ""}${pointChange}** สปอร์` }).catch(() => null);
      }
    }
    return;
  }

  const monster = rollMonster();
  setPendingBattle(userId, {
    monsterEmoji: monster.emoji,
    monsterName: monster.name,
    winChance: monster.winChance,
    winMin: monster.winMin,
    winMax: monster.winMax,
    lossMin: monster.lossMin,
    lossMax: monster.lossMax,
  });

  const monsterEmbed = new EmbedBuilder()
    .setTitle(`⚠️ มอนสเตอร์ปรากฏ! ${monster.emoji} ${monster.name}`)
    .setDescription(
      `${monster.description}\n\n` +
      `📊 โอกาสชนะ: **${monster.winChance}%**\n` +
      `🏆 ถ้าชนะ: **+${monster.winMin}~${monster.winMax} สปอร์**\n` +
      `💀 ถ้าแพ้: **-${monster.lossMin}~${monster.lossMax} สปอร์**\n\n` +
      `⏰ ตัดสินใจภายใน **60 วินาที!**`
    )
    .setColor(monster.color)
    .setFooter({ text: "เลือก: สู้หรือหนี?" });

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`monster_fight_${userId}`)
      .setLabel("⚔️ สู้")
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId(`monster_flee_${userId}`)
      .setLabel("🏃 หนี")
      .setStyle(ButtonStyle.Secondary)
  );

  await interaction.editReply({ embeds: [farmEmbed, monsterEmbed], components: [row] });
}
