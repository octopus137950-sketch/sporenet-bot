import crypto from "node:crypto";

const API = "https://discord.com/api/v10";
const redirectUri = () => process.env.DISCORD_REDIRECT_URI || `${process.env.GAME_BASE_URL || "https://bot-kappa.vercel.app"}/api/auth/discord/callback`;

export function configured() {
  return Boolean(process.env.DISCORD_CLIENT_ID && process.env.DISCORD_CLIENT_SECRET && process.env.DISCORD_GUILD_ID && process.env.DISCORD_TOKEN);
}

export function authUrl(state) {
  const params = new URLSearchParams({
    client_id: process.env.DISCORD_CLIENT_ID,
    redirect_uri: redirectUri(),
    response_type: "code",
    scope: "identify guilds",
    state,
  });
  return `https://discord.com/oauth2/authorize?${params}`;
}

export async function exchange(code) {
  const body = new URLSearchParams({
    client_id: process.env.DISCORD_CLIENT_ID,
    client_secret: process.env.DISCORD_CLIENT_SECRET,
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri(),
  });
  const response = await fetch(`${API}/oauth2/token`, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body });
  return response.ok ? response.json() : null;
}

export async function discordUser(token) {
  const response = await fetch(`${API}/users/@me`, { headers: { Authorization: `Bearer ${token}` } });
  return response.ok ? response.json() : null;
}

export async function isMember(userId) {
  const response = await fetch(`${API}/guilds/${process.env.DISCORD_GUILD_ID}/members/${userId}`, { headers: { Authorization: `Bot ${process.env.DISCORD_TOKEN}` } });
  return response.ok;
}

function secret() {
  return process.env.SESSION_SECRET || process.env.DISCORD_CLIENT_SECRET;
}

export function session(user) {
  const payload = Buffer.from(JSON.stringify({ userId: user.id, username: user.username, exp: Date.now() + 7 * 86400000 })).toString("base64url");
  const signature = crypto.createHmac("sha256", secret()).update(payload).digest("hex");
  return `${payload}.${signature}`;
}

export function verify(token) {
  try {
    const [payload, signature] = String(token || "").split(".");
    const expected = crypto.createHmac("sha256", secret()).update(payload).digest("hex");
    if (!payload || !signature || signature.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;
    const value = JSON.parse(Buffer.from(payload, "base64url").toString());
    return value.exp > Date.now() ? value : null;
  } catch { return null; }
}

export function userResponse(user) {
  return { id: user.id, username: user.username, globalName: user.global_name, avatar: user.avatar ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png` : null };
}

export function cookie(token) {
  return `sporenet_token=${encodeURIComponent(token)}; Path=/; Max-Age=604800; HttpOnly; Secure; SameSite=Lax`;
}

export { redirectUri };
