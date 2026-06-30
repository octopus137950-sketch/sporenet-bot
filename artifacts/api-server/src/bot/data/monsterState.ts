export interface PendingBattle {
  userId: string;
  monsterEmoji: string;
  monsterName: string;
  winChance: number;
  winMin: number;
  winMax: number;
  lossMin: number;
  lossMax: number;
  expireAt: number;
}

const battles = new Map<string, PendingBattle>();

export function setPendingBattle(userId: string, data: Omit<PendingBattle, "userId" | "expireAt">): void {
  battles.set(userId, { ...data, userId, expireAt: Date.now() + 60_000 });
}

export function getPendingBattle(userId: string): PendingBattle | undefined {
  const b = battles.get(userId);
  if (!b) return undefined;
  if (Date.now() > b.expireAt) {
    battles.delete(userId);
    return undefined;
  }
  return b;
}

export function clearPendingBattle(userId: string): void {
  battles.delete(userId);
}
