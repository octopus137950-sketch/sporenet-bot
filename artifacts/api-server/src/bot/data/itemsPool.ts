// ระบบไอเทมบัฟ — SporeNet Bot
// drop rate 0.75% ต่อการฟาร์ม

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

export const ITEMS_POOL: BuffItem[] = [
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
    id: "magic_basket",
    name: "ตะกร้าสปอร์มนตร์",
    emoji: "🧺",
    description: "ตะกร้าทอจากเส้นใยเห็ดมนตร์โบราณ ดึงดูดสปอร์ได้มากกว่าปกติ",
    lore: "เพิ่มสปอร์จากการฟาร์ม +25%",
    buffType: "spore_percent",
    buffValue: 25,
  },
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
    id: "golden_ring",
    name: "แหวนเห็ดทอง",
    emoji: "💍",
    description: "แหวนทองคำที่มีเห็ดจิ๋วฝังอยู่ภายใน ส่องแสงระยิบระยับในความมืด",
    lore: "เพิ่มสปอร์คงที่ +15 ต่อการฟาร์มแต่ละครั้ง",
    buffType: "spore_flat",
    buffValue: 15,
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
    id: "fern_crown",
    name: "มงกุฎใบเฟิร์นโบราณ",
    emoji: "🌿",
    description: "มงกุฎสานจากใบเฟิร์นอายุนับพันปี สวมใส่แล้วรู้สึกสงบและชาญฉลาดยิ่งขึ้น",
    lore: "เพิ่ม EXP จากกิจกรรมทั้งหมด +30%",
    buffType: "exp_percent",
    buffValue: 30,
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
    id: "mystic_wand",
    name: "ไม้กายสิทธิ์เห็ดลึกลับ",
    emoji: "🪄",
    description: "ไม้กายสิทธิ์ที่แกะสลักจากไม้เห็ดโบราณ มีพลังวิเศษซ่อนอยู่ในเนื้อไม้",
    lore: "เพิ่มสปอร์คงที่ +20 ต่อการฟาร์มแต่ละครั้ง",
    buffType: "spore_flat",
    buffValue: 20,
  },
];

export function getItemById(id: string): BuffItem | undefined {
  return ITEMS_POOL.find((item) => item.id === id);
}

/**
 * สุ่มไอเทมดรอปจากการฟาร์ม — โอกาส 0.75%
 * คืน null ถ้าไม่ดรอป
 */
export function rollItemDrop(): BuffItem | null {
  if (Math.random() * 100 >= 0.75) return null;
  const idx = Math.floor(Math.random() * ITEMS_POOL.length);
  return ITEMS_POOL[idx]!;
}
