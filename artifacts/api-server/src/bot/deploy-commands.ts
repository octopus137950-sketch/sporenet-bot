import { REST, Routes } from "discord.js";
import { data as reactionroleData } from "./commands/reactionrole.js";
import { data as listrolesData } from "./commands/listroles.js";
import { data as deleteroleData } from "./commands/deleterole.js";
import { data as setwelcomeData } from "./commands/setwelcome.js";
import { data as setgoodbyeData } from "./commands/setgoodbye.js";
import { data as disablewelcomeData } from "./commands/disablewelcome.js";

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
    setwelcomeData.toJSON(),
    setgoodbyeData.toJSON(),
    disablewelcomeData.toJSON(),
  ];

  console.log("🔄 กำลัง deploy slash commands...");

  await rest.put(Routes.applicationCommands(clientId), {
    body: commands,
  });

  console.log("✅ deploy slash commands สำเร็จ!");
}
