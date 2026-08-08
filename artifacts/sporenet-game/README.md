# SporeNet — Mushroom Adventure (Web Game)

เกมผจญภัยเห็ด voxel 3D ที่เชื่อมต่อกับ Discord bot โดยตรง

## ฟีเจอร์

- 🎮 เกม 3D voxel ทำด้วย Three.js (ไฟล์เดียว)
- 🔵 ล็อกอินด้วย Discord OAuth2 (เฉพาะสมาชิกเซิร์ฟเวอร์)
- 🔄 sync ข้อมูล real-time กับบอท: spore, level, EXP, items, potions
- 🍄 เก็บเห็ด 3 ชนิด + สู้มอนสเตอร์ 4 ชนิด + เปิดกล่องสมบัติ 3 ระดับ
- ⚔️ ระบบสู้แบบ animation จริง (charge + slash + counter)
- 🧪 น้ำยาฟื้นฟู HP + ไอเทมบัฟ 20 ชนิดจาก sporenet-bot

## Deploy บน Vercel

1. import repo นี้ไปที่ Vercel
2. ตั้ง Root Directory เป็น `artifacts/sporenet-game`
3. Framework Preset: Other (static)
4. Deploy แล้ว copy URL (เช่น `https://sporenet-game.vercel.app`)

## ตั้งค่า API_BASE

หลัง deploy บน Vercel แล้ว ต้องตั้งค่า `API_BASE` ใน `index.html` ให้ชี้ไปที่ api-server ของบอท:

```js
window.GAME_CONFIG = {
    API_BASE: 'https://your-bot-domain.com'  // URL ของ api-server
};
```

หรือใช้ environment variable ใน Vercel + build script ถ้าต้องการแบบ dynamic

## Discord OAuth2 Setup

ดูคู่มือฉบับเต็มที่: [../docs/discord-oauth-setup.md](../../docs/discord-oauth-setup.md)

โดยสรุป:
1. ไปที่ https://discord.com/developers/applications
2. เลือกแอป → OAuth2 → Redirects
3. เพิ่ม redirect URI: `https://<vercel-domain>/auth/callback`
4. copy Client Secret → ใส่ใน `.env` ของ api-server เป็น `DISCORD_CLIENT_SECRET`

## env ของ api-server ที่ต้องเพิ่ม

```env
DISCORD_CLIENT_SECRET=xxx           # Discord OAuth2 client secret
DISCORD_GUILD_ID=xxx                # guild ID ที่ต้องเช็คสมาชิก
GAME_BASE_URL=https://sporenet-game.vercel.app  # URL ของเว็บเกม (Vercel)
SESSION_SECRET=random-string        # secret สำหรับ sign session token
```

## วิธีเล่น

1. ใน Discord พิมพ์ `/play` → บอทส่งลิงก์เปิดเกม
2. กดลิงก์ → ล็อกอินด้วย Discord (ต้องเป็นสมาชิกเซิร์ฟเวอร์)
3. เล่นเกม → ข้อมูล sync กับบอท real-time
4. กลับไป Discord ใช้ `/farm` → ข้อมูล sync กลับ (spore, level, items)
