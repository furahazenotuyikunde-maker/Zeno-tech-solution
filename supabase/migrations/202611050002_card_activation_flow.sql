alter table public.cards
  alter column uid drop not null,
  add column if not exists status text,
  add column if not exists phone text,
  add column if not exists passport_number text,
  add column if not exists valid_from timestamptz,
  add column if not exists valid_until timestamptz,
  add column if not exists created_by uuid references auth.users(id);

update public.cards
set status = case
      when not is_active then 'expired'
      when expires_at is not null and expires_at <= now() then 'expired'
      else 'active'
    end
where status is null;

update public.cards set valid_from = starts_at where valid_from is null;
update public.cards set valid_until = expires_at where valid_until is null and expires_at is not null;

alter table public.cards
  alter column status set default 'pending',
  alter column status set not null,
  alter column valid_from set default now(),
  alter column valid_from set not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'cards_status_check'
      and conrelid = 'public.cards'::regclass
  ) then
    alter table public.cards
      add constraint cards_status_check
      check (status in ('pending', 'active', 'expired', 'blocked'));
  end if;

end
$$;

create index if not exists cards_hotel_status_created_idx
  on public.cards (hotel_id, status, created_at desc);
