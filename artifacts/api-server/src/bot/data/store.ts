import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = process.env["DATA_DIR"] ?? __dirname;
const DATA_FILE = path.join(DATA_DIR, "bot_data.json");

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

export interface GuildConfig {
  welcome?: WelcomeGoodbyeConfig;
  goodbye?: WelcomeGoodbyeConfig;
  logChannelId?: string;
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
}

function loadStore(): Store {
  if (!fs.existsSync(DATA_FILE)) {
    return { panels: {}, guilds: {}, players: {} };
  }
  try {
    const raw = fs.readFileSync(DATA_FILE, "utf-8");
    const parsed = JSON.parse(raw) as Partial<Store>;
    return {
      panels: parsed.panels ?? {},
      guilds: parsed.guilds ?? {},
      players: parsed.players ?? {},
    };
  } catch {
    return { panels: {}, guilds: {}, players: {} };
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
