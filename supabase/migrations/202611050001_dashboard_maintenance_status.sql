alter table public.readers
  add column if not exists maintenance_status text not null default 'open';
