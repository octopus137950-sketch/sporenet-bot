// ============================================================
// questScheduler.ts — Daily midnight reset (Thai UTC+7)
// Clears stale quest data at 00:00 Thai time so every player
// gets fresh quests on their next activity or /quest command.
// ============================================================

import { clearStaleQuestData } from "../data/store.js";
import { getThaiDateString } from "./thaiTime.js";

let lastResetDate = "";

function doReset(): void {
  const today = getThaiDateString();
  console.log(`📅 [QuestScheduler] Daily quest reset — clearing stale data for ${today}`);
  clearStaleQuestData(today);
  lastResetDate = today;
}

export function startQuestDailyReset(): void {
  // Record today's date so we don't reset on startup
  lastResetDate = getThaiDateString();

  // Check every minute whether midnight has just passed
  setInterval(() => {
    const today = getThaiDateString();
    if (today !== lastResetDate) {
      doReset();
    }
  }, 60_000);

  console.log(`📅 Quest daily reset scheduler started (current Thai date: ${lastResetDate})`);
}
