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
  id: string; // internal id like field_0
  label: string; // shown label
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
  fields: VerificationPanelField[]; // up to 5
}

export interface GuildConfig {
  welcome?: WelcomeGoodbyeConfig;
  goodbye?: WelcomeGoodbyeConfig;
  logChannelId?: string;
  gameChannelId?: string;
  shop?: ShopItem[];
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

export interface Store {
  panels: Record<string, ReactionRolePanel>;
  guilds: Record<string, GuildConfig>;
  players: Record<string, PlayerData>;
  verificationPanels: Record<string, VerificationPanel>;
}

function loadStore(): Store {
  if (!fs.existsSync(DATA_FILE)) {
    return { panels: {}, guilds: {}, players: {}, verificationPanels: {} };
  }
  try {
    const raw = fs.readFileSync(DATA_FILE, "utf-8");
    const parsed = JSON.parse(raw) as Partial<Store>;
    return {
      panels: parsed.panels ?? {},
      guilds: parsed.guilds ?? {},
      players: parsed.players ?? {},
      verificationPanels: parsed.verificationPanels ?? {},
    };
  } catch {
    return { panels: {}, guilds: {}, players: {}, verificationPanels: {} };
  }
}

function saveStore(store: Store): void {
  fs.writeFileSync(DATA_FILE, JSON.stringify(store, null, 2), "utf-8");
}

let _store: Store = loadStore();

export function getStore(): Store { return _store; }

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

// Verification panel APIs
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
