// Discord OAuth2 + session token system สำหรับ SporeNet web game
import { createHmac, randomBytes } from "crypto";

// ─── env ที่ต้องมี ─────────────────────────────────────────────
const DISCORD_CLIENT_ID = process.env["DISCORD_CLIENT_ID"] ?? "";
const DISCORD_CLIENT_SECRET = process.env["DISCORD_CLIENT_SECRET"] ?? "";
const DISCORD_BOT_TOKEN = process.env["DISCORD_TOKEN"] ?? "";
const DISCORD_GUILD_ID = process.env["DISCORD_GUILD_ID"] ?? "";
const GAME_BASE_URL = process.env["GAME_BASE_URL"] ?? ""; // เช่น https://sporenet-game.vercel.app
const DISCORD_REDIRECT_URI = process.env["DISCORD_REDIRECT_URI"] ?? `${GAME_BASE_URL}/auth/callback`;
const SESSION_SECRET = process.env["SESSION_SECRET"] ?? randomBytes(32).toString("hex");

// Discord API endpoints
const DISCORD_API = "https://discord.com/api/v10";
const TOKEN_URL = `${DISCORD_API}/oauth2/token`;
const USER_URL = `${DISCORD_API}/users/@me`;
const USER_GUILDS_URL = `${DISCORD_API}/users/@me/guilds`;

// ─── สร้าง OAuth2 authorization URL ────────────────────────────
export function buildAuthUrl(state: string): string {
  const redirectUri = encodeURIComponent(DISCORD_REDIRECT_URI);
  const scope = encodeURIComponent("identify guilds");
  const params = new URLSearchParams({
    client_id: DISCORD_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: "code",
    scope,
    state,
  });
  return `https://discord.com/api/oauth2/authorize?${params.toString()}`;
}

// ─── แลก code เป็น access_token ───────────────────────────────
export interface DiscordTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string;
  scope: string;
}

export async function exchangeCodeForToken(code: string): Promise<DiscordTokenResponse | null> {
  const redirectUri = DISCORD_REDIRECT_URI;
  const body = new URLSearchParams({
    client_id: DISCORD_CLIENT_ID,
    client_secret: DISCORD_CLIENT_SECRET,
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
  });

  try {
    const res = await fetch(TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    if (!res.ok) {
      console.error("[auth] token exchange failed:", res.status, await res.text());
      return null;
    }
    return (await res.json()) as DiscordTokenResponse;
  } catch (err) {
    console.error("[auth] token exchange error:", err);
    return null;
  }
}

// ─── ดึงข้อมูล user จาก Discord ────────────────────────────────
export interface DiscordUser {
  id: string;
  username: string;
  global_name: string | null;
  avatar: string | null;
  discriminator: string;
}

export async function getDiscordUser(accessToken: string): Promise<DiscordUser | null> {
  try {
    const res = await fetch(USER_URL, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) return null;
    return (await res.json()) as DiscordUser;
  } catch (err) {
    console.error("[auth] get user error:", err);
    return null;
  }
}

// ─── ดึง guilds ที่ user เป็นสมาชิก ─────────────────────────────
export interface DiscordGuild {
  id: string;
  name: string;
  owner: boolean;
}

export async function getUserGuilds(accessToken: string): Promise<DiscordGuild[]> {
  try {
    const res = await fetch(USER_GUILDS_URL, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) return [];
    return (await res.json()) as DiscordGuild[];
  } catch (err) {
    console.error("[auth] get guilds error:", err);
    return [];
  }
}

// ─── เช็คว่า user เป็นสมาชิก guild ID ที่กำหนด ───────────────────
// วิธีที่แม่นยำที่สุด: ใช้ bot token เช็คผ่าน /guilds/{guild}/members/{user}
export async function isUserInGuild(userId: string, accessToken: string): Promise<boolean> {
  // วิธี 1: ใช้ bot token ดึง member (แม่นยำสุด)
  if (DISCORD_BOT_TOKEN && DISCORD_GUILD_ID) {
    try {
      const res = await fetch(
        `${DISCORD_API}/guilds/${DISCORD_GUILD_ID}/members/${userId}`,
        { headers: { Authorization: `Bot ${DISCORD_BOT_TOKEN}` } }
      );
      if (res.ok) return true;
      if (res.status === 404) return false;
    } catch (err) {
      console.error("[auth] guild check via bot error:", err);
    }
  }
  // วิธี 2 (fallback): ใช้ access_token ดึง user guilds แล้วเช็ค
  const guilds = await getUserGuilds(accessToken);
  return guilds.some((g) => g.id === DISCORD_GUILD_ID);
}

// ─── Session Token (HMAC-signed, ไม่ใช้ library external) ─────
// รูปแบบ: <payload base64>.<signature hex>
// payload: { userId, username, exp }

export interface SessionPayload {
  userId: string;
  username: string;
  exp: number; // unix ms
}

const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 วัน

function sign(data: string): string {
  return createHmac("sha256", SESSION_SECRET).update(data).digest("hex");
}

export function createSessionToken(userId: string, username: string): string {
  const payload: SessionPayload = {
    userId,
    username,
    exp: Date.now() + SESSION_TTL_MS,
  };
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = sign(payloadB64);
  return `${payloadB64}.${sig}`;
}

export function verifySessionToken(token: string): SessionPayload | null {
  if (!token || typeof token !== "string") return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [payloadB64, sig] = parts;
  const expectedSig = sign(payloadB64);
  // timing-safe compare
  if (sig.length !== expectedSig.length) return null;
  let diff = 0;
  for (let i = 0; i < sig.length; i++) {
    diff |= sig.charCodeAt(i) ^ expectedSig.charCodeAt(i);
  }
  if (diff !== 0) return null;
  try {
    const payload = JSON.parse(Buffer.from(payloadB64, "base64url").toString()) as SessionPayload;
    if (Date.now() > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

// ─── ดึง authorization header จาก request ─────────────────────
export function extractSessionToken(authHeader: string | undefined): string | null {
  if (!authHeader) return null;
  if (authHeader.startsWith("Bearer ")) return authHeader.slice(7);
  return authHeader;
}

// ─── ตรวจสอบว่า config ครบไหม ─────────────────────────────────
export function isAuthConfigured(): { ok: boolean; missing: string[] } {
  const missing: string[] = [];
  if (!DISCORD_CLIENT_ID) missing.push("DISCORD_CLIENT_ID");
  if (!DISCORD_CLIENT_SECRET) missing.push("DISCORD_CLIENT_SECRET");
  if (!DISCORD_GUILD_ID) missing.push("DISCORD_GUILD_ID");
  if (!GAME_BASE_URL) missing.push("GAME_BASE_URL");
  return { ok: missing.length === 0, missing };
}
