// ============================================================
// thaiTime.ts — Shared Thai timezone (UTC+7) helpers
// ============================================================

export const THAI_OFFSET_MS = 7 * 60 * 60 * 1000;

/** Returns "YYYY-MM-DD" in Thai time (UTC+7) */
export function getThaiDateString(ts = Date.now()): string {
  const d = new Date(ts + THAI_OFFSET_MS);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Milliseconds remaining until midnight Thai time */
export function msUntilMidnightThai(): number {
  const thaiNow = Date.now() + THAI_OFFSET_MS;
  const d = new Date(thaiNow);
  const nextMidnight = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1);
  return nextMidnight - thaiNow;
}
