// Game API routes — สำหรับ SporeNet web game
import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import {
  buildAuthUrl,
  exchangeCodeForToken,
  getDiscordUser,
  isUserInGuild,
  createSessionToken,
  verifySessionToken,
  extractSessionToken,
  isAuthConfigured,
  type SessionPayload,
} from "../bot/auth/discord.js";
import {
  getPlayer,
  savePlayer,
  getInventory,
  addItemToInventory,
  countItem,
  removeOneItem,
} from "../bot/data/store.js";

const router: IRouter = Router();

// ─── Auth middleware ──────────────────────────────────────────
// แนบ req.user ถ้ามี session token ที่ถูกต้อง ไม่งั้น 401
function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const token = extractSessionToken(req.headers["authorization"]);
  if (!token) {
    res.status(401).json({ error: "missing_token" });
    return;
  }
  const payload = verifySessionToken(token);
  if (!payload) {
    res.status(401).json({ error: "invalid_or_expired_token" });
    return;
  }
  (req as Request & { user: SessionPayload }).user = payload;
  next();
}

// ─── GET /api/auth/config ─────────────────────────────────────
// เช็คว่า auth config ครบไหม + ส่งข้อมูล guild invite link ถ้ามี
router.get("/auth/config", (_req, res) => {
  const { ok, missing } = isAuthConfigured();
  res.json({
    ok,
    missing,
    guildId: process.env["DISCORD_GUILD_ID"] ?? "",
  });
});

// ─── GET /api/auth/login ──────────────────────────────────────
// redirect ไป Discord OAuth2 — เรียกจากหน้าเว็บ
router.get("/auth/login", (req, res) => {
  const { ok, missing } = isAuthConfigured();
  if (!ok) {
    res.status(500).json({
      error: "auth_not_configured",
      missing,
      message: "Server admin ยังไม่ได้ตั้งค่า env ที่จำเป็น",
    });
    return;
  }
  // state สำหรับ CSRF protection — ใช้ origin
  const state = Buffer.from(req.headers["origin"] ?? "").toString("base64url");
  const url = buildAuthUrl(state);
  res.json({ url });
});

// ─── POST /api/auth/callback ──────────────────────────────────
// รับ code จาก Discord → แลก token → เช็ค guild → สร้าง session
router.post("/auth/callback", async (req, res) => {
  const { code } = req.body as { code?: string };
  if (!code) {
    res.status(400).json({ error: "missing_code" });
    return;
  }

  // แลก code เป็น access_token
  const tokenResp = await exchangeCodeForToken(code);
  if (!tokenResp) {
    res.status(400).json({ error: "token_exchange_failed" });
    return;
  }

  // ดึงข้อมูล user
  const user = await getDiscordUser(tokenResp.access_token);
  if (!user) {
    res.status(400).json({ error: "failed_to_get_user" });
    return;
  }

  // เช็คว่าเป็นสมาชิก guild ไหม
  const inGuild = await isUserInGuild(user.id, tokenResp.access_token);
  if (!inGuild) {
    res.status(403).json({
      error: "not_in_guild",
      message: "คุณยังไม่ได้เข้าร่วมเซิร์ฟเวอร์ Discord ของ SporeNet",
      guildId: process.env["DISCORD_GUILD_ID"] ?? "",
    });
    return;
  }

  // สร้าง session token (7 วัน)
  const sessionToken = createSessionToken(user.id, user.username);
  res.json({
    token: sessionToken,
    user: {
      id: user.id,
      username: user.username,
      globalName: user.global_name,
      avatar: user.avatar
        ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`
        : null,
    },
  });
});

// ─── GET /api/auth/me ─────────────────────────────────────────
// เช็ค session ปัจจุบัน + ดึงข้อมูล user จาก player data
router.get("/auth/me", requireAuth, (req, res) => {
  const user = (req as Request & { user: SessionPayload }).user;
  res.json({
    userId: user.userId,
    username: user.username,
  });
});

// ─── GET /api/player ──────────────────────────────────────────
// ดึงข้อมูลผู้เล่นสำหรับเว็บเกม (sync จาก bot data)
router.get("/player", requireAuth, (req, res) => {
  const { userId } = (req as Request & { user: SessionPayload }).user;
  const player = getPlayer(userId);
  const inventory = getInventory(userId);
  // potion count = จำนวน entries ที่ itemId === 'potion' และไม่ได้ equipped
  const potionCount = countItem(userId, "potion");

  res.json({
    userId: player.userId,
    spore: player.sporePoints,
    level: player.farmLevel,
    exp: player.farmExp,
    potionCount,
    // inventory ส่งเป็น array ของ itemId (เกมจะ map เป็น item data เอง)
    // ไม่รวม potion เพราะส่งแยกใน potionCount
    items: inventory
      .filter((entry) => entry.itemId !== "potion")
      .map((entry) => ({ itemId: entry.itemId, isEquipped: entry.isEquipped })),
  });
});

// ─── POST /api/player ─────────────────────────────────────────
// อัปเดตข้อมูลผู้เล่นจากเว็บเกม (real-time sync)
// body: { spore?, level?, exp?, addItem?, usePotion?, addPotion? }
router.post("/player", requireAuth, (req, res) => {
  const { userId } = (req as Request & { user: SessionPayload }).user;
  const body = req.body as {
    spore?: number;
    level?: number;
    exp?: number;
    addItem?: string;
    usePotion?: boolean;
    addPotion?: boolean;
  };

  // ดึง player ปัจจุบัน
  const player = getPlayer(userId);

  // อัปเดตเฉพาะ field ที่ส่งมา
  if (typeof body.spore === "number" && body.spore >= 0) {
    player.sporePoints = Math.floor(body.spore);
  }
  if (typeof body.level === "number" && body.level >= 1) {
    player.farmLevel = Math.floor(body.level);
  }
  if (typeof body.exp === "number" && body.exp >= 0) {
    player.farmExp = Math.floor(body.exp);
  }

  savePlayer(player);

  // ถ้ามี addItem → เพิ่มไอเทมเข้า inventory
  if (typeof body.addItem === "string" && body.addItem) {
    addItemToInventory(userId, body.addItem);
  }

  // ถ้ามี addPotion → เพิ่ม potion (ใช้ itemId 'potion')
  if (body.addPotion) {
    addItemToInventory(userId, "potion");
  }

  // ถ้ามี usePotion → ลบ potion 1 ขวด
  if (body.usePotion) {
    removeOneItem(userId, "potion");
  }

  // ส่งข้อมูลล่าสุดกลับ
  const inventory = getInventory(userId);
  const potionCount = countItem(userId, "potion");
  res.json({
    ok: true,
    player: {
      userId: player.userId,
      spore: player.sporePoints,
      level: player.farmLevel,
      exp: player.farmExp,
      potionCount,
      items: inventory
        .filter((entry) => entry.itemId !== "potion")
        .map((entry) => ({ itemId: entry.itemId, isEquipped: entry.isEquipped })),
    },
  });
});

export default router;
