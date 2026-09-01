import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

// CORS — อนุญาตเฉพาะเว็บเกม + localhost (สำหรับ dev)
const gameBaseUrl = process.env["GAME_BASE_URL"];
const allowedOrigins = [
  gameBaseUrl,
  ...(process.env["GAME_ALLOWED_ORIGINS"] ?? "").split(",").map((origin) => origin.trim()),
  "http://localhost:5173",
  "http://localhost:3000",
  "http://127.0.0.1:5173",
].filter(Boolean) as string[];

app.use(
  cors({
    origin: (origin, callback) => {
      // อนุญาต requests ที่ไม่มี origin (เช่น curl, postman, Discord bot)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      // อนุญาต vercel preview domains ถ้าตั้ง GAME_BASE_URL เป็น vercel
      if (gameBaseUrl && origin.endsWith(".vercel.app")) return callback(null, true);
      callback(new Error(`CORS blocked: ${origin}`));
    },
    credentials: true,
  }),
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

export default app;
