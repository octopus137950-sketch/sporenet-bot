import {
  Client,
  GatewayIntentBits,
  Partials,
  Events,
  Collection,
  ChatInputCommandInteraction,
  AutocompleteInteraction,
} from "discord.js";
import { logger } from "../lib/logger.js";
import { deployCommands } from "./deploy-commands.js";
import { handleReactionAdd } from "./events/reactionAdd.js";
import { handleReactionRemove } from "./events/reactionRemove.js";
import { handleMemberAdd } from "./events/memberAdd.js";
import { handleMemberRemove } from "./events/memberRemove.js";
import { handleCasinoButton, handleCasinoModal } from "./events/casinoHandler.js";
import {
  handleShopOpen,
  handleShopBack,
  handleShopSelect,
  handleShopConfirm,
} from "./events/shopHandler.js";
import { handleMonsterFight, handleMonsterFlee } from "./events/monsterHandler.js";
import { handleVerifyButton, handleVerifyModal } from "./events/verificationHandler.js";
import { handleVoiceStateUpdate, startVoiceEconomyLoop } from "./events/voiceHandler.js";
import { handleDynVoice } from "./events/dynVoiceHandler.js";
import { initWorldBossScheduler } from "./events/worldBossHandler.js";
import { onQuestMessage, startQuestVoiceLoop } from "./events/questTracker.js";
import {
  handleInventorySelect,
  handleInventoryEquip,
  handleInventoryUnequip,
} from "./events/inventoryHandler.js";
import { startQuestDailyReset } from "./utils/questScheduler.js";

import * as reactionroleCmd from "./commands/reactionrole.js";
import * as listrolesCmd from "./commands/listroles.js";
import * as deleteroleCmd from "./commands/deleterole.js";
import * as addroleCmd from "./commands/addrole.js";
import * as setwelcomeCmd from "./commands/setwelcome.js";
import * as setgoodbyeCmd from "./commands/setgoodbye.js";
import * as disablewelcomeCmd from "./commands/disablewelcome.js";
import * as farmCmd from "./commands/farm.js";
import * as walletCmd from "./commands/wallet.js";
import * as shopCmd from "./commands/shop.js";
import * as addshopCmd from "./commands/addshop.js";
import * as givesporeCmd from "./commands/givespore.js";
import * as giveitemCmd from "./commands/giveitem.js";
import * as setsporeCmd from "./commands/setspore.js";
import * as setlogCmd from "./commands/setlog.js";
import * as leaderboardCmd from "./commands/leaderboard.js";
import * as dailyCmd from "./commands/daily.js";
import * as transferCmd from "./commands/transfer.js";
import * as setcasinoCmd from "./commands/setcasino.js";
import * as setgamechannelCmd from "./commands/setgamechannel.js";
import * as setshoppanelCmd from "./commands/setshoppanel.js";
import * as helpCmd from "./commands/help.js";
import * as mushroomCmd from "./commands/mushroom.js";
import * as verifypanelCmd from "./commands/verifypanel.js";
import * as deleteverifypanelCmd from "./commands/deleteverifypanel.js";
import * as editverifypanelCmd from "./commands/editverifypanel.js";
import * as setvoicerewardCmd from "./commands/setvoicereward.js";
import * as blockvoiceroomCmd from "./commands/blockvoiceroom.js";
import * as setdynvoiceCmd from "./commands/setdynvoice.js";
import * as roomCmd from "./commands/room.js";
import * as questCmd from "./commands/quest.js";
import * as achievementAdminCmd from "./commands/achievement-admin.js";
import * as achievementCmd from "./commands/achievement.js";
import * as attackCmd from "./commands/attack.js";
import * as setworldbossCmd from "./commands/setworldboss.js";
import * as setSporeCrashCmd from "./commands/setSporeCrash.js";
import {
  handleCrashBetButton,
  handleCrashBetModal,
  handleCrashCashOut,
} from "./events/sporeCrashHandler.js";

interface Command {
  execute(interaction: ChatInputCommandInteraction): Promise<void>;
  autocomplete?(interaction: AutocompleteInteraction): Promise<void>;
}

const commands = new Collection<string, Command>();
commands.set("reactionrole", reactionroleCmd);
commands.set("listroles", listrolesCmd);
commands.set("deleterole", deleteroleCmd);
commands.set("addrole", addroleCmd);
commands.set("setwelcome", setwelcomeCmd);
commands.set("setgoodbye", setgoodbyeCmd);
commands.set("disablewelcome", disablewelcomeCmd);
commands.set("farm", farmCmd);
commands.set("wallet", walletCmd);
commands.set("shop", shopCmd);
commands.set("addshop", addshopCmd);
commands.set("give-spore", givesporeCmd);
commands.set("give-item", giveitemCmd);
commands.set("set-spore", setsporeCmd);
commands.set("setlog", setlogCmd);
commands.set("leaderboard", leaderboardCmd);
commands.set("daily", dailyCmd);
commands.set("transfer", transferCmd);
commands.set("setcasino", setcasinoCmd);
commands.set("setgamechannel", setgamechannelCmd);
commands.set("setshoppanel", setshoppanelCmd);
commands.set("mushroom", mushroomCmd);
commands.set("help", helpCmd);
commands.set("verifypanel", verifypanelCmd);
commands.set("deleteverifypanel", deleteverifypanelCmd);
commands.set("editverifypanel", editverifypanelCmd);
commands.set("setvoicereward", setvoicerewardCmd);
commands.set("blockvoiceroom", blockvoiceroomCmd);
commands.set("setdynvoice", setdynvoiceCmd);
commands.set("room", roomCmd);
commands.set("quest", questCmd);
commands.set("achievement-admin", achievementAdminCmd);
commands.set("achievement", achievementCmd);
commands.set("attack", attackCmd);
commands.set("setworldboss", setworldbossCmd);
commands.set("setsporecrash", setSporeCrashCmd);

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
      GatewayIntentBits.GuildMembers,
      GatewayIntentBits.GuildVoiceStates,
      // MessageContent is a privileged intent — not needed since we only count messages, not read them
    ],
    partials: [Partials.Message, Partials.Channel, Partials.Reaction],
  });

  client.once(Events.ClientReady, (c) => {
    logger.info(`✅ บอทออนไลน์แล้ว! ชื่อ: ${c.user.tag}`);
    console.log(`✅ บอทออนไลน์แล้ว! ชื่อ: ${c.user.tag}`);

    // Start background loops
    startVoiceEconomyLoop(client);
    startQuestVoiceLoop(client);
    startQuestDailyReset();
    initWorldBossScheduler(client);
  });

  client.on(Events.InteractionCreate, async (interaction) => {
    try {
      if (interaction.isAutocomplete()) {
        const command = commands.get(interaction.commandName);
        if (command?.autocomplete) {
          await command.autocomplete(interaction as AutocompleteInteraction);
        }
        return;
      }

      if (interaction.isChatInputCommand()) {
        const command = commands.get(interaction.commandName);
        if (!command) return;
        await command.execute(interaction);
        return;
      }

      if (interaction.isButton()) {
        const id = interaction.customId;
        if (id.startsWith("verify_open_")) {
          await handleVerifyButton(interaction);
        } else if (id === "casino_bet") {
          await handleCasinoButton(interaction);
        } else if (id === "crash_bet") {
          await handleCrashBetButton(interaction);
        } else if (id.startsWith("crash_cashout:")) {
          await handleCrashCashOut(interaction);
        } else if (id === "shop_open") {
          await handleShopOpen(interaction);
        } else if (id === "shop_back") {
          await handleShopBack(interaction);
        } else if (id.startsWith("shop_confirm_")) {
          await handleShopConfirm(interaction, id.replace("shop_confirm_", ""));
        } else if (id.startsWith("monster_fight_")) {
          await handleMonsterFight(interaction);
        } else if (id.startsWith("monster_flee_")) {
          await handleMonsterFlee(interaction);
        } else if (id.startsWith("inv_equip:")) {
          await handleInventoryEquip(interaction);
        } else if (id.startsWith("inv_unequip:")) {
          await handleInventoryUnequip(interaction);
        }
        return;
      }

      if (interaction.isStringSelectMenu()) {
        if (interaction.customId === "shop_select") {
          await handleShopSelect(interaction);
        } else if (interaction.customId.startsWith("inv_select:")) {
          await handleInventorySelect(interaction);
        }
        return;
      }

      if (interaction.isModalSubmit()) {
        if (interaction.customId.startsWith("verify_modal_")) {
          await handleVerifyModal(interaction);
        } else if (interaction.customId === "casino_bet_modal") {
          await handleCasinoModal(interaction);
        } else if (interaction.customId === "crash_bet_modal") {
          await handleCrashBetModal(interaction);
        }
        return;
      }
    } catch (err) {
      logger.error({ err }, "Error handling interaction");
      const errMsg = "❌ เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง";
      try {
        if (
          "replied" in interaction &&
          "deferred" in interaction &&
          (interaction.replied || interaction.deferred)
        ) {
          await (interaction as ChatInputCommandInteraction).editReply(errMsg);
        } else if ("reply" in interaction) {
          await (interaction as ChatInputCommandInteraction).reply({
            content: errMsg,
            ephemeral: true,
          });
        }
      } catch { /* ignore */ }
    }
  });

  // ── Quest: track chat messages ────────────────────────────────
  client.on(Events.MessageCreate, (message) => {
    onQuestMessage(message, client).catch((err) =>
      logger.error({ err }, "Error tracking quest message")
    );
  });

  client.on(Events.MessageReactionAdd, async (reaction, user) => {
    try { await handleReactionAdd(reaction, user); }
    catch (err) { logger.error({ err }, "Error handling reaction add"); }
  });

  client.on(Events.MessageReactionRemove, async (reaction, user) => {
    try { await handleReactionRemove(reaction, user); }
    catch (err) { logger.error({ err }, "Error handling reaction remove"); }
  });

  client.on(Events.GuildMemberAdd, async (member) => {
    try { await handleMemberAdd(member); }
    catch (err) { logger.error({ err }, "Error handling member add"); }
  });

  client.on(Events.GuildMemberRemove, async (member) => {
    try { await handleMemberRemove(member); }
    catch (err) { logger.error({ err }, "Error handling member remove"); }
  });

  // ── Voice state: economy + quest tracking ────────────────────
  client.on(Events.VoiceStateUpdate, (oldState, newState) => {
    try { handleVoiceStateUpdate(oldState, newState, client); }
    catch (err) { logger.error({ err }, "Error handling voice state update"); }
    handleDynVoice(oldState, newState).catch((err) =>
      logger.error({ err }, "Error handling dynamic voice channel")
    );
  });

  await client.login(token);
}
