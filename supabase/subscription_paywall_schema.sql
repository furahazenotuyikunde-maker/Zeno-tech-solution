-- ==============================================================================
-- ZENO TECH SOLUTION - Smart Access Systems
-- Subscription & Paywall Enforcement Schema for Supabase (PostgreSQL)
-- Includes:
--   1. Hotels table (subscription_status, plan, trial_ends_at, max_rooms)
--   2. Profiles table (auth.users linkage, hotel_id, role, is_active)
--   3. Rooms & Access Logs tables with esp32_id
--   4. RLS Policies: Tenant isolation + Hard Subscription Lockout
--   5. Room creation limit validation trigger (Max 2 rooms on trial)
--   6. Self-signup abuse prevention trigger (auto-provisions 7-day trial)
-- ==============================================================================

-- 1. Enable Required Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 2. CREATE CORE TABLES
-- ==============================================================================

-- Table: hotels (SaaS Tenancy, Plan & Paywall Status)
CREATE TABLE IF NOT EXISTS public.hotels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    owner_email TEXT NOT NULL,
    subscription_status TEXT NOT NULL DEFAULT 'trialing' 
        CHECK (subscription_status IN ('trialing', 'active', 'past_due', 'canceled')),
    plan TEXT NOT NULL DEFAULT 'trial' 
        CHECK (plan IN ('trial', 'starter', 'pro')),
    trial_ends_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days'),
    max_rooms INTEGER NOT NULL DEFAULT 2,
    currency TEXT NOT NULL DEFAULT 'USD',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Table: profiles (Staff accounts linked to auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    hotel_id UUID NOT NULL REFERENCES public.hotels(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'admin' 
        CHECK (role IN ('admin', 'receptionist', 'technician')),
    is_active BOOLEAN NOT NULL DEFAULT true,
    email TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Table: rooms (Hotel Rooms mapped to ESP32 Hardware Controllers)
CREATE TABLE IF NOT EXISTS public.rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hotel_id UUID NOT NULL REFERENCES public.hotels(id) ON DELETE CASCADE,
    room_number TEXT NOT NULL,
    esp32_id TEXT NOT NULL, -- e.g. 'ESP32-L204'
    floor INTEGER NOT NULL DEFAULT 1,
    type TEXT NOT NULL DEFAULT 'Standard' 
        CHECK (type IN ('Standard', 'Deluxe', 'Executive Suite', 'Presidential Suite')),
    status TEXT NOT NULL DEFAULT 'vacant' 
        CHECK (status IN ('vacant', 'occupied', 'maintenance')),
    card_assigned TEXT,
    current_guest TEXT,
    lock_status TEXT NOT NULL DEFAULT 'online' 
        CHECK (lock_status IN ('online', 'offline', 'warning')),
    lock_battery INTEGER NOT NULL DEFAULT 100 CHECK (lock_battery BETWEEN 0 AND 100),
    lock_signal INTEGER NOT NULL DEFAULT -55,
    last_access_time TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT unique_hotel_room_number UNIQUE (hotel_id, room_number),
    CONSTRAINT unique_hotel_esp32 UNIQUE (hotel_id, esp32_id)
);

-- Table: access_logs (Door entry audit trail)
CREATE TABLE IF NOT EXISTS public.access_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hotel_id UUID NOT NULL REFERENCES public.hotels(id) ON DELETE CASCADE,
    room_id UUID REFERENCES public.rooms(id) ON DELETE SET NULL,
    room_number TEXT NOT NULL,
    card_uid TEXT NOT NULL,
    guest_name TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('UNLOCKED', 'FAILED')),
    reason TEXT,
    source TEXT NOT NULL DEFAULT 'RFID' 
        CHECK (source IN ('RFID', 'QR_BACKUP', 'RECEPTION_REMOTE')),
    battery_status INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ==============================================================================
-- 3. HELPER FUNCTIONS FOR RLS & SUBSCRIPTION CHECK
-- ==============================================================================

-- Helper: Get hotel_id of current authenticated user
CREATE OR REPLACE FUNCTION public.get_user_hotel_id()
RETURNS UUID AS $$
    SELECT hotel_id FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper: Check if user is Super Admin (Platform Owner)
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN (
        auth.jwt() ->> 'email' = 'admin@zenotech.rw'
        OR auth.jwt() ->> 'email' = 'habimana@zenotech.rw'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Helper: Check if hotel subscription is currently valid (Active OR Trial not expired)
CREATE OR REPLACE FUNCTION public.is_subscription_valid(target_hotel_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    hotel_record RECORD;
BEGIN
    SELECT subscription_status, trial_ends_at INTO hotel_record
    FROM public.hotels
    WHERE id = target_hotel_id;

    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;

    -- Active subscription always allowed
    IF hotel_record.subscription_status = 'active' THEN
        RETURN TRUE;
    END IF;

    -- If canceled or past_due, immediately block
    IF hotel_record.subscription_status IN ('canceled', 'past_due') THEN
        RETURN FALSE;
    END IF;

    -- If trialing, allowed ONLY if now() < trial_ends_at
    IF hotel_record.subscription_status = 'trialing' AND hotel_record.trial_ends_at > timezone('utc'::text, now()) THEN
        RETURN TRUE;
    END IF;

    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ==============================================================================
-- 4. ROW LEVEL SECURITY (RLS) POLICIES
-- Policy 1: users only see where hotel_id = their profile hotel_id
-- Policy 2: block all queries if hotel subscription_status != active AND trial_ends_at < now()
-- (Super admins bypass all restrictions)
-- ==============================================================================

ALTER TABLE public.hotels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.access_logs ENABLE ROW LEVEL SECURITY;

-- HOTELS RLS
DROP POLICY IF EXISTS "Hotels Tenant Isolation & Paywall Policy" ON public.hotels;
CREATE POLICY "Hotels Tenant Isolation & Paywall Policy"
ON public.hotels
FOR ALL
USING (
    public.is_super_admin()
    OR (
        id = public.get_user_hotel_id()
        -- Users can still read their hotel details to see trial status or billing
    )
);

-- PROFILES RLS
DROP POLICY IF EXISTS "Profiles Isolation Policy" ON public.profiles;
CREATE POLICY "Profiles Isolation Policy"
ON public.profiles
FOR ALL
USING (
    public.is_super_admin()
    OR hotel_id = public.get_user_hotel_id()
);

-- ROOMS RLS (Strict Paywall: Block read/write if subscription expired)
DROP POLICY IF EXISTS "Rooms Tenant Isolation & Paywall Policy" ON public.rooms;
CREATE POLICY "Rooms Tenant Isolation & Paywall Policy"
ON public.rooms
FOR ALL
USING (
    public.is_super_admin()
    OR (
        hotel_id = public.get_user_hotel_id()
        AND public.is_subscription_valid(hotel_id)
    )
)
WITH CHECK (
    public.is_super_admin()
    OR (
        hotel_id = public.get_user_hotel_id()
        AND public.is_subscription_valid(hotel_id)
    )
);

-- ACCESS LOGS RLS (Strict Paywall: Block read/write if subscription expired)
DROP POLICY IF EXISTS "Access Logs Isolation & Paywall Policy" ON public.access_logs;
CREATE POLICY "Access Logs Isolation & Paywall Policy"
ON public.access_logs
FOR ALL
USING (
    public.is_super_admin()
    OR (
        hotel_id = public.get_user_hotel_id()
        AND public.is_subscription_valid(hotel_id)
    )
)
WITH CHECK (
    public.is_super_admin()
    OR (
        hotel_id = public.get_user_hotel_id()
        AND public.is_subscription_valid(hotel_id)
    )
);

-- ==============================================================================
-- 5. ROOM CREATION LIMIT VALIDATION TRIGGER
-- (If rooms count >= hotel.max_rooms and status trialing, reject insert)
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.check_room_limit_before_insert()
RETURNS TRIGGER AS $$
DECLARE
    h_max_rooms INTEGER;
    h_status TEXT;
    current_count INTEGER;
BEGIN
    SELECT max_rooms, subscription_status INTO h_max_rooms, h_status
    FROM public.hotels
    WHERE id = NEW.hotel_id;

    SELECT COUNT(*) INTO current_count
    FROM public.rooms
    WHERE hotel_id = NEW.hotel_id;

    -- Enforce limit if trialing or current_count exceeds max_rooms
    IF current_count >= h_max_rooms THEN
        RAISE EXCEPTION 'Room limit exceeded. Current plan allows a maximum of % rooms. Please upgrade your subscription on the billing page.', h_max_rooms
            USING ERRCODE = 'ZENO1';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_enforce_room_limit ON public.rooms;
CREATE TRIGGER trigger_enforce_room_limit
BEFORE INSERT ON public.rooms
FOR EACH ROW EXECUTE FUNCTION public.check_room_limit_before_insert();

-- ==============================================================================
-- 6. SELF-SIGNUP ABUSE PREVENTION & AUTOMATIC HOTEL PROVISIONING
-- (On auth.users signup -> create Hotel + Profile with 7-day trial & max_rooms=2)
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user_signup()
RETURNS TRIGGER AS $$
DECLARE
    new_hotel_id UUID;
    hotel_name_input TEXT;
BEGIN
    hotel_name_input := COALESCE(NEW.raw_user_meta_data->>'hotel_name', split_part(NEW.email, '@', 1) || ' Hotel');

    -- 1. Create Hotel with strict 7-day trial and 2-room cap
    INSERT INTO public.hotels (
        name,
        owner_email,
        subscription_status,
        plan,
        trial_ends_at,
        max_rooms,
        currency
    ) VALUES (
        hotel_name_input,
        NEW.email,
        'trialing',
        'trial',
        timezone('utc'::text, now() + interval '7 days'),
        2,
        'USD'
    ) RETURNING id INTO new_hotel_id;

    -- 2. Create User Profile with admin role
    INSERT INTO public.profiles (
        id,
        hotel_id,
        role,
        is_active,
        email
    ) VALUES (
        NEW.id,
        new_hotel_id,
        'admin',
        true,
        NEW.email
    );

    -- 3. Provision 2 default sample rooms within the free trial limit
    INSERT INTO public.rooms (hotel_id, room_number, esp32_id, floor, type, status)
    VALUES 
        (new_hotel_id, '101', 'ESP32-' || substr(md5(random()::text), 1, 6), 1, 'Standard', 'vacant'),
        (new_hotel_id, '102', 'ESP32-' || substr(md5(random()::text), 1, 6), 1, 'Deluxe', 'vacant');

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Hook into auth.users (runs automatically when someone signs up via Supabase Auth)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_signup();

-- ==============================================================================
-- 7. INITIAL SEED DATA FOR DEMO & TESTING
-- ==============================================================================

-- 1. Trialing Hotel (Active 5 days remaining, max 2 rooms)
INSERT INTO public.hotels (
    id, name, owner_email, subscription_status, plan, trial_ends_at, max_rooms
) VALUES (
    '00000000-0000-0000-0000-000000000001',
    'Grand Serena Hotel & Suites',
    'manager@grandserena.rw',
    'trialing',
    'trial',
    timezone('utc'::text, now() + interval '5 days 14 hours'),
    2
) ON CONFLICT (id) DO UPDATE SET
    subscription_status = EXCLUDED.subscription_status,
    plan = EXCLUDED.plan,
    trial_ends_at = EXCLUDED.trial_ends_at,
    max_rooms = EXCLUDED.max_rooms;

-- 2. Expired Hotel (Trial expired 2 days ago, locked out)
INSERT INTO public.hotels (
    id, name, owner_email, subscription_status, plan, trial_ends_at, max_rooms
) VALUES (
    '00000000-0000-0000-0000-000000000002',
    'Kigali Marriott Express',
    'stay@kigalimarriott.rw',
    'trialing',
    'trial',
    timezone('utc'::text, now() - interval '2 days 4 hours'),
    2
) ON CONFLICT (id) DO UPDATE SET
    subscription_status = EXCLUDED.subscription_status,
    trial_ends_at = EXCLUDED.trial_ends_at;

-- 3. Active Paid Hotel (Pro Plan $50/mo, 50 rooms)
INSERT INTO public.hotels (
    id, name, owner_email, subscription_status, plan, trial_ends_at, max_rooms
) VALUES (
    '00000000-0000-0000-0000-000000000003',
    'Lake Kivu Serena Resort',
    'finance@lakekivu.rw',
    'active',
    'pro',
    timezone('utc'::text, now() + interval '365 days'),
    50
) ON CONFLICT (id) DO UPDATE SET
    subscription_status = EXCLUDED.subscription_status,
    plan = EXCLUDED.plan,
    max_rooms = EXCLUDED.max_rooms;
