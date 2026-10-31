Updated. Copy this final `README.md`:
# ZENO TECH SOLUTION - Smart Hotel RFID Access SaaS

> Tap. Unlock. Logged. | Rwanda's First Keyless Hotel System

![ESP32](https://img.shields.io/badge/Hardware-ESP32-blue) ![Next.js](https://img.shields.io/badge/Platform-Next.js-black) ![Rwanda](https://img.shields.io/badge/Made_in-Kayonza,_Rwanda-00A651)

**ZENO replaces metal hotel keys with secure blue RFID cards.** Built for hotels, guest houses, and Airbnb in Rwanda.

### 🚀 Live Demo
**Dashboard:** https://zenotech.vercel.app  
**Docs:** https://zenotech.solution/docs

### 🏨 How It Works
1. Guest gets **blue RFID card** at reception
2. Taps on reader outside Room 204
3. ESP32 validates UID in < 1 sec
4. 12V relay triggers electric strike → Door unlocks
5. Log sent to cloud: `14:32 Room 204 unlocked - SUCCESS`

### 🛠️ Tech Stack
- **Hardware:** ESP32 DevKit V1, RC522 RFID 13.56MHz, 5V Relay, 12V Electric Strike
- **Firmware:** Arduino C++ (MFRC522, WiFiManager, HTTPClient)
- **Cloud:** Next.js 14, Tailwind, Supabase (Auth + RLS), Vercel
- **Payments:** Paystack + MTN MoMo
- **Theme:** Navy #0F1D5E, Gold #D4A017, Teal #14B8A6

### 📦 Quick Install
```bash
# Wiring
RC522 SDA -> GPIO 21 | RST -> GPIO 22
Relay -> GPIO 23
Strike -> Relay COM/NO -> 12V Adapter

# Flash
Open /firmware/zeno_lock.ino -> Set hotel_id, room_id -> Upload

# SaaS
git clone https://github.com/yourname/zeno-tech.git
npm install
npm run dev
### 🔐 No Free Use - Paywall Enforced
- *Trial:* 7 days, max 2 rooms
- *Cloud:* middleware.ts redirects expired hotels to /billing
- *Hardware:* ESP32 calls /api/check-sub hourly. If expired -> Red LED + lock disabled
- *Security:* Supabase RLS - hotels only see their own data
- *Roles:* admin / receptionist / technician

### 💳 Plans
Plan | Rooms | Price
Trial | 2 | Free 7 Days
Starter | 10 | $20/mo
Pro | 50 | $50/mo
### 👨‍💻 Contact & Installation

We install in Kigali, Kayonza, and all Eastern Province.

*Email:* tuyikundefzeno@gmail.com  
*Tel / WhatsApp:* 0790723406  
*Location:* Kayonza, Eastern Province, RW

> Need installation? Message us on WhatsApp for site survey.

### 📄 License
Proprietary - Contact for partnership & hotel installation.

---
*ZENO TECH SOLUTION © 2026 - Stop Copying Keys. Start Tapping Cards.*

This is now ready to commit.

Do you want me to also make you a **short WhatsApp business description** using same contact so hotels can find you?
