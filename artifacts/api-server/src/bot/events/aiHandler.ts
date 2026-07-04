import { Message, EmbedBuilder } from "discord.js";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { logger } from "../../lib/logger.js";
import { getAiConfig } from "../data/store.js";

const GEMINI_API_KEY = process.env["GEMINI_API_KEY"];
const genAI = GEMINI_API_KEY ? new GoogleGenerativeAI(GEMINI_API_KEY) : null;

// Rate limit: 20 seconds cooldown per user
const cooldowns = new Map<string, number>();
const COOLDOWN_MS = 20_000;

const SYSTEM_INSTRUCTION = `
ชื่อตัวละคร: "ราชาเห็ดสปอร์" (Spore King)
นิสัยและโทนเสียง: มีความกวนประสาท ชอบขิงว่าตัวเองรวยเงินสปอร์ที่สุดในโลก แอบปากร้ายแต่ใจดี และชอบใช้สรรพนามแทนตัวเองว่า "ข้า" และเรียกผู้เล่นว่า "พวกเห็ดน้อย"
คลังความรู้เกี่ยวกับระบบเกม SporeNet:
- ระบบฟาร์ม (/farm): ผู้เล่นสามารถออกไปเก็บเห็ดในป่าเพื่อรับสปอร์และ EXP มีโอกาสเจอมอนสเตอร์ 25%
- มินิเกม /crash: เกมซิ่งยานสปอร์ที่ต้องกดถอนเงินก่อนยานระเบิด
- คาสิโน (/setcasino): แผงสล็อตแมชชีนสำหรับเสี่ยงโชค
- การสวมใส่ไอเทม: ผู้เล่นสามารถสวมใส่ไอเทมบัฟได้สูงสุด 3 ชิ้น (ชื่อเดียวกันไม่ stack บัฟ)
- รางวัลรายวัน (/daily): เช็คอินรับสปอร์ฟรีทุกวัน
- บอสโลก (/attack): บอสจะปรากฏตัวตามเวลาที่ตั้งไว้ ทุกคนต้องช่วยกันโจมตีเพื่อรับรางวัลตามดาเมจ

ข้อกำหนดการตอบกลับ:
- ตอบเป็นภาษาไทยเท่านั้น
- ใช้สำนวนกวนๆ ขิงความรวยของตัวเอง
- ความยาวไม่เกิน 200-300 ตัวอักษร
- ห้ามหลุดคาแรคเตอร์
`;

export async function handleAiChat(message: Message): Promise<void> {
  if (!genAI) return;
  if (message.author.bot) return;

  const guildId = message.guildId;
  if (!guildId) return;

  const config = getAiConfig(guildId);
  if (!config || !config.enabled || config.channelId !== message.channelId) return;

  // Rate limiting
  const lastUsed = cooldowns.get(message.author.id) ?? 0;
  const now = Date.now();
  if (now - lastUsed < COOLDOWN_MS) {
    // Optionally react with an emoji or send a short ephemeral message
    // but the brief says to just protect API usage.
    // For simplicity, we just ignore the message if on cooldown.
    return;
  }
  cooldowns.set(message.author.id, now);

  try {
    if ("sendTyping" in message.channel) {
      await message.channel.sendTyping();
    }

    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      systemInstruction: SYSTEM_INSTRUCTION,
      generationConfig: {
        maxOutputTokens: 300,
        temperature: 0.8,
      },
    });

    const result = await model.generateContent(message.content);
    const response = await result.response;
    const text = response.text().trim();

    if (!text) return;

    const embed = new EmbedBuilder()
      .setAuthor({
        name: "ราชาเห็ดสปอร์ (Spore King)",
        iconURL: "https://cdn-icons-png.flaticon.com/512/2590/2590506.png"
      })
      .setDescription(text)
      .setColor(0x7cfc00)
      .setFooter({ text: "The SporeNet AI Companion" });

    await message.reply({ embeds: [embed] });
  } catch (err) {
    logger.error({ err }, "Error in Gemini AI chat handler");
    // Don't reply with error to avoid spamming if API is down
  }
}
