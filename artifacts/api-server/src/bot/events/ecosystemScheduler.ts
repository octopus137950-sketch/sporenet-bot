import type { Client } from "discord.js";
import { getEcosystemState } from "../data/store.js";
import {
  announceHourlyCycle,
  applyHourlyCycle,
  HOUR_MS,
} from "../utils/ecosystem.js";

let schedulerStarted = false;

async function processDueCycle(client: Client): Promise<void> {
  const state = getEcosystemState();
  if (Date.now() < state.lastCycleAt + HOUR_MS) return;
  const result = applyHourlyCycle();
  await announceHourlyCycle(client, result);
}

export function startEcosystemScheduler(client: Client): void {
  if (schedulerStarted) return;
  schedulerStarted = true;
  void processDueCycle(client);
  setInterval(() => {
    void processDueCycle(client);
  }, 30_000);
}
