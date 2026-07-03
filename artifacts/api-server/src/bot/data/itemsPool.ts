// ระบบไอเทมบัฟ — SporeNet Bot
// drop rate 0.75% ต่อการฟาร์ม | 2% ต่อการชนะบอส (top 3)
// ADMIN_ONLY_ITEMS: ไม่ drop เองได้ — แอดมินเสกให้เท่านั้น

export type BuffType = "spore_percent" | "spore_flat" | "exp_percent" | "attack_percent";

export interface BuffItem {
  id: string;
  name: string;
  emoji: string;
  description: string;
  lore: string;        // คำอธิบายบัฟ
  buffType: BuffType;
  buffValue: number;   // percent หรือ flat ขึ้นกับ buffType
}

// ─── ไอเทมปกติ — drop ได้จาก farm / boss ─────────────────────

export const ITEMS_POOL: BuffItem[] = [
  // ─── attack_percent ──────────────────────────────────────────
  {
    id: "poison_blade",
    name: "ใบมีดเห็ดพิษ",
    emoji: "🗡️",
    description: "ใบมีดที่สกัดจากเห็ดพิษหายากในป่าลึก มีพลังมืดสิงสู่อยู่ภายใน",
    lore: "เพิ่มพลังโจมตีบอสโลก +20%",
    buffType: "attack_percent",
    buffValue: 20,
  },
  {
    id: "mushroom_potion",
    name: "ขวดน้ำยาเห็ดเข้มข้น",
    emoji: "⚗️",
    description: "ของเหลวสีม่วงเข้มที่ต้มจากเห็ดหายากหลากชนิด ดื่มแล้วแข็งแกร่งขึ้นทันที",
    lore: "เพิ่มพลังโจมตีบอสโลก +15%",
    buffType: "attack_percent",
    buffValue: 15,
  },
  {
    id: "thunder_hammer",
    name: "ค้อนสายฟ้า",
    emoji: "⚡",
    description: "ค้อนที่ถูกฟ้าผ่าพันครั้งจนกลายเป็นอาวุธอาบพลังงาน แต่ละครั้งที่ฟาดมีเสียงฟ้าร้อง",
    lore: "เพิ่มพลังโจมตีบอสโลก +30%",
    buffType: "attack_percent",
    buffValue: 30,
  },
  {
    id: "void_crystal",
    name: "คริสตัลแห่งความว่างเปล่า",
    emoji: "🔮",
    description: "หินคริสตัลที่ตกลงมาจากมิติอื่น ดูดซับความมืดและแปลงเป็นพลังโจมตี",
    lore: "เพิ่มพลังโจมตีบอสโลก +25%",
    buffType: "attack_percent",
    buffValue: 25,
  },
  {
    id: "shadow_dagger",
    name: "มีดสายลับเงา",
    emoji: "🌑",
    description: "มีดที่ตีขึ้นจากเงาของราชาในตำนาน ล่องหนได้และโจมตีจุดอ่อนศัตรูได้เสมอ",
    lore: "เพิ่มพลังโจมตีบอสโลก +35%",
    buffType: "attack_percent",
    buffValue: 35,
  },
  {
    id: "dragon_scale_mail",
    name: "เกราะเกล็ดมังกรราชา",
    emoji: "🐉",
    description: "เกราะทำจากเกล็ดมังกรโบราณผู้ยิ่งใหญ่ บางเบาแต่แข็งแกร่งกว่าเหล็กพันชั้น",
    lore: "เพิ่มพลังโจมตีบอสโลก +45%",
    buffType: "attack_percent",
    buffValue: 45,
  },

  // ─── spore_percent ────────────────────────────────────────────
  {
    id: "magic_basket",
    name: "ตะกร้าสปอร์มนตร์",
    emoji: "🧺",
    description: "ตะกร้าทอจากเส้นใยเห็ดมนตร์โบราณ ดึงดูดสปอร์ได้มากกว่าปกติ",
    lore: "เพิ่มสปอร์จากการฟาร์ม +25%",
    buffType: "spore_percent",
    buffValue: 25,
  },
  {
    id: "spore_gauntlet",
    name: "ถุงมือสปอร์",
    emoji: "🧤",
    description: "ถุงมือหนังพิเศษที่เคลือบด้วยสปอร์เห็ดชั้นดี เพิ่มความชำนาญในการเก็บเกี่ยว",
    lore: "เพิ่มสปอร์จากการฟาร์ม +15%",
    buffType: "spore_percent",
    buffValue: 15,
  },
  {
    id: "blood_ruby",
    name: "อัญมณีเลือดมังกร",
    emoji: "💎",
    description: "อัญมณีสีแดงเข้มที่ไหลซึมเลือดของมังกรโบราณ ทำให้ดวงชะตาเอื้ออำนวยต่อสปอร์",
    lore: "เพิ่มสปอร์จากการฟาร์ม +40%",
    buffType: "spore_percent",
    buffValue: 40,
  },
  {
    id: "lava_boots",
    name: "รองเท้าอัคคีภัย",
    emoji: "🔥",
    description: "รองเท้าทำจากหินลาวาที่แข็งตัว เดินไปไหนก็มีสปอร์ร้อนๆ ผุดขึ้นมาตาม",
    lore: "เพิ่มสปอร์จากการฟาร์ม +20%",
    buffType: "spore_percent",
    buffValue: 20,
  },

  // ─── spore_flat ───────────────────────────────────────────────
  {
    id: "golden_ring",
    name: "แหวนเห็ดทอง",
    emoji: "💍",
    description: "แหวนทองคำที่มีเห็ดจิ๋วฝังอยู่ภายใน ส่องแสงระยิบระยับในความมืด",
    lore: "เพิ่มสปอร์คงที่ +15 ต่อการฟาร์มแต่ละครั้ง",
    buffType: "spore_flat",
    buffValue: 15,
  },
  {
    id: "mystic_wand",
    name: "ไม้กายสิทธิ์เห็ดลึกลับ",
    emoji: "🪄",
    description: "ไม้กายสิทธิ์ที่แกะสลักจากไม้เห็ดโบราณ มีพลังวิเศษซ่อนอยู่ในเนื้อไม้",
    lore: "เพิ่มสปอร์คงที่ +20 ต่อการฟาร์มแต่ละครั้ง",
    buffType: "spore_flat",
    buffValue: 20,
  },
  {
    id: "ancient_scroll",
    name: "ม้วนคัมภีร์แห่งความมั่งคั่ง",
    emoji: "📜",
    description: "ม้วนกระดาษโบราณที่จารึกสูตรการเพาะเห็ดของนักเวทโบราณ อ่านแล้วสปอร์ผุดขึ้นมาเอง",
    lore: "เพิ่มสปอร์คงที่ +50 ต่อการฟาร์มแต่ละครั้ง",
    buffType: "spore_flat",
    buffValue: 50,
  },
  {
    id: "mermaid_tear",
    name: "น้ำตานางเงือก",
    emoji: "💧",
    description: "หยดน้ำตาของนางเงือกในทะเลลึก แช่แข็งคงรูปมานานพันปี มีพลังดึงดูดทรัพย์สมบัติ",
    lore: "เพิ่มสปอร์คงที่ +80 ต่อการฟาร์มแต่ละครั้ง",
    buffType: "spore_flat",
    buffValue: 80,
  },
  {
    id: "ancient_coin",
    name: "เหรียญทองพันปี",
    emoji: "🪙",
    description: "เหรียญทองจากอาณาจักรโบราณที่ล่มสลายนานแล้ว สัมผัสแล้วรู้สึกถึงความมั่งคั่ง",
    lore: "เพิ่มสปอร์คงที่ +100 ต่อการฟาร์มแต่ละครั้ง",
    buffType: "spore_flat",
    buffValue: 100,
  },

  // ─── exp_percent ──────────────────────────────────────────────
  {
    id: "sage_tome",
    name: "คัมภีร์ฉลามเห็ด",
    emoji: "📖",
    description: "หนังสือโบราณจดบันทึกภูมิปัญญาของนักเห็ดในตำนาน อ่านแล้วฉลาดขึ้นทันที",
    lore: "เพิ่ม EXP จากกิจกรรมทั้งหมด +50%",
    buffType: "exp_percent",
    buffValue: 50,
  },
  {
    id: "fern_crown",
    name: "มงกุฎใบเฟิร์นโบราณ",
    emoji: "🌿",
    description: "มงกุฎสานจากใบเฟิร์นอายุนับพันปี สวมใส่แล้วรู้สึกสงบและชาญฉลาดยิ่งขึ้น",
    lore: "เพิ่ม EXP จากกิจกรรมทั้งหมด +30%",
    buffType: "exp_percent",
    buffValue: 30,
  },
  {
    id: "ghost_cloak",
    name: "เสื้อคลุมวิญญาณนักปราชญ์",
    emoji: "👻",
    description: "เสื้อคลุมที่วิญญาณนักปราชญ์โบราณสิงอยู่ สอนความรู้อยู่ตลอดเวลาที่สวมใส่",
    lore: "เพิ่ม EXP จากกิจกรรมทั้งหมด +60%",
    buffType: "exp_percent",
    buffValue: 60,
  },
  {
    id: "mushroom_crown",
    name: "มงกุฎราชาเห็ด",
    emoji: "👑",
    description: "มงกุฎที่สลักจากเห็ดทองคำหายากที่สุดในโลก ผู้สวมใส่จะรับรู้ทุกอย่างได้อย่างรวดเร็ว",
    lore: "เพิ่ม EXP จากกิจกรรมทั้งหมด +80%",
    buffType: "exp_percent",
    buffValue: 80,
  },
  {
    id: "star_fragment",
    name: "เศษดาวตก",
    emoji: "⭐",
    description: "ชิ้นส่วนของดาวตกที่หล่นลงมาสู่ดินแดนเห็ด เปล่งแสงสีทองและบรรจุพลังแห่งจักรวาล",
    lore: "เพิ่ม EXP จากกิจกรรมทั้งหมด +100%",
    buffType: "exp_percent",
    buffValue: 100,
  },
];

// ─── ไอเทม Admin-Only — ไม่ drop เองได้ — เสกโดยแอดมินเท่านั้น ─

export const ADMIN_ONLY_ITEMS: BuffItem[] = [
  {
    id: "god_weapon",
    name: "อาวุธแห่งพระเจ้า",
    emoji: "⚔️",
    description: "อาวุธที่สร้างขึ้นโดยพระเจ้าในตำนาน ผู้ถือครองจะมีพลังโจมตีที่เกินกว่ามนุษย์ธรรมดาจะรับได้ ไม่สามารถได้รับจากการฟาร์มหรือบอส",
    lore: "⚠️ [ไอเทมพิเศษจากแอดมิน] เพิ่มพลังโจมตีบอสโลก +999,999,999%",
    buffType: "attack_percent",
    buffValue: 999_999_999,
  },
];

// ─── Helpers ──────────────────────────────────────────────────

const ALL_ITEMS = [...ITEMS_POOL, ...ADMIN_ONLY_ITEMS];

/** ค้นหาไอเทมจากทั้ง pool ปกติและ admin-only */
export function getItemById(id: string): BuffItem | undefined {
  return ALL_ITEMS.find((item) => item.id === id);
}

/**
 * สุ่มไอเทมดรอปจากการฟาร์ม — โอกาส 0.75%
 * คืน null ถ้าไม่ดรอป (ไอเทม admin-only จะไม่อยู่ใน pool นี้)
 */
export function rollItemDrop(): BuffItem | null {
  if (Math.random() * 100 >= 0.75) return null;
  const idx = Math.floor(Math.random() * ITEMS_POOL.length);
  return ITEMS_POOL[idx]!;
}
