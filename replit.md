# SporeNet Bot

Discord bot for The Mushroom Kingdom, with spores, quests, monsters, World Bosses, casino games, marketplace, items, achievements, and server roles.

## Run & Operate

- Production runtime is Termux on Android, not a Replit server.
- Build the bot with `cd artifacts/api-server && node build.mjs`.
- Do not use `pnpm build` for the bot; it is not the Termux build command.
- Built output: `artifacts/api-server/dist/index.mjs`.
- Required environment variables: `DISCORD_TOKEN`, `DISCORD_CLIENT_ID`, `DATA_DIR`, `PORT`.
- Replit workflow `artifacts/api-server: API Server` is for verification only and should be stopped afterward so it does not run a second bot instance.

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Discord.js 14 and Express 5
- JSON-file data store
- Build: esbuild

## Where things live

- `artifacts/api-server/src/bot/commands/` — individual Discord command files
- `artifacts/api-server/src/bot/bot.ts` — command imports and `commands.set()` registrations
- `artifacts/api-server/src/bot/deploy-commands.ts` — command imports and `.toJSON()` deployment list
- `artifacts/api-server/src/bot/data/store.ts` — JSON-file data store
- `artifacts/api-server/dist/index.mjs` — compiled runtime entry point

## Architecture decisions

- SporeNet is the bot name; The Mushroom Kingdom is the Discord server name used in user-facing server messages.
- The bot is intended to run as one instance from Termux.
- The local JSON data directory is controlled by `DATA_DIR`.

## Product

SporeNet Bot provides the Mushroom Kingdom community with an economy and progression system built around spores, farming, quests, games, monsters, marketplace trading, achievements, and Discord roles.

## User preferences

- After every code change, always provide the two Termux deployment command blocks from this file.
- Keep deployment instructions compatible with the user's Termux workflow.

## Gotchas

- Any new Discord command must update all three places:
  1. Create the command file under `src/bot/commands/`.
  2. Add its import and `commands.set()` call in `src/bot/bot.ts`.
  3. Add its import and `.toJSON()` entry in `src/bot/deploy-commands.ts`.
- Before deploying, commit and push to `https://github.com/octopus137950-sketch/sporenet-bot`.
- The Termux update flow must pull the repository, build with `node build.mjs`, then start `dist/index.mjs` with `.env` loaded.

## Termux deployment commands

Pull and build:

```bash
pkill -f index.mjs ; cd ~/sporenet-bot && git pull && cd artifacts/api-server && node build.mjs
```

Start the bot:

```bash
cd ~/sporenet-bot && set -a && source .env && set +a && nohup node artifacts/api-server/dist/index.mjs > ~/bot.log 2>&1 &
```

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
