alter table public.activities
  add column if not exists product_id uuid references public.products(id) on delete set null;

alter table public.activities
  add column if not exists unit_cost numeric(12,2);

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
