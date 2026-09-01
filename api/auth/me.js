import { verify } from "../../_auth.js";

export default function handler(req, res) {
  const header = String(req.headers.authorization || "");
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  const cookies = Object.fromEntries(String(req.headers.cookie || "").split(";").filter(Boolean).map((part) => { const [key, ...value] = part.trim().split("="); return [key, decodeURIComponent(value.join("="))]; }));
  const user = verify(token || cookies.sporenet_token);
  if (!user) return res.status(401).json({ error: "missing_or_invalid_session" });
  return res.status(200).json(user);
}
