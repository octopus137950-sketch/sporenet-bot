import { REST, Routes } from "discord.js";
import { data as reactionroleData } from "./commands/reactionrole.js";
import { data as listrolesData } from "./commands/listroles.js";
import { data as deleteroleData } from "./commands/deleterole.js";
import { data as addroleData } from "./commands/addrole.js";
import { data as setwelcomeData } from "./commands/setwelcome.js";
import { data as setgoodbyeData } from "./commands/setgoodbye.js";
import { data as disablewelcomeData } from "./commands/disablewelcome.js";
import { data as farmData } from "./commands/farm.js";
import { data as walletData } from "./commands/wallet.js";
import { data as shopData } from "./commands/shop.js";
import { data as buyData } from "./commands/buy.js";
import { data as addshopData } from "./commands/addshop.js";
import { data as givesporeData } from "./commands/givespore.js";
import { data as setsporeData } from "./commands/setspore.js";
import { data as setlogData } from "./commands/setlog.js";
import { data as leaderboardData } from "./commands/leaderboard.js";
import { data as dailyData } from "./commands/daily.js";
import { data as transferData } from "./commands/transfer.js";
import { data as setcasinoData } from "./commands/setcasino.js";

export async function deployCommands(): Promise<void> {
  const token = process.env["DISCORD_TOKEN"];
  const clientId = process.env["DISCORD_CLIENT_ID"];

  if (!token || !clientId) {
    throw new Error("DISCORD_TOKEN and DISCORD_CLIENT_ID are required");
  }

  const rest = new REST({ version: "10" }).setToken(token);

  const commands = [
    reactionroleData.toJSON(),
    listrolesData.toJSON(),
    deleteroleData.toJSON(),
    addroleData.toJSON(),
    setwelcomeData.toJSON(),
    setgoodbyeData.toJSON(),
    disablewelcomeData.toJSON(),
    farmData.toJSON(),
    walletData.toJSON(),
    shopData.toJSON(),
    buyData.toJSON(),
    addshopData.toJSON(),
    givesporeData.toJSON(),
    setsporeData.toJSON(),
    setlogData.toJSON(),
    leaderboardData.toJSON(),
    dailyData.toJSON(),
    transferData.toJSON(),
    setcasinoData.toJSON(),
  ];

  console.log("🔄 กำลัง deploy slash commands...");
  await rest.put(Routes.applicationCommands(clientId), { body: commands });
  console.log("✅ deploy slash commands สำเร็จ!");
}
