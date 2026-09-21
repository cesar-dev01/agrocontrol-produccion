-- Ejecutar una vez en Supabase: SQL Editor.
-- Las tablas quedan aisladas por usuario mediante Row Level Security (RLS).
create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default 'Administrador',
  farm_name text not null default '',
  currency text not null default 'PEN',
  timezone text not null default 'America/Lima',
  notifications_enabled boolean not null default true,
  theme text not null default 'light',
  created_at timestamptz not null default now()
);

alter table public.profiles add column if not exists farm_name text not null default '';
alter table public.profiles add column if not exists currency text not null default 'PEN';
alter table public.profiles add column if not exists timezone text not null default 'America/Lima';
alter table public.profiles add column if not exists notifications_enabled boolean not null default true;
alter table public.profiles add column if not exists theme text not null default 'light';

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
  product_id uuid references public.products(id) on delete set null,
  stage text not null check (stage in ('preparation','planting','care','harvest')),
  activity_type text not null check (activity_type in ('machinery','irrigation','labor','input','transport','other')),
  description text not null, started_at timestamptz not null default now(), ended_at timestamptz,
  quantity numeric(12,2), unit text, unit_cost numeric(12,2), total_cost numeric(12,2) not null default 0,
  created_at timestamptz not null default now()
);

-- Estas sentencias también actualizan proyectos que ya ejecutaron una versión anterior del esquema.
alter table public.activities add column if not exists product_id uuid references public.products(id) on delete set null;
alter table public.activities add column if not exists unit_cost numeric(12,2);
create index if not exists activities_product_id_idx on public.activities(product_id);

create or replace function public.sync_activity_product_stock()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  product_cost numeric(12,2);
  product_unit text;
begin
  if tg_op = 'UPDATE'
    and old.activity_type = 'input'
    and old.product_id is not null
    and new.activity_type = 'input'
    and new.product_id is null then
    raise exception 'No puedes eliminar un insumo que tiene movimientos asociados. Elimina primero esos movimientos.';
  end if;

  -- Al editar o eliminar un consumo, primero devuelve al inventario lo descontado anteriormente.
  if tg_op in ('UPDATE', 'DELETE')
    and old.activity_type = 'input'
    and old.product_id is not null
    and coalesce(old.quantity, 0) > 0 then
    update public.products
      set stock_quantity = stock_quantity + old.quantity
      where id = old.product_id and owner_id = old.owner_id;
  end if;

  if tg_op = 'DELETE' then return old; end if;

  if new.activity_type = 'input' then
    if new.product_id is null then
      raise exception 'Selecciona el insumo utilizado.';
    end if;
    if coalesce(new.quantity, 0) <= 0 then
      raise exception 'La cantidad utilizada debe ser mayor que cero.';
    end if;

    select unit_cost, stock_unit
      into product_cost, product_unit
      from public.products
      where id = new.product_id and owner_id = new.owner_id;

    if not found then
      raise exception 'El insumo seleccionado no existe o no pertenece al usuario.';
    end if;

    update public.products
      set stock_quantity = stock_quantity - new.quantity
      where id = new.product_id
        and owner_id = new.owner_id
        and stock_quantity >= new.quantity;

    if not found then
      raise exception 'Stock insuficiente para registrar este consumo.';
    end if;

    new.unit := product_unit;
    new.unit_cost := product_cost;
    new.total_cost := round(new.quantity * product_cost, 2);
  else
    new.product_id := null;
    new.unit_cost := null;
  end if;

  return new;
end;
$$;

drop trigger if exists sync_activity_product_stock_trigger on public.activities;
create trigger sync_activity_product_stock_trigger
before insert or update or delete on public.activities
for each row execute function public.sync_activity_product_stock();

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

-- Para proyectos nuevos, aplicar después las migraciones de supabase/migrations en orden.
