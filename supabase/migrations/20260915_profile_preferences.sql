alter table public.profiles
  add column if not exists farm_name text not null default '',
  add column if not exists currency text not null default 'PEN',
  add column if not exists timezone text not null default 'America/Lima',
  add column if not exists notifications_enabled boolean not null default true,
  add column if not exists theme text not null default 'light';
