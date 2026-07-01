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
  // ── EASY ──
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

  // ── MEDIUM ──
  {
    id: "farm_6",
    type: "farm",
    description: "ออกฟาร์มเห็ดให้ครบ 6 ครั้ง",
    target: 6,
    reward: 120,
    weight: 30,
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
    weight: 30,
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
    weight: 25,
    difficulty: "medium",
    emoji: "🎙️",
    unit: "นาที",
  },

  // ── HARD ──
  {
    id: "farm_12",
    type: "farm",
    description: "ออกฟาร์มเห็ดให้ครบ 12 ครั้ง",
    target: 12,
    reward: 280,
    weight: 12,
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
    weight: 12,
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
    weight: 10,
    difficulty: "hard",
    emoji: "🎙️",
    unit: "นาที",
  },

  // ── LEGENDARY ──
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
    id: "voice_180",
    type: "voice",
    description: "สิงห้องเสียงให้ครบ 3 ชั่วโมง",
    target: 180,
    reward: 480,
    weight: 3,
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
