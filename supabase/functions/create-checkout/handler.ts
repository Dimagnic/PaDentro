import { adminDb, cors, env, json, stripeClient } from '../_shared/deps.ts'

interface Body {
  items: { id: number; qty: number; variant?: string | null }[]
  name: string
  phone: string
  notes?: string
  pickup?: string
}
interface Line { name: string; variant: string | null; price: number; qty: number }

// Mensajes de la base que sí se le pueden mostrar al cliente.
const FRIENDLY = /(no disponible|sin precio|Cantidad inválida|vacío|cerrada|Falta el nombre|Teléfono inválido|mínimo)/i

export async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'Método no permitido' }, 405)

  let body: Body
  try { body = await req.json() } catch { return json({ error: 'Solicitud inválida' }, 400) }
  if (!Array.isArray(body.items)) return json({ error: 'Solicitud inválida' }, 400)

  const db = adminDb()
  const { data, error } = await db.rpc('create_online_order', {
    p_items: body.items.map(i => ({ id: i.id, qty: i.qty, variant: i.variant === 'Botella' ? 'Botella' : null })),
    p_name: String(body.name ?? ''),
    p_phone: String(body.phone ?? ''),
    p_notes: String(body.notes ?? ''),
    p_pickup: String(body.pickup ?? ''),
  })
  if (error || !data?.[0]) {
    const msg = error?.message ?? ''
    console.error('create_online_order', msg)
    return json({ error: FRIENDLY.test(msg) ? msg : 'No se pudo crear el pedido. Intenta de nuevo.' }, 400)
  }
  const order = data[0] as { id: string; folio: number; total: number; lines: Line[] }

  const site = env('SITE_URL').replace(/\/+$/, '')
  try {
    const session = await stripeClient().checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      locale: 'es-419',
      client_reference_id: order.id,
      metadata: { order_id: order.id, folio: String(order.folio) },
      payment_intent_data: { description: `Pa'dentro · pedido #${order.folio}`, metadata: { order_id: order.id, folio: String(order.folio) } },
      line_items: order.lines.map(l => ({
        quantity: l.qty,
        price_data: {
          currency: 'mxn',
          unit_amount: Math.round(Number(l.price) * 100),
          product_data: { name: l.name + (l.variant ? ` (${l.variant})` : '') },
        },
      })),
      success_url: `${site}/?pago=ok&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${site}/?pago=cancelado`,
      expires_at: Math.floor(Date.now() / 1000) + 31 * 60,
    }, { idempotencyKey: `order-${order.id}` })

    const { error: upErr } = await db.from('orders').update({ stripe_session_id: session.id }).eq('id', order.id)
    if (upErr) console.error('save session id', upErr.message)
    return json({ url: session.url, folio: order.folio })
  } catch (e) {
    console.error('stripe', e instanceof Error ? e.message : e)
    await db.from('orders').update({ payment_status: 'expired', status: 'cancelado' }).eq('id', order.id)
    return json({ error: 'No se pudo iniciar el pago. Intenta de nuevo o pide por WhatsApp.' }, 502)
  }
}
