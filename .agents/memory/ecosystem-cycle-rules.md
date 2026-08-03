---
name: Ecosystem cycle rules
description: The durable timing and fertilizer rules for SporeNet's shared natural spore pool.
---

Natural spore regeneration runs on a five-hour cycle. Each `/fertilize` adds the existing per-cycle regeneration bonus and reduces the current cycle's remaining wait by one minute. The wait cannot be reduced below one hour.

**Why:** The user explicitly chose a slower five-hour regeneration cadence while keeping fertilizer meaningful for both the next regeneration amount and the time remaining.

**How to apply:** Keep the cycle anchor and fertilizer count in the JSON store so restarts preserve progress. Calculate the next cycle dynamically from the anchor plus five hours minus the capped fertilizer reduction; reset the fertilizer count only when the cycle is applied.