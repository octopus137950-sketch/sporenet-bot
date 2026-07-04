// ============================================================
// aiChatHandler.ts — SporeNet AI Companion
// รับข้อความจากช่อง AI ที่กำหนด ส่งไปยัง Edge Function
// ที่เรียก Gemini API แล้วตอบกลับใน Discord
// ============================================================

import { Message, EmbedBuilder } from "discord.js";
import { getAiChannel } from "../data/store.js";
import { logger } from "../../lib/logger.js";

const SUPABASE_URL = process.env["SUPABASE_URL"];
const SUPABASE_ANON_KEY = process.env["SUPABASE_ANON_KEY"];

const COOLDOWN_MS = 20_000;
const MAX_HISTORY = 10;

const cooldowns = new Map<string, number>();

const conversationHistory = new Map<string, { role: string; content: string }[]>();

export async function onAiChatMessage(message: Message): Promise<void> {
  if (message.author.bot) return;
  if (!message.guild) return;
  if (message.content.trim() === "") return;

  const aiChannelId = getAiChannel(message.guild.id);
  if (!aiChannelId || message.channelId !== aiChannelId) return;

  const key = `${message.guild.id}:${message.author.id}`;
  const now = Date.now();
  const lastUsed = cooldowns.get(key);
  if (lastUsed && now - lastUsed < COOLDOWN_MS) {
    const remaining = Math.ceil((COOLDOWN_MS - (now - lastUsed)) / 1000);
    const reply = await message.reply(
      `⏳ พวกเห็ดน้อยรออีก **${remaining} วินาที** ก่อนคุยกับข้าใหม่นะ`
    );
    setTimeout(() => reply.delete().catch(() => {}), 5000);
    return;
  }

  cooldowns.set(key, now);

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    logger.error("SUPABASE_URL or SUPABASE_ANON_KEY not set — AI chat disabled");
    return;
  }

  if ("sendTyping" in message.channel) {
    await message.channel.sendTyping();
  }

  const history = conversationHistory.get(key) ?? [];
  const userMessage = message.content.slice(0, 1000);

  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/ai-chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        apikey: SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({ message: userMessage, history }),
    });

    if (!res.ok) {
      const errText = await res.text();
      logger.error({ errText, status: res.status }, "AI chat API error");
      await message.reply("😵 ข้าปวดหัว ลองถามใหม่ภายหลังนะพวกเห็ดน้อย");
      return;
    }

    const data = (await res.json()) as { reply?: string; error?: string };
    const replyText = data.reply ?? "ข้าไม่เข้าใจ ลองใหม่อีกครั้ง";

    history.push({ role: "user", content: userMessage });
    history.push({ role: "model", content: replyText });
    if (history.length > MAX_HISTORY * 2) {
      history.splice(0, history.length - MAX_HISTORY * 2);
    }
    conversationHistory.set(key, history);

    const embed = new EmbedBuilder()
      .setAuthor({
        name: "ราชาเห็ดสปอร์",
        iconURL: message.client.user.displayAvatarURL(),
      })
      .setDescription(replyText)
      .setColor(0x9b59b6)
      .setFooter({ text: `คุยกับ ${message.author.displayName}` })
      .setTimestamp();

    await message.reply({ embeds: [embed] });
  } catch (err) {
    logger.error({ err }, "Error in AI chat handler");
    await message.reply("😵 ข้าง่วง ลองถามใหม่ภายหลังนะ");
  }
}
