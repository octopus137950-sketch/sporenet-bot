import crypto from "node:crypto";
import { authUrl, configured } from "../_auth.js";

export default function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "method_not_allowed" });
  if (!configured()) return res.status(500).json({ error: "auth_not_configured" });
  const state = crypto.randomBytes(24).toString("hex");
  res.setHeader("Set-Cookie", `sporenet_oauth_state=${state}; Path=/; Max-Age=600; HttpOnly; Secure; SameSite=Lax`);
  return res.status(200).json({ url: authUrl(state) });
}
