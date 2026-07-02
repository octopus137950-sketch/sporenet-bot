export interface BossTemplate {
  name: string;
  emoji: string;
  difficulty: string;
  difficultyColor: number;
  maxHp: number;
  rewardSpore: number;
  description: string;
}

export const BOSS_POOL: BossTemplate[] = [
  {
    name: "เห็ดยักษ์ราชัน",
    emoji: "🍄",
    difficulty: "ง่าย",
    difficultyColor: 0x57f287,
    maxHp: 5_000,
    rewardSpore: 10_000,
    description: "เห็ดยักษ์ที่ซ่อนตัวอยู่ในป่าลึก ตื่นขึ้นมาด้วยความหิวโหย",
  },
  {
    name: "มังกรพิษ Vipora",
    emoji: "🐉",
    difficulty: "ปานกลาง",
    difficultyColor: 0xfee75c,
    maxHp: 15_000,
    rewardSpore: 30_000,
    description: "มังกรพิษโบราณผู้ครองแม่น้ำพิษ พ่นพิษสังหารได้ทุกทิศทาง",
  },
  {
    name: "ราชันหมาป่า Fangrow",
    emoji: "🐺",
    difficulty: "ยาก",
    difficultyColor: 0xed4245,
    maxHp: 30_000,
    rewardSpore: 60_000,
    description: "จ่าฝูงหมาป่าผู้น่าเกรงขาม รอดจากดาบนับพันมาได้",
  },
  {
    name: "เทพเจ้าพายุ Stormael",
    emoji: "⚡",
    difficulty: "อันตราย",
    difficultyColor: 0xff7b00,
    maxHp: 60_000,
    rewardSpore: 120_000,
    description: "เทพเจ้าแห่งพายุที่ตื่นจากหลับใหลพันปี ฟ้าผ่าทุกทิศทาง",
  },
  {
    name: "มารมืดนิรันดร์ Abyssalor",
    emoji: "👹",
    difficulty: "ตำนาน",
    difficultyColor: 0x9b59b6,
    maxHp: 100_000,
    rewardSpore: 200_000,
    description: "มารแห่งนรกที่ถูกปิดผนึกไว้นานนับพัน ตื่นขึ้นมาล้างโลก",
  },
];
