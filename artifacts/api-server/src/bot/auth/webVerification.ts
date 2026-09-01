import { randomUUID } from "node:crypto";
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  Client,
  GuildMember,
} from "discord.js";
import { getPlayer } from "../data/store.js";
import { createSessionToken } from "./discord.js";

type Status = "pending" | "approved" | "rejected" | "expired";
interface RequestState { id: string; userId: string; username: string; status: Status; expiresAt: number; }
const requests = new Map<string, RequestState>();
const TTL = 10 * 60_000;

function active(id: string): RequestState | undefined {
  const request = requests.get(id);
  if (!request) return;
  if (request.status === "pending" && request.expiresAt < Date.now()) request.status = "expired";
  return request;
}

export async function createWebVerification(client: Client, username: string): Promise<{ id: string; expiresAt: number }> {
  const guildId = process.env["DISCORD_GUILD_ID"];
  if (!guildId) throw new Error("guild_not_configured");
  const guild = await client.guilds.fetch(guildId);
  const members = await guild.members.fetch({ query: username.trim(), limit: 10 });
  const matches = members.filter((member) => member.user.username.toLowerCase() === username.trim().toLowerCase());
  if (matches.size !== 1) throw new Error(matches.size > 1 ? "multiple_users" : "user_not_found");
  const member = matches.first() as GuildMember;
  const id = randomUUID();
  const request: RequestState = { id, userId: member.id, username: member.user.username, status: "pending", expiresAt: Date.now() + TTL };
  requests.set(id, request);
  try {
    await member.user.send({
      content: `มีคำขอเข้าสู่ SporeNet สำหรับบัญชี Discord **${member.user.username}**\nถ้าเป็นคุณ ให้กด ยอมรับ ภายใน 10 นาที ถ้าไม่ใช่คุณให้กด ปฏิเสธ`,
      components: [new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder().setCustomId(`webverify_accept:${id}`).setLabel("ยอมรับ").setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId(`webverify_reject:${id}`).setLabel("ปฏิเสธ").setStyle(ButtonStyle.Danger),
      )],
    });
  } catch {
    requests.delete(id);
    throw new Error("dm_unavailable");
  }
  return { id, expiresAt: request.expiresAt };
}

export function getWebVerification(id: string): RequestState | undefined { return active(id); }
export function approveWebVerification(id: string, userId: string): boolean {
  const request = active(id);
  if (!request || request.userId !== userId || request.status !== "pending") return false;
  request.status = "approved";
  return true;
}
export function rejectWebVerification(id: string, userId: string): boolean {
  const request = active(id);
  if (!request || request.userId !== userId || request.status !== "pending") return false;
  request.status = "rejected";
  return true;
}
export function sessionForWebVerification(id: string): { token: string; userId: string; username: string } | undefined {
  const request = active(id);
  if (!request || request.status !== "approved") return;
  request.status = "expired";
  const player = getPlayer(request.userId);
  return { token: createSessionToken(request.userId, request.username), userId: player.userId, username: request.username };
}
