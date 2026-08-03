import type { Client } from "discord.js";
import { getEcosystemState } from "../data/store.js";
import {
  announceEcosystemCycle,
  applyEcosystemCycle,
  getNextCycleAt,
} from "../utils/ecosystem.js";

let schedulerStarted = false;

async function processDueCycle(client: Client): Promise<void> {
  const state = getEcosystemState();
  if (Date.now() < getNextCycleAt(state)) return;
  const result = applyEcosystemCycle();
  await announceEcosystemCycle(client, result);
}

export function startEcosystemScheduler(client: Client): void {
  if (schedulerStarted) return;
  schedulerStarted = true;
  void processDueCycle(client);
  setInterval(() => {
    void processDueCycle(client);
  }, 30_000);
}
