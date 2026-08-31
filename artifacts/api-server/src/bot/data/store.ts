import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";

const DATA_DIR = process.env["DATA_DIR"] ?? path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "bot_data.json");
const LOCK_DIR = path.join(DATA_DIR, "locks");

fs.mkdirSync(DATA_DIR, { recursive: true });
fs.mkdirSync(LOCK_DIR, { recursive: true });
console.log(`📦 [store] DATA_DIR = ${DATA_DIR}`);
console.log(`📄 [store] DATA_FILE = ${DATA_FILE}`);

function tryAcquireLock(scope: string, key: string, ttlMs: number): boolean {
  const scopeDir = path.join(LOCK_DIR, scope);
  const lockPath = path.join(scopeDir, `${key}.lock`);
  fs.mkdirSync(scopeDir, { recursive: true });

  try {
    const fd = fs.openSync(lockPath, "wx");
    fs.writeFileSync(fd, `${process.pid}:${Date.now()}`);
    fs.closeSync(fd);

    const timer = setTimeout(() => {
      try {
        fs.rmSync(lockPath, { force: true });
      } catch {
        // A stale lock will be cleaned up by the next acquisition attempt.
      }
    }, ttlMs);
    timer.unref?.();
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "EEXIST") return false;

    try {
      const ageMs = Date.now() - fs.statSync(lockPath).mtimeMs;
      if (ageMs > ttlMs) {
        fs.rmSync(lockPath, { force: true });
        return tryAcquireLock(scope, key, ttlMs);
      }
    } catch {
      // Another process may be creating/removing the lock right now.
    }
    return false;
  }
}

/** Prevents two bot processes from handling one user's voice leave event. */
export function tryAcquireVoiceLeaveLock(guildId: string, userId: string): boolean {
  return tryAcquireLock("voice-leave", `${guildId}-${userId}`, 30_000);
}

/** Prevents two bot processes from distributing the same voice reward cycle. */
export function tryAcquireVoiceRewardCycleLock(
  guildId: string,
  cycleKey: number,
  ttlMs: number,
): boolean {
  return tryAcquireLock("voice-reward-cycle", `${guildId}-${cycleKey}`, ttlMs);
}

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

/** บอส custom ที่แอดมินสร้างเองสำหรับ guild */
export interface CustomBoss {
  bossId: string;
  name: string;
  emoji: string;
  difficulty: string;
  difficultyColor: number;
  maxHp: number;
  rewardSpore: number;
  description: string;
  createdAt: number;
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
  /** บอสที่แอดมินสร้างเอง */
  customBosses?: CustomBoss[];
  /** ชื่อบอสมาตรฐาน (BOSS_POOL) ที่ถูก disable สำหรับ guild นี้ */
  disabledDefaultBosses?: string[];
  /** false = ปิดระบบบอสทั้งหมด (ไม่ spawn อัตโนมัติ, ไม่ spawn_now) */
  bossSystemEnabled?: boolean;
  /** ช่องแชทสำหรับคุยกับ AI (SporeNet AI Companion) */
  aiChannelId?: string;
  worldMushroom?: WorldMushroomState;
  marketplace?: MarketplaceConfig;
}

export interface MarketplaceConfig {
  channelId: string;
  enabled: boolean;
  listingDurationMs: number;
  feePercent: number;
}

export interface WorldMushroomContributor {
  userId: string;
  donatedSpores: number;
}

export interface WorldMushroomSeasonResult {
  seasonNumber: number;
  endedAt: number;
  topContributors: WorldMushroomContributor[];
}

export interface WorldMushroomState {
  level: number;
  exp: number;
  seasonNumber: number;
  seasonStartedAt: number;
  nextResetAt: number;
  contributors: Record<string, number>;
  lastPestAt: number;
  activePest?: {
    startedAt: number;
    expiresAt: number;
    protectedBy?: string;
  };
  lastSeasonResult?: WorldMushroomSeasonResult;
}


export interface FriendChannelConfig {
  guildId: string;
  channelId: string;
  updatedAt: number;
}

export interface FriendProfile {
  guildId: string;
  userId: string;
  interests: string[];
  chatStyle: string;
  availability: string;
  optIn: boolean;
  excludedUserIds: string[];
  updatedAt: number;
}

export type FriendMatchStatus = "candidate" | "pending" | "matched" | "later" | "voice" | "declined";

export interface FriendMatch {
  id: string;
  guildId: string;
  userA: string;
  userB: string;
  status: FriendMatchStatus;
  createdAt: number;
  matchedAt?: number;
  voiceChannelId?: string;
}

export interface PlayerData {
  userId: string;
  sporePoints: number;
  farmLevel: number;
  farmExp: number;
  lastFarmTime: number;
  lastDailyTime: number;
  dailyStreak: number;
  lastGachaTime: number;
}

// ─── Global Ecosystem State ───────────────────────────────────

export type EcosystemWeather = "Sunny" | "Normal" | "Rainy";

export interface EcosystemState {
  currentSpores: number;
  maxSpores: number;
  hourlyFertilizeCount: number;
  currentWeather: EcosystemWeather;
  weatherIntensity: 30 | 60 | 90 | 100;
  /** Start of the most recently completed hourly cycle. */
  lastCycleAt: number;
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

export type MarketplaceListingStatus = "active" | "sold" | "cancelled" | "expired";

export interface MarketplaceListing {
  listingId: string;
  guildId: string;
  channelId: string;
  messageId?: string;
  sellerId: string;
  itemId: string;
  price: number;
  fee: number;
  sellerReceives: number;
  status: MarketplaceListingStatus;
  createdAt: number;
  expiresAt: number;
  buyerId?: string;
  completedAt?: number;
  messageDeletedAt?: number;
}

export interface MarketplaceHistoryEntry {
  historyId: string;
  listingId: string;
  guildId: string;
  sellerId: string;
  buyerId?: string;
  itemId: string;
  price: number;
  fee: number;
  sellerReceives: number;
  status: "sold" | "cancelled" | "expired";
  createdAt: number;
  completedAt: number;
}

export interface Store {
  panels: Record<string, ReactionRolePanel>;
  guilds: Record<string, GuildConfig>;
  players: Record<string, PlayerData>;
  ecosystem: EcosystemState;
  verificationPanels: Record<string, VerificationPanel>;
  verificationSubmissions: VerificationSubmission[];
  questData: Record<string, PlayerQuestData>;
  achievements: Record<string, AchievementConfig[]>;
  playerAchievements: PlayerAchievement[];
  playerStats: Record<string, PlayerStats>;
  inventories: Record<string, InventoryItem[]>;
  marketplaceListings: Record<string, MarketplaceListing>;
  marketplaceHistory: MarketplaceHistoryEntry[];
  friendProfiles: Record<string, FriendProfile>;
  friendMatches: FriendMatch[];
  friendChannelConfigs: Record<string, FriendChannelConfig>;
}

function emptyStore(): Store {
  return {
    panels: {},
    guilds: {},
    players: {},
    ecosystem: {
      currentSpores: 1_000_000,
      maxSpores: 1_000_000,
      hourlyFertilizeCount: 0,
      currentWeather: "Normal",
      weatherIntensity: 100,
      lastCycleAt: Math.floor(Date.now() / 3_600_000) * 3_600_000,
    },
    verificationPanels: {},
    verificationSubmissions: [],
    questData: {},
    achievements: {},
    playerAchievements: [],
    playerStats: {},
    inventories: {},
    marketplaceListings: {},
    marketplaceHistory: [],
    friendProfiles: {},
    friendMatches: [],
    friendChannelConfigs: {},
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
    const rawAchievements = (parsed.achievements ?? {}) as unknown as Record<
      string,
      Record<string, unknown>[]
    >;
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

    const rawPlayers = (parsed.players ?? {}) as Record<string, Partial<PlayerData>>;
    const players: Record<string, PlayerData> = {};
    for (const [userId, player] of Object.entries(rawPlayers)) {
      players[userId] = {
        userId: player.userId ?? userId,
        sporePoints: player.sporePoints ?? 0,
        farmLevel: player.farmLevel ?? 1,
        farmExp: player.farmExp ?? 0,
        lastFarmTime: player.lastFarmTime ?? 0,
        lastDailyTime: player.lastDailyTime ?? 0,
        dailyStreak: player.dailyStreak ?? 0,
        lastGachaTime: player.lastGachaTime ?? 0,
      };
    }

    return {
      panels:                  parsed.panels ?? {},
      guilds:                  parsed.guilds ?? {},
      players,
      ecosystem: {
        currentSpores:         parsed.ecosystem?.currentSpores ?? 1_000_000,
        maxSpores:             parsed.ecosystem?.maxSpores ?? 1_000_000,
        hourlyFertilizeCount:  parsed.ecosystem?.hourlyFertilizeCount ?? 0,
        currentWeather:       parsed.ecosystem?.currentWeather ?? "Normal",
        weatherIntensity:     parsed.ecosystem?.weatherIntensity ?? 100,
        lastCycleAt:           parsed.ecosystem?.lastCycleAt
          ?? Math.floor(Date.now() / 3_600_000) * 3_600_000,
      },
      verificationPanels:      parsed.verificationPanels ?? {},
      verificationSubmissions: parsed.verificationSubmissions ?? [],
      questData:               parsed.questData ?? {},
      achievements,
      playerAchievements:      parsed.playerAchievements ?? [],
      playerStats,
      inventories: (parsed.inventories ?? {}) as Record<string, InventoryItem[]>,
      marketplaceListings: (parsed.marketplaceListings ?? {}) as Record<string, MarketplaceListing>,
      marketplaceHistory: (parsed.marketplaceHistory ?? []) as MarketplaceHistoryEntry[],
      friendProfiles: (parsed.friendProfiles ?? {}) as Record<string, FriendProfile>,
      friendMatches: (parsed.friendMatches ?? []) as FriendMatch[],
      friendChannelConfigs: (parsed.friendChannelConfigs ?? {}) as Record<string, FriendChannelConfig>,
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


// ─── Friend Match ───────────────────────────────────────────

function friendProfileKey(guildId: string, userId: string): string {
  return guildId + ":" + userId;
}

export function getFriendChannelConfig(guildId: string): FriendChannelConfig | undefined {
  return _store.friendChannelConfigs[guildId];
}

export function saveFriendChannelConfig(config: FriendChannelConfig): void {
  _store.friendChannelConfigs[config.guildId] = config;
  saveStore(_store);
}

export function deleteFriendChannelConfig(guildId: string): void {
  delete _store.friendChannelConfigs[guildId];
  saveStore(_store);
}

export function getFriendProfile(guildId: string, userId: string): FriendProfile | undefined {
  return _store.friendProfiles[friendProfileKey(guildId, userId)];
}

export function saveFriendProfile(profile: FriendProfile): void {
  _store.friendProfiles[friendProfileKey(profile.guildId, profile.userId)] = profile;
  saveStore(_store);
}

export function getFriendProfiles(guildId: string): FriendProfile[] {
  return Object.values(_store.friendProfiles).filter((profile) => profile.guildId === guildId);
}

export function saveFriendMatch(match: FriendMatch): void {
  const index = _store.friendMatches.findIndex((item) => item.id === match.id);
  if (index >= 0) _store.friendMatches[index] = match;
  else _store.friendMatches.push(match);
  saveStore(_store);
}

export function getFriendMatch(id: string): FriendMatch | undefined {
  return _store.friendMatches.find((match) => match.id === id);
}

export function getFriendMatchBetween(guildId: string, userA: string, userB: string): FriendMatch | undefined {
  return _store.friendMatches.find((match) =>
    match.guildId === guildId &&
    ((match.userA === userA && match.userB === userB) || (match.userA === userB && match.userB === userA))
  );
}

export function getFriendMatchByVoiceChannel(channelId: string): FriendMatch | undefined {
  return _store.friendMatches.find((match) => match.voiceChannelId === channelId);
}

export function getEcosystemState(): EcosystemState {
  return _store.ecosystem;
}

export function incrementFertilizeCount(): EcosystemState {
  _store.ecosystem.hourlyFertilizeCount += 1;
  saveStore(_store);
  return _store.ecosystem;
}

export function harvestNaturalSpores(requestedAmount: number): number {
  const amount = Math.max(0, Math.floor(requestedAmount));
  const harvested = Math.min(amount, _store.ecosystem.currentSpores);
  _store.ecosystem.currentSpores -= harvested;
  if (harvested > 0) saveStore(_store);
  return harvested;
}

export function saveEcosystemState(state: EcosystemState): void {
  _store.ecosystem = state;
  saveStore(_store);
}

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

const WORLD_MUSHROOM_SEASON_MS = 60 * 24 * 60 * 60 * 1_000;

function createWorldMushroomState(now = Date.now()): WorldMushroomState {
  return {
    level: 1,
    exp: 0,
    seasonNumber: 1,
    seasonStartedAt: now,
    nextResetAt: now + WORLD_MUSHROOM_SEASON_MS,
    contributors: {},
    lastPestAt: 0,
  };
}

export function getWorldMushroom(guildId: string): WorldMushroomState {
  const guild = _store.guilds[guildId] ?? (_store.guilds[guildId] = {});
  if (!guild.worldMushroom) {
    guild.worldMushroom = createWorldMushroomState();
    saveStore(_store);
  } else {
    const current = guild.worldMushroom;
    let changed = false;
    if (!current.level || current.level < 1) {
      current.level = 1;
      changed = true;
    }
    if (!Number.isFinite(current.exp) || current.exp < 0) {
      current.exp = 0;
      changed = true;
    }
    if (!current.seasonNumber || current.seasonNumber < 1) {
      current.seasonNumber = 1;
      changed = true;
    }
    if (!current.seasonStartedAt) {
      current.seasonStartedAt = Date.now();
      changed = true;
    }
    if (!current.nextResetAt) {
      current.nextResetAt = current.seasonStartedAt + WORLD_MUSHROOM_SEASON_MS;
      changed = true;
    }
    if (!current.contributors) {
      current.contributors = {};
      changed = true;
    }
    if (!current.lastPestAt) {
      current.lastPestAt = 0;
      changed = true;
    }
    if (changed) saveStore(_store);
  }
  return guild.worldMushroom;
}

export function saveWorldMushroom(guildId: string, state: WorldMushroomState): void {
  if (!_store.guilds[guildId]) _store.guilds[guildId] = {};
  _store.guilds[guildId]!.worldMushroom = state;
  saveStore(_store);
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

const DEFAULT_MARKETPLACE_DURATION_MS = 7 * 24 * 60 * 60 * 1_000;
const DEFAULT_MARKETPLACE_FEE_PERCENT = 5;

export function getMarketplaceConfig(guildId: string): MarketplaceConfig | undefined {
  return _store.guilds[guildId]?.marketplace;
}

export function setMarketplaceConfig(guildId: string, config: MarketplaceConfig): void {
  if (!_store.guilds[guildId]) _store.guilds[guildId] = {};
  _store.guilds[guildId]!.marketplace = config;
  saveStore(_store);
}

export function createMarketplaceListing(
  guildId: string,
  channelId: string,
  sellerId: string,
  itemId: string,
  price: number,
): MarketplaceListing | undefined {
  const inventory = getInventory(sellerId);
  const slot = inventory.find((entry) => entry.itemId === itemId && !entry.isEquipped);
  if (!slot) return undefined;

  const config = getMarketplaceConfig(guildId);
  const now = Date.now();
  const fee = Math.floor(price * (config?.feePercent ?? DEFAULT_MARKETPLACE_FEE_PERCENT) / 100);
  const listing: MarketplaceListing = {
    listingId: randomUUID(),
    guildId,
    channelId,
    sellerId,
    itemId,
    price,
    fee,
    sellerReceives: price - fee,
    status: "active",
    createdAt: now,
    expiresAt: now + (config?.listingDurationMs ?? DEFAULT_MARKETPLACE_DURATION_MS),
  };

  inventory.splice(inventory.indexOf(slot), 1);
  _store.inventories[sellerId] = inventory;
  _store.marketplaceListings[listing.listingId] = listing;
  saveStore(_store);
  return listing;
}

export function setMarketplaceListingMessageId(listingId: string, messageId: string): boolean {
  const listing = _store.marketplaceListings[listingId];
  if (!listing) return false;
  listing.messageId = messageId;
  saveStore(_store);
  return true;
}

export function getMarketplaceListing(listingId: string): MarketplaceListing | undefined {
  return _store.marketplaceListings[listingId];
}

export function getMarketplaceListings(guildId: string): MarketplaceListing[] {
  return Object.values(_store.marketplaceListings)
    .filter((listing) => listing.guildId === guildId);
}

export type MarketplaceTransactionResult =
  | { ok: true; listing: MarketplaceListing }
  | { ok: false; reason: "not_found" | "not_active" | "expired" | "own_listing" | "insufficient_spores" };

export function buyMarketplaceListing(
  listingId: string,
  buyerId: string,
): MarketplaceTransactionResult {
  const listing = _store.marketplaceListings[listingId];
  if (!listing) return { ok: false, reason: "not_found" };
  if (listing.status !== "active") return { ok: false, reason: "not_active" };
  if (listing.expiresAt <= Date.now()) return { ok: false, reason: "expired" };
  if (listing.sellerId === buyerId) return { ok: false, reason: "own_listing" };

  const buyer = getPlayer(buyerId);
  if (buyer.sporePoints < listing.price) return { ok: false, reason: "insufficient_spores" };

  const seller = getPlayer(listing.sellerId);
  buyer.sporePoints -= listing.price;
  seller.sporePoints += listing.sellerReceives;
  getInventory(buyerId).push({ itemId: listing.itemId, isEquipped: false });

  const completedAt = Date.now();
  listing.status = "sold";
  listing.buyerId = buyerId;
  listing.completedAt = completedAt;
  listing.messageDeletedAt = completedAt + 60 * 60 * 1_000;
  _store.marketplaceHistory.push({
    historyId: randomUUID(),
    listingId: listing.listingId,
    guildId: listing.guildId,
    sellerId: listing.sellerId,
    buyerId,
    itemId: listing.itemId,
    price: listing.price,
    fee: listing.fee,
    sellerReceives: listing.sellerReceives,
    status: "sold",
    createdAt: listing.createdAt,
    completedAt,
  });
  saveStore(_store);
  return { ok: true, listing };
}

export type MarketplaceListingUpdateResult =
  | { ok: true; listing: MarketplaceListing }
  | { ok: false; reason: "not_found" | "not_active" | "not_owner" };

export function cancelMarketplaceListing(
  listingId: string,
  requesterId: string,
): MarketplaceListingUpdateResult {
  const listing = _store.marketplaceListings[listingId];
  if (!listing) return { ok: false, reason: "not_found" };
  if (listing.status !== "active") return { ok: false, reason: "not_active" };
  if (listing.sellerId !== requesterId) return { ok: false, reason: "not_owner" };
  if (listing.expiresAt <= Date.now()) {
    return expireMarketplaceListing(listingId);
  }

  const completedAt = Date.now();
  getInventory(requesterId).push({ itemId: listing.itemId, isEquipped: false });
  listing.status = "cancelled";
  listing.completedAt = completedAt;
  listing.messageDeletedAt = completedAt + 60 * 60 * 1_000;
  _store.marketplaceHistory.push({
    historyId: randomUUID(),
    listingId: listing.listingId,
    guildId: listing.guildId,
    sellerId: listing.sellerId,
    itemId: listing.itemId,
    price: listing.price,
    fee: listing.fee,
    sellerReceives: listing.sellerReceives,
    status: "cancelled",
    createdAt: listing.createdAt,
    completedAt,
  });
  saveStore(_store);
  return { ok: true, listing };
}

export function expireMarketplaceListing(listingId: string): MarketplaceListingUpdateResult {
  const listing = _store.marketplaceListings[listingId];
  if (!listing) return { ok: false, reason: "not_found" };
  if (listing.status !== "active") return { ok: false, reason: "not_active" };
  if (listing.expiresAt > Date.now()) return { ok: false, reason: "not_active" };

  const completedAt = Date.now();
  getInventory(listing.sellerId).push({ itemId: listing.itemId, isEquipped: false });
  listing.status = "expired";
  listing.completedAt = completedAt;
  listing.messageDeletedAt = completedAt + 60 * 60 * 1_000;
  _store.marketplaceHistory.push({
    historyId: randomUUID(),
    listingId: listing.listingId,
    guildId: listing.guildId,
    sellerId: listing.sellerId,
    itemId: listing.itemId,
    price: listing.price,
    fee: listing.fee,
    sellerReceives: listing.sellerReceives,
    status: "expired",
    createdAt: listing.createdAt,
    completedAt,
  });
  saveStore(_store);
  return { ok: true, listing };
}

export function markMarketplaceMessageDeleted(listingId: string): boolean {
  const listing = _store.marketplaceListings[listingId];
  if (!listing || !listing.messageId) return false;
  delete listing.messageId;
  listing.messageDeletedAt = undefined;
  saveStore(_store);
  return true;
}

export function getMarketplaceHistory(
  guildId: string,
  userId: string,
  limit = 20,
): MarketplaceHistoryEntry[] {
  return _store.marketplaceHistory
    .filter((entry) => entry.guildId === guildId && (entry.sellerId === userId || entry.buyerId === userId))
    .sort((a, b) => b.completedAt - a.completedAt)
    .slice(0, limit);
}

export function setAiChannel(guildId: string, channelId: string): void {
  if (!_store.guilds[guildId]) _store.guilds[guildId] = {};
  _store.guilds[guildId]!.aiChannelId = channelId;
  saveStore(_store);
}

export function getAiChannel(guildId: string): string | undefined {
  return _store.guilds[guildId]?.aiChannelId;
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

export function clearShopItems(guildId: string): number {
  const shop = _store.guilds[guildId]?.shop;

  if (!shop || shop.length === 0) {
    return 0;
  }

  const removedCount = shop.length;
  _store.guilds[guildId]!.shop = [];
  saveStore(_store);

  return removedCount;
}

export function updateShopItem(
  guildId: string,
  itemId: string,
  updates: { name?: string; description?: string; price?: number; roleId?: string }
): boolean {
  const shop = _store.guilds[guildId]?.shop;
  if (!shop) return false;
  const item = shop.find((i) => i.id === itemId);
  if (!item) return false;
  if (updates.name !== undefined) item.name = updates.name;
  if (updates.description !== undefined) item.description = updates.description;
  if (updates.price !== undefined) item.price = updates.price;
  if (updates.roleId !== undefined) item.roleId = updates.roleId;
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

// ─── Custom Boss Pool ─────────────────────────────────────────

/** ดึง pool บอส custom ของ guild (ถ้าไม่มีคืน []) */
export function getCustomBosses(guildId: string): CustomBoss[] {
  return _store.guilds[guildId]?.customBosses ?? [];
}

/** เพิ่มบอส custom เข้า pool */
export function addCustomBoss(guildId: string, boss: CustomBoss): void {
  if (!_store.guilds[guildId]) _store.guilds[guildId] = {};
  if (!_store.guilds[guildId]!.customBosses) _store.guilds[guildId]!.customBosses = [];
  _store.guilds[guildId]!.customBosses!.push(boss);
  saveStore(_store);
}

/** ลบบอส custom ตาม bossId — คืน true ถ้าลบสำเร็จ */
export function deleteCustomBoss(guildId: string, bossId: string): boolean {
  const list = _store.guilds[guildId]?.customBosses;
  if (!list) return false;
  const idx = list.findIndex((b) => b.bossId === bossId);
  if (idx === -1) return false;
  list.splice(idx, 1);
  saveStore(_store);
  return true;
}

/** ระบบบอสเปิดอยู่ไหม — undefined/true = เปิด, false = ปิด */
export function isBossSystemEnabled(guildId: string): boolean {
  return _store.guilds[guildId]?.bossSystemEnabled !== false;
}

/** ตั้งค่าเปิด/ปิดระบบบอส */
export function setBossSystemEnabled(guildId: string, enabled: boolean): void {
  if (!_store.guilds[guildId]) _store.guilds[guildId] = {};
  _store.guilds[guildId]!.bossSystemEnabled = enabled;
  saveStore(_store);
}

// ─── Disabled Default Bosses ──────────────────────────────────

/** ดึงรายชื่อบอสมาตรฐานที่ถูก disable สำหรับ guild นี้ */
export function getDisabledDefaultBosses(guildId: string): string[] {
  return _store.guilds[guildId]?.disabledDefaultBosses ?? [];
}

/** disable บอสมาตรฐาน (ซ่อนออกจาก pool สำหรับ guild นี้) */
export function disableDefaultBoss(guildId: string, bossName: string): void {
  if (!_store.guilds[guildId]) _store.guilds[guildId] = {};
  const list = _store.guilds[guildId]!.disabledDefaultBosses ?? [];
  if (!list.includes(bossName)) {
    list.push(bossName);
    _store.guilds[guildId]!.disabledDefaultBosses = list;
    saveStore(_store);
  }
}

/** enable บอสมาตรฐานกลับมา (นำกลับเข้า pool) */
export function enableDefaultBoss(guildId: string, bossName: string): void {
  const list = _store.guilds[guildId]?.disabledDefaultBosses;
  if (!list) return;
  const idx = list.indexOf(bossName);
  if (idx !== -1) {
    list.splice(idx, 1);
    saveStore(_store);
  }
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
      lastGachaTime: 0,
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

// ─── Web game helpers (potion stacking) ────────────────────────

/**
 * นับจำนวนไอเทมที่ itemId ตรง (ใช้สำหรับ potion stack ในเว็บเกม)
 * นับเฉพาะที่ยังไม่ได้สวมใส่ (เพราะ potion ไม่ equip)
 */
export function countItem(userId: string, itemId: string): number {
  return getInventory(userId).filter((e) => e.itemId === itemId && !e.isEquipped).length;
}

/**
 * ลบไอเทม 1 ชิ้นออกจาก inventory (ใช้สำหรับใช้ potion ในเว็บเกม)
 * คืน true ถ้าสำเร็จ, false ถ้าไม่มีไอเทม
 */
export function removeOneItem(userId: string, itemId: string): boolean {
  const inv = getInventory(userId);
  const slot = inv.find((e) => e.itemId === itemId && !e.isEquipped);
  if (!slot) return false;
  const idx = inv.indexOf(slot);
  inv.splice(idx, 1);
  _store.inventories[userId] = inv;
  saveStore(_store);
  return true;
}
