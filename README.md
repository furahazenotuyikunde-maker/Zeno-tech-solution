# ZENO TECH SOLUTION — Smart Access SaaS

Hotel RFID access management for Rwanda, built with Next.js 14 App Router, Supabase Auth/Postgres/Realtime, and Tailwind CSS.

## Local setup

1. Use Node.js 20 or newer. Install dependencies with `npm ci`.
2. Create a Supabase project and configure email/password sign-in.
3. Apply the Supabase migrations in order, including `202611020001_smart_access.sql` and the newer dashboard migrations.
4. Copy `.env.example` to `.env.local` and set all required values. Never expose the service-role, device API, or hardware-encryption keys to the browser.
5. Create the first hotel manager in Supabase Auth, then link that user to a hotel:

   ```sql
   insert into public.hotels (name, owner_email, subscription_status, plan)
   values ('Example Hotel', 'manager@example.rw', 'trialing', 'trial')
   returning id;

   insert into public.hotel_users (hotel_id, auth_user_id, email, role)
   values (
     '<hotel-id-from-the-first-query>',
     (select id from auth.users where email = 'manager@example.rw'),
     'manager@example.rw',
     'manager'
   );
   ```

6. Start the app with `npm run dev`. Build for Vercel with `npm run build`.

Hotel staff are invited from **Dashboard → Team**. The sign-in role selector is checked against the account's `hotel_users` membership and does not grant roles. Managers and receptionists can create guest cards in the single `/dashboard` view; new cards remain pending until a reader activates them.

## Frontend mock preview

The role-based `/dashboard` requires an authenticated hotel membership and reads hotel-scoped data from Supabase. Other preview routes may still use sample data; do not treat them as production card-management or door-control interfaces.

The `/ai-insights` preview uses deterministic, offline rules with a 400 ms mock-service delay. Use **Simulate Cloned Card** on the dashboard to show the 92% sample duplicate-card alert. AI risk and savings are illustrative, not production access decisions or guaranteed savings; see [docs/ai_design.md](./docs/ai_design.md) for the planned stages and data/privacy notes.

## Roles

- **Manager:** hotel dashboard, all hotel cards, enrollment, logs/export, hardware, billing, team, rooms, and master cards.
- **Receptionist:** hotel cards, card creation/check-out, and logs.
- **Electrician:** hardware, logs, and blocked/cloned-card alerts; guest identity details are not returned to this role.

Dashboard APIs verify the Supabase session and hotel membership. Card creation, activation, and check-out are hotel-scoped server operations. Row Level Security is enabled for tenant data; the service-role key is used only by server-side handlers.

## ESP32 API

Configure these secrets on the server and the trusted reader firmware:

- `ZENO_DEVICE_API_KEY`: send as `X-Device-Api-Key` on every device request.
- `SUPABASE_SERVICE_ROLE_KEY`: server only; never put this in firmware.

Requests:

```text
POST /api/check-card
{ "hotel_id": "...", "uid": "...", "reader_id": "ESP32-R204" }

POST /api/cards/activate
{ "card_id": "...", "uid": "04A1B2C3" }

GET /api/check-card?hotel_id=...

POST /api/hardware/ping
{ "hotel_id": "...", "reader_id": "ESP32-R204", "battery": 78, "rssi": -45 }

GET /api/hardware/commands?hotel_id=...&reader_id=ESP32-R204
POST /api/hardware/commands
{ "hotel_id": "...", "reader_id": "ESP32-R204", "command_id": "...", "status": "completed" }
```

Readers must be registered to a hotel and room before pinging or checking cards. Card activation requests require `X-Device-Api-Key`; a USB reader can also submit a scanned UID from the authenticated dashboard activation dialog. Only active cards within their validity dates can open doors. The offline whitelist contains at most 50 current active physical/master card UIDs; a QR mobile key requires an online check. Guest QR tokens are random, hashed at rest, and expire with the guest card. QR unlocking also requires firmware that can scan QR codes and submit their token as the `uid`.

Remote open, reboot, and Wi-Fi updates are queued for readers to poll. Wi-Fi credentials are AES-256-GCM encrypted before storage; set `HARDWARE_COMMAND_ENCRYPTION_KEY` on the server and implement the matching decrypt/apply behavior in trusted firmware. Manual room unlock is not simulated in the dashboard.

## Supabase and deployment notes

- The migration enables Realtime for `access_logs` and the private guest-log detail table.
- Apply migrations before deploying the app; the original schema/migration creates the base `hotels` and `rooms` tables.
- Apply `supabase/migrations/202611050002_card_activation_flow.sql` to add card phone/passport metadata, nullable UIDs for pending cards, and card lifecycle/validity fields.
- Set Supabase Auth redirect URLs for localhost and the production Vercel domain.
- Use a unique, high-entropy device API key and hardware encryption key in the Vercel environment. Rotate them if a reader is retired or compromised.
- Trial access is 14 days and capped at two rooms. MoMo renewal and $5 room unlock requests currently contact the operator for manual confirmation; no payment is marked complete by this app.
- Door controllers should retain a safe physical egress path. Confirm strike behavior under power loss at installation; the dashboard status badge is informational.

## Support

0790723406 · tuyikundefzeno@gmail.com
