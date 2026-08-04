import { getWorldMushroom, saveWorldMushroom, type WorldMushroomState } from "../data/store.js";

export const WORLD_MUSHROOM_SEASON_MS = 60 * 24 * 60 * 60 * 1_000;

export function worldMushroomExpForNextLevel(level: number): number {
  return Math.max(1, level) * 1_000;
}

export function getWorldMushroomBonuses(level: number): {
  sporeBonusPercent: number;
  bossDamageBonusPercent: number;
} {
  return {
    sporeBonusPercent: Math.max(0, level),
    bossDamageBonusPercent: Math.max(0, level * 2),
  };
}

export function applyWorldMushroomSporeBonus(guildId: string, amount: number): number {
  const base = Math.max(0, Math.floor(amount));
  const { sporeBonusPercent } = getWorldMushroomBonuses(getWorldMushroom(guildId).level);
  return Math.floor(base * (1 + sporeBonusPercent / 100));
}

export function addWorldMushroomExp(
  guildId: string,
  amount: number,
  userId?: string,
): { state: WorldMushroomState; levelsGained: number } {
  const state = getWorldMushroom(guildId);
  const donation = Math.max(0, Math.floor(amount));
  if (donation <= 0) return { state, levelsGained: 0 };

  state.exp += donation;
  if (userId) state.contributors[userId] = (state.contributors[userId] ?? 0) + donation;

  let levelsGained = 0;
  while (state.exp >= worldMushroomExpForNextLevel(state.level)) {
    state.exp -= worldMushroomExpForNextLevel(state.level);
    state.level += 1;
    levelsGained += 1;
  }
  saveWorldMushroom(guildId, state);
  return { state, levelsGained };
}

export function reduceWorldMushroomLevel(guildId: string): WorldMushroomState {
  const state = getWorldMushroom(guildId);
  if (state.level > 1) {
    state.level -= 1;
    state.exp = Math.min(state.exp, worldMushroomExpForNextLevel(state.level) - 1);
  }
  saveWorldMushroom(guildId, state);
  return state;
}

export function formatWorldMushroomReset(timestamp: number): string {
  return `<t:${Math.floor(timestamp / 1_000)}:R>`;
}