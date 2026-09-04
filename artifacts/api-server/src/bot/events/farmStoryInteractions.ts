import { Client, Events, ButtonInteraction, StringSelectMenuInteraction } from "discord.js";
import {
  handleAccept,
  handleBag,
  handleBack,
  handleBattleAction,
  handleCollect,
  handleDecline,
  handleEventAction,
  handleFarm,
  handleProfile,
  handleQuests,
  handleQuestSubmit,
  handleSkipMushroom,
  handleStartAdventure,
  handleWeaponSelect,
} from "../commands/farm-story.js";

export function registerFarmStoryInteractions(client: Client): void {
  client.on(Events.InteractionCreate, async (interaction) => {
    try {
      if (interaction.isButton()) {
        await handleButton(interaction);
      } else if (interaction.isStringSelectMenu() && interaction.customId.startsWith("fs:")) {
        await handleSelect(interaction);
      }
    } catch (error) {
      console.error("[farmStoryInteractions] Error:", error);
      if (interaction.isRepliable() && !interaction.replied && !interaction.deferred) {
        await interaction.reply({ content: "❌ เกิดข้อผิดพลาดในโหมดผจญภัย", ephemeral: true }).catch(() => undefined);
      }
    }
  });
}

async function handleButton(interaction: ButtonInteraction): Promise<void> {
  const parts = interaction.customId.split(":");
  if (parts[0] !== "fs") return;
  const action = parts[1];
  if (!action) return;

  switch (action) {
    case "accept": return handleAccept(interaction);
    case "decline": return handleDecline(interaction);
    case "start": return handleStartAdventure(interaction);
    case "farm": return handleFarm(interaction);
    case "profile": return handleProfile(interaction);
    case "bag": return handleBag(interaction);
    case "quests": return handleQuests(interaction);
    case "quest_submit": return handleQuestSubmit(interaction, parts[3] ?? "");
    case "back": return handleBack(interaction);
    case "collect": return handleCollect(interaction);
    case "skip": return handleSkipMushroom(interaction);
    case "npc_talk":
    case "quest_accept":
    case "item_take":
    case "shop_buy":
    case "shop_sell":
    case "secret_open":
    case "ruins_continue":
    case "leave":
      return handleEventAction(interaction, action);
    case "battle":
      return handleBattleAction(interaction, "attack");
    case "skill":
      return handleBattleAction(interaction, "skill", parts[3]);
    case "flee":
      return handleBattleAction(interaction, "flee");
    default:
      return;
  }
}

async function handleSelect(interaction: StringSelectMenuInteraction): Promise<void> {
  const parts = interaction.customId.split(":");
  if (parts[1] !== "weapon") return;
  await handleWeaponSelect(interaction, interaction.values[0]!, parts[3] === "1");
}
