import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from "discord.js";

export const data = new SlashCommandBuilder()
  .setName("help")
  .setDescription("📖 ดูคู่มือคำสั่งสำหรับผู้เล่น พร้อมวิธีเล่นเบื้องต้น");

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  const avatar = interaction.client.user?.displayAvatarURL() ?? null;

  const mainEmbed = new EmbedBuilder()
    .setTitle("📖 คู่มือผู้เล่น — The SporeNet")
    .setDescription(
      "ยินดีต้อนรับสู่ **ป่าเวทมนตร์แห่งสปอร์** 🍄\n" +
      "นี่คือคำสั่งทั้งหมดที่ผู้เล่นใช้ได้ ลองอ่านให้ครบก่อนเริ่มเลยนะ!\n\u200b"
    )
    .setThumbnail(avatar)
    .setColor(0x57f287)
    .addFields(
      {
        name: "🍄 เริ่มต้นสำหรับมือใหม่",
        value: [
          "1️⃣ พิมพ์ `/daily` เพื่อรับสปอร์ฟรีทุกวัน",
          "2️⃣ พิมพ์ `/farm` เพื่อออกล่าเห็ดและสะสมสปอร์",
          "3️⃣ พิมพ์ `/wallet` เพื่อดูยอดสปอร์ของตัวเอง",
          "4️⃣ เข้าร้านค้าผ่านแผงในห้อง หรือพิมพ์ `/shop` เพื่อดูสินค้า",
        ].join("\n"),
        inline: false,
      },
      {
        name: "🌾 ระบบฟาร์ม & เศรษฐกิจ",
        value: [
          "`/farm` — ออกฟาร์มเห็ดในป่า (cooldown ~60 วิ) อาจเจอมอนสเตอร์!",
          "`/daily` — รับสปอร์รายวัน ยิ่งเช็คอินต่อเนื่อง ยิ่งได้ streak bonus",
          "`/wallet [@ผู้เล่น]` — ดูกระเป๋าสปอร์ สถิติ และไอเทมของตัวเอง หรือคนอื่น",
          "`/leaderboard` — อันดับผู้เล่นที่มีสปอร์สูงสุดในเซิร์ฟ",
          "`/transfer @ผู้เล่น` — โอนสปอร์ และ/หรือส่งไอเทมให้เพื่อน",
        ].join("\n"),
        inline: false,
      },
      {
        name: "⚔️ ระบบมอนสเตอร์ & บอส",
        value: [
          "มีโอกาส **25%** ต่อการฟาร์มที่จะเจอมอนสเตอร์ กดปุ่ม **⚔️ สู้** หรือ **🏃 หนี** ภายใน 60 วิ",
          "🐛 หนอนเขียวป่า (ง่าย) → 🦇 ค้างคาวเห็ดพิษ (ปานกลาง) → 🐗 หมูป่า (ยาก) → 🐉 มังกรเห็ด (บอส)",
          "`/attack` — โจมตี **บอสโลก** ที่ปรากฏตัวในเซิร์ฟ! ดาเมจสูง → รางวัลสปอร์สูง + โอกาสดรอปไอเทม",
        ].join("\n"),
        inline: false,
      },
      {
        name: "📋 ภารกิจ & ความสำเร็จ",
        value: [
          "`/quest view` — ดูภารกิจประจำวันพร้อม Progress Bar",
          "`/quest claim` — กดรับรางวัลสปอร์จากภารกิจที่สำเร็จแล้ว",
          "`/achievement list` — เปิดสมุดยศความสำเร็จของตัวเอง (มีบางยศซ่อนอยู่ — ลองค้นหาเอง!)",
        ].join("\n"),
        inline: false,
      },
      {
        name: "🏪 ร้านค้า & มินิเกม",
        value: [
          "`/shop` — ดูรายการสินค้าในร้าน (ซื้อด้วยคำสั่ง `/buy <id>`)",
          "**แผงร้านค้า** — กดปุ่มซื้อสินค้าและรับยศอัตโนมัติ",
          "**แผงคาสิโน 🎰** — สล็อตแมชชีน วางเดิมพันสปอร์แล้วลุ้นเลย",
          "**แผง Spore Crash 🚀** — วางเดิมพัน กดถอนให้ทันก่อนยานระเบิด!",
        ].join("\n"),
        inline: false,
      },
      {
        name: "🎙️ ห้องเสียงไดนามิก",
        value: [
          "เข้าห้อง **Join to Create** → บอทสร้างห้องส่วนตัวให้อัตโนมัติ",
          "`/room` — จัดการห้องเสียงของตัวเอง (ตั้งชื่อ, จำกัดคน, ล็อค, เตะสมาชิก)",
          "อยู่ในห้องเสียงนานยิ่งได้สปอร์เพิ่ม! (แอดมินตั้งค่าอัตราไว้)",
        ].join("\n"),
        inline: false,
      },
      {
        name: "🌱 อื่นๆ",
        value: [
          "`/mushroom` — สุ่มเกร็ดความรู้สนุกๆ เกี่ยวกับเห็ด 🍄",
        ].join("\n"),
        inline: false,
      }
    )
    .setFooter({ text: "The SporeNet • ป่าเวทมนตร์แห่งสปอร์ | สำหรับคำสั่งแอดมิน ใช้ /help-admin" })
    .setTimestamp();

  await interaction.reply({ embeds: [mainEmbed], ephemeral: true });
}
