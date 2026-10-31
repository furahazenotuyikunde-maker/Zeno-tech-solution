-- Supabase migration: initial schema for ZENO TECH SOLUTION paywall
-- ---------------------------------------------------------------
-- 1. Hotels table (subscription info)
create table public.hotels (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_email text not null,
  subscription_status text not null default 'trialing', -- trialing | active | past_due | canceled
  plan text not null default 'starter',               -- starter | pro
  trial_ends_at timestamp without time zone not null default (now() + interval '7 days'),
  max_rooms integer not null default 2,
  created_at timestamp without time zone not null default now()
);

-- 2. Auth profiles (extends auth.users)
create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  hotel_id uuid references public.hotels(id) on delete cascade,
  role text not null check (role in ('admin','receptionist','technician')),
  is_active boolean not null default true,
  created_at timestamp without time zone not null default now()
);

-- 3. Rooms owned by a hotel
create table public.rooms (
  id uuid primary key default gen_random_uuid(),
  hotel_id uuid references public.hotels(id) on delete cascade,
  room_number text not null,
  esp32_id text,
  created_at timestamp without time zone not null default now()
);

-- 4. Access logs
create table public.access_logs (
  id uuid primary key default gen_random_uuid(),
  hotel_id uuid references public.hotels(id) on delete cascade,
  room_id uuid references public.rooms(id) on delete set null,
  card_uid text not null,
  created_at timestamp without time zone not null default now()
);

-- ---------------------------------------------------------------
-- Row‑Level Security (RLS) enable
alter table public.hotels enable row level security;
alter table public.profiles enable row level security;
alter table public.rooms enable row level security;
alter table public.access_logs enable row level security;

-- ---------------------------------------------------------------
-- Policies: Users can only see data belonging to their hotel
create policy "hotel access" on public.hotels
  using (auth.uid() = any (select id from auth.users where id = auth.uid()))
  with check (true);

create policy "profile access" on public.profiles
  using (hotel_id = (select hotel_id from public.profiles where id = auth.uid()))
  with check (hotel_id = (select hotel_id from public.profiles where id = auth.uid()));

create policy "rooms access" on public.rooms
  using (hotel_id = (select hotel_id from public.profiles where id = auth.uid()))
  with check (hotel_id = (select hotel_id from public.profiles where id = auth.uid()));

create policy "logs access" on public.access_logs
  using (hotel_id = (select hotel_id from public.profiles where id = auth.uid()))
  with check (hotel_id = (select hotel_id from public.profiles where id = auth.uid()));

-- ---------------------------------------------------------------
-- Subscription block policy – deny any operation when trial expired
create function public.is_subscription_active(p_hotel uuid) returns boolean language sql stable as $$
  select (subscription_status = 'active') or (subscription_status = 'trialing' and trial_ends_at > now())
  from public.hotels where id = p_hotel;
$$;

-- Apply to all tables: block inserts/updates/selects when inactive
create policy "block when inactive" on public.hotels using (public.is_subscription_active(id));
create policy "block when inactive" on public.profiles using (public.is_subscription_active((select hotel_id from public.profiles where id = auth.uid())));
create policy "block when inactive" on public.rooms using (public.is_subscription_active(hotel_id));
create policy "block when inactive" on public.access_logs using (public.is_subscription_active(hotel_id));

-- ---------------------------------------------------------------
-- Helper: set subscription status (callable from Edge functions / admin UI)
create function public.set_subscription(p_hotel uuid, p_status text, p_plan text, p_max_rooms int, p_trial_ends_at timestamp) returns void language plpgsql as $$
begin
  update public.hotels set
    subscription_status = p_status,
    plan = p_plan,
    max_rooms = p_max_rooms,
    trial_ends_at = p_trial_ends_at
  where id = p_hotel;
end;
$$;

-- ---------------------------------------------------------------
-- Trigger: enforce room limit on insert
create function public.enforce_room_limit() returns trigger language plpgsql as $$
declare _cnt int;
begin
  select count(*) into _cnt from public.rooms where hotel_id = NEW.hotel_id;
  if (select max_rooms from public.hotels where id = NEW.hotel_id) < _cnt + 1 then
    raise exception 'Room limit exceeded for this hotel (max %)', (select max_rooms from public.hotels where id = NEW.hotel_id);
  end if;
  return NEW;
end;
$$;

create trigger trg_enforce_room_limit
  before insert on public.rooms
  for each row execute function public.enforce_room_limit();

-- ---------------------------------------------------------------
-- End of migration
