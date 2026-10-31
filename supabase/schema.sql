-- ==============================================================================
-- ZENO TECH SOLUTION - Smart Access Systems
-- Complete Production Database Schema for Supabase (PostgreSQL)
-- Includes: Extensions, Tables, Foreign Keys, RLS Policies, Realtime Publication,
-- Stored Procedures, Automation Triggers, and Initial Seed Data.
-- ==============================================================================

-- 1. Enable Required Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 2. CREATE TABLES
-- ==============================================================================

-- Table: hotels (Multi-property hotel management)
CREATE TABLE IF NOT EXISTS public.hotels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(10) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    location VARCHAR(255) NOT NULL,
    total_rooms INTEGER NOT NULL DEFAULT 0,
    currency VARCHAR(10) NOT NULL DEFAULT 'USD',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Table: rooms (Hotel room inventory & mapped ESP32 locks)
CREATE TABLE IF NOT EXISTS public.rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hotel_id UUID REFERENCES public.hotels(id) ON DELETE CASCADE,
    room_number VARCHAR(20) NOT NULL,
    floor INTEGER NOT NULL DEFAULT 1,
    type VARCHAR(50) NOT NULL DEFAULT 'Standard' CHECK (type IN ('Standard', 'Deluxe', 'Executive Suite', 'Presidential Suite')),
    status VARCHAR(30) NOT NULL DEFAULT 'vacant' CHECK (status IN ('vacant', 'occupied', 'maintenance')),
    card_assigned VARCHAR(50),
    current_guest VARCHAR(255),
    lock_id VARCHAR(50) NOT NULL, -- e.g. 'ESP32-L204'
    lock_status VARCHAR(20) NOT NULL DEFAULT 'online' CHECK (lock_status IN ('online', 'offline', 'warning')),
    lock_battery INTEGER NOT NULL DEFAULT 100 CHECK (lock_battery BETWEEN 0 AND 100),
    lock_signal INTEGER NOT NULL DEFAULT -55, -- in dBm (e.g. -50 to -85)
    last_access_time TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT unique_hotel_room UNIQUE (hotel_id, room_number)
);

-- Table: guests (Active and historical guest registrations)
CREATE TABLE IF NOT EXISTS public.guests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hotel_id UUID REFERENCES public.hotels(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    room_number VARCHAR(20) NOT NULL,
    check_in_date DATE NOT NULL,
    check_out_date DATE NOT NULL,
    id_number VARCHAR(100) NOT NULL, -- Passport / National ID
    phone VARCHAR(50),
    email VARCHAR(255),
    card_uid VARCHAR(50) NOT NULL, -- e.g. 'G-10247'
    status VARCHAR(30) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'checked_out', 'deactivated')),
    issued_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    vip_status BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Table: cards_inventory (Mifare RFID physical card stock & statuses)
CREATE TABLE IF NOT EXISTS public.cards_inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hotel_id UUID REFERENCES public.hotels(id) ON DELETE CASCADE,
    uid VARCHAR(50) NOT NULL UNIQUE, -- e.g. 'G-10247'
    type VARCHAR(50) NOT NULL DEFAULT 'Mifare Classic 1K',
    status VARCHAR(30) NOT NULL DEFAULT 'unassigned' CHECK (status IN ('active', 'unassigned', 'lost', 'blocked')),
    assigned_guest VARCHAR(255),
    assigned_room VARCHAR(20),
    batch_number VARCHAR(50) NOT NULL DEFAULT 'BATCH-2026-A',
    last_read TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Table: access_logs (Audit trail of every tap, remote unlock, or QR scan)
CREATE TABLE IF NOT EXISTS public.access_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hotel_id UUID REFERENCES public.hotels(id) ON DELETE SET NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    room_number VARCHAR(20) NOT NULL,
    card_uid VARCHAR(50) NOT NULL,
    guest_name VARCHAR(255) NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('UNLOCKED', 'FAILED')),
    reason TEXT,
    source VARCHAR(30) NOT NULL DEFAULT 'RFID' CHECK (source IN ('RFID', 'QR_BACKUP', 'RECEPTION_REMOTE')),
    battery_status INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Table: system_config (WiFi, MQTT broker, and controller settings)
CREATE TABLE IF NOT EXISTS public.system_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hotel_id UUID REFERENCES public.hotels(id) ON DELETE CASCADE UNIQUE,
    wifi_ssid VARCHAR(100) NOT NULL DEFAULT 'ZENO_HOTEL_GUEST_IOT',
    wifi_pass VARCHAR(100) NOT NULL DEFAULT 'zenoSecure2026!IoT',
    mqtt_broker VARCHAR(255) NOT NULL DEFAULT 'broker.emqx.io',
    mqtt_port INTEGER NOT NULL DEFAULT 1883,
    relay_hold_seconds INTEGER NOT NULL DEFAULT 4,
    offline_sync_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ==============================================================================
-- 3. INDEXES FOR PERFORMANCE
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_rooms_hotel ON public.rooms(hotel_id);
CREATE INDEX IF NOT EXISTS idx_rooms_number ON public.rooms(room_number);
CREATE INDEX IF NOT EXISTS idx_guests_hotel ON public.guests(hotel_id);
CREATE INDEX IF NOT EXISTS idx_guests_card ON public.guests(card_uid);
CREATE INDEX IF NOT EXISTS idx_guests_status ON public.guests(status);
CREATE INDEX IF NOT EXISTS idx_logs_timestamp ON public.access_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_logs_room ON public.access_logs(room_number);
CREATE INDEX IF NOT EXISTS idx_logs_card ON public.access_logs(card_uid);
CREATE INDEX IF NOT EXISTS idx_cards_uid ON public.cards_inventory(uid);
CREATE INDEX IF NOT EXISTS idx_cards_status ON public.cards_inventory(status);

-- ==============================================================================
-- 4. AUTOMATIC TIMESTAMP TRIGGER
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_hotels_updated_at ON public.hotels;
CREATE TRIGGER set_hotels_updated_at BEFORE UPDATE ON public.hotels FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_rooms_updated_at ON public.rooms;
CREATE TRIGGER set_rooms_updated_at BEFORE UPDATE ON public.rooms FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_guests_updated_at ON public.guests;
CREATE TRIGGER set_guests_updated_at BEFORE UPDATE ON public.guests FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_cards_updated_at ON public.cards_inventory;
CREATE TRIGGER set_cards_updated_at BEFORE UPDATE ON public.cards_inventory FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ==============================================================================
-- 5. BUSINESS LOGIC AUTOMATION TRIGGERS
-- ==============================================================================

-- A. Automatically update room status and card inventory on guest enrollment
CREATE OR REPLACE FUNCTION public.sync_guest_enrollment()
RETURNS TRIGGER AS $$
BEGIN
    -- 1. Mark the room as occupied and assign current guest
    UPDATE public.rooms
    SET status = 'occupied',
        card_assigned = NEW.card_uid,
        current_guest = NEW.name,
        last_access_time = timezone('utc'::text, now())
    WHERE room_number = NEW.room_number
      AND (hotel_id = NEW.hotel_id OR NEW.hotel_id IS NULL);

    -- 2. Mark card as active and assigned
    INSERT INTO public.cards_inventory (hotel_id, uid, type, status, assigned_guest, assigned_room, batch_number, last_read)
    VALUES (NEW.hotel_id, NEW.card_uid, 'Mifare Classic 1K', 'active', NEW.name, NEW.room_number, 'DESK-ENROLLED', timezone('utc'::text, now()))
    ON CONFLICT (uid) DO UPDATE
    SET status = 'active',
        assigned_guest = EXCLUDED.assigned_guest,
        assigned_room = EXCLUDED.assigned_room,
        last_read = timezone('utc'::text, now());

    -- 3. Automatically record enrollment event in access_logs
    INSERT INTO public.access_logs (hotel_id, room_number, card_uid, guest_name, status, reason, source)
    VALUES (NEW.hotel_id, NEW.room_number, NEW.card_uid, NEW.name, 'UNLOCKED', 'Card programmed and paired at Reception Desk', 'RFID');

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_sync_guest_enrollment ON public.guests;
CREATE TRIGGER trigger_sync_guest_enrollment
AFTER INSERT ON public.guests
FOR EACH ROW EXECUTE FUNCTION public.sync_guest_enrollment();

-- B. Automatically release room and free card on guest checkout
CREATE OR REPLACE FUNCTION public.sync_guest_checkout()
RETURNS TRIGGER AS $$
BEGIN
    IF (OLD.status = 'active' AND NEW.status IN ('checked_out', 'deactivated')) THEN
        -- 1. Free the room
        UPDATE public.rooms
        SET status = 'vacant',
            card_assigned = NULL,
            current_guest = NULL
        WHERE room_number = OLD.room_number
          AND (hotel_id = OLD.hotel_id OR OLD.hotel_id IS NULL);

        -- 2. Reset the card to unassigned stock
        UPDATE public.cards_inventory
        SET status = 'unassigned',
            assigned_guest = NULL,
            assigned_room = NULL
        WHERE uid = OLD.card_uid;

        -- 3. Log the checkout revocation
        INSERT INTO public.access_logs (hotel_id, room_number, card_uid, guest_name, status, reason, source)
        VALUES (OLD.hotel_id, OLD.room_number, OLD.card_uid, OLD.name, 'UNLOCKED', 'Guest checked out. Card credentials revoked.', 'RECEPTION_REMOTE');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_sync_guest_checkout ON public.guests;
CREATE TRIGGER trigger_sync_guest_checkout
AFTER UPDATE ON public.guests
FOR EACH ROW EXECUTE FUNCTION public.sync_guest_checkout();

-- ==============================================================================
-- 6. ENABLE ROW LEVEL SECURITY (RLS)
-- ==============================================================================
ALTER TABLE public.hotels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cards_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.access_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_config ENABLE ROW LEVEL SECURITY;

-- Allow public read/write for authenticated users & anon demo client
CREATE POLICY "Allow public read hotels" ON public.hotels FOR SELECT USING (true);
CREATE POLICY "Allow public all hotels" ON public.hotels FOR ALL USING (true);

CREATE POLICY "Allow public read rooms" ON public.rooms FOR SELECT USING (true);
CREATE POLICY "Allow public all rooms" ON public.rooms FOR ALL USING (true);

CREATE POLICY "Allow public read guests" ON public.guests FOR SELECT USING (true);
CREATE POLICY "Allow public all guests" ON public.guests FOR ALL USING (true);

CREATE POLICY "Allow public read cards" ON public.cards_inventory FOR SELECT USING (true);
CREATE POLICY "Allow public all cards" ON public.cards_inventory FOR ALL USING (true);

CREATE POLICY "Allow public read logs" ON public.access_logs FOR SELECT USING (true);
CREATE POLICY "Allow public all logs" ON public.access_logs FOR ALL USING (true);

CREATE POLICY "Allow public read config" ON public.system_config FOR SELECT USING (true);
CREATE POLICY "Allow public all config" ON public.system_config FOR ALL USING (true);

-- ==============================================================================
-- 7. ENABLE SUPABASE REALTIME REPLICATION
-- (Allows instant live WebSocket pushes to the dashboard whenever logs/rooms update)
-- ==============================================================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'access_logs'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.access_logs;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'rooms'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.rooms;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'guests'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.guests;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'cards_inventory'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.cards_inventory;
    END IF;
END $$;

-- ==============================================================================
-- 8. INITIAL SEED DATA
-- ==============================================================================

-- 1. Insert Hotel
INSERT INTO public.hotels (id, code, name, location, total_rooms, currency)
VALUES ('00000000-0000-0000-0000-000000000001', 'GSH', 'Grand Serena Hotel & Suites', 'Kigali, Rwanda', 48, 'USD')
ON CONFLICT (code) DO NOTHING;

-- 2. Insert System Configuration
INSERT INTO public.system_config (hotel_id, wifi_ssid, wifi_pass, mqtt_broker, mqtt_port, relay_hold_seconds, offline_sync_enabled)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    'ZENO_HOTEL_GUEST_IOT',
    'zenoSecure2026!IoT',
    'broker.emqx.io',
    1883,
    4,
    TRUE
)
ON CONFLICT (hotel_id) DO NOTHING;

-- 3. Insert Rooms
INSERT INTO public.rooms (hotel_id, room_number, floor, type, status, lock_id, lock_status, lock_battery, lock_signal) VALUES
('00000000-0000-0000-0000-000000000001', '101', 1, 'Standard', 'vacant', 'ESP32-L101', 'online', 98, -62),
('00000000-0000-0000-0000-000000000001', '102', 1, 'Deluxe', 'occupied', 'ESP32-L102', 'online', 85, -58),
('00000000-0000-0000-0000-000000000001', '103', 1, 'Standard', 'vacant', 'ESP32-L103', 'online', 92, -65),
('00000000-0000-0000-0000-000000000001', '104', 1, 'Deluxe', 'maintenance', 'ESP32-L104', 'warning', 22, -78),
('00000000-0000-0000-0000-000000000001', '201', 2, 'Executive Suite', 'vacant', 'ESP32-L201', 'online', 94, -60),
('00000000-0000-0000-0000-000000000001', '202', 2, 'Deluxe', 'occupied', 'ESP32-L202', 'online', 78, -54),
('00000000-0000-0000-0000-000000000001', '203', 2, 'Standard', 'vacant', 'ESP32-L203', 'online', 88, -68),
('00000000-0000-0000-0000-000000000001', '204', 2, 'Executive Suite', 'occupied', 'ESP32-L204', 'online', 91, -51),
('00000000-0000-0000-0000-000000000001', '205', 2, 'Standard', 'vacant', 'ESP32-L205', 'offline', 15, -85),
('00000000-0000-0000-0000-000000000001', '301', 3, 'Presidential Suite', 'occupied', 'ESP32-L301', 'online', 96, -48),
('00000000-0000-0000-0000-000000000001', '302', 3, 'Presidential Suite', 'vacant', 'ESP32-L302', 'online', 95, -55)
ON CONFLICT (hotel_id, room_number) DO NOTHING;

-- 4. Insert Initial Cards Inventory
INSERT INTO public.cards_inventory (hotel_id, uid, type, status, assigned_guest, assigned_room, batch_number) VALUES
('00000000-0000-0000-0000-000000000001', 'G-10247', 'Mifare Classic 1K', 'active', 'John Smith', '204', 'BATCH-2026-A'),
('00000000-0000-0000-0000-000000000001', 'G-10242', 'Mifare Classic 1K', 'active', 'Amina Uwase', '102', 'BATCH-2026-A'),
('00000000-0000-0000-0000-000000000001', 'G-10245', 'Mifare Classic 1K', 'active', 'David Miller', '202', 'BATCH-2026-A'),
('00000000-0000-0000-0000-000000000001', 'G-10250', 'Mifare Classic 1K', 'active', 'Elena Rostova', '301', 'BATCH-2026-A'),
('00000000-0000-0000-0000-000000000001', 'G-10251', 'Mifare Classic 1K', 'unassigned', NULL, NULL, 'BATCH-2026-B'),
('00000000-0000-0000-0000-000000000001', 'G-10252', 'Mifare Classic 1K', 'unassigned', NULL, NULL, 'BATCH-2026-B'),
('00000000-0000-0000-0000-000000000001', 'G-10253', 'Mifare Classic 1K', 'unassigned', NULL, NULL, 'BATCH-2026-B'),
('00000000-0000-0000-0000-000000000001', 'G-10254', 'Mifare Classic 1K', 'unassigned', NULL, NULL, 'BATCH-2026-B'),
('00000000-0000-0000-0000-000000000001', 'G-10219', 'Mifare Classic 1K', 'lost', 'Reported lost', 'Ex-Room 105', 'BATCH-2026-A'),
('00000000-0000-0000-0000-000000000001', 'G-10220', 'Mifare Classic 1K', 'blocked', 'Security Block', NULL, 'BATCH-2026-A')
ON CONFLICT (uid) DO NOTHING;

-- 5. Insert Initial Guests
INSERT INTO public.guests (hotel_id, name, room_number, check_in_date, check_out_date, id_number, phone, email, card_uid, status, vip_status) VALUES
('00000000-0000-0000-0000-000000000001', 'John Smith', '204', '2026-10-30', '2026-11-04', 'USA-9844201', '+1 (555) 234-5678', 'john.smith@example.com', 'G-10247', 'active', TRUE),
('00000000-0000-0000-0000-000000000001', 'Amina Uwase', '102', '2026-10-29', '2026-11-02', 'RWA-1199480029', '+250 788 123 456', 'amina.uwase@rwanda.tech', 'G-10242', 'active', FALSE),
('00000000-0000-0000-0000-000000000001', 'David Miller', '202', '2026-10-28', '2026-11-01', 'UK-7729188', '+44 7911 123456', 'dmiller@london.co.uk', 'G-10245', 'active', FALSE),
('00000000-0000-0000-0000-000000000001', 'Elena Rostova', '301', '2026-10-31', '2026-11-07', 'FR-8893120', '+33 6 12 34 56 78', 'elena.rostova@paris.fr', 'G-10250', 'active', TRUE);

-- Update Room states for initial guests
UPDATE public.rooms SET status = 'occupied', card_assigned = 'G-10247', current_guest = 'John Smith', last_access_time = timezone('utc'::text, now() - interval '3 minutes') WHERE room_number = '204';
UPDATE public.rooms SET status = 'occupied', card_assigned = 'G-10242', current_guest = 'Amina Uwase', last_access_time = timezone('utc'::text, now() - interval '10 minutes') WHERE room_number = '102';
UPDATE public.rooms SET status = 'occupied', card_assigned = 'G-10245', current_guest = 'David Miller', last_access_time = timezone('utc'::text, now() - interval '42 minutes') WHERE room_number = '202';
UPDATE public.rooms SET status = 'occupied', card_assigned = 'G-10250', current_guest = 'Elena Rostova', last_access_time = timezone('utc'::text, now() - interval '2 hours') WHERE room_number = '301';

-- 6. Insert Initial Access Logs
INSERT INTO public.access_logs (hotel_id, timestamp, room_number, card_uid, guest_name, status, reason, source, battery_status) VALUES
('00000000-0000-0000-0000-000000000001', timezone('utc'::text, now() - interval '3 minutes'), '204', 'G-10247', 'John Smith', 'UNLOCKED', 'Contactless Mifare 1K door unlock tap', 'RFID', 91),
('00000000-0000-0000-0000-000000000001', timezone('utc'::text, now() - interval '10 minutes'), '102', 'G-10242', 'Amina Uwase', 'UNLOCKED', 'Contactless Mifare 1K door unlock tap', 'RFID', 85),
('00000000-0000-0000-0000-000000000001', timezone('utc'::text, now() - interval '32 minutes'), '204', 'G-99999', 'Unknown Card', 'FAILED', 'Card not registered to Room 204', 'RFID', NULL),
('00000000-0000-0000-0000-000000000001', timezone('utc'::text, now() - interval '58 minutes'), '202', 'G-10245', 'David Miller', 'UNLOCKED', 'Contactless Mifare 1K door unlock tap', 'RFID', 78),
('00000000-0000-0000-0000-000000000001', timezone('utc'::text, now() - interval '2 hours'), '301', 'G-10250', 'Elena Rostova', 'UNLOCKED', 'Digital QR mobile pass authenticated', 'QR_BACKUP', 96),
('00000000-0000-0000-0000-000000000001', timezone('utc'::text, now() - interval '3 hours'), '205', 'G-10247', 'John Smith', 'FAILED', 'Invalid room authorization sector key', 'RFID', NULL);
