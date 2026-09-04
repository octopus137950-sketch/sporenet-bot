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
  handleQuestChoose,
  handleQuestMushroomSelect,
  handleQuestSubmit,
  handleShopMushroomSelect,
  handleShopMushroomConfirm,
  handleSkipMushroom,
  handleStartAdventure,
  handleStats,
  handleStatUpgrade,
  handleWeaponSelect,
} from "../commands/farm-story.js";

function decodeQuestId(value: string): string {
  return Buffer.from(value, "base64url").toString("utf8");
}

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
    case "stats": return handleStats(interaction);
    case "statup": return handleStatUpgrade(interaction, parts[3] ?? "");
    case "quests": return handleQuests(interaction);
    case "quest_choose": return handleQuestChoose(interaction, decodeQuestId(parts[3] ?? ""));
    case "quest_confirm": return handleQuestSubmit(interaction);
    case "shop_confirm": return handleShopMushroomConfirm(interaction, (parts[3] ?? "").split(",").filter(Boolean).map(decodeQuestId));
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
    case "event_leave":
      return handleEventAction(interaction, "leave");
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
  if (parts[1] === "weapon") return handleWeaponSelect(interaction, interaction.values[0]!, parts[3] === "1");
  if (parts[1] === "quest_mushroom") return handleQuestMushroomSelect(interaction, decodeQuestId(parts[3] ?? ""), interaction.values);
  if (parts[1] === "shop_mushrooms") return handleShopMushroomSelect(interaction);
}
