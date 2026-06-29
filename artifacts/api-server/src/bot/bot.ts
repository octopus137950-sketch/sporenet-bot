import {
  Client,
  GatewayIntentBits,
  Partials,
  Events,
  Collection,
  ChatInputCommandInteraction,
} from "discord.js";
import { logger } from "../lib/logger.js";
import { deployCommands } from "./deploy-commands.js";
import { handleReactionAdd } from "./events/reactionAdd.js";
import { handleReactionRemove } from "./events/reactionRemove.js";

import * as reactionroleCmd from "./commands/reactionrole.js";
import * as listrolesCmd from "./commands/listroles.js";
import * as deleteroleCmd from "./commands/deleterole.js";

interface Command {
  execute(interaction: ChatInputCommandInteraction): Promise<void>;
}

const commands = new Collection<string, Command>();
commands.set("reactionrole", reactionroleCmd);
commands.set("listroles", listrolesCmd);
commands.set("deleterole", deleteroleCmd);

export async function startBot(): Promise<void> {
  const token = process.env["DISCORD_TOKEN"];
  if (!token) {
    logger.error("DISCORD_TOKEN is not set — bot will not start");
    return;
  }

  await deployCommands();

  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.GuildMessageReactions,
    ],
    partials: [Partials.Message, Partials.Channel, Partials.Reaction],
  });

  client.once(Events.ClientReady, (c) => {
    logger.info(`✅ บอทออนไลน์แล้ว! ชื่อ: ${c.user.tag}`);
    console.log(`✅ บอทออนไลน์แล้ว! ชื่อ: ${c.user.tag}`);
  });

  client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    const command = commands.get(interaction.commandName);
    if (!command) return;

    try {
      await command.execute(interaction);
    } catch (err) {
      logger.error({ err }, `Error in command ${interaction.commandName}`);
      const errMsg = "❌ เกิดข้อผิดพลาดในการรันคำสั่ง";
      if (interaction.replied || interaction.deferred) {
        await interaction.editReply(errMsg).catch(() => null);
      } else {
        await interaction.reply({ content: errMsg, ephemeral: true }).catch(() => null);
      }
    }
  });

  client.on(Events.MessageReactionAdd, async (reaction, user) => {
    try {
      await handleReactionAdd(reaction, user);
    } catch (err) {
      logger.error({ err }, "Error handling reaction add");
    }
  });

  client.on(Events.MessageReactionRemove, async (reaction, user) => {
    try {
      await handleReactionRemove(reaction, user);
    } catch (err) {
      logger.error({ err }, "Error handling reaction remove");
    }
  });

  await client.login(token);
}
