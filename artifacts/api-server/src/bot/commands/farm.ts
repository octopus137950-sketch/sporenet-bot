import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  TextChannel,
} from "discord.js";
import {
  getPlayer,
  savePlayer,
  getLogChannel,
  getEcosystemState,
  harvestNaturalSpores,
} from "../data/store.js";
import { requireGameChannel } from "../utils/channelGuard.js";
import { setPendingBattle } from "../data/monsterState.js";
import { incrementQuestProgress } from "../events/questTracker.js";
import { trackStatAndCheck } from "../utils/achievementChecker.js";
import { rollItemDrop } from "../data/itemsPool.js";
import { addItemToInventory } from "../data/store.js";
import { applyWorldMushroomSporeBonus } from "../utils/worldMushroom.js";

export const data = new SlashCommandBuilder()
  .setName("farm")
  .setDescription("🍄 ออกไปฟาร์มเห็ดในป่าเวทมนตร์!");

const COOLDOWN_SECONDS = 60;
const EXP_PER_FARM = 5;
const MONSTER_CHANCE = 25;

// ภาพประกอบผลการสำรวจ — เก็บไว้ใน GitHub เพื่อให้ Discord โหลดได้โดยตรง
const FARM_IMAGE_BASE = "https://raw.githubusercontent.com/octopus137950-sketch/sporenet-bot/main/artifacts/api-server/assets/farm";
const FARM_IMAGES: Record<string, string> = {
  "เห็ดฟางธรรมดา": `${FARM_IMAGE_BASE}/farm_common_mushroom.png`,
  "เห็ดเรืองแสงเวทมนตร์": `${FARM_IMAGE_BASE}/farm_glowing_mushroom.png`,
  "เห็ดทองคำโบราณ": `${FARM_IMAGE_BASE}/farm_golden_mushroom.png`,
  "เห็ดจันทราน้ำค้าง": `${FARM_IMAGE_BASE}/farm_mooncap_mushroom.png`,
  "เห็ดหัวใจผลึก": `${FARM_IMAGE_BASE}/farm_crystalheart_mushroom.png`,
  "เห็ดเถ้าอัคคี": `${FARM_IMAGE_BASE}/farm_embercap_mushroom.png`,
  "แมงมุมซุ่มโจมตี": `${FARM_IMAGE_BASE}/farm_spider_ambush.png`,
  "นกฮูกขโมยของ": `${FARM_IMAGE_BASE}/farm_owl_thief.png`,
};

const MONSTER_IMAGES: Record<string, string> = {
  "หนอนเขียวป่า": `${FARM_IMAGE_BASE}/farm_green_forest_worm.png`,
  "ค้างคาวเห็ดพิษ": `${FARM_IMAGE_BASE}/farm_poison_mushroom_bat.png`,
  "หมูป่าบ้าเลือด": `${FARM_IMAGE_BASE}/farm_bloodrage_boar.png`,
  "มังกรเห็ดโบราณ": `${FARM_IMAGE_BASE}/farm_mushroom_dragon.png`,
  "โกเลมเห็ดโบราณ": `${FARM_IMAGE_BASE}/farm_mushroom_golem.png`,
  "แม่มดสปอร์": `${FARM_IMAGE_BASE}/farm_spore_witch.png`,
  "นักล่าเห็ดพิษ": `${FARM_IMAGE_BASE}/farm_venomcap_stalker.png`,
  "มังกรไมซีเลียม": `${FARM_IMAGE_BASE}/farm_mycelium_dragon.png`,
};

function getFarmImage(name: string, monster = false): string | undefined {
  return (monster ? MONSTER_IMAGES : FARM_IMAGES)[name];
}

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
    weight: 39,
    color: 0xa8e063,
  },
  {
    emoji: "✨",
    name: "เห็ดเรืองแสงเวทมนตร์",
    description: "ยินดีด้วย! ท่านขุดพบ **เห็ดเรืองแสงเวทมนตร์** ในถ้ำลึก!",
    type: "gain",
    min: 25,
    max: 40,
    weight: 20,
    color: 0x7cfc00,
  },
  {
    emoji: "👑",
    name: "เห็ดทองคำโบราณ",
    description: "ปังมาก! ท่านบังเอิญเจอ **เห็ดทองคำโบราณ** ยอดเห็ดหายากแห่งราชวงศ์!",
    type: "gain",
    min: 100,
    max: 150,
    weight: 3,
    color: 0xffd700,
  },
  {
    emoji: "🕷️",
    name: "แมงมุมซุ่มโจมตี",
    description: "แย่แล้ว! ท่านโดน**แมงมุมป่าเห็ด**ซุ่มโจมตีจนตกใจทำตะกร้าคว่ำ!",
    type: "lose",
    min: 15,
    max: 25,
    weight: 12,
    color: 0xff4500,
  },
  {
    emoji: "🦉",
    name: "นกฮูกขโมยของ",
    description: "โชคร้ายจริง! **นกฮูกลึกลับ**บินโฉบขโมยตะกร้าเห็ดของท่านไปต่อหน้าต่อตา!",
    type: "percent",
    min: 10,
    max: 10,
    weight: 3,
    color: 0x8b4513,
  },
  {
    emoji: "🌙",
    name: "เห็ดจันทราน้ำค้าง",
    description: "ท่านพบ **เห็ดจันทราน้ำค้าง** ที่ผลิบานเฉพาะคืนพระจันทร์เต็มดวง!",
    type: "gain",
    min: 35,
    max: 55,
    weight: 8,
    color: 0x7aa7ff,
  },
  {
    emoji: "💎",
    name: "เห็ดหัวใจผลึก",
    description: "แสงสีฟ้าส่องออกมาจาก **เห็ดหัวใจผลึก** ที่ซ่อนอยู่ในถ้ำลึก!",
    type: "gain",
    min: 55,
    max: 85,
    weight: 5,
    color: 0x00d9ff,
  },
  {
    emoji: "🔥",
    name: "เห็ดเถ้าอัคคี",
    description: "ท่านขุดพบ **เห็ดเถ้าอัคคี** ที่ยังคุกรุ่นอยู่ใต้ผืนดิน!",
    type: "gain",
    min: 25,
    max: 45,
    weight: 10,
    color: 0xff6b35,
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
    weight: 34,
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
    weight: 24,
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
    weight: 3,
    color: 0xff4500,
  },
  {
    emoji: "🪨",
    name: "โกเลมเห็ดโบราณ",
    description: "โกเลมหินที่มีเห็ดขนาดใหญ่ปกคลุมร่างก้าวออกมาขวางทาง!",
    winChance: 50,
    winMin: 85,
    winMax: 120,
    lossMin: 35,
    lossMax: 55,
    weight: 12,
    color: 0x8b7d6b,
  },
  {
    emoji: "🧙",
    name: "แม่มดสปอร์",
    description: "แม่มดแห่งป่าเห็ดร่ายมนตร์พิษใส่ท่านจากหลังต้นไม้!",
    winChance: 40,
    winMin: 110,
    winMax: 150,
    lossMin: 45,
    lossMax: 70,
    weight: 7,
    color: 0xb05cff,
  },
  {
    emoji: "🐆",
    name: "นักล่าเห็ดพิษ",
    description: "เสือเงาที่หุ้มเกราะเห็ดพิษพุ่งออกมาจากหมอกอย่างรวดเร็ว!",
    winChance: 35,
    winMin: 140,
    winMax: 190,
    lossMin: 60,
    lossMax: 85,
    weight: 4,
    color: 0x45d483,
  },
  {
    emoji: "🐲",
    name: "มังกรไมซีเลียม",
    description: "มังกรโบราณที่มีเส้นใยเรืองแสงปกคลุมทั่วร่างตื่นขึ้นจากถ้ำ!",
    winChance: 22,
    winMin: 250,
    winMax: 350,
    lossMin: 100,
    lossMax: 150,
    weight: 1,
    color: 0x36c9d8,
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

  if (getEcosystemState().currentSpores <= 0) {
    await interaction.editReply(
      "สปอร์ในธรรมชาติหมดเกลี้ยงแล้ว! ช่วยกันกด /fertilize เพื่อเร่งการเกิดในชั่วโมงถัดไป!",
    );
    return;
  }

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

  const hasMonster = Math.random() * 100 < MONSTER_CHANCE;
  const event = hasMonster ? undefined : rollEvent();
  const levelBonus = (player.farmLevel - 1) * 2;
  let pointChange = 0;
  let resultText = "";

  if (event?.type === "gain") {
    const base = randInt(event.min, event.max);
    pointChange = base + levelBonus;
    resultText = `**+${pointChange} สปอร์** ${levelBonus > 0 ? `(+${levelBonus} โบนัสเลเวล)` : ""}`;
  } else if (event?.type === "lose") {
    const base = randInt(event.min, event.max);
    pointChange = -Math.min(base, player.sporePoints);
    resultText = `**${pointChange} สปอร์**`;
  } else if (event?.type === "percent") {
    const stolen = Math.floor(player.sporePoints * 0.1);
    pointChange = -stolen;
    resultText = stolen > 0 ? `**-${stolen} สปอร์** (10% ที่มี)` : "**ท่านไม่มีแต้มให้ขโมย!**";
  }

  if (pointChange > 0) {
    const requestedHarvest = applyWorldMushroomSporeBonus(guild?.id ?? "", pointChange);
    const harvested = harvestNaturalSpores(requestedHarvest);
    pointChange = harvested;
    resultText =
      harvested > 0
        ? `**+${harvested} สปอร์** ${
            harvested < requestedHarvest
              ? "(สปอร์ธรรมชาติมีจำกัด)"
              : levelBonus > 0
                ? `(+${levelBonus} โบนัสเลเวล)`
                : ""
          }`
        : "**สปอร์ในธรรมชาติหมดระหว่างการเก็บเกี่ยว**";
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
    incrementQuestProgress(interaction.client, guild.id, userId, "farm", 1, interaction).catch(
      (e) => console.error("[farm] quest increment error:", e)
    );

    // ── Achievement tracking: increment cumulative farm count ──
    trackStatAndCheck(interaction.client, guild.id, userId, "farmCount", 1).catch(
      (e) => console.error("[farm] achievement check error:", e)
    );
  }

  const newExpNeeded = player.farmLevel * 100;
  if (hasMonster) {
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
      .setThumbnail(getFarmImage(monster.name, true) ?? null)
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

    await interaction.editReply({ embeds: [monsterEmbed], components: [row] });
    return;
  }

  const farmEmbed = new EmbedBuilder()
    .setTitle(`${event!.emoji} ${event!.name}`)
    .setDescription(`${event!.description}\n\n🎁 **ผลการฟาร์ม:** ${resultText}${levelUpText}`)
    .setColor(event!.color)
    .setThumbnail(getFarmImage(event!.name) ?? null)
    .addFields(
      { name: "💰 สปอร์ทั้งหมด", value: `**${player.sporePoints.toLocaleString()}** แต้ม`, inline: true },
      { name: "⭐ เลเวล", value: `**${player.farmLevel}**`, inline: true },
      {
        name: "📊 EXP",
        value: `**${player.farmExp}/${newExpNeeded}**\n${expBar(player.farmExp, newExpNeeded)}`,
        inline: true,
      }
    )
    .setFooter({ text: `ฟาร์มได้อีกครั้งใน 60 วินาที • วันนี้ ${new Date().toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })}` })
    .setTimestamp();

  // ── Item drop check ──────────────────────────────────────
  const droppedItem = rollItemDrop();
  if (droppedItem && guild) {
    addItemToInventory(userId, droppedItem.id);
    farmEmbed.addFields({
      name: `✨ ไอเทมหายากดรอป!`,
      value: `${droppedItem.emoji} **${droppedItem.name}**\n> ${droppedItem.lore}\n📬 ไอเทมถูกเก็บเข้ากระเป๋าแล้ว ใช้ /wallet เพื่อสวมใส่!`,
      inline: false,
    });
  }

  await interaction.editReply({ embeds: [farmEmbed] });

  if (guild && pointChange !== 0) {
    const logId = getLogChannel(guild.id);
    if (logId) {
      const logCh = guild.channels.cache.get(logId) as TextChannel | undefined;
      logCh?.send({ content: `📋 **${interaction.user.username}** ฟาร์มได้ **${pointChange > 0 ? "+" : ""}${pointChange}** สปอร์` }).catch(() => null);
    }
  }
}
