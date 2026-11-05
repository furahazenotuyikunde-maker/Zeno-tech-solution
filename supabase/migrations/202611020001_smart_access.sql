-- Smart Access SaaS schema. Keeps the existing hotels and rooms tables intact.
alter table public.hotels
  alter column trial_ends_at set default (now() + interval '14 days');

create table if not exists public.hotel_users (
  id uuid primary key default gen_random_uuid(),
  hotel_id uuid not null references public.hotels(id) on delete cascade,
  auth_user_id uuid unique references auth.users(id) on delete cascade,
  email text not null,
  role text not null check (role in ('manager', 'receptionist', 'electrician')),
  created_at timestamptz not null default now(),
  unique (hotel_id, email)
);

insert into public.hotel_users (hotel_id, auth_user_id, email, role)
select p.hotel_id,
       p.id,
       coalesce(u.email, ''),
       case p.role
         when 'admin' then 'manager'
         when 'technician' then 'electrician'
         else 'receptionist'
       end
from public.profiles p
join auth.users u on u.id = p.id
where p.hotel_id is not null
  and p.is_active = true
  and p.role in ('admin', 'receptionist', 'technician')
on conflict (auth_user_id) do nothing;

create unique index if not exists rooms_hotel_room_number_key
  on public.rooms (hotel_id, room_number);

create or replace function public.enforce_room_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  room_limit integer;
  room_count integer;
  hotel_status text;
begin
  select max_rooms, subscription_status
  into room_limit, hotel_status
  from public.hotels
  where id = new.hotel_id
  for update;

  if not found then
    raise exception 'Hotel not found';
  end if;

  if hotel_status = 'trialing' then
    room_limit := least(coalesce(room_limit, 2), 2);
  end if;

  select count(*) into room_count
  from public.rooms
  where hotel_id = new.hotel_id;

  if room_count >= room_limit then
    raise exception 'Room limit exceeded for this hotel (max %)', room_limit;
  end if;

  return new;
end;
$$;

create table if not exists public.cards (
  id uuid primary key default gen_random_uuid(),
  hotel_id uuid not null references public.hotels(id) on delete cascade,
  uid text not null unique,
  room_number text not null,
  guest_name text not null,
  starts_at timestamptz not null default now(),
  client_request_id uuid unique,
  is_active boolean not null default true,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.access_logs
  add column if not exists uid text,
  add column if not exists reader_id text,
  add column if not exists room_number text,
  add column if not exists allowed boolean,
  add column if not exists reason text,
  add column if not exists guest_name text;

update public.access_logs
set uid = coalesce(uid, card_uid),
    allowed = coalesce(allowed, false),
    room_number = coalesce(room_number, (select room_number from public.rooms where rooms.id = access_logs.room_id))
where uid is null or allowed is null or room_number is null;

alter table public.access_logs
  alter column uid set not null,
  alter column allowed set not null;

create table if not exists public.readers (
  id uuid primary key default gen_random_uuid(),
  hotel_id uuid not null references public.hotels(id) on delete cascade,
  reader_id text not null,
  room_number text not null,
  last_ping_at timestamptz,
  battery integer check (battery between 0 and 100),
  rssi integer,
  unique (hotel_id, reader_id)
);

insert into public.readers (hotel_id, reader_id, room_number)
select hotel_id, esp32_id, room_number
from public.rooms
where hotel_id is not null and esp32_id is not null
on conflict (hotel_id, reader_id) do nothing;

create table if not exists public.master_cards (
  id uuid primary key default gen_random_uuid(),
  hotel_id uuid not null references public.hotels(id) on delete cascade,
  uid text not null unique,
  type text not null check (type in ('manager', 'cleaner')),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.guest_keys (
  id uuid primary key default gen_random_uuid(),
  hotel_id uuid not null references public.hotels(id) on delete cascade,
  card_id uuid not null references public.cards(id) on delete cascade,
  uid text not null unique,
  room_number text not null,
  guest_name text not null,
  is_active boolean not null default true,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table if not exists public.hardware_commands (
  id uuid primary key default gen_random_uuid(),
  hotel_id uuid not null references public.hotels(id) on delete cascade,
  reader_id text not null,
  command text not null check (command in ('remote_open_test', 'reboot', 'update_wifi')),
  encrypted_payload jsonb,
  status text not null default 'pending' check (status in ('pending', 'delivered', 'completed', 'failed')),
  created_at timestamptz not null default now()
);

create table if not exists public.access_log_guest_details (
  access_log_id uuid primary key references public.access_logs(id) on delete cascade,
  hotel_id uuid not null references public.hotels(id) on delete cascade,
  guest_name text not null
);

insert into public.access_log_guest_details (access_log_id, hotel_id, guest_name)
select id, hotel_id, guest_name
from public.access_logs
where guest_name is not null and hotel_id is not null
on conflict (access_log_id) do nothing;

update public.access_logs
set guest_name = null
where guest_name is not null;

create index if not exists access_logs_hotel_created_idx
  on public.access_logs (hotel_id, created_at desc);
create index if not exists cards_hotel_active_expiry_idx
  on public.cards (hotel_id, is_active, expires_at);
create index if not exists readers_hotel_ping_idx
  on public.readers (hotel_id, last_ping_at desc);

create or replace function public.current_hotel_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select hotel_id from public.hotel_users
  where auth_user_id = auth.uid()
  limit 1
$$;

create or replace function public.current_hotel_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.hotel_users
  where auth_user_id = auth.uid()
  limit 1
$$;

create or replace function public.is_hotel_subscription_active(p_hotel uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    subscription_status = 'active' or
    (subscription_status = 'trialing' and trial_ends_at > now()),
    false
  )
  from public.hotels
  where id = p_hotel
$$;

revoke all on function public.current_hotel_id() from public;
revoke all on function public.current_hotel_role() from public;
grant execute on function public.current_hotel_id() to authenticated;
grant execute on function public.current_hotel_role() to authenticated;
revoke all on function public.is_hotel_subscription_active(uuid) from public, anon, authenticated;
grant execute on function public.is_hotel_subscription_active(uuid) to authenticated;
revoke all on function public.is_subscription_active(uuid) from public, anon, authenticated;
revoke all on function public.esp32_check_sub(uuid) from public, anon, authenticated;

alter table public.hotel_users enable row level security;
alter table public.rooms enable row level security;
alter table public.cards enable row level security;
alter table public.access_logs enable row level security;
alter table public.readers enable row level security;
alter table public.master_cards enable row level security;
alter table public.guest_keys enable row level security;
alter table public.hardware_commands enable row level security;
alter table public.access_log_guest_details enable row level security;
alter table public.hotels enable row level security;
alter table public.profiles enable row level security;

drop policy if exists "hotel access" on public.hotels;
drop policy if exists "block when inactive" on public.hotels;
drop policy if exists "profile access" on public.profiles;
drop policy if exists "profiles: tenant + active sub only" on public.profiles;
drop policy if exists "block when inactive" on public.profiles;
drop policy if exists "rooms access" on public.rooms;
drop policy if exists "rooms: tenant + active sub only" on public.rooms;
drop policy if exists "block when inactive" on public.rooms;
drop policy if exists "logs access" on public.access_logs;
drop policy if exists "logs: tenant + active sub only" on public.access_logs;
drop policy if exists "block when inactive" on public.access_logs;

create policy "hotel members can read their hotel"
  on public.hotels for select to authenticated
  using (id = public.current_hotel_id());
create policy "users can read their own profile and managers their team"
  on public.profiles for select to authenticated
  using (
    id = auth.uid() or
    (hotel_id = public.current_hotel_id() and public.current_hotel_role() = 'manager')
  );

create policy "hotel users can read their own membership"
  on public.hotel_users for select to authenticated
  using (auth_user_id = auth.uid() or
    (hotel_id = public.current_hotel_id() and public.current_hotel_role() = 'manager'));
create policy "managers can manage hotel memberships"
  on public.hotel_users for all to authenticated
  using (hotel_id = public.current_hotel_id() and public.current_hotel_role() = 'manager')
  with check (hotel_id = public.current_hotel_id() and public.current_hotel_role() = 'manager');

create policy "hotel members can read rooms"
  on public.rooms for select to authenticated
  using (hotel_id = public.current_hotel_id() and public.is_hotel_subscription_active(hotel_id));
create policy "managers can manage rooms"
  on public.rooms for all to authenticated
  using (hotel_id = public.current_hotel_id() and public.current_hotel_role() = 'manager' and public.is_hotel_subscription_active(hotel_id))
  with check (hotel_id = public.current_hotel_id() and public.current_hotel_role() = 'manager' and public.is_hotel_subscription_active(hotel_id));

create policy "managers and receptionists can read active cards"
  on public.cards for select to authenticated
  using (hotel_id = public.current_hotel_id() and public.current_hotel_role() in ('manager', 'receptionist') and public.is_hotel_subscription_active(hotel_id));
create policy "managers and receptionists can issue active cards"
  on public.cards for insert to authenticated
  with check (hotel_id = public.current_hotel_id() and public.current_hotel_role() in ('manager', 'receptionist') and public.is_hotel_subscription_active(hotel_id));
create policy "managers and receptionists can revoke cards"
  on public.cards for update to authenticated
  using (hotel_id = public.current_hotel_id() and public.current_hotel_role() in ('manager', 'receptionist'))
  with check (hotel_id = public.current_hotel_id() and public.current_hotel_role() in ('manager', 'receptionist'));
revoke update on table public.cards from authenticated;
grant update (is_active) on table public.cards to authenticated;

create policy "hotel members can read access logs"
  on public.access_logs for select to authenticated
  using (hotel_id = public.current_hotel_id() and public.is_hotel_subscription_active(hotel_id));
create policy "hotel members can create access logs"
  on public.access_logs for insert to authenticated
  with check (hotel_id = public.current_hotel_id() and public.is_hotel_subscription_active(hotel_id));
create policy "managers and receptionists can read guest log details"
  on public.access_log_guest_details for select to authenticated
  using (hotel_id = public.current_hotel_id() and public.current_hotel_role() in ('manager', 'receptionist') and public.is_hotel_subscription_active(hotel_id));

create policy "managers and electricians can read readers"
  on public.readers for select to authenticated
  using (hotel_id = public.current_hotel_id() and public.current_hotel_role() in ('manager', 'electrician') and public.is_hotel_subscription_active(hotel_id));
create policy "managers can manage readers"
  on public.readers for all to authenticated
  using (hotel_id = public.current_hotel_id() and public.current_hotel_role() = 'manager' and public.is_hotel_subscription_active(hotel_id))
  with check (hotel_id = public.current_hotel_id() and public.current_hotel_role() = 'manager' and public.is_hotel_subscription_active(hotel_id));

create policy "managers can read master cards"
  on public.master_cards for select to authenticated
  using (hotel_id = public.current_hotel_id() and public.current_hotel_role() = 'manager' and public.is_hotel_subscription_active(hotel_id));
create policy "managers can manage master cards"
  on public.master_cards for all to authenticated
  using (hotel_id = public.current_hotel_id() and public.current_hotel_role() = 'manager' and public.is_hotel_subscription_active(hotel_id))
  with check (hotel_id = public.current_hotel_id() and public.current_hotel_role() = 'manager' and public.is_hotel_subscription_active(hotel_id));

create policy "hotel members can read guest keys"
  on public.guest_keys for select to authenticated
  using (hotel_id = public.current_hotel_id() and public.current_hotel_role() in ('manager', 'receptionist') and public.is_hotel_subscription_active(hotel_id));
create policy "managers and receptionists can manage guest keys"
  on public.guest_keys for all to authenticated
  using (hotel_id = public.current_hotel_id() and public.current_hotel_role() in ('manager', 'receptionist') and public.is_hotel_subscription_active(hotel_id))
  with check (hotel_id = public.current_hotel_id() and public.current_hotel_role() in ('manager', 'receptionist') and public.is_hotel_subscription_active(hotel_id));

create policy "managers and electricians can read hardware commands"
  on public.hardware_commands for select to authenticated
  using (hotel_id = public.current_hotel_id() and public.current_hotel_role() in ('manager', 'electrician') and public.is_hotel_subscription_active(hotel_id));

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'access_logs'
  ) then
    alter publication supabase_realtime add table public.access_logs;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'access_log_guest_details'
  ) then
    alter publication supabase_realtime add table public.access_log_guest_details;
  end if;
end
$$;
