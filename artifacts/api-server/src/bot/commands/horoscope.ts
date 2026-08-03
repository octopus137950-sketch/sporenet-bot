// ============================================================
// horoscope.ts — ระบบดูดวงประจำวัน 🔮
// ดวงสุ่มตาม userId + วันที่ → ผลเหมือนกันทั้งวัน
// ============================================================

import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
} from "discord.js";

export const data = new SlashCommandBuilder()
  .setName("horoscope")
  .setDescription("🔮 ดูดวงประจำวันจากราชาเห็ดสปอร์!");

// ─── Thai timezone ────────────────────────────────────────────
const THAI_OFFSET_MS = 7 * 60 * 60 * 1000;

function getThaiDateString(): string {
  const d = new Date(Date.now() + THAI_OFFSET_MS);
  return `${d.getUTCFullYear()}-${d.getUTCMonth() + 1}-${d.getUTCDate()}`;
}

function getThaiDateDisplay(): string {
  const d = new Date(Date.now() + THAI_OFFSET_MS);
  const months = [
    "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
    "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม",
  ];
  return `${d.getUTCDate()} ${months[d.getUTCMonth()]} ${d.getUTCFullYear() + 543}`;
}

// ─── Seeded random (ผลเหมือนกันทั้งวันสำหรับ user คนเดียว) ───
function seededRandom(seed: string): () => number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(31, h) + seed.charCodeAt(i) | 0;
  }
  return () => {
    h ^= h << 13; h ^= h >> 17; h ^= h << 5;
    return ((h >>> 0) / 0xFFFFFFFF);
  };
}

function pickRandom<T>(arr: T[], rand: () => number): T {
  return arr[Math.floor(rand() * arr.length)]!;
}

// ─── ข้อมูลดวง ────────────────────────────────────────────────

const MUSHROOM_SIGNS = [
  { name: "🍄 เห็ดทอง", element: "ดิน", trait: "มั่นคง อดทน" },
  { name: "🌙 เห็ดดาว", element: "น้ำ", trait: "ฉลาด สังหรณ์ใจดี" },
  { name: "⚡ เห็ดฟ้าแลบ", element: "ไฟ", trait: "กล้าหาญ หุนหันพลันแล่น" },
  { name: "🌸 เห็ดนางฟ้า", element: "ลม", trait: "อ่อนโยน เมตตา" },
  { name: "💀 เห็ดพิษ", element: "ความมืด", trait: "ลึกลับ ทรงพลัง" },
  { name: "🌊 เห็ดปะการัง", element: "น้ำ", trait: "ยืดหยุ่น ปรับตัวเก่ง" },
  { name: "🔥 เห็ดลาวา", element: "ไฟ", trait: "เร่าร้อน มีเสน่ห์" },
];

const LUCKY_MUSHROOMS = [
  "🍄 เห็ดทรัฟเฟิล", "🌟 เห็ดดาวทอง", "🫧 เห็ดฟองสบู่",
  "🌺 เห็ดดอกไม้", "💎 เห็ดคริสตัล", "🐉 เห็ดมังกร", "🍀 เห็ดโคลเวอร์",
];

const LUCKY_COLORS = [
  "🔴 แดงเลือดหมู", "🟠 ส้มทอง", "🟡 เหลืองอำพัน",
  "🟢 เขียวมรกต", "🔵 น้ำเงินลึก", "🟣 ม่วงราชา",
  "⚫ ดำมิดชิด", "⚪ ขาวบริสุทธิ์", "🟤 น้ำตาลดิน",
];

const WEALTH_TEXTS = [
  ["💸 วันนี้ควักกระเป๋าระวัง สปอร์อาจรั่วออกแบบไม่รู้ตัว", "⭐"],
  ["💰 โชคลาภพอประมาณ ทำงานปกติได้ผลปกติ", "⭐⭐"],
  ["🌱 ดวงทรัพย์กำลังงอกงาม รอผลดีในไม่ช้า", "⭐⭐⭐"],
  ["✨ วันนี้ดวงการเงินดี ฟาร์มแล้วได้สปอร์เต็มมือ", "⭐⭐⭐⭐"],
  ["🌟 ดวงทรัพย์พุ่งแรง! เห็ดทองโปรยปรายลงมาให้เก็บ", "⭐⭐⭐⭐⭐"],
];

const ADVENTURE_TEXTS = [
  ["🐌 วันนี้ไม่เหมาะออกผจญภัย นั่งนิ่งๆ ในบ้านดีกว่า", "⭐"],
  ["🗺️ การผจญภัยพอมีอยู่ แต่ระวังกับดักที่ไม่คาดคิด", "⭐⭐"],
  ["⚔️ วันนี้พอสู้ได้ มอนสเตอร์ไม่น่ากลัวอย่างที่คิด", "⭐⭐⭐"],
  ["🔥 ดวงนักรบดี! บุกไปเลยไม่ต้องกลัวใคร", "⭐⭐⭐⭐"],
  ["🏆 วันนี้ทำอะไรก็ชนะ โลกทั้งใบอยู่ในมือแล้ว!", "⭐⭐⭐⭐⭐"],
];

const SOCIAL_TEXTS = [
  ["🙈 วันนี้เงียบๆ ดีกว่า คุยมากอาจพลาดได้", "⭐"],
  ["🤝 ความสัมพันธ์ราบรื่น แต่ไม่มีอะไรพิเศษเป็นพิเศษ", "⭐⭐"],
  ["😊 เพื่อนพ้องน้องพี่มีแต่คนดี วันนี้คุยสนุก", "⭐⭐⭐"],
  ["💬 มิตรภาพแน่นแฟ้น คนรอบข้างชื่นชอบคุณมากวันนี้", "⭐⭐⭐⭐"],
  ["🌈 ดวงสังคมพีค! ทุกคนรักคุณ เพื่อนใหม่มาเยือน", "⭐⭐⭐⭐⭐"],
];

const LUCK_TEXTS = [
  ["🌧️ โชคหลบไปนอนอยู่ที่ไหนสักแห่ง ระวังตัวหน่อย", "⭐"],
  ["🎲 โชคพอมีอยู่บ้าง แต่อย่าพึ่งแน่มากนัก", "⭐⭐"],
  ["🌤️ โชคเริ่มกลับมา วันนี้ลองลุ้นอะไรเบาๆ ได้", "⭐⭐⭐"],
  ["🍀 โชคดีชัดเจน! ทุกอย่างเป็นใจวันนี้", "⭐⭐⭐⭐"],
  ["🌠 โชคท่วมหัว! วันนี้จะขอพรอะไรก็ได้รับ", "⭐⭐⭐⭐⭐"],
];

const FORTUNE_MESSAGES = [
  "วันนี้หัวใจต้องการความสงบ ลองหาพื้นที่เงียบๆ แล้วคุยกับตัวเองดู",
  "มีบางอย่างที่คุณลังเลใจอยู่ — วันนี้เหมาะสมที่สุดที่จะตัดสินใจ",
  "ความเพียรพยายามของคุณไม่ได้สูญเปล่า ผลลัพธ์กำลังจะมาถึง",
  "วันนี้เหมาะกับการพักผ่อน อย่าฝืนตัวเองมากเกินไป",
  "มีคนที่คิดถึงคุณอยู่โดยที่คุณไม่รู้ตัว",
  "ระวังคำพูดที่ออกจากปากวันนี้ มันอาจส่งผลนานกว่าที่คิด",
  "โอกาสที่คุณมองข้ามอาจเป็นสิ่งที่ดีที่สุดในชีวิต",
  "วันนี้เหมาะกับการเริ่มต้นสิ่งใหม่ อย่ากลัวที่จะก้าวออกไป",
  "ความดีที่คุณทำอยู่เงียบๆ นั้น จักรวาลรับรู้ทั้งหมดแล้ว",
  "วันนี้ถ้ารู้สึกเหนื่อย ไม่เป็นไร — พักก็คือการทำงานอย่างหนึ่ง",
  "สิ่งที่คุณกลัวอยู่นั้น ส่วนใหญ่ไม่น่ากลัวอย่างที่คิดหรอก",
  "ราชาเห็ดสปอร์กระซิบว่า: วันนี้เหมาะกับการฟาร์มเห็ดเป็นอย่างยิ่ง 🍄",
  "พลังงานของคุณวันนี้ดึงดูดความดีเข้ามาโดยธรรมชาติ",
  "มีบางอย่างที่คุณต้องปล่อยวางก่อน ถึงจะรับสิ่งใหม่ได้",
  "วันนี้ตัดสินใจด้วยหัวใจ ไม่ใช่ความกลัว",
];

// ─── Main execute ─────────────────────────────────────────────
export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply();

  const userId = interaction.user.id;
  const dateStr = getThaiDateString();
  const seed = `${userId}-${dateStr}`;
  const rand = seededRandom(seed);

  const sign = pickRandom(MUSHROOM_SIGNS, rand);
  const luckyMushroom = pickRandom(LUCKY_MUSHROOMS, rand);
  const luckyColor = pickRandom(LUCKY_COLORS, rand);
  const luckyNumber = Math.floor(rand() * 99) + 1;
  const fortune = pickRandom(FORTUNE_MESSAGES, rand);

  const [wealthText, wealthStar] = WEALTH_TEXTS[Math.floor(rand() * WEALTH_TEXTS.length)]!;
  const [adventureText, adventureStar] = ADVENTURE_TEXTS[Math.floor(rand() * ADVENTURE_TEXTS.length)]!;
  const [socialText, socialStar] = SOCIAL_TEXTS[Math.floor(rand() * SOCIAL_TEXTS.length)]!;
  const [luckText, luckStar] = LUCK_TEXTS[Math.floor(rand() * LUCK_TEXTS.length)]!;

  const embed = new EmbedBuilder()
    .setTitle(`🔮 ดวงประจำวัน — ${interaction.user.displayName}`)
    .setDescription(`> *"${fortune}"*\n\u200b`)
    .addFields(
      {
        name: "🍄 ราศีเห็ดประจำวัน",
        value: `**${sign.name}**\nธาตุ: ${sign.element} • ${sign.trait}`,
        inline: false,
      },
      { name: `💰 ดวงทรัพย์ ${wealthStar}`, value: wealthText, inline: false },
      { name: `⚔️ ดวงผจญภัย ${adventureStar}`, value: adventureText, inline: false },
      { name: `💬 ดวงมิตรภาพ ${socialStar}`, value: socialText, inline: false },
      { name: `🎲 ดวงโชคลาภ ${luckStar}`, value: luckText, inline: false },
      {
        name: "✨ ของดีประจำวัน",
        value: `เห็ดนำโชค: ${luckyMushroom}\nสีนำโชค: ${luckyColor}\nเลขนำโชค: **${luckyNumber}**`,
        inline: false,
      }
    )
    .setFooter({ text: `📅 ${getThaiDateDisplay()} • ดวงจะเปลี่ยนเที่ยงคืนตามเวลาไทย` })
    .setColor(0x9B59B6)
    .setThumbnail(interaction.user.displayAvatarURL());

  await interaction.editReply({ embeds: [embed] });
}
