-- Ejecutar una vez en Supabase: SQL Editor.
-- Las tablas quedan aisladas por usuario mediante Row Level Security (RLS).
create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default 'Administrador',
  created_at timestamptz not null default now()
);

create or replace function public.create_profile()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', 'Administrador'));
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
for each row execute procedure public.create_profile();

create table if not exists public.fields (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null, area_hectares numeric(10,2), location text,
  created_at timestamptz not null default now()
);

create table if not exists public.crop_cycles (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  field_id uuid references public.fields(id) on delete set null,
  crop_name text not null, season text, started_on date not null,
  estimated_harvest_on date, harvested_on date,
  status text not null default 'planned' check (status in ('planned','preparation','growing','harvesting','closed')),
  created_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null, category text not null,
  stock_quantity numeric(12,2) not null default 0,
  stock_unit text not null default 'unidades',
  unit_cost numeric(12,2) not null default 0, photo_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.activities (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  crop_cycle_id uuid not null references public.crop_cycles(id) on delete cascade,
  stage text not null check (stage in ('preparation','planting','care','harvest')),
  activity_type text not null check (activity_type in ('machinery','irrigation','labor','input','transport','other')),
  description text not null, started_at timestamptz not null default now(), ended_at timestamptz,
  quantity numeric(12,2), unit text, total_cost numeric(12,2) not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.harvests (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  crop_cycle_id uuid not null references public.crop_cycles(id) on delete cascade,
  harvested_on date not null, quantity numeric(12,2) not null, unit text not null default 'kg',
  total_income numeric(12,2) not null default 0, notes text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.fields enable row level security;
alter table public.crop_cycles enable row level security;
alter table public.products enable row level security;
alter table public.activities enable row level security;
alter table public.harvests enable row level security;

grant usage on schema public to authenticated;
grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert, update, delete on public.fields to authenticated;
grant select, insert, update, delete on public.crop_cycles to authenticated;
grant select, insert, update, delete on public.products to authenticated;
grant select, insert, update, delete on public.activities to authenticated;
grant select, insert, update, delete on public.harvests to authenticated;

create policy "own profile" on public.profiles for all using (id = auth.uid()) with check (id = auth.uid());
create policy "own fields" on public.fields for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "own cycles" on public.crop_cycles for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "own products" on public.products for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "own activities" on public.activities for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "own harvests" on public.harvests for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do update set public = true;

create policy "upload own product photos" on storage.objects for insert to authenticated
with check (bucket_id = 'product-images' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "update own product photos" on storage.objects for update to authenticated
using (bucket_id = 'product-images' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "delete own product photos" on storage.objects for delete to authenticated
using (bucket_id = 'product-images' and (storage.foldername(name))[1] = auth.uid()::text);
