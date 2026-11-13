-- =====================================================================
-- Pa'dentro · POS, pedidos programados (calendario), seguimiento y tiempo real
-- Ejecutar DESPUÉS de 01 a 05. Es seguro volver a ejecutarlo.
-- =====================================================================

-- ---------- Columnas nuevas de pedidos ----------
alter table public.orders add column if not exists scheduled_for  timestamptz;
alter table public.orders add column if not exists tracking_code  text;
alter table public.orders add column if not exists status_history jsonb not null default '[]'::jsonb;
alter table public.orders add column if not exists payment_method text not null default '';
alter table public.orders add column if not exists amount_paid    numeric(10,2) not null default 0;
alter table public.orders add column if not exists discount       numeric(10,2) not null default 0;
alter table public.orders add column if not exists updated_at     timestamptz not null default now();

alter table public.orders drop constraint if exists orders_status_check;
alter table public.orders add constraint orders_status_check
  check (status in ('nuevo','confirmado','preparando','listo','entregado','cancelado'));
alter table public.orders drop constraint if exists orders_channel_check;
alter table public.orders add constraint orders_channel_check
  check (channel in ('whatsapp','online','pos','telefono'));
alter table public.orders drop constraint if exists orders_payment_status_check;
alter table public.orders add constraint orders_payment_status_check
  check (payment_status in ('none','pending','partial','paid','expired','refunded'));

create unique index if not exists orders_tracking_idx on public.orders(tracking_code);
create index if not exists orders_scheduled_idx on public.orders(scheduled_for) where scheduled_for is not null;

create or replace function public.gen_tracking_code()
returns text language sql volatile as $$
  select upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
$$;

update public.orders set tracking_code = public.gen_tracking_code() where tracking_code is null;
update public.orders set status_history = jsonb_build_array(jsonb_build_object('status', status, 'at', created_at))
where status_history = '[]'::jsonb;
update public.orders set amount_paid = total, payment_method = 'stripe'
where payment_status = 'paid' and amount_paid = 0 and channel = 'online';

create or replace function public.orders_track()
returns trigger language plpgsql as $$
begin
  if tg_op = 'INSERT' then
    new.tracking_code := coalesce(new.tracking_code, public.gen_tracking_code());
    new.status_history := jsonb_build_array(jsonb_build_object('status', new.status, 'at', now()));
  elsif new.status is distinct from old.status then
    new.status_history := coalesce(old.status_history, '[]'::jsonb)
      || jsonb_build_object('status', new.status, 'at', now());
  end if;
  new.updated_at := now();
  return new;
end; $$;
drop trigger if exists orders_track on public.orders;
create trigger orders_track before insert or update on public.orders
for each row execute function public.orders_track();

-- ---------- Reglas de horario para pedidos programados ----------
create or replace function public.check_pickup(p_when timestamptz)
returns void language plpgsql stable security definer set search_path = public as $$
declare
  cfg jsonb; local_ts timestamp; dow int;
  open_t time; close_t time; lead_min int; max_days int; days jsonb;
begin
  if p_when is null then return; end if;
  select coalesce(content -> 'store' -> 'schedule', '{}'::jsonb) into cfg from public.site_settings where id = 1;
  cfg := coalesce(cfg, '{}'::jsonb);
  open_t   := coalesce(nullif(cfg ->> 'open', ''), '13:00')::time;
  close_t  := coalesce(nullif(cfg ->> 'close', ''), '20:00')::time;
  lead_min := coalesce((cfg ->> 'leadMinutes')::int, 45);
  max_days := coalesce((cfg ->> 'maxDays')::int, 30);
  days     := coalesce(cfg -> 'days', '[0,2,3,4,5,6]'::jsonb);

  if p_when < now() + make_interval(mins => lead_min) then
    raise exception 'Elige una hora con al menos % minutos de anticipación', lead_min;
  end if;
  if p_when > now() + make_interval(days => max_days) then
    raise exception 'Solo se puede programar con hasta % días de anticipación', max_days;
  end if;
  local_ts := p_when at time zone 'America/Mexico_City';
  dow := extract(dow from local_ts)::int;
  if not days @> to_jsonb(dow) then raise exception 'Ese día no abrimos'; end if;
  if local_ts::time < open_t or local_ts::time > close_t then
    raise exception 'Elige una hora entre % y %', to_char(open_t, 'HH24:MI'), to_char(close_t, 'HH24:MI');
  end if;
end; $$;
revoke all on function public.check_pickup(timestamptz) from public, anon, authenticated;

-- ---------- Pedido por WhatsApp ----------
drop function if exists public.create_order(jsonb, text);
create or replace function public.create_order(p_items jsonb, p_notes text default '', p_scheduled timestamptz default null)
returns table (folio bigint, total numeric, tracking_code text)
language plpgsql security definer set search_path = public
as $$
declare pl record; o record;
begin
  perform public.check_pickup(p_scheduled);
  select * into pl from public.price_items(p_items);
  insert into public.orders (items, total, notes, channel, scheduled_for)
  values (pl.lines, pl.total, left(coalesce(p_notes, ''), 500), 'whatsapp', p_scheduled)
  returning orders.folio, orders.tracking_code into o;
  return query select o.folio, pl.total, o.tracking_code;
end; $$;
revoke all on function public.create_order(jsonb, text, timestamptz) from public;
grant execute on function public.create_order(jsonb, text, timestamptz) to anon, authenticated;

-- ---------- Pedido pagado en línea ----------
drop function if exists public.create_online_order(jsonb, text, text, text, text);
create or replace function public.create_online_order(
  p_items jsonb, p_name text default '', p_phone text default '', p_notes text default '',
  p_pickup text default '', p_scheduled timestamptz default null)
returns table (id uuid, folio bigint, total numeric, lines jsonb, tracking_code text)
language plpgsql security definer set search_path = public
as $$
declare pl record; o record; online text;
begin
  select content -> 'store' ->> 'online' into online from public.site_settings where site_settings.id = 1;
  if online = 'false' then raise exception 'La tienda en línea está cerrada en este momento'; end if;
  perform public.check_pickup(p_scheduled);
  select * into pl from public.price_items(p_items);
  if pl.total < 10 then raise exception 'El mínimo para pagar en línea es $10'; end if;
  insert into public.orders (items, total, notes, channel, customer_name, customer_phone, pickup_time, payment_status, scheduled_for)
  values (pl.lines, pl.total, left(coalesce(p_notes, ''), 500), 'online',
          left(trim(coalesce(p_name, '')), 80), left(trim(coalesce(p_phone, '')), 20),
          left(coalesce(p_pickup, ''), 40), 'pending', p_scheduled)
  returning orders.id, orders.folio, orders.tracking_code into o;
  return query select o.id, o.folio, pl.total, pl.lines, o.tracking_code;
end; $$;
revoke all on function public.create_online_order(jsonb, text, text, text, text, timestamptz) from public, anon, authenticated;
grant execute on function public.create_online_order(jsonb, text, text, text, text, timestamptz) to service_role;

-- ---------- Estado del pago al volver de Stripe ----------
drop function if exists public.order_payment_status(text);
create or replace function public.order_payment_status(p_session text)
returns table (folio bigint, payment_status text, total numeric, tracking_code text, scheduled_for timestamptz)
language sql stable security definer set search_path = public
as $$ select folio, payment_status, total, tracking_code, scheduled_for from public.orders where stripe_session_id = p_session; $$;
revoke all on function public.order_payment_status(text) from public;
grant execute on function public.order_payment_status(text) to anon, authenticated;

-- ---------- Seguimiento público del pedido ----------
create or replace function public.track_order(p_code text)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'folio', folio, 'status', status, 'history', status_history, 'created_at', created_at,
    'scheduled_for', scheduled_for, 'channel', channel, 'payment_status', payment_status,
    'total', total, 'amount_paid', amount_paid,
    'name', split_part(customer_name, ' ', 1),
    'items', (select coalesce(jsonb_agg(jsonb_build_object('name', l ->> 'name', 'variant', l ->> 'variant', 'qty', (l ->> 'qty')::int)), '[]'::jsonb)
              from jsonb_array_elements(items) l))
  from public.orders
  where tracking_code = upper(trim(p_code))
    and not (channel = 'online' and payment_status in ('pending', 'expired'));
$$;
revoke all on function public.track_order(text) from public;
grant execute on function public.track_order(text) to anon, authenticated;

-- ---------- POS (solo administradores) ----------
create or replace function public.require_admin()
returns void language plpgsql stable security definer set search_path = public as $$
begin if not public.is_admin() then raise exception 'Solo administradores'; end if; end; $$;

create or replace function public.pos_create_order(
  p_items jsonb, p_channel text default 'pos', p_customer_name text default '', p_customer_phone text default '',
  p_notes text default '', p_scheduled timestamptz default null, p_discount numeric default 0,
  p_payment_method text default '', p_status text default 'confirmado')
returns table (id uuid, folio bigint, total numeric, tracking_code text)
language plpgsql security definer set search_path = public as $$
declare pl record; o record; t numeric; paid boolean;
begin
  perform public.require_admin();
  if p_channel not in ('pos', 'telefono', 'whatsapp') then raise exception 'Canal inválido'; end if;
  select * into pl from public.price_items(p_items);
  t := greatest(pl.total - greatest(coalesce(p_discount, 0), 0), 0);
  paid := coalesce(p_payment_method, '') in ('efectivo', 'tarjeta', 'transferencia');
  insert into public.orders (items, total, discount, notes, channel, customer_name, customer_phone,
                             scheduled_for, status, payment_method, amount_paid, payment_status)
  values (pl.lines, t, least(greatest(coalesce(p_discount, 0), 0), pl.total), left(coalesce(p_notes, ''), 500), p_channel,
          left(trim(coalesce(p_customer_name, '')), 80), left(trim(coalesce(p_customer_phone, '')), 20),
          p_scheduled, coalesce(nullif(p_status, ''), 'confirmado'),
          case when paid then p_payment_method else '' end,
          case when paid then t else 0 end,
          case when paid then 'paid' else 'none' end)
  returning orders.id, orders.folio, orders.tracking_code into o;
  return query select o.id, o.folio, t, o.tracking_code;
end; $$;

create or replace function public.pos_add_items(p_order uuid, p_items jsonb)
returns numeric language plpgsql security definer set search_path = public as $$
declare pl record; o public.orders%rowtype; new_total numeric;
begin
  perform public.require_admin();
  select * into o from public.orders where id = p_order for update;
  if not found then raise exception 'Pedido no encontrado'; end if;
  if o.status in ('entregado', 'cancelado') then raise exception 'El pedido ya está %', o.status; end if;
  select * into pl from public.price_items(p_items);
  new_total := o.total + pl.total;
  update public.orders set items = o.items || pl.lines, total = new_total,
    payment_status = case when o.amount_paid >= new_total then o.payment_status
                          when o.amount_paid > 0 then 'partial' else o.payment_status end
  where id = p_order;
  return new_total;
end; $$;

create or replace function public.pos_remove_line(p_order uuid, p_index int)
returns numeric language plpgsql security definer set search_path = public as $$
declare o public.orders%rowtype; new_items jsonb; new_total numeric;
begin
  perform public.require_admin();
  select * into o from public.orders where id = p_order for update;
  if not found then raise exception 'Pedido no encontrado'; end if;
  if jsonb_array_length(o.items) <= 1 then raise exception 'El pedido debe tener al menos un producto; mejor cancélalo'; end if;
  new_items := o.items - p_index;
  select greatest(coalesce(sum((l ->> 'subtotal')::numeric), 0) - o.discount, 0) into new_total from jsonb_array_elements(new_items) l;
  update public.orders set items = new_items, total = new_total,
    payment_status = case when o.amount_paid > 0 and o.amount_paid >= new_total then 'paid' else o.payment_status end
  where id = p_order;
  return new_total;
end; $$;

create or replace function public.pos_register_payment(p_order uuid, p_method text, p_amount numeric default null)
returns numeric language plpgsql security definer set search_path = public as $$
declare o public.orders%rowtype; amt numeric; paid_now numeric;
begin
  perform public.require_admin();
  if p_method not in ('efectivo', 'tarjeta', 'transferencia') then raise exception 'Método de pago inválido'; end if;
  select * into o from public.orders where id = p_order for update;
  if not found then raise exception 'Pedido no encontrado'; end if;
  amt := coalesce(p_amount, o.total - o.amount_paid);
  if amt <= 0 then raise exception 'No hay saldo pendiente'; end if;
  paid_now := o.amount_paid + amt;
  update public.orders set amount_paid = paid_now,
    payment_method = case when o.payment_method = '' then p_method
                          when position(p_method in o.payment_method) > 0 then o.payment_method
                          else o.payment_method || ' + ' || p_method end,
    payment_status = case when paid_now >= o.total then 'paid' else 'partial' end
  where id = p_order;
  return greatest(o.total - paid_now, 0);
end; $$;

revoke all on function public.pos_create_order(jsonb, text, text, text, text, timestamptz, numeric, text, text) from public, anon;
revoke all on function public.pos_add_items(uuid, jsonb) from public, anon;
revoke all on function public.pos_remove_line(uuid, int) from public, anon;
revoke all on function public.pos_register_payment(uuid, text, numeric) from public, anon;
grant execute on function public.pos_create_order(jsonb, text, text, text, text, timestamptz, numeric, text, text) to authenticated;
grant execute on function public.pos_add_items(uuid, jsonb) to authenticated;
grant execute on function public.pos_remove_line(uuid, int) to authenticated;
grant execute on function public.pos_register_payment(uuid, text, numeric) to authenticated;

-- ---------- Tiempo real ----------
do $$
declare t text;
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    foreach t in array array['site_settings','menu_categories','menu_sections','menu_items','promos','orders'] loop
      if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t) then
        execute format('alter publication supabase_realtime add table public.%I', t);
      end if;
    end loop;
  end if;
end $$;