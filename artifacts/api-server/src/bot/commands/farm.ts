import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  TextChannel,
} from "discord.js";
import { getPlayer, savePlayer, getLogChannel } from "../data/store.js";
import { requireGameChannel } from "../utils/channelGuard.js";

export const data = new SlashCommandBuilder()
  .setName("farm")
  .setDescription("🍄 ออกไปฟาร์มเห็ดในป่าเวทมนตร์!");

const COOLDOWN_SECONDS = 60;
const EXP_PER_FARM = 5;

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

function rollEvent(): FarmEvent {
  const total = EVENTS.reduce((s, e) => s + e.weight, 0);
  let roll = Math.random() * total;
  for (const event of EVENTS) {
    roll -= event.weight;
    if (roll <= 0) return event;
  }
  return EVENTS[0]!;
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

  const newExpNeeded = player.farmLevel * 100;
  const embed = new EmbedBuilder()
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

  await interaction.editReply({ embeds: [embed] });
}
