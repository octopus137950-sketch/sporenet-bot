import fs from "fs";
import path from "path";

const DATA_DIR = process.env["DATA_DIR"] ?? path.join(process.cwd(), "data");
const FARM_STORY_FILE = path.join(DATA_DIR, "farm_story.json");

fs.mkdirSync(DATA_DIR, { recursive: true });

export type WeaponId = "sword" | "spear" | "bow" | "axe";

export interface WeaponSkill {
  id: string;
  name: string;
  description: string;
  costMP: number;
  damageMultiplier: number;
  hitChance: number;
  effectChance?: number;
  effect?: "stun" | "poison" | "defend" | "pierce" | "double_hit" | "whirlwind";
  effectDuration?: number;
}

export interface Weapon {
  id: WeaponId;
  name: string;
  emoji: string;
  description: string;
  baseDamage: number;
  baseDefense: number;
  baseHP: number;
  skills: WeaponSkill[];
}

export const WEAPONS: Record<WeaponId, Weapon> = {
  sword: {
    id: "sword",
    name: "ดาบแห่งเมืองหิน",
    emoji: "⚔️",
    description: "อาวุธสมดุล มีทั้งพลังโจมตีและการป้องกันที่ดี",
    baseDamage: 25,
    baseDefense: 8,
    baseHP: 100,
    skills: [
      { id: "power_slash", name: "ฟันแรง", description: "ฟันหนัก โอกาสโดน 85%", costMP: 15, damageMultiplier: 1.6, hitChance: 85 },
      { id: "counter", name: "หลบและโต้กลับ", description: "โจมตีพร้อมตั้งรับ ลดความเสียหายรอบหน้า", costMP: 10, damageMultiplier: 0.8, hitChance: 90, effect: "defend", effectDuration: 1 },
      { id: "stunning_slash", name: "ฟันสะเทือน", description: "ฟันจนศัตรูมีโอกาสชะงัก", costMP: 20, damageMultiplier: 1.2, hitChance: 85, effect: "stun", effectChance: 55, effectDuration: 1 },
    ],
  },
  spear: {
    id: "spear",
    name: "หอกเวทมนตร์แห่งแรง",
    emoji: "🗡️",
    description: "โจมตีสูงและแม่นยำ เหมาะกับการเจาะเกราะ",
    baseDamage: 28,
    baseDefense: 4,
    baseHP: 85,
    skills: [
      { id: "piercing_thrust", name: "แทงทะลุ", description: "เจาะเกราะศัตรู ทำให้โดนแรงขึ้น", costMP: 20, damageMultiplier: 1.8, hitChance: 80, effect: "pierce", effectDuration: 2 },
      { id: "quick_strike", name: "การโจมตีเร็ว", description: "แทงสองครั้ง ความเสียหายรวมสูง", costMP: 12, damageMultiplier: 0.7, hitChance: 100, effect: "double_hit", effectDuration: 1 },
      { id: "guard_break", name: "ทำลายการ์ด", description: "ลดพลังโจมตีของศัตรูชั่วคราว", costMP: 18, damageMultiplier: 1.1, hitChance: 90, effect: "pierce", effectDuration: 3 },
    ],
  },
  bow: {
    id: "bow",
    name: "ธนูแสงจันทร์",
    emoji: "🏹",
    description: "ระยะไกลและอึด มีความแม่นยำสูง",
    baseDamage: 22,
    baseDefense: 11,
    baseHP: 110,
    skills: [
      { id: "power_shot", name: "ยิงแรง", description: "เล็งอย่างระมัดระวังแล้วยิงอย่างหนัก", costMP: 18, damageMultiplier: 1.7, hitChance: 88 },
      { id: "poison_arrow", name: "ธนูพิษ", description: "ทำให้ศัตรูติดพิษเป็นเวลาหลายเทิร์น", costMP: 16, damageMultiplier: 1.1, hitChance: 85, effect: "poison", effectChance: 75, effectDuration: 3 },
      { id: "moonlight", name: "แสงจันทร์ฟื้นพลัง", description: "โจมตีและฟื้น HP เล็กน้อย", costMP: 20, damageMultiplier: 0.8, hitChance: 95, effect: "defend", effectDuration: 1 },
    ],
  },
  axe: {
    id: "axe",
    name: "ขวานไฟแห่งสงคราม",
    emoji: "🪓",
    description: "พลังโจมตีสูงสุด แต่ป้องกันต่ำ ต้องเสี่ยงเพื่อชัยชนะ",
    baseDamage: 32,
    baseDefense: 2,
    baseHP: 75,
    skills: [
      { id: "cleave", name: "ฟันสะบั้น", description: "ฟันครั้งใหญ่ ความเสียหายสูงแต่พลาดง่าย", costMP: 22, damageMultiplier: 2.1, hitChance: 75 },
      { id: "whirlwind", name: "พายุขวาน", description: "หมุนขวานโจมตีสองครั้งและตั้งรับ", costMP: 25, damageMultiplier: 0.75, hitChance: 90, effect: "whirlwind", effectDuration: 1 },
      { id: "rage", name: "โทสะนักรบ", description: "โจมตีหนักและเพิ่มพลังในเทิร์นถัดไป", costMP: 18, damageMultiplier: 1.5, hitChance: 85, effect: "defend", effectDuration: 1 },
    ],
  },
};

export interface MushroomDefinition {
  id: string;
  name: string;
  emoji: string;
  description: string;
  value: number;
  exp: number;
  image: string;
}

export interface StoryItem {
  id: string;
  name: string;
  emoji: string;
  description: string;
  value?: number;
}

export interface StoryEventState {
  kind: "mushroom" | "npc" | "quest" | "shop" | "item" | "secret" | "ruins";
  id: string;
  title: string;
  description: string;
  image: string;
  mushroom?: MushroomDefinition;
  item?: StoryItem;
  offer?: StoryItem & { price: number };
  quest?: { id: string; title: string; description: string; target: number; progress: number; rewardSpore: number; rewardExp: number };
  resolved?: boolean;
}

export interface MonsterDefinition {
  id: string;
  name: string;
  emoji: string;
  description: string;
  image: string;
  level: number;
  maxHP: number;
  damageMin: number;
  damageMax: number;
  attackSkills: string[];
  rewardSpore: number;
  rewardExp: number;
}

export interface BattleState {
  monster: MonsterDefinition;
  currentHP: number;
  enemyDefenseBrokenTurns: number;
  enemyPoisonTurns: number;
  enemyStunnedTurns: number;
  playerDefending: boolean;
  turn: number;
}

export interface InventoryItem {
  id: string;
  name: string;
  emoji?: string;
  type: "mushroom" | "item";
  quantity: number;
  value?: number;
}

export interface ActiveQuest {
  id: string;
  title: string;
  description: string;
  target: number;
  progress: number;
  rewardSpore: number;
  rewardExp: number;
}

export interface FarmStorySession {
  userId: string;
  guildId: string;
  weapon: Weapon;
  chapter: number;
  isAccepted: boolean;
  currentHP: number;
  maxHP: number;
  currentMP: number;
  maxMP: number;
  currentExp: number;
  currentSpore: number;
  inventory: InventoryItem[];
  statusEffects: { type: string; duration: number }[];
  activeQuest?: ActiveQuest;
  pendingEvent?: StoryEventState;
  battle?: BattleState;
  createdAt: number;
  lastSavedAt: number;
  lastAction?: string;
}

interface FarmStoryStore {
  sessions: Record<string, FarmStorySession>;
}

function emptyStore(): FarmStoryStore {
  return { sessions: {} };
}

function loadStore(): FarmStoryStore {
  if (!fs.existsSync(FARM_STORY_FILE)) return emptyStore();
  try {
    const parsed = JSON.parse(fs.readFileSync(FARM_STORY_FILE, "utf-8")) as Partial<FarmStoryStore>;
    return { sessions: parsed.sessions ?? {} };
  } catch (error) {
    console.error("[farmStoryStore] Could not load session store:", error);
    return emptyStore();
  }
}

function writeStore(): void {
  fs.writeFileSync(FARM_STORY_FILE, JSON.stringify(_store, null, 2), "utf-8");
}

let _store = loadStore();

function key(userId: string, guildId: string): string {
  return `${userId}:${guildId}`;
}

export function getSession(userId: string, guildId: string): FarmStorySession | undefined {
  return _store.sessions[key(userId, guildId)];
}

export function createSession(
  userId: string,
  guildId: string,
  weapon: Weapon,
  isAccepted: boolean,
  initialSpore: number,
  playerExp = 0,
): FarmStorySession {
  const now = Date.now();
  return {
    userId,
    guildId,
    weapon,
    chapter: 1,
    isAccepted,
    currentHP: weapon.baseHP,
    maxHP: weapon.baseHP,
    currentMP: 50,
    maxMP: 50,
    currentExp: playerExp,
    currentSpore: initialSpore,
    inventory: [],
    statusEffects: [],
    createdAt: now,
    lastSavedAt: now,
    lastAction: "weapon_selected",
  };
}

export function saveSession(session: FarmStorySession): void {
  session.lastSavedAt = Date.now();
  _store.sessions[key(session.userId, session.guildId)] = session;
  writeStore();
}

export function saveAllSessions(): void {
  writeStore();
}

export function addItemToSession(session: FarmStorySession, item: InventoryItem): void {
  const existing = session.inventory.find((entry) => entry.id === item.id && entry.type === item.type);
  if (existing) existing.quantity += item.quantity;
  else session.inventory.push(item);
  saveSession(session);
}

export function removeItemFromSession(
  session: FarmStorySession,
  itemId: string,
  type: InventoryItem["type"],
  quantity = 1,
): boolean {
  const item = session.inventory.find((entry) => entry.id === itemId && entry.type === type);
  if (!item || item.quantity < quantity) return false;
  item.quantity -= quantity;
  if (item.quantity <= 0) {
    session.inventory.splice(session.inventory.indexOf(item), 1);
  }
  saveSession(session);
  return true;
}

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.once(signal, () => {
    saveAllSessions();
  });
}
