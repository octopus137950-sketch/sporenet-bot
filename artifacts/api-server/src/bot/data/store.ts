import fs from "fs";
import path from "path";

const DATA_DIR = process.env["DATA_DIR"] ?? path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "bot_data.json");

fs.mkdirSync(DATA_DIR, { recursive: true });
console.log(`📦 [store] DATA_DIR = ${DATA_DIR}`);
console.log(`📄 [store] DATA_FILE = ${DATA_FILE}`);

export interface RoleEntry {
  emoji: string;
  roleId: string;
  roleName: string;
}

export interface ReactionRolePanel {
  guildId: string;
  channelId: string;
  messageId: string;
  title: string;
  description: string;
  imageUrl?: string;
  exclusive: boolean;
  roles: RoleEntry[];
}

export interface WelcomeGoodbyeConfig {
  channelId: string;
  message: string;
  imageUrl?: string;
  enabled: boolean;
}

export interface ShopItem {
  id: string;
  name: string;
  description: string;
  price: number;
  roleId?: string;
  type: "role" | "custom";
}

export interface VerificationPanelField {
  id: string;
  label: string;
  placeholder?: string;
  required?: boolean;
}

export interface VerificationPanel {
  guildId: string;
  channelId: string;
  messageId: string;
  title: string;
  description: string;
  imageUrl?: string;
  roleIdToGrant?: string;
  fields: VerificationPanelField[];
  logChannelId?: string;
}

export interface VerificationSubmission {
  id: string;
  panelMessageId: string;
  userId: string;
  values: Record<string, string>;
  createdAt: number;
}

export interface VoiceRewardConfig {
  enabled: boolean;
  timeLoopMinutes: number;
  giveSpore: number;
  giveExp: number;
  notifyChannelId?: string;
  blockedRoomIds: string[];
}

export interface DynVoiceConfig {
  starterChannelIds: string[];
}

export interface WorldBossConfig {
  intervalDays: number;
  spawnHour: number;
  spawnMinute: number;
  timeoutMinutes: number;
  liveUpdateSeconds: number;
  nextSpawnAt?: number;
}

export interface GuildConfig {
  welcome?: WelcomeGoodbyeConfig;
  goodbye?: WelcomeGoodbyeConfig;
  logChannelId?: string;
  gameChannelId?: string;
  shop?: ShopItem[];
  voiceReward?: VoiceRewardConfig;
  dynVoice?: DynVoiceConfig | null;
  worldBoss?: WorldBossConfig;
}

export interface PlayerData {
  userId: string;
  sporePoints: number;
  farmLevel: number;
  farmExp: number;
  lastFarmTime: number;
  lastDailyTime: number;
  dailyStreak: number;
}

// ─── Daily Quest Data ────────────────────────────────────────

export interface PlayerQuestEntry {
  questId: string;
  progress: number;
  completed: boolean;
  claimed: boolean;
}

export interface PlayerQuestData {
  userId: string;
  date: string;
  quests: PlayerQuestEntry[];
}

// ─── Achievement System ──────────────────────────────────────

/** Supported condition types for achievements */
export type AchievementConditionType =
  | "voice_time"        // วินาทีในห้องเสียงสะสม
  | "chat_count"        // ข้อความที่ส่งสะสม
  | "farm_count"        // ครั้งที่ฟาร์มเห็ดสะสม
  | "quest_completed";  // เควสที่สำเร็จสะสม (ทุกวันรวมกัน)

/** A single condition (type + threshold).  ALL conditions in an achievement must be met. */
export interface AchievementCondition {
  type: AchievementConditionType;
  value: number;
}

export interface AchievementConfig {
  achievementId: string;
  guildId: string;
  titleName: string;
  /** One or more conditions — ALL must be satisfied simultaneously */
  conditions: AchievementCondition[];
  sporeReward: number;
  isSecret: boolean;
  isDiscovered: boolean;
  firstUnlockedBy: string | null;
  discordRoleId?: string;
  createdAt: number;
}

export interface PlayerAchievement {
  userId: string;
  guildId: string;
  achievementId: string;
  unlockedAt: number;
}

export interface PlayerStats {
  userId: string;
  guildId: string;
  voiceTimeSeconds: number;
  chatCount: number;
  farmCount: number;
  questCompletedCount: number;
}

// ─── Store ───────────────────────────────────────────────────

// ─── Inventory System ────────────────────────────────────────

export interface InventoryItem {
  itemId: string;
  isEquipped: boolean;
}

export interface Store {
  panels: Record<string, ReactionRolePanel>;
  guilds: Record<string, GuildConfig>;
  players: Record<string, PlayerData>;
  verificationPanels: Record<string, VerificationPanel>;
  verificationSubmissions: VerificationSubmission[];
  questData: Record<string, PlayerQuestData>;
  achievements: Record<string, AchievementConfig[]>;
  playerAchievements: PlayerAchievement[];
  playerStats: Record<string, PlayerStats>;
  inventories: Record<string, InventoryItem[]>;
}

function emptyStore(): Store {
  return {
    panels: {},
    guilds: {},
    players: {},
    verificationPanels: {},
    verificationSubmissions: [],
    questData: {},
    achievements: {},
    playerAchievements: [],
    playerStats: {},
    inventories: {},
  };
}

// ── Migrate legacy single-condition achievements on load ──────
// Old format had `targetType` + `targetValue` directly.
// New format uses `conditions: AchievementCondition[]`.
function migrateLegacyAchievement(raw: Record<string, unknown>): AchievementConfig {
  if (!Array.isArray(raw["conditions"])) {
    // Legacy format — convert to new conditions array
    const conditions: AchievementCondition[] = [{
      type: (raw["targetType"] as AchievementConditionType) ?? "chat_count",
      value: (raw["targetValue"] as number) ?? 1,
    }];
    return {
      achievementId:   raw["achievementId"] as string,
      guildId:         raw["guildId"] as string,
      titleName:       raw["titleName"] as string,
      conditions,
      sporeReward:     (raw["sporeReward"] as number) ?? 0,
      isSecret:        (raw["isSecret"] as boolean) ?? false,
      isDiscovered:    (raw["isDiscovered"] as boolean) ?? false,
      firstUnlockedBy: (raw["firstUnlockedBy"] as string | null) ?? null,
      discordRoleId:   raw["discordRoleId"] as string | undefined,
      createdAt:       (raw["createdAt"] as number) ?? Date.now(),
    };
  }
  return raw as unknown as AchievementConfig;
}

function loadStore(): Store {
  if (!fs.existsSync(DATA_FILE)) return emptyStore();
  try {
    const raw = fs.readFileSync(DATA_FILE, "utf-8");
    const parsed = JSON.parse(raw) as Partial<Store>;

    // Migrate legacy achievements
    const rawAchievements = (parsed.achievements ?? {}) as Record<string, Record<string, unknown>[]>;
    const achievements: Record<string, AchievementConfig[]> = {};
    for (const [guildId, list] of Object.entries(rawAchievements)) {
      achievements[guildId] = list.map(migrateLegacyAchievement);
    }

    // Migrate legacy PlayerStats missing questCompletedCount
    const rawStats = (parsed.playerStats ?? {}) as Record<string, Partial<PlayerStats>>;
    const playerStats: Record<string, PlayerStats> = {};
    for (const [key, s] of Object.entries(rawStats)) {
      playerStats[key] = {
        userId:               s.userId ?? "",
        guildId:              s.guildId ?? "",
        voiceTimeSeconds:     s.voiceTimeSeconds ?? 0,
        chatCount:            s.chatCount ?? 0,
        farmCount:            s.farmCount ?? 0,
        questCompletedCount:  s.questCompletedCount ?? 0,
      };
    }

    return {
      panels:                  parsed.panels ?? {},
      guilds:                  parsed.guilds ?? {},
      players:                 parsed.players ?? {},
      verificationPanels:      parsed.verificationPanels ?? {},
      verificationSubmissions: parsed.verificationSubmissions ?? [],
      questData:               parsed.questData ?? {},
      achievements,
      playerAchievements:      parsed.playerAchievements ?? [],
      playerStats,
      inventories: (parsed.inventories ?? {}) as Record<string, InventoryItem[]>,
    };
  } catch {
    return emptyStore();
  }
}

function saveStore(store: Store): void {
  fs.writeFileSync(DATA_FILE, JSON.stringify(store, null, 2), "utf-8");
}

let _store: Store = loadStore();

export function getStore(): Store { return _store; }

// ─── Panels ─────────────────────────────────────────────────

export function savePanel(panel: ReactionRolePanel): void {
  _store.panels[panel.messageId] = panel;
  saveStore(_store);
}

export function getPanel(messageId: string): ReactionRolePanel | undefined {
  return _store.panels[messageId];
}

export function deletePanel(messageId: string): boolean {
  if (_store.panels[messageId]) {
    delete _store.panels[messageId];
    saveStore(_store);
    return true;
  }
  return false;
}

export function getAllPanels(): ReactionRolePanel[] {
  return Object.values(_store.panels);
}

// ─── Guild Config ────────────────────────────────────────────

export function getGuildConfig(guildId: string): GuildConfig {
  return _store.guilds[guildId] ?? {};
}

export function setWelcomeConfig(guildId: string, config: WelcomeGoodbyeConfig): void {
  if (!_store.guilds[guildId]) _store.guilds[guildId] = {};
  _store.guilds[guildId]!.welcome = config;
  saveStore(_store);
}

export function setGoodbyeConfig(guildId: string, config: WelcomeGoodbyeConfig): void {
  if (!_store.guilds[guildId]) _store.guilds[guildId] = {};
  _store.guilds[guildId]!.goodbye = config;
  saveStore(_store);
}

export function disableWelcome(guildId: string): void {
  if (_store.guilds[guildId]?.welcome) {
    _store.guilds[guildId]!.welcome!.enabled = false;
    saveStore(_store);
  }
}

export function disableGoodbye(guildId: string): void {
  if (_store.guilds[guildId]?.goodbye) {
    _store.guilds[guildId]!.goodbye!.enabled = false;
    saveStore(_store);
  }
}

export function setLogChannel(guildId: string, channelId: string): void {
  if (!_store.guilds[guildId]) _store.guilds[guildId] = {};
  _store.guilds[guildId]!.logChannelId = channelId;
  saveStore(_store);
}

export function getLogChannel(guildId: string): string | undefined {
  return _store.guilds[guildId]?.logChannelId;
}

export function setGameChannel(guildId: string, channelId: string): void {
  if (!_store.guilds[guildId]) _store.guilds[guildId] = {};
  _store.guilds[guildId]!.gameChannelId = channelId;
  saveStore(_store);
}

export function getGameChannel(guildId: string): string | undefined {
  return _store.guilds[guildId]?.gameChannelId;
}

export function getShopItems(guildId: string): ShopItem[] {
  return _store.guilds[guildId]?.shop ?? [];
}

export function addShopItem(guildId: string, item: ShopItem): void {
  if (!_store.guilds[guildId]) _store.guilds[guildId] = {};
  if (!_store.guilds[guildId]!.shop) _store.guilds[guildId]!.shop = [];
  _store.guilds[guildId]!.shop!.push(item);
  saveStore(_store);
}

export function removeShopItem(guildId: string, itemId: string): boolean {
  const shop = _store.guilds[guildId]?.shop;
  if (!shop) return false;
  const idx = shop.findIndex((i) => i.id === itemId);
  if (idx === -1) return false;
  shop.splice(idx, 1);
  saveStore(_store);
  return true;
}

export function getVoiceRewardConfig(guildId: string): VoiceRewardConfig | undefined {
  return _store.guilds[guildId]?.voiceReward;
}

export function setVoiceRewardConfig(guildId: string, config: VoiceRewardConfig): void {
  if (!_store.guilds[guildId]) _store.guilds[guildId] = {};
  _store.guilds[guildId]!.voiceReward = config;
  saveStore(_store);
}

export function getDynVoiceConfig(guildId: string): DynVoiceConfig | null | undefined {
  return _store.guilds[guildId]?.dynVoice;
}

export function setDynVoiceConfig(guildId: string, config: DynVoiceConfig | null): void {
  if (!_store.guilds[guildId]) _store.guilds[guildId] = {};
  _store.guilds[guildId]!.dynVoice = config;
  saveStore(_store);
}

// ─── World Boss ───────────────────────────────────────────────

export function getWorldBossConfig(guildId: string): WorldBossConfig | undefined {
  return _store.guilds[guildId]?.worldBoss;
}

export function setWorldBossConfig(guildId: string, config: WorldBossConfig): void {
  if (!_store.guilds[guildId]) _store.guilds[guildId] = {};
  _store.guilds[guildId]!.worldBoss = config;
  saveStore(_store);
}

// ─── Players ─────────────────────────────────────────────────

export function getPlayer(userId: string): PlayerData {
  if (!_store.players[userId]) {
    _store.players[userId] = {
      userId,
      sporePoints: 0,
      farmLevel: 1,
      farmExp: 0,
      lastFarmTime: 0,
      lastDailyTime: 0,
      dailyStreak: 0,
    };
  }
  return _store.players[userId]!;
}

export function savePlayer(player: PlayerData): void {
  _store.players[player.userId] = player;
  saveStore(_store);
}

export function getTopPlayers(limit = 10): PlayerData[] {
  return Object.values(_store.players)
    .sort((a, b) => b.sporePoints - a.sporePoints)
    .slice(0, limit);
}

// ─── Verification ────────────────────────────────────────────

export function saveVerificationPanel(panel: VerificationPanel): void {
  _store.verificationPanels[panel.messageId] = panel;
  saveStore(_store);
}

export function getVerificationPanel(messageId: string): VerificationPanel | undefined {
  return _store.verificationPanels[messageId];
}

export function deleteVerificationPanel(messageId: string): boolean {
  if (_store.verificationPanels[messageId]) {
    delete _store.verificationPanels[messageId];
    saveStore(_store);
    return true;
  }
  return false;
}

export function getAllVerificationPanels(): VerificationPanel[] {
  return Object.values(_store.verificationPanels);
}

export function saveVerificationSubmission(sub: VerificationSubmission): void {
  _store.verificationSubmissions.push(sub);
  saveStore(_store);
}

export function getSubmissionsForPanel(messageId: string): VerificationSubmission[] {
  return _store.verificationSubmissions.filter((s) => s.panelMessageId === messageId);
}

export function getSubmissionsForUser(userId: string): VerificationSubmission[] {
  return _store.verificationSubmissions.filter((s) => s.userId === userId);
}

// ─── Quest Data ──────────────────────────────────────────────

export function getPlayerQuestData(userId: string): PlayerQuestData | undefined {
  return _store.questData[userId];
}

export function savePlayerQuestData(data: PlayerQuestData): void {
  _store.questData[data.userId] = data;
  saveStore(_store);
}

export function clearStaleQuestData(today: string): void {
  let changed = false;
  for (const userId of Object.keys(_store.questData)) {
    if (_store.questData[userId]?.date !== today) {
      delete _store.questData[userId];
      changed = true;
    }
  }
  if (changed) saveStore(_store);
}

// ─── Achievement CRUD ────────────────────────────────────────

export function getGuildAchievements(guildId: string): AchievementConfig[] {
  return _store.achievements[guildId] ?? [];
}

export function getAchievementById(guildId: string, achievementId: string): AchievementConfig | undefined {
  return (_store.achievements[guildId] ?? []).find((a) => a.achievementId === achievementId);
}

export function saveAchievement(ach: AchievementConfig): void {
  if (!_store.achievements[ach.guildId]) _store.achievements[ach.guildId] = [];
  const idx = _store.achievements[ach.guildId]!.findIndex((a) => a.achievementId === ach.achievementId);
  if (idx >= 0) {
    _store.achievements[ach.guildId]![idx] = ach;
  } else {
    _store.achievements[ach.guildId]!.push(ach);
  }
  saveStore(_store);
}

export function deleteAchievement(guildId: string, achievementId: string): boolean {
  const list = _store.achievements[guildId];
  if (!list) return false;
  const idx = list.findIndex((a) => a.achievementId === achievementId);
  if (idx === -1) return false;
  list.splice(idx, 1);
  saveStore(_store);
  return true;
}

export function markAchievementDiscovered(guildId: string, achievementId: string, userId: string): void {
  const ach = getAchievementById(guildId, achievementId);
  if (!ach) return;
  ach.isDiscovered = true;
  ach.firstUnlockedBy = userId;
  saveAchievement(ach);
}

// ─── Player Achievements ─────────────────────────────────────

export function getPlayerAchievements(guildId: string, userId: string): PlayerAchievement[] {
  return _store.playerAchievements.filter((a) => a.guildId === guildId && a.userId === userId);
}

export function addPlayerAchievement(entry: PlayerAchievement): void {
  _store.playerAchievements.push(entry);
  saveStore(_store);
}

export function hasPlayerAchievement(guildId: string, userId: string, achievementId: string): boolean {
  return _store.playerAchievements.some(
    (a) => a.guildId === guildId && a.userId === userId && a.achievementId === achievementId
  );
}

// ─── Player Stats (cumulative for achievements) ───────────────

function statsKey(guildId: string, userId: string): string {
  return `${guildId}:${userId}`;
}

export function getPlayerStats(guildId: string, userId: string): PlayerStats {
  const key = statsKey(guildId, userId);
  if (!_store.playerStats[key]) {
    _store.playerStats[key] = {
      userId,
      guildId,
      voiceTimeSeconds:    0,
      chatCount:           0,
      farmCount:           0,
      questCompletedCount: 0,
    };
  }
  return _store.playerStats[key]!;
}

export function incrementPlayerStat(
  guildId: string,
  userId: string,
  field: keyof Omit<PlayerStats, "userId" | "guildId">,
  amount: number
): PlayerStats {
  const key = statsKey(guildId, userId);
  const stats = getPlayerStats(guildId, userId);
  stats[field] += amount;
  _store.playerStats[key] = stats;
  saveStore(_store);
  return stats;
}

// ─── Condition parsing helper (used by admin command) ────────

/**
 * Parse a conditions string into AchievementCondition[].
 * Format: "voice_time:180000,chat_count:3000,farm_count:200,quest_completed:50"
 * Returns null if any token is invalid.
 */
export function parseConditionsString(raw: string): AchievementCondition[] | null {
  const VALID_TYPES: AchievementConditionType[] = ["voice_time", "chat_count", "farm_count", "quest_completed"];
  const tokens = raw.split(",").map((t) => t.trim()).filter(Boolean);
  if (tokens.length === 0) return null;

  const result: AchievementCondition[] = [];
  for (const token of tokens) {
    const colonIdx = token.indexOf(":");
    if (colonIdx === -1) return null;
    const type = token.slice(0, colonIdx).trim() as AchievementConditionType;
    const valueStr = token.slice(colonIdx + 1).trim();
    const value = parseInt(valueStr, 10);
    if (!VALID_TYPES.includes(type) || isNaN(value) || value < 1) return null;
    result.push({ type, value });
  }
  return result;
}

// ─── Inventory Helpers ───────────────────────────────────────

/** ดึงกระเป๋าไอเทมของผู้เล่น (สร้างใหม่ถ้าไม่มี) */
export function getInventory(userId: string): InventoryItem[] {
  if (!_store.inventories[userId]) {
    _store.inventories[userId] = [];
  }
  return _store.inventories[userId]!;
}

/** เพิ่มไอเทมเข้ากระเป๋า (ยังไม่สวมใส่) */
export function addItemToInventory(userId: string, itemId: string): void {
  const inv = getInventory(userId);
  inv.push({ itemId, isEquipped: false });
  _store.inventories[userId] = inv;
  saveStore(_store);
}

/** นับจำนวนช่องสวมใส่ที่ใช้ไปแล้ว (max 3) */
export function getEquippedCount(userId: string): number {
  return getInventory(userId).filter((e) => e.isEquipped).length;
}

/**
 * สวมใส่ไอเทม — คืน true ถ้าสำเร็จ
 * กฎ: ชิ้นเดียวกัน (itemId เดียวกัน) ถ้าสวมใส่อยู่แล้ว ไม่ต้อง stack
 */
export function equipItem(userId: string, itemId: string): boolean {
  const inv = getInventory(userId);
  // หา slot ที่ยังไม่ได้สวม (เป็นชิ้นเดิมๆ ที่ไม่ได้ equipped)
  const slot = inv.find((e) => e.itemId === itemId && !e.isEquipped);
  if (!slot) return false;
  if (getEquippedCount(userId) >= 3) return false;
  slot.isEquipped = true;
  _store.inventories[userId] = inv;
  saveStore(_store);
  return true;
}

/**
 * ถอดไอเทม — คืน true ถ้าสำเร็จ
 */
export function unequipItem(userId: string, itemId: string): boolean {
  const inv = getInventory(userId);
  const slot = inv.find((e) => e.itemId === itemId && e.isEquipped);
  if (!slot) return false;
  slot.isEquipped = false;
  _store.inventories[userId] = inv;
  saveStore(_store);
  return true;
}

/**
 * โอนไอเทม (ถอดออกก่อนโอน) — คืน true ถ้าสำเร็จ
 */
export function transferItem(fromUserId: string, toUserId: string, itemId: string): boolean {
  const fromInv = getInventory(fromUserId);
  // ห้ามโอนถ้า equipped อยู่
  const slot = fromInv.find((e) => e.itemId === itemId && !e.isEquipped);
  if (!slot) return false;
  // ลบจากผู้โอน
  const idx = fromInv.indexOf(slot);
  fromInv.splice(idx, 1);
  _store.inventories[fromUserId] = fromInv;
  // เพิ่มให้ผู้รับ
  addItemToInventory(toUserId, itemId);
  saveStore(_store);
  return true;
}

/**
 * ดึงบัฟที่ active อยู่จากไอเทมที่สวมใส่
 * กฎ non-stack: ไอเทมชนิดเดียวกัน (itemId เดียวกัน) นับแค่ 1 ครั้ง
 */
export function getActiveBuffs(userId: string): Map<string, number> {
  const inv = getInventory(userId);
  const equipped = inv.filter((e) => e.isEquipped);
  // dedupe by itemId (non-stack rule)
  const seen = new Set<string>();
  const result = new Map<string, number>();
  for (const entry of equipped) {
    if (seen.has(entry.itemId)) continue;
    seen.add(entry.itemId);
    result.set(entry.itemId, 1);
  }
  return result;
}
