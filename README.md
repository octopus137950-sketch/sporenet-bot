# 🍄 Discord Bot — Reaction Role & Welcome System

บอทดิสคอดสำหรับระบบรับยศด้วยอิโมจิ และระบบต้อนรับ/ลาก่อนสมาชิก

---

## ✨ ฟีเจอร์

- **Reaction Role** — กดอิโมจิเพื่อรับยศ, รองรับโหมดล็อค (รับยศเดียว)
- **Welcome** — ส่ง embed ต้อนรับสมาชิกใหม่พร้อมรูปภาพ
- **Goodbye** — ส่ง embed ลาก่อนเมื่อสมาชิกออกจากเซิร์ฟเวอร์

---

## 📋 Slash Commands

| คำสั่ง | คำอธิบาย |
|--------|----------|
| `/reactionrole` | สร้างแผงรับยศด้วยอิโมจิ |
| `/listroles` | ดูรายการแผงทั้งหมด |
| `/deleterole` | ลบแผงรับยศ |
| `/setwelcome` | ตั้งค่าข้อความต้อนรับสมาชิกใหม่ |
| `/setgoodbye` | ตั้งค่าข้อความลาก่อน |
| `/disablewelcome` | ปิดระบบต้อนรับ/ลาก่อน |

---

## 🚀 วิธี Deploy บน Railway

### 1. เตรียม Environment Variables
ใส่ค่าเหล่านี้ใน Railway Dashboard → Variables:

```
DISCORD_TOKEN=xxx
DISCORD_CLIENT_ID=xxx
DATA_DIR=/data
PORT=8080
```

### 2. เตรียม Volume (เก็บข้อมูลบอท)
ใน Railway → Add Volume → Mount Path: `/data`

### 3. สั่ง Deploy
Railway จะ build จาก Dockerfile อัตโนมัติ

---

## 🔧 วิธีรันในเครื่อง (Local)

```bash
# ติดตั้ง dependencies
pnpm install

# รัน dev server + bot
pnpm --filter @workspace/api-server run dev
```

---

## 🌿 Environment Variables ที่ต้องใช้

| ตัวแปร | คำอธิบาย | ต้องใส่ |
|--------|----------|---------|
| `DISCORD_TOKEN` | Bot Token จาก Discord Developer Portal | ✅ |
| `DISCORD_CLIENT_ID` | Application ID จาก Discord Developer Portal | ✅ |
| `PORT` | พอร์ตสำหรับ HTTP server (Railway กำหนดให้อัตโนมัติ) | ✅ |
| `DATA_DIR` | โฟลเดอร์เก็บข้อมูลบอท (ตั้งเป็น `/data` บน Railway) | แนะนำ |

---

## 📁 โครงสร้างโปรเจกต์

```
artifacts/api-server/src/bot/
├── bot.ts                  # จุดเริ่มต้นบอท
├── deploy-commands.ts      # ลงทะเบียน slash commands
├── commands/
│   ├── reactionrole.ts     # คำสั่งสร้างแผงรับยศ
│   ├── listroles.ts        # คำสั่งดูรายการแผง
│   ├── deleterole.ts       # คำสั่งลบแผง
│   ├── setwelcome.ts       # คำสั่งตั้งต้อนรับ
│   ├── setgoodbye.ts       # คำสั่งตั้งลาก่อน
│   └── disablewelcome.ts   # คำสั่งปิดระบบ
├── events/
│   ├── reactionAdd.ts      # จัดการ reaction เพิ่ม
│   ├── reactionRemove.ts   # จัดการ reaction ลบ
│   ├── memberAdd.ts        # จัดการสมาชิกเข้า
│   └── memberRemove.ts     # จัดการสมาชิกออก
└── data/
    └── store.ts            # จัดเก็บข้อมูลบอท (JSON)
```
