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

export interface GuildConfig {
  welcome?: WelcomeGoodbyeConfig;
  goodbye?: WelcomeGoodbyeConfig;
  logChannelId?: string;
  gameChannelId?: string;
  shop?: ShopItem[];
  voiceReward?: VoiceRewardConfig;
  dynVoice?: DynVoiceConfig | null;
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
  progress: number;   // current accumulated progress
  completed: boolean; // true when progress >= target
  claimed: boolean;   // true after reward has been collected
}

export interface PlayerQuestData {
  userId: string;
  date: string;       // Thai date "YYYY-MM-DD" — resets each midnight
  quests: PlayerQuestEntry[];
}

// ─── Store ───────────────────────────────────────────────────

export interface Store {
  panels: Record<string, ReactionRolePanel>;
  guilds: Record<string, GuildConfig>;
  players: Record<string, PlayerData>;
  verificationPanels: Record<string, VerificationPanel>;
  verificationSubmissions: VerificationSubmission[];
  questData: Record<string, PlayerQuestData>;
}

function emptyStore(): Store {
  return {
    panels: {},
    guilds: {},
    players: {},
    verificationPanels: {},
    verificationSubmissions: [],
    questData: {},
  };
}

function loadStore(): Store {
  if (!fs.existsSync(DATA_FILE)) return emptyStore();
  try {
    const raw = fs.readFileSync(DATA_FILE, "utf-8");
    const parsed = JSON.parse(raw) as Partial<Store>;
    return {
      panels: parsed.panels ?? {},
      guilds: parsed.guilds ?? {},
      players: parsed.players ?? {},
      verificationPanels: parsed.verificationPanels ?? {},
      verificationSubmissions: parsed.verificationSubmissions ?? [],
      questData: parsed.questData ?? {},
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

/** Clear quest entries that don't match `today` (Thai YYYY-MM-DD).
 *  Called by the daily scheduler at midnight. */
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
