# Discord OAuth2 Setup สำหรับ SporeNet Web Game

คู่มือตั้งค่าระบบล็อกอิน Discord สำหรับเว็บเกม SporeNet mushroom adventure

## สิ่งที่ต้องมี

- Discord bot ที่สร้างจาก https://discord.com/developers/applications
- เว็บเกม host บน Vercel/Netlify (มี URL แล้ว)
- api-server ที่รันอยู่ (มี URL แล้ว)

## ขั้นตอนที่ 1: ตั้งค่า OAuth2 ใน Discord Developer Portal

1. ไปที่ https://discord.com/developers/applications
2. เลือกแอป SporeNet Bot ของคุณ
3. คลิกเมนู **OAuth2** ทางซ้าย
4. ในส่วน **Redirects** คลิก **Add Redirect**
5. ใส่ URL: `https://<your-vercel-domain>/auth/callback`
   - เช่น `https://sporenet-game.vercel.app/auth/callback`
6. กด **Save Changes**

## ขั้นตอนที่ 2: ดึง Client Secret

1. ในหน้า OAuth2 → General
2. ดูส่วน **Client Information**
3. copy **Client ID** (มีอยู่แล้วใน env เป็น `DISCORD_CLIENT_ID`)
4. คลิก **Reset Secret** หรือ **Copy** ถ้ามีอยู่แล้ว → ได้ **Client Secret**
   - ⚠️ Client Secret ห้ามส่งให้ใคร — เก็บเป็นความลับ

## ขั้นตอนที่ 3: หา Guild ID

1. เปิด Discord → ไปที่เซิร์ฟเวอร์ที่ต้องการให้สมาชิกเล่นเกมได้
2. คลิกขวาที่ชื่อเซิร์ฟเวอร์ → **Copy ID**
   - ถ้าไม่เห็น Copy ID ให้เปิด Settings → Advanced → **Developer Mode** ก่อน
3. ได้ Guild ID มาเป็นตัวเลขยาวๆ เช่น `123456789012345678`

## ขั้นตอนที่ 4: ตั้งค่า env ใน api-server

เพิ่ม env ใหม่ในไฟล์ `.env` ของ api-server:

```env
# env ที่มีอยู่แล้ว
DISCORD_TOKEN=xxx
DISCORD_CLIENT_ID=xxx
DATA_DIR=xxx
PORT=xxx

# env ใหม่สำหรับเว็บเกม
DISCORD_CLIENT_SECRET=<client_secret จากขั้นตอนที่ 2>
DISCORD_GUILD_ID=<guild_id จากขั้นตอนที่ 3>
GAME_BASE_URL=https://sporenet-game.vercel.app  # URL ของเว็บเกมบน Vercel
SESSION_SECRET=<สุ่ม string ยาวๆ>  # ใช้สร้าง session token
```

วิธีสร้าง SESSION_SECRET:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## ขั้นตอนที่ 5: ตั้งค่า API_BASE ในเว็บเกม

หลัง deploy เว็บเกมบน Vercel แล้ว ต้องบอกเว็บเกมว่า api-server อยู่ที่ไหน

แก้ไฟล์ `artifacts/sporenet-game/index.html` บรรทัดที่มี `window.GAME_CONFIG`:

```js
window.GAME_CONFIG = {
    API_BASE: 'https://your-bot-domain.com'  // URL ของ api-server ไม่มี / ท้าย
};
```

ถ้า api-server และเว็บเกมอยู่ domain เดียวกัน ไม่ต้องตั้งค่า (เว้นว่างไว้)

## ขั้นตอนที่ 6: Deploy และทดสอบ

1. commit + push โค้ดขึ้น GitHub
2. รันคำสั่ง Termux 2 บรรทัดเพื่อ deploy api-server:
```bash
pkill -f index.mjs ; cd ~/sporenet-bot && git pull && cd artifacts/api-server && node build.mjs
cd ~/sporenet-bot && set -a && source .env && set +a && nohup node artifacts/api-server/dist/index.mjs > ~/bot.log 2>&1 &
```
3. deploy เว็บเกมบน Vercel (auto-deploy จาก GitHub ถ้าตั้งไว้)
4. ทดสอบ: ใน Discord พิมพ์ `/play` → บอทส่งลิงก์ → กดลิงก์ → ล็อกอินด้วย Discord

## การแก้ปัญหา

### ล็อกอินไม่ผ่าน — "redirect_uri mismatch"
- ตรวจว่า redirect URI ใน Discord Developer Portal ตรงกับ `GAME_BASE_URL + /auth/callback` ที่ตั้งไว้

### "คุณยังไม่ได้เข้าร่วมเซิร์ฟเวอร์ Discord"
- ตรวจ `DISCORD_GUILD_ID` ว่าถูกต้อง
- ตรวจว่าบอทอยู่ในเซิร์ฟเวอร์นั้นจริง (บอทต้องอยู่ใน guild ถึงจะเช็คสมาชิกได้)

### CORS error ใน console
- ตรวจว่า `GAME_BASE_URL` ใน env ของ api-server ตรงกับ URL ของเว็บเกมบน Vercel
- ตรวจว่าไม่มี `/` ท้าย URL

### "auth_not_configured"
- ตรวจว่าตั้ง env ครบทั้ง 4 ตัว: `DISCORD_CLIENT_SECRET`, `DISCORD_GUILD_ID`, `GAME_BASE_URL`, `SESSION_SECRET`

### session หมดอายุเร็ว
- session token อยู่ได้ 7 วัน — ถ้าผู้เล่นกลับมาเล่นใหม่หลัง 7 วัน ต้องล็อกอินใหม่
- ถ้าเปลี่ยน `SESSION_SECRET` session ทั้งหมดจะหมดอายุทันที

## Flow การล็อกอิน

```
1. ผู้เล่นเปิดเว็บเกม → แสดงหน้าล็อกอิน
2. กด "ล็อกอินด้วย Discord" → redirect ไป Discord
3. Discord ถาม "ยอมรับไหม?" → ผู้เล่นกดยอม
4. Discord redirect กลับมา /auth/callback?code=xxx
5. เว็บเกมส่ง code ไป api-server → api-server:
   - แลก code เป็น access_token
   - ดึงข้อมูล user จาก Discord
   - เช็คว่า user เป็นสมาชิก guild ไหม (ใช้ bot token)
   - สร้าง session token (HMAC-signed, 7 วัน)
   - ส่ง session token กลับเว็บเกม
6. เว็บเกมเก็บ token ใน localStorage → โหลดข้อมูล player → เริ่มเกม
7. ทุกการกระทำ (เก็บเห็ด, ชนะมอนสเตอร์, ฯลฯ) → sync ไป api-server (real-time)
```

## Security Notes

- `SESSION_SECRET` ต้องเป็นความลับ — ถ้ารั่ว คนอื่นสร้าง session token ปลอมได้
- `DISCORD_CLIENT_SECRET` ต้องเป็นความลับ — ถ้ารั่ว คนอื่นปลอมตัวเป็นแอปคุณได้
- session token เก็บใน localStorage — ผู้ใช้ต้อง logout ทุกครั้งที่ใช้เครื่องสาธารณะ
- API endpoints ที่แก้ข้อมูล player ต้องมี `requireAuth` middleware เสมอ
