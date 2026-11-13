-- =====================================================================
-- Pa'dentro · Tienda en línea (Stripe) + CMS del sitio + fotos
-- Ejecutar DESPUÉS de 01, 02 y 03. Es seguro volver a ejecutarlo.
-- =====================================================================

-- ---------- Contenido editable del sitio (CMS) ----------
create table if not exists public.site_settings (
  id         smallint primary key default 1 check (id = 1),
  content    jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
insert into public.site_settings (id) values (1) on conflict do nothing;

drop trigger if exists site_settings_touch on public.site_settings;
create trigger site_settings_touch before update on public.site_settings
for each row execute function public.touch_updated_at();

alter table public.site_settings enable row level security;
drop policy if exists "public read site" on public.site_settings;
create policy "public read site" on public.site_settings for select using (true);
drop policy if exists "admin write site" on public.site_settings;
create policy "admin write site" on public.site_settings for all using (public.is_admin()) with check (public.is_admin());
grant select on public.site_settings to anon, authenticated;
grant insert, update on public.site_settings to authenticated;

-- ---------- Pedidos: datos del cliente y pago ----------
alter table public.orders add column if not exists channel text not null default 'whatsapp';
alter table public.orders add column if not exists customer_name  text not null default '';
alter table public.orders add column if not exists customer_phone text not null default '';
alter table public.orders add column if not exists pickup_time    text not null default '';
alter table public.orders add column if not exists payment_status text not null default 'none';
alter table public.orders add column if not exists stripe_session_id text;
alter table public.orders add column if not exists paid_at timestamptz;

alter table public.orders drop constraint if exists orders_channel_check;
alter table public.orders add constraint orders_channel_check check (channel in ('whatsapp','online'));
alter table public.orders drop constraint if exists orders_payment_status_check;
alter table public.orders add constraint orders_payment_status_check
  check (payment_status in ('none','pending','paid','expired','refunded'));
create unique index if not exists orders_stripe_session_idx on public.orders(stripe_session_id) where stripe_session_id is not null;

-- Calcula renglones y total desde la base (nunca desde el navegador).
create or replace function public.price_items(p_items jsonb)
returns table (lines jsonb, total numeric)
language plpgsql stable security definer set search_path = public
as $$
declare
  r jsonb; it public.menu_items%rowtype; q int; v text; unit numeric;
  acc jsonb := '[]'::jsonb; t numeric := 0;
begin
  if p_items is null or jsonb_typeof(p_items) <> 'array'
     or jsonb_array_length(p_items) = 0 or jsonb_array_length(p_items) > 60 then
    raise exception 'Pedido vacío o demasiado grande';
  end if;
  for r in select * from jsonb_array_elements(p_items) loop
    q := (r ->> 'qty')::int;
    if q is null or q < 1 or q > 50 then raise exception 'Cantidad inválida'; end if;
    select mi.* into it
    from public.menu_items mi
    join public.menu_sections s on s.id = mi.section_id and s.active
    join public.menu_categories c on c.id = s.category_id and c.active
    where mi.id = (r ->> 'id')::bigint and mi.available;
    if not found then raise exception 'Producto no disponible: %', r ->> 'id'; end if;
    v := nullif(r ->> 'variant', '');
    if v = 'Botella' then unit := it.bottle_price; else unit := it.price; end if;
    if unit is null then raise exception 'Producto sin precio: %', it.name; end if;
    t := t + unit * q;
    acc := acc || jsonb_build_object('item_id', it.id, 'name', it.name, 'variant', v,
                                     'price', unit, 'qty', q, 'subtotal', unit * q);
  end loop;
  return query select acc, t;
end; $$;
revoke all on function public.price_items(jsonb) from public, anon, authenticated;

-- Pedido por WhatsApp (sin pago en línea). Misma firma que antes.
create or replace function public.create_order(p_items jsonb, p_notes text default '')
returns table (folio bigint, total numeric)
language plpgsql security definer set search_path = public
as $$
declare pl record; o_folio bigint;
begin
  select * into pl from public.price_items(p_items);
  insert into public.orders (items, total, notes, channel)
  values (pl.lines, pl.total, left(coalesce(p_notes, ''), 500), 'whatsapp')
  returning orders.folio into o_folio;
  return query select o_folio, pl.total;
end; $$;
revoke all on function public.create_order(jsonb, text) from public;
grant execute on function public.create_order(jsonb, text) to anon, authenticated;

-- Pedido pagado en línea: solo lo llama la función de servidor (create-checkout).
create or replace function public.create_online_order(
  p_items jsonb, p_name text, p_phone text, p_notes text default '', p_pickup text default '')
returns table (id uuid, folio bigint, total numeric, lines jsonb)
language plpgsql security definer set search_path = public
as $$
declare pl record; o record; online text;
begin
  select content -> 'store' ->> 'online' into online from public.site_settings where site_settings.id = 1;
  if online = 'false' then raise exception 'La tienda en línea está cerrada en este momento'; end if;
  if length(trim(coalesce(p_name, ''))) < 2 then raise exception 'Falta el nombre'; end if;
  if length(regexp_replace(coalesce(p_phone, ''), '\D', '', 'g')) < 10 then raise exception 'Teléfono inválido'; end if;
  select * into pl from public.price_items(p_items);
  if pl.total < 10 then raise exception 'El mínimo para pagar en línea es $10'; end if;
  insert into public.orders (items, total, notes, channel, customer_name, customer_phone, pickup_time, payment_status)
  values (pl.lines, pl.total, left(coalesce(p_notes, ''), 500), 'online',
          left(trim(p_name), 80), left(trim(p_phone), 20), left(coalesce(p_pickup, ''), 40), 'pending')
  returning orders.id, orders.folio into o;
  return query select o.id, o.folio, pl.total, pl.lines;
end; $$;
revoke all on function public.create_online_order(jsonb, text, text, text, text) from public, anon, authenticated;
grant execute on function public.create_online_order(jsonb, text, text, text, text) to service_role;

-- Estado público de un pedido en línea (para la página de "gracias"), sin datos personales.
create or replace function public.order_payment_status(p_session text)
returns table (folio bigint, payment_status text, total numeric)
language sql stable security definer set search_path = public
as $$ select folio, payment_status, total from public.orders where stripe_session_id = p_session; $$;
revoke all on function public.order_payment_status(text) from public;
grant execute on function public.order_payment_status(text) to anon, authenticated;

-- ---------- Fotos del sitio (Supabase Storage) ----------
insert into storage.buckets (id, name, public)
values ('site', 'site', true)
on conflict (id) do update set public = true;

drop policy if exists "site images public read" on storage.objects;
create policy "site images public read" on storage.objects for select using (bucket_id = 'site');
drop policy if exists "site images admin insert" on storage.objects;
create policy "site images admin insert" on storage.objects for insert to authenticated with check (bucket_id = 'site' and public.is_admin());
drop policy if exists "site images admin update" on storage.objects;
create policy "site images admin update" on storage.objects for update to authenticated using (bucket_id = 'site' and public.is_admin());
drop policy if exists "site images admin delete" on storage.objects;
create policy "site images admin delete" on storage.objects for delete to authenticated using (bucket_id = 'site' and public.is_admin());
