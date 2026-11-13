-- =====================================================================
-- Pa'dentro · Pago directo en Stripe
-- El carrito ya no pide nombre ni teléfono: los pide Stripe y el webhook
-- los guarda en el pedido al confirmarse el pago.
-- Ejecutar DESPUÉS de 04_tienda_cms.sql. Es seguro volver a ejecutarlo.
-- =====================================================================
create or replace function public.create_online_order(
  p_items jsonb, p_name text, p_phone text, p_notes text default '', p_pickup text default '')
returns table (id uuid, folio bigint, total numeric, lines jsonb)
language plpgsql security definer set search_path = public
as $$
declare pl record; o record; online text;
begin
  select content -> 'store' ->> 'online' into online from public.site_settings where site_settings.id = 1;
  if online = 'false' then raise exception 'La tienda en línea está cerrada en este momento'; end if;
  select * into pl from public.price_items(p_items);
  if pl.total < 10 then raise exception 'El mínimo para pagar en línea es $10'; end if;
  insert into public.orders (items, total, notes, channel, customer_name, customer_phone, pickup_time, payment_status)
  values (pl.lines, pl.total, left(coalesce(p_notes, ''), 500), 'online',
          left(trim(coalesce(p_name, '')), 80), left(trim(coalesce(p_phone, '')), 20), left(coalesce(p_pickup, ''), 40), 'pending')
  returning orders.id, orders.folio into o;
  return query select o.id, o.folio, pl.total, pl.lines;
end; $$;
revoke all on function public.create_online_order(jsonb, text, text, text, text) from public, anon, authenticated;
grant execute on function public.create_online_order(jsonb, text, text, text, text) to service_role;
