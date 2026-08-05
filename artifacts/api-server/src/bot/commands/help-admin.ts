import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  PermissionFlagsBits,
} from "discord.js";

export const data = new SlashCommandBuilder()
  .setName("help-admin")
  .setDescription("🛠️ คู่มือคำสั่งทั้งหมดสำหรับแอดมิน แยกหมวดหมู่พร้อมตัวอย่าง")
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply({ ephemeral: true });

  // ── Embed 1: Economy & Items ──────────────────────────────────────────────
  const economyEmbed = new EmbedBuilder()
    .setTitle("🛠️ คู่มือแอดมิน — The SporeNet")
    .setDescription("คำสั่งทั้งหมดแบ่งตามหมวดหมู่ พร้อมตัวอย่างการใช้งาน\n\u200b")
    .setColor(0xfee75c)
    .addFields(
      {
        name: "💰 หมวด: เศรษฐกิจ & ไอเทม",
        value: [
          "**`/give-spore @ผู้เล่น <จำนวน> [เหตุผล]`**",
          "→ เสกสปอร์ให้ผู้เล่น (ไม่หักจากใคร)",
          "✏️ ตัวอย่าง: `/give-spore @มิ้ว 5000 รางวัลแข่งขัน`\n",
          "**`/set-spore @ผู้เล่น <จำนวน> [เหตุผล]`**",
          "→ ตั้งค่าสปอร์ผู้เล่นให้เท่ากับจำนวนที่กำหนด (แทนที่ค่าเดิม)",
          "✏️ ตัวอย่าง: `/set-spore @โอม 0 โดนแบน`\n",
          "**`/give-item @ผู้เล่น <ไอเทม> [เหตุผล]`**",
          "→ เสกไอเทมบัฟให้ผู้เล่นโดยตรง",
          "✏️ ตัวอย่าง: `/give-item @มิ้ว golden_spore รางวัลพิเศษ`",
        ].join("\n"),
        inline: false,
      }
    );

  // ── Embed 2: Shop & Panels ─────────────────────────────────────────────────
  const shopEmbed = new EmbedBuilder()
    .setColor(0xfee75c)
    .addFields(
      {
        name: "🏪 หมวด: ร้านค้า",
        value: [
          "**`/addshop role <id> <ชื่อ> <คำอธิบาย> <ราคา> @ยศ`**",
          "→ เพิ่มสินค้าประเภทยศในร้าน (ผู้ซื้อได้รับยศอัตโนมัติ)",
          "✏️ ตัวอย่าง: `/addshop role vip VIP 🌟 ยศพรีเมียม 10000 @VIP`\n",
          "**`/addshop custom <id> <ชื่อ> <คำอธิบาย> <ราคา>`**",
          "→ เพิ่มสินค้าแบบ Manual (แอดมินต้องดำเนินการให้ผู้ซื้อเอง)",
          "✏️ ตัวอย่าง: `/addshop custom art commission 🎨 รับวาดรูป 5000`\n",
          "**`/addshop remove <id>`**",
          "→ ลบสินค้าออกจากร้านค้า",
          "✏️ ตัวอย่าง: `/addshop remove vip`\n",
          "**`/setshoppanel`**",
          "→ สร้าง/รีเฟรชแผงร้านค้าแบบมีปุ่มในห้องปัจจุบัน",
          "✏️ ใช้ในห้องร้านค้า แล้วให้ผู้เล่นกดปุ่มซื้อจากแผงนั้น\n",
          "**`/setlog #ห้อง`**",
          "→ ตั้งห้อง log การซื้อขาย/ทำธุรกรรม",
          "✏️ ตัวอย่าง: `/setlog #📋-log-transactions`",
          "**`/marketplace [channel]`**",
          "→ ตั้งห้องตลาดกลางผู้เล่น ผู้เล่นใช้ `/market-sell` ได้เฉพาะห้องนี้",
          "→ ประกาศมีปุ่มซื้อทันที และรายการจบแล้วจะถูกลบหลัง 1 ชั่วโมง",
        ].join("\n"),
        inline: false,
      }
    );

  // ── Embed 3: Games ─────────────────────────────────────────────────────────
  const gamesEmbed = new EmbedBuilder()
    .setColor(0xfee75c)
    .addFields(
      {
        name: "🎮 หมวด: มินิเกม & ห้องเกม",
        value: [
          "**`/setgamechannel #ห้อง`**",
          "→ กำหนดให้ห้องนั้นเป็น Game Channel (จำกัดคำสั่งเกมให้ใช้ได้เฉพาะในห้องนี้)",
          "✏️ ตัวอย่าง: `/setgamechannel #🎮-game`\n",
          "**`/setcasino [หัวข้อ] [คำอธิบาย]`**",
          "→ สร้างแผงคาสิโน 🎰 (สล็อตแมชชีน) ในห้องปัจจุบัน",
          "✏️ ตัวอย่าง: `/setcasino` (ใช้ค่า default) หรือใส่หัวข้อเองก็ได้\n",
          "**`/setsporecrash [หัวข้อ] [คำอธิบาย]`**",
          "→ สร้างแผงมินิเกม Spore Crash 🚀 ในห้องปัจจุบัน",
          "→ ผู้เล่นกดวางเดิมพัน กดถอนเงินก่อนยานระเบิด",
          "✏️ ตัวอย่าง: `/setsporecrash` (ใช้ค่า default)",
          "**`/setluckydoors [หัวข้อ] [คำอธิบาย]`**",
          "→ สร้างแผง Lucky Doors 🚪 ให้ผู้เล่นวางเดิมพันและเลือก 1 ใน 3 ช่อง",
          "→ เลือกถูกได้รับสปอร์คืน ×2 เลือกผิดเสียเดิมพัน",
          "✏️ ตัวอย่าง: `/setluckydoors` (ใช้ค่า default)",
        ].join("\n"),
        inline: false,
      }
    );

  // ── Embed 4: World Boss ────────────────────────────────────────────────────
  const bossEmbed = new EmbedBuilder()
    .setColor(0xfee75c)
    .addFields(
      {
        name: "👹 หมวด: บอสโลก",
        value: [
          "**`/setworldboss setup`**",
          "→ ตั้งค่าระบบ spawn บอสอัตโนมัติ",
          "  • `interval_days` — ทุกกี่วันสปอว์นครั้ง",
          "  • `spawn_hour / spawn_minute` — เวลา spawn (24h)",
          "  • `timeout_minutes` — เวลาที่บอสหมดอายุ",
          "  • `live_update_seconds` — อัปเดต embed ทุกกี่วินาที",
          "✏️ ตัวอย่าง: `/setworldboss setup interval_days:3 spawn_hour:20 spawn_minute:0 timeout_minutes:30`\n",
          "**`/setworldboss status`** — ดูการตั้งค่าบอสปัจจุบัน\n",
          "**`/setworldboss spawn_now`** — เรียกบอสมาทันที (สำหรับทดสอบ)\n",
          "**`/setworldboss bosses`** — ดูรายการบอสทั้งหมดในระบบ",
        ].join("\n"),
        inline: false,
      }
    );

  // ── Embed 5: Roles & Welcome ────────────────────────────────────────────────
  const rolesEmbed = new EmbedBuilder()
    .setColor(0xfee75c)
    .addFields(
      {
        name: "🎭 หมวด: Reaction Role",
        value: [
          "**`/reactionrole`** — สร้างแผงเลือกยศด้วย emoji ในห้องปัจจุบัน\n",
          "**`/addrole <messageId> <emoji> @ยศ`**",
          "→ เพิ่ม emoji-ยศเข้าในแผงที่มีอยู่",
          "✏️ ตัวอย่าง: `/addrole 1234567890 🌟 @Member`\n",
          "**`/deleterole <messageId>`** — ลบแผง Reaction Role ออก\n",
          "**`/listroles`** — ดูรายการแผง Reaction Role ทั้งหมดในเซิร์ฟ",
        ].join("\n"),
        inline: false,
      },
      {
        name: "👋 หมวด: Welcome & Goodbye",
        value: [
          "**`/setwelcome <ข้อความ> [รูปภาพ]`**",
          "→ ตั้งข้อความต้อนรับสมาชิกใหม่ในห้องปัจจุบัน",
          "→ ใช้ `{user}` แทนชื่อสมาชิก, `{server}` แทนชื่อเซิร์ฟ",
          "✏️ ตัวอย่าง: `/setwelcome ยินดีต้อนรับ {user} สู่ {server}!`\n",
          "**`/setgoodbye <ข้อความ>`** — ตั้งข้อความอำลาสมาชิกที่ออกไป\n",
          "**`/disablewelcome <welcome/goodbye/both>`** — ปิดระบบต้อนรับ/ลาก่อน",
          "✏️ ตัวอย่าง: `/disablewelcome both`",
        ].join("\n"),
        inline: false,
      }
    );

  // ── Embed 6: Verify & Achievement ─────────────────────────────────────────
  const verifyEmbed = new EmbedBuilder()
    .setColor(0xfee75c)
    .addFields(
      {
        name: "✅ หมวด: แผงยืนยันตัวตน (Verify Panel)",
        value: [
          "**`/verifypanel`** — สร้างแผงยืนยันตัวตนด้วย Modal (สูงสุด 5 ฟิลด์)",
          "  • `title / description` — หัวข้อและคำอธิบายแผง",
          "  • `role` — ยศที่ให้หลังยืนยัน",
          "  • `log_channel` — ห้อง log คำตอบ",
          "  • `field1_label ... field5_label` — ป้ายกำกับแต่ละช่องกรอก\n",
          "**`/editverifypanel <message_id>`** — แก้ไขแผงยืนยันที่มีอยู่\n",
          "**`/deleteverifypanel #ห้อง <message_id>`** — ลบแผงยืนยันตัวตน",
        ].join("\n"),
        inline: false,
      },
      {
        name: "🏆 หมวด: ยศความสำเร็จ (Achievement Admin)",
        value: [
          "**`/achievement-admin create`**",
          "→ สร้างยศความสำเร็จใหม่ พร้อมกำหนดเงื่อนไข/รางวัลสปอร์/ยศ Discord",
          "✏️ ตัวอย่าง: สร้างยศ 'นักล่าบอส' สำหรับคนที่โจมตีบอส 10 ครั้ง\n",
          "**`/achievement-admin edit <id>`** — แก้ไขยศความสำเร็จที่มีอยู่\n",
          "**`/achievement-admin delete <id>`** — ลบยศความสำเร็จ\n",
          "**`/achievement-admin delete-secret confirm:true`**",
          "→ ลบยศลับ (isSecret=true) ทั้งหมดในเซิร์ฟ\n",
          "**`/achievement-admin list`** — ดูรายการยศทั้งหมด (Admin View พร้อม ID)",
        ].join("\n"),
        inline: false,
      }
    );

  // ── Embed 7: Voice ─────────────────────────────────────────────────────────
  const voiceEmbed = new EmbedBuilder()
    .setColor(0xfee75c)
    .addFields(
      {
        name: "🎙️ หมวด: ห้องเสียง",
        value: [
          "**`/setvoicereward`** — ตั้งค่าระบบแจกสปอร์จากการอยู่ในห้องเสียง",
          "  • `enabled` — เปิด/ปิดระบบ",
          "  • `time_loop` — รอบเวลาแจก (นาที)",
          "  • `give_spore` — จำนวนสปอร์ต่อรอบ",
          "  • `give_exp` — exp ต่อรอบ (ถ้ามีระบบ)",
          "  • `notify_channel` — ห้องแจ้งเตือนการรับสปอร์",
          "✏️ ตัวอย่าง: `/setvoicereward enabled:true time_loop:10 give_spore:50`\n",
          "**`/setdynvoice`** — ตั้งค่าระบบห้องเสียงไดนามิก (สร้างห้องอัตโนมัติ)",
          "→ เลือกห้อง 'Join to Create' แล้วบอทจะสร้างห้องใหม่ให้ผู้เล่นทุกคน\n",
          "**`/blockvoiceroom [#ห้อง]`** — บล็อค/ปลดบล็อคห้องเสียงไม่ให้แจกสปอร์ (toggle)",
          "✏️ ตัวอย่าง: `/blockvoiceroom #🎵-music` เพื่อยกเว้นห้องเพลง",
        ].join("\n"),
        inline: false,
      }
    )
    .setFooter({ text: "The SporeNet • คู่มือแอดมิน | คำสั่งผู้เล่นทั่วไป ใช้ /help" })
    .setTimestamp();

  await interaction.editReply({
    embeds: [economyEmbed, shopEmbed, gamesEmbed, bossEmbed, rolesEmbed, verifyEmbed, voiceEmbed],
  });
}
