import { exchange, discordUser, isMember, session, cookie, userResponse, configured } from "../../../_auth.js";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).send("Method not allowed");
  if (!configured()) return res.status(500).send("Discord OAuth is not configured");
  const { code, state, error } = req.query;
  if (error) return res.redirect("/?auth_error=discord_cancelled");
  const cookies = Object.fromEntries(String(req.headers.cookie || "").split(";").filter(Boolean).map((part) => { const [key, ...value] = part.trim().split("="); return [key, decodeURIComponent(value.join("="))]; }));
  if (!code || !state || state !== cookies.sporenet_oauth_state) return res.status(400).send("Invalid OAuth state");
  const tokens = await exchange(code);
  const user = tokens && await discordUser(tokens.access_token);
  if (!user) return res.redirect("/?auth_error=discord_user_failed");
  if (!(await isMember(user.id))) return res.redirect("/?auth_error=not_in_guild");
  res.setHeader("Set-Cookie", [cookie(session(user)), "sporenet_oauth_state=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax"]);
  return res.redirect(`/?auth_user=${encodeURIComponent(JSON.stringify(userResponse(user)))}`);
}
