import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from "discord.js";

export const data = new SlashCommandBuilder()
  .setName("help")
  .setDescription("📖 ดูรายการคำสั่งทั้งหมดของบอท");

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  const embed = new EmbedBuilder()
    .setTitle("📖 รายการคำสั่งทั้งหมด — The SporeNet")
    .setColor(0x7cfc00)
    .setThumbnail(interaction.client.user?.displayAvatarURL() ?? null)
    .addFields(
      {
        name: "🍄 ระบบฟาร์มเห็ด & เศรษฐกิจ",
        value: [
          "`/farm` — ออกไปฟาร์มเห็ด (cooldown 60 วิ) อาจเจอมอนสเตอร์!",
          "`/daily` — รับสปอร์รายวัน สะสมสตรีคยิ่งได้มาก",
          "`/wallet [player]` — ดูกระเป๋าสปอร์และสถิติ",
          "`/leaderboard` — อันดับผู้เล่นสปอร์สูงสุด",
          "`/transfer <@user> <จำนวน>` — โอนสปอร์ให้ผู้เล่นอื่น",
        ].join("\n"),
        inline: false,
      },
      {
        name: "⚔️ ระบบมอนสเตอร์",
        value: [
          "มีโอกาส **25%** ต่อการฟาร์มที่จะเจอมอนสเตอร์",
          "🐛 หนอนเขียวป่า — ง่าย | 🦇 ค้างคาวเห็ดพิษ — ปานกลาง",
          "🐗 หมูป่าบ้าเลือด — ยาก | 🐉 มังกรเห็ดโบราณ — บอส",
          "กดปุ่ม **⚔️ สู้** หรือ **🏃 หนี** ภายใน 60 วินาที",
        ].join("\n"),
        inline: false,
      },
      {
        name: "🏪 ร้านค้า & คาสิโน",
        value: [
          "`/shop` — ดูรายการสินค้าในร้าน",
          "แผงร้านค้า — กดปุ่มซื้อของ / ได้รับยศอัตโนมัติ",
          "แผงคาสิโน — กดปุ่มวางเดิมพัน สล็อตแมชชีน 🎰",
        ].join("\n"),
        inline: false,
      },
      {
        name: "🎭 ระบบ Reaction Role",
        value: [
          "`/reactionrole` — สร้างแผงเลือกยศด้วย emoji",
          "`/addrole` — เพิ่มยศลงในแผง",
          "`/deleterole` — ลบยศออกจากแผง",
          "`/listroles` — ดูรายการยศทั้งหมดในแผง",
        ].join("\n"),
        inline: false,
      },
      {
        name: "👋 ระบบ Welcome & Goodbye",
        value: [
          "`/setwelcome` — ตั้งค่าข้อความต้อนรับสมาชิกใหม่",
          "`/setgoodbye` — ตั้งค่าข้อความอำลาสมาชิก",
          "`/disablewelcome` — ปิดข้อความต้อนรับ/อำลา",
        ].join("\n"),
        inline: false,
      },
      {
        name: "🛠️ คำสั่ง Admin",
        value: [
          "`/setgamechannel` — กำหนดห้องสำหรับคำสั่งเกม",
          "`/setlog` — กำหนดห้อง log การซื้อขาย",
          "`/setshoppanel` — สร้างแผงร้านค้าในห้อง",
          "`/setcasino` — สร้างแผงคาสิโนในห้อง",
          "`/addshop` — เพิ่มสินค้าในร้านค้า",
          "`/give-spore <@user> <จำนวน>` — มอบสปอร์ให้ผู้เล่น",
          "`/set-spore <@user> <จำนวน>` — ตั้งค่าสปอร์ผู้เล่น",
        ].join("\n"),
        inline: false,
      }
    )
    .setFooter({ text: "The SporeNet • ป่าเวทมนตร์แห่งสปอร์" })
    .setTimestamp();

  await interaction.reply({ embeds: [embed], ephemeral: true });
}
