-- Historial de inventario. Ejecutar una vez en SQL Editor antes de publicar la interfaz.
create schema if not exists private;

alter table public.products add column if not exists archived_at timestamptz;

create table if not exists public.inventory_events (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  activity_id uuid references public.activities(id) on delete set null deferrable initially deferred,
  event_type text not null check (event_type in ('opening', 'purchase', 'adjustment_in', 'adjustment_out', 'return_in', 'return_out', 'consumption', 'consumption_reversal')),
  quantity_delta numeric(12,2) not null check (quantity_delta <> 0),
  balance_after numeric(12,2) not null check (balance_after >= 0),
  unit_cost numeric(12,2) check (unit_cost >= 0),
  note text,
  occurred_on date not null default current_date,
  created_at timestamptz not null default now()
);

create index if not exists inventory_events_owner_product_idx on public.inventory_events(owner_id, product_id, created_at desc);
alter table public.inventory_events enable row level security;
revoke all on public.inventory_events from anon, authenticated;
grant select on public.inventory_events to authenticated;
drop policy if exists "read own inventory events" on public.inventory_events;
create policy "read own inventory events" on public.inventory_events for select to authenticated using (owner_id = auth.uid());

-- Los insumos se archivan, no se borran: así sus consumos y existencias conservan historial.
revoke delete on public.products from authenticated;

create or replace function private.apply_inventory_delta(
  p_product_id uuid, p_owner_id uuid, p_event_type text, p_delta numeric,
  p_occurred_on date, p_note text, p_activity_id uuid, p_unit_cost numeric
) returns public.inventory_events
language plpgsql security definer set search_path = '' as $$
declare
  v_product public.products%rowtype;
  v_event public.inventory_events%rowtype;
  v_balance numeric(12,2);
  v_previous_setting text;
begin
  if p_owner_id is null or p_owner_id <> auth.uid() then
    raise exception 'No tienes permiso para modificar este inventario.';
  end if;
  if p_event_type not in ('purchase', 'adjustment_in', 'adjustment_out', 'return_in', 'return_out', 'consumption', 'consumption_reversal') then
    raise exception 'Tipo de movimiento de inventario inválido.';
  end if;
  if p_delta is null or p_delta = 0 or p_delta <> round(p_delta, 2) then
    raise exception 'La cantidad debe ser mayor que cero y tener como máximo dos decimales.';
  end if;
  if p_unit_cost is not null and (p_unit_cost < 0 or p_unit_cost <> round(p_unit_cost, 2)) then
    raise exception 'El costo unitario debe ser válido.';
  end if;
  if (p_event_type in ('purchase', 'adjustment_in', 'return_in', 'consumption_reversal') and p_delta < 0)
    or (p_event_type in ('adjustment_out', 'return_out', 'consumption') and p_delta > 0) then
    raise exception 'La dirección de la cantidad no corresponde al tipo seleccionado.';
  end if;

  select * into v_product from public.products
    where id = p_product_id and owner_id = p_owner_id for update;
  if not found then raise exception 'El insumo no existe o no te pertenece.'; end if;
  if v_product.archived_at is not null and p_event_type not in ('consumption_reversal', 'consumption') then
    raise exception 'Restaura el insumo archivado antes de modificar sus existencias.';
  end if;
  v_balance := v_product.stock_quantity + p_delta;
  if v_balance < 0 then raise exception 'Stock insuficiente para esta salida.'; end if;

  v_previous_setting := current_setting('app.inventory_internal', true);
  perform set_config('app.inventory_internal', 'true', true);
  update public.products set
    stock_quantity = v_balance,
    unit_cost = case when p_event_type = 'purchase' and p_unit_cost is not null then p_unit_cost else unit_cost end
    where id = p_product_id;
  perform set_config('app.inventory_internal', coalesce(v_previous_setting, ''), true);

  insert into public.inventory_events
    (owner_id, product_id, activity_id, event_type, quantity_delta, balance_after, unit_cost, note, occurred_on)
  values
    (p_owner_id, p_product_id, p_activity_id, p_event_type, p_delta, v_balance,
     coalesce(p_unit_cost, v_product.unit_cost), nullif(trim(p_note), ''), coalesce(p_occurred_on, current_date))
  returning * into v_event;
  return v_event;
end;
$$;

create or replace function public.record_inventory_change(
  p_product_id uuid, p_kind text, p_quantity numeric, p_occurred_on date,
  p_note text, p_unit_cost numeric
) returns public.inventory_events
language plpgsql security invoker set search_path = '' as $$
declare v_delta numeric;
begin
  if p_kind not in ('purchase', 'adjustment_in', 'adjustment_out', 'return_in', 'return_out') then
    raise exception 'Selecciona un tipo de entrada o salida válido.';
  end if;
  if p_quantity is null or p_quantity <= 0 then raise exception 'Ingresa una cantidad mayor que cero.'; end if;
  v_delta := case when p_kind in ('adjustment_out', 'return_out') then -p_quantity else p_quantity end;
  return private.apply_inventory_delta(p_product_id, auth.uid(), p_kind, v_delta, p_occurred_on, p_note, null, p_unit_cost);
end;
$$;

revoke execute on function private.apply_inventory_delta(uuid, uuid, text, numeric, date, text, uuid, numeric) from public, anon;
grant usage on schema private to authenticated;
grant execute on function private.apply_inventory_delta(uuid, uuid, text, numeric, date, text, uuid, numeric) to authenticated;
revoke execute on function public.record_inventory_change(uuid, text, numeric, date, text, numeric) from public, anon;
grant execute on function public.record_inventory_change(uuid, text, numeric, date, text, numeric) to authenticated;

create or replace function private.guard_product_stock()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.stock_quantity is distinct from old.stock_quantity
     and current_setting('app.inventory_internal', true) is distinct from 'true' then
    raise exception 'Modifica las existencias desde el historial de inventario.';
  end if;
  return new;
end;
$$;
drop trigger if exists guard_product_stock_trigger on public.products;
create trigger guard_product_stock_trigger before update on public.products
for each row execute function private.guard_product_stock();

create or replace function private.log_product_opening()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.stock_quantity > 0 then
    insert into public.inventory_events
      (owner_id, product_id, event_type, quantity_delta, balance_after, unit_cost, note, occurred_on)
    values
      (new.owner_id, new.id, 'opening', new.stock_quantity, new.stock_quantity, new.unit_cost, 'Stock inicial al crear el insumo', current_date);
  end if;
  return new;
end;
$$;
drop trigger if exists log_product_opening_trigger on public.products;
create trigger log_product_opening_trigger after insert on public.products
for each row execute function private.log_product_opening();

-- Los saldos previos se registran como punto de partida; no se inventa el detalle histórico anterior.
insert into public.inventory_events
  (owner_id, product_id, event_type, quantity_delta, balance_after, unit_cost, note, occurred_on)
select p.owner_id, p.id, 'opening', p.stock_quantity, p.stock_quantity, p.unit_cost,
       'Saldo inicial migrado; el historial detallado comienza aquí', current_date
from public.products p
where p.stock_quantity > 0
  and not exists (select 1 from public.inventory_events e where e.product_id = p.id);

create or replace function public.sync_activity_product_stock()
returns trigger language plpgsql security invoker set search_path = '' as $$
declare
  v_product_cost numeric(12,2);
  v_product_unit text;
begin
  if tg_op = 'UPDATE' and old.activity_type = 'input' and old.product_id is not null
     and new.activity_type = 'input' and new.product_id is null then
    raise exception 'Selecciona el insumo utilizado.';
  end if;

  if tg_op in ('UPDATE', 'DELETE') and old.activity_type = 'input'
     and old.product_id is not null and coalesce(old.quantity, 0) > 0 then
    perform private.apply_inventory_delta(
      old.product_id, old.owner_id, 'consumption_reversal', old.quantity,
      current_date, 'Reversión por edición o eliminación: ' || old.description, old.id, old.unit_cost);
  end if;

  if tg_op = 'DELETE' then return old; end if;

  if new.activity_type = 'input' then
    if new.product_id is null then raise exception 'Selecciona el insumo utilizado.'; end if;
    if coalesce(new.quantity, 0) <= 0 then raise exception 'La cantidad utilizada debe ser mayor que cero.'; end if;

    select unit_cost, stock_unit into v_product_cost, v_product_unit
      from public.products where id = new.product_id and owner_id = new.owner_id;
    if not found then raise exception 'El insumo seleccionado no existe o no pertenece al usuario.'; end if;

    perform private.apply_inventory_delta(
      new.product_id, new.owner_id, 'consumption', -new.quantity,
      new.started_at::date, new.description, new.id, v_product_cost);
    new.unit := v_product_unit;
    new.unit_cost := v_product_cost;
    new.total_cost := round(new.quantity * v_product_cost, 2);
  else
    new.product_id := null;
    new.unit_cost := null;
  end if;
  return new;
end;
$$;
