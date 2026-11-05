-- ============================================================
-- ZENO TECH SOLUTION – Supabase Subscription Enforcement Patch
-- Run this in the Supabase SQL Editor AFTER the initial schema.
-- Owner: tuyikundefzeno@gmail.com | +250 790 723 406
-- ============================================================

-- ── 1. Strengthen the subscription-block function ──────────────────────────
-- Drop old version first (if it exists)
drop function if exists public.is_subscription_active(uuid);

create or replace function public.is_subscription_active(p_hotel uuid)
  returns boolean
  language sql
  stable
  security definer
as $$
  select (
    (subscription_status = 'active') or
    (subscription_status = 'trialing' and trial_ends_at > now())
  )
  from public.hotels
  where id = p_hotel
  limit 1;
$$;

-- ── 2. Rooms SELECT returns 0 rows when subscription expired ──────────────
-- Drop old policies first
drop policy if exists "rooms access" on public.rooms;
drop policy if exists "block when inactive" on public.rooms;

-- Combined policy: tenant isolation + subscription gate
create policy "rooms: tenant + active sub only"
  on public.rooms
  for all
  using (
    hotel_id = (select hotel_id from public.profiles where id = auth.uid())
    and public.is_subscription_active(hotel_id)
  )
  with check (
    hotel_id = (select hotel_id from public.profiles where id = auth.uid())
    and public.is_subscription_active(hotel_id)
  );

-- ── 3. Access logs SELECT returns 0 rows when expired ────────────────────
drop policy if exists "logs access" on public.access_logs;
drop policy if exists "block when inactive" on public.access_logs;

create policy "logs: tenant + active sub only"
  on public.access_logs
  for all
  using (
    hotel_id = (select hotel_id from public.profiles where id = auth.uid())
    and public.is_subscription_active(hotel_id)
  )
  with check (
    hotel_id = (select hotel_id from public.profiles where id = auth.uid())
    and public.is_subscription_active(hotel_id)
  );

-- ── 4. Profiles: same gate ────────────────────────────────────────────────
drop policy if exists "profile access" on public.profiles;
drop policy if exists "block when inactive" on public.profiles;

create policy "profiles: tenant + active sub only"
  on public.profiles
  for all
  using (
    hotel_id = (select hotel_id from public.profiles where id = auth.uid())
    and public.is_subscription_active(
      (select hotel_id from public.profiles where id = auth.uid())
    )
  )
  with check (
    hotel_id = (select hotel_id from public.profiles where id = auth.uid())
    and public.is_subscription_active(
      (select hotel_id from public.profiles where id = auth.uid())
    )
  );

-- ── 5. Reminders table for cron job logging ───────────────────────────────
create table if not exists public.reminders (
  id            uuid primary key default gen_random_uuid(),
  hotel_id      uuid references public.hotels(id) on delete cascade,
  type          text not null check (type in ('expiring_soon', 'expired')),
  days_left     integer not null default 0,
  message       text,
  sent_via      text default 'log', -- 'log' | 'whatsapp' | 'email'
  created_at    timestamp without time zone not null default now()
);

alter table public.reminders enable row level security;

-- Admin can see all; hotel owners see their own
create policy "reminders: admin or own hotel"
  on public.reminders
  for select
  using (
    auth.email() = 'tuyikundefzeno@gmail.com' or
    hotel_id = (select hotel_id from public.profiles where id = auth.uid())
  );

-- ── 6. Helper: admin can mark hotel as paid ───────────────────────────────
create or replace function public.admin_activate_hotel(
  p_hotel    uuid,
  p_plan     text,
  p_max_rooms int
)
  returns void
  language plpgsql
  security definer
as $$
begin
  -- Only the designated admin email can call this
  if auth.email() != 'tuyikundefzeno@gmail.com' then
    raise exception 'Unauthorized: admin only';
  end if;

  update public.hotels
  set
    subscription_status = 'active',
    plan = p_plan,
    max_rooms = p_max_rooms,
    trial_ends_at = now() + interval '365 days'
  where id = p_hotel;
end;
$$;

-- ── 7. Helper: admin can ban / cancel a hotel ─────────────────────────────
create or replace function public.admin_ban_hotel(p_hotel uuid)
  returns void
  language plpgsql
  security definer
as $$
begin
  if auth.email() != 'tuyikundefzeno@gmail.com' then
    raise exception 'Unauthorized: admin only';
  end if;
  update public.hotels set subscription_status = 'canceled' where id = p_hotel;
end;
$$;

-- ── 8. ESP32 subscription check (no auth required – public RPC) ──────────
create or replace function public.esp32_check_sub(p_hotel uuid)
  returns json
  language plpgsql
  security definer
as $$
declare
  _hotel public.hotels%rowtype;
  _allowed boolean;
begin
  select * into _hotel from public.hotels where id = p_hotel limit 1;
  if not found then
    return json_build_object('allowed', false, 'expired', true, 'error', 'hotel not found');
  end if;

  _allowed := (
    _hotel.subscription_status = 'active' or
    (_hotel.subscription_status = 'trialing' and _hotel.trial_ends_at > now())
  );

  return json_build_object(
    'allowed', _allowed,
    'expired', not _allowed,
    'subscription_status', _hotel.subscription_status,
    'trial_ends_at', _hotel.trial_ends_at,
    'contact', '0790723406',
    'email', 'tuyikundefzeno@gmail.com'
  );
end;
$$;

-- ── End of patch ─────────────────────────────────────────────────────────
