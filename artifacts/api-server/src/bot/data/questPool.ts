// ============================================================
// questPool.ts — Daily Quest Pool & Weighted Randomization
// ============================================================

export type QuestType = "farm" | "chat" | "voice";
export type QuestDifficulty = "easy" | "medium" | "hard" | "legendary";

export interface QuestDef {
  id: string;
  type: QuestType;
  description: string;
  target: number;   // unit count (farm/chat) or minutes (voice)
  reward: number;   // spore reward
  weight: number;   // higher = more frequent in random draw
  difficulty: QuestDifficulty;
  emoji: string;
  unit: string;     // display unit label
}

// ─── Quest Pool ─────────────────────────────────────────────
// Difficulty tiers: easy (≥40 weight), medium (25‑35), hard (10‑15), legendary (≤5)
// Rewards scale with difficulty. Voice target is in minutes.

export const QUEST_POOL: QuestDef[] = [

  // ════════════════════════════════════════════
  // 🟢 EASY
  // ════════════════════════════════════════════

  {
    id: "farm_2",
    type: "farm",
    description: "ออกฟาร์มเห็ดให้ครบ 2 ครั้ง",
    target: 2,
    reward: 30,
    weight: 50,
    difficulty: "easy",
    emoji: "🍄",
    unit: "ครั้ง",
  },
  {
    id: "farm_3",
    type: "farm",
    description: "ออกฟาร์มเห็ดให้ครบ 3 ครั้ง",
    target: 3,
    reward: 50,
    weight: 45,
    difficulty: "easy",
    emoji: "🍄",
    unit: "ครั้ง",
  },
  {
    id: "farm_5",
    type: "farm",
    description: "ออกฟาร์มเห็ดให้ครบ 5 ครั้ง",
    target: 5,
    reward: 70,
    weight: 42,
    difficulty: "easy",
    emoji: "🍄",
    unit: "ครั้ง",
  },
  {
    id: "chat_5",
    type: "chat",
    description: "พิมพ์ข้อความในเซิร์ฟเวอร์ให้ครบ 5 ข้อความ",
    target: 5,
    reward: 25,
    weight: 50,
    difficulty: "easy",
    emoji: "💬",
    unit: "ข้อความ",
  },
  {
    id: "chat_10",
    type: "chat",
    description: "พิมพ์ข้อความในเซิร์ฟเวอร์ให้ครบ 10 ข้อความ",
    target: 10,
    reward: 40,
    weight: 45,
    difficulty: "easy",
    emoji: "💬",
    unit: "ข้อความ",
  },
  {
    id: "chat_20",
    type: "chat",
    description: "พิมพ์ข้อความในเซิร์ฟเวอร์ให้ครบ 20 ข้อความ",
    target: 20,
    reward: 60,
    weight: 42,
    difficulty: "easy",
    emoji: "💬",
    unit: "ข้อความ",
  },
  {
    id: "voice_10",
    type: "voice",
    description: "สิงห้องเสียงให้ครบ 10 นาที",
    target: 10,
    reward: 20,
    weight: 50,
    difficulty: "easy",
    emoji: "🎙️",
    unit: "นาที",
  },
  {
    id: "voice_20",
    type: "voice",
    description: "สิงห้องเสียงให้ครบ 20 นาที",
    target: 20,
    reward: 35,
    weight: 45,
    difficulty: "easy",
    emoji: "🎙️",
    unit: "นาที",
  },
  {
    id: "voice_30",
    type: "voice",
    description: "สิงห้องเสียงให้ครบ 30 นาที",
    target: 30,
    reward: 45,
    weight: 40,
    difficulty: "easy",
    emoji: "🎙️",
    unit: "นาที",
  },
  {
    id: "voice_45",
    type: "voice",
    description: "สิงห้องเสียงให้ครบ 45 นาที",
    target: 45,
    reward: 65,
    weight: 38,
    difficulty: "easy",
    emoji: "🎙️",
    unit: "นาที",
  },

  // ════════════════════════════════════════════
  // 🟡 MEDIUM
  // ════════════════════════════════════════════

  {
    id: "farm_6",
    type: "farm",
    description: "ออกฟาร์มเห็ดให้ครบ 6 ครั้ง",
    target: 6,
    reward: 120,
    weight: 32,
    difficulty: "medium",
    emoji: "🍄",
    unit: "ครั้ง",
  },
  {
    id: "farm_8",
    type: "farm",
    description: "ออกฟาร์มเห็ดให้ครบ 8 ครั้ง",
    target: 8,
    reward: 150,
    weight: 28,
    difficulty: "medium",
    emoji: "🍄",
    unit: "ครั้ง",
  },
  {
    id: "farm_10",
    type: "farm",
    description: "ออกฟาร์มเห็ดให้ครบ 10 ครั้ง",
    target: 10,
    reward: 180,
    weight: 26,
    difficulty: "medium",
    emoji: "🍄",
    unit: "ครั้ง",
  },
  {
    id: "chat_25",
    type: "chat",
    description: "พิมพ์ข้อความในเซิร์ฟเวอร์ให้ครบ 25 ข้อความ",
    target: 25,
    reward: 100,
    weight: 32,
    difficulty: "medium",
    emoji: "💬",
    unit: "ข้อความ",
  },
  {
    id: "chat_35",
    type: "chat",
    description: "พิมพ์ข้อความในเซิร์ฟเวอร์ให้ครบ 35 ข้อความ",
    target: 35,
    reward: 130,
    weight: 28,
    difficulty: "medium",
    emoji: "💬",
    unit: "ข้อความ",
  },
  {
    id: "chat_40",
    type: "chat",
    description: "พิมพ์ข้อความในเซิร์ฟเวอร์ให้ครบ 40 ข้อความ",
    target: 40,
    reward: 150,
    weight: 26,
    difficulty: "medium",
    emoji: "💬",
    unit: "ข้อความ",
  },
  {
    id: "voice_60",
    type: "voice",
    description: "สิงห้องเสียงให้ครบ 1 ชั่วโมง",
    target: 60,
    reward: 110,
    weight: 30,
    difficulty: "medium",
    emoji: "🎙️",
    unit: "นาที",
  },
  {
    id: "voice_75",
    type: "voice",
    description: "สิงห้องเสียงให้ครบ 1 ชั่วโมง 15 นาที",
    target: 75,
    reward: 130,
    weight: 27,
    difficulty: "medium",
    emoji: "🎙️",
    unit: "นาที",
  },
  {
    id: "voice_90",
    type: "voice",
    description: "สิงห้องเสียงให้ครบ 1 ชั่วโมง 30 นาที",
    target: 90,
    reward: 155,
    weight: 25,
    difficulty: "medium",
    emoji: "🎙️",
    unit: "นาที",
  },

  // ════════════════════════════════════════════
  // 🔴 HARD
  // ════════════════════════════════════════════

  {
    id: "farm_12",
    type: "farm",
    description: "ออกฟาร์มเห็ดให้ครบ 12 ครั้ง",
    target: 12,
    reward: 280,
    weight: 13,
    difficulty: "hard",
    emoji: "🍄",
    unit: "ครั้ง",
  },
  {
    id: "farm_15",
    type: "farm",
    description: "ออกฟาร์มเห็ดให้ครบ 15 ครั้ง",
    target: 15,
    reward: 340,
    weight: 11,
    difficulty: "hard",
    emoji: "🍄",
    unit: "ครั้ง",
  },
  {
    id: "farm_18",
    type: "farm",
    description: "ออกฟาร์มเห็ดให้ครบ 18 ครั้ง",
    target: 18,
    reward: 390,
    weight: 10,
    difficulty: "hard",
    emoji: "🍄",
    unit: "ครั้ง",
  },
  {
    id: "chat_50",
    type: "chat",
    description: "พิมพ์ข้อความในเซิร์ฟเวอร์ให้ครบ 50 ข้อความ",
    target: 50,
    reward: 250,
    weight: 13,
    difficulty: "hard",
    emoji: "💬",
    unit: "ข้อความ",
  },
  {
    id: "chat_70",
    type: "chat",
    description: "พิมพ์ข้อความในเซิร์ฟเวอร์ให้ครบ 70 ข้อความ",
    target: 70,
    reward: 310,
    weight: 11,
    difficulty: "hard",
    emoji: "💬",
    unit: "ข้อความ",
  },
  {
    id: "chat_100",
    type: "chat",
    description: "พิมพ์ข้อความในเซิร์ฟเวอร์ให้ครบ 100 ข้อความ",
    target: 100,
    reward: 380,
    weight: 9,
    difficulty: "hard",
    emoji: "💬",
    unit: "ข้อความ",
  },
  {
    id: "voice_120",
    type: "voice",
    description: "สิงห้องเสียงให้ครบ 2 ชั่วโมง",
    target: 120,
    reward: 260,
    weight: 12,
    difficulty: "hard",
    emoji: "🎙️",
    unit: "นาที",
  },
  {
    id: "voice_150",
    type: "voice",
    description: "สิงห้องเสียงให้ครบ 2 ชั่วโมง 30 นาที",
    target: 150,
    reward: 320,
    weight: 10,
    difficulty: "hard",
    emoji: "🎙️",
    unit: "นาที",
  },

  // ════════════════════════════════════════════
  // 👑 LEGENDARY
  // ════════════════════════════════════════════

  {
    id: "farm_20",
    type: "farm",
    description: "ออกฟาร์มเห็ดให้ครบ 20 ครั้ง",
    target: 20,
    reward: 500,
    weight: 4,
    difficulty: "legendary",
    emoji: "👑",
    unit: "ครั้ง",
  },
  {
    id: "farm_25",
    type: "farm",
    description: "ออกฟาร์มเห็ดให้ครบ 25 ครั้ง (ตำนานแห่งป่า)",
    target: 25,
    reward: 650,
    weight: 3,
    difficulty: "legendary",
    emoji: "👑",
    unit: "ครั้ง",
  },
  {
    id: "farm_30",
    type: "farm",
    description: "ออกฟาร์มเห็ดให้ครบ 30 ครั้ง (เทพแห่งสปอร์)",
    target: 30,
    reward: 800,
    weight: 2,
    difficulty: "legendary",
    emoji: "👑",
    unit: "ครั้ง",
  },
  {
    id: "chat_150",
    type: "chat",
    description: "พิมพ์ข้อความให้ครบ 150 ข้อความ (นักพูดตัวยง)",
    target: 150,
    reward: 550,
    weight: 4,
    difficulty: "legendary",
    emoji: "👑",
    unit: "ข้อความ",
  },
  {
    id: "chat_200",
    type: "chat",
    description: "พิมพ์ข้อความให้ครบ 200 ข้อความ (เจ้าแห่งคำพูด)",
    target: 200,
    reward: 700,
    weight: 2,
    difficulty: "legendary",
    emoji: "👑",
    unit: "ข้อความ",
  },
  {
    id: "voice_180",
    type: "voice",
    description: "สิงห้องเสียงให้ครบ 3 ชั่วโมง",
    target: 180,
    reward: 480,
    weight: 4,
    difficulty: "legendary",
    emoji: "👑",
    unit: "นาที",
  },
  {
    id: "voice_240",
    type: "voice",
    description: "สิงห้องเสียงให้ครบ 4 ชั่วโมง (อมตะแห่งห้องเสียง)",
    target: 240,
    reward: 650,
    weight: 2,
    difficulty: "legendary",
    emoji: "👑",
    unit: "นาที",
  },
  {
    id: "voice_300",
    type: "voice",
    description: "สิงห้องเสียงให้ครบ 5 ชั่วโมง (ราชาห้องเสียง)",
    target: 300,
    reward: 900,
    weight: 1,
    difficulty: "legendary",
    emoji: "👑",
    unit: "นาที",
  },
];

// ─── Weighted Random Draw ────────────────────────────────────
// Draws `count` quests from the pool without repeating IDs.
// Tries to vary quest types — each type ideally appears at most once.
export function rollQuests(count = 3): QuestDef[] {
  const chosen: QuestDef[] = [];
  const usedIds = new Set<string>();
  const usedTypes = new Set<QuestType>();

  for (let attempt = 0; attempt < 300 && chosen.length < count; attempt++) {
    const available = QUEST_POOL.filter((q) => !usedIds.has(q.id));
    if (available.length === 0) break;

    const totalWeight = available.reduce((sum, q) => sum + q.weight, 0);
    let r = Math.random() * totalWeight;
    let selected: QuestDef | null = null;

    for (const q of available) {
      r -= q.weight;
      if (r <= 0) { selected = q; break; }
    }
    if (!selected) selected = available[available.length - 1]!;

    // Try to vary types in the first pass (first 100 attempts)
    if (usedTypes.has(selected.type) && chosen.length < count - 1 && attempt < 100) {
      continue;
    }

    chosen.push(selected);
    usedIds.add(selected.id);
    usedTypes.add(selected.type);
  }

  return chosen;
}

export function getQuestById(id: string): QuestDef | undefined {
  return QUEST_POOL.find((q) => q.id === id);
}

export const DIFFICULTY_EMOJI: Record<QuestDifficulty, string> = {
  easy: "🟢",
  medium: "🟡",
  hard: "🔴",
  legendary: "👑",
};

export const DIFFICULTY_LABEL: Record<QuestDifficulty, string> = {
  easy: "ง่าย",
  medium: "ปานกลาง",
  hard: "ยาก",
  legendary: "ตำนาน",
};
