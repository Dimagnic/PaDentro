import { adminDb, env, Stripe, stripeClient } from '../_shared/deps.ts'

const crypto = Stripe.createSubtleCryptoProvider()

export async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') return new Response('Método no permitido', { status: 405 })
  const sig = req.headers.get('stripe-signature')
  if (!sig) return new Response('Falta firma', { status: 400 })

  const raw = await req.text()
  let event: Stripe.Event
  try {
    event = await stripeClient().webhooks.constructEventAsync(raw, sig, env('STRIPE_WEBHOOK_SECRET'), undefined, crypto)
  } catch (e) {
    console.error('firma inválida', e instanceof Error ? e.message : e)
    return new Response('Firma inválida', { status: 400 })
  }

  const db = adminDb()
  const s = event.data.object as Stripe.Checkout.Session
  const orderId = s.metadata?.order_id ?? s.client_reference_id
  if (!orderId) return new Response('ok')

  let patch: Record<string, unknown> | null = null
  let only: string | null = null
  switch (event.type) {
    case 'checkout.session.completed':
    case 'checkout.session.async_payment_succeeded':
      if (s.payment_status === 'paid') {
        patch = { payment_status: 'paid', paid_at: new Date().toISOString(), stripe_session_id: s.id }
      }
      break
    case 'checkout.session.expired':
    case 'checkout.session.async_payment_failed':
      patch = { payment_status: 'expired', status: 'cancelado' }
      only = 'pending' // nunca cancelar un pedido ya pagado
      break
  }
  if (patch) {
    let q = db.from('orders').update(patch).eq('id', orderId)
    if (only) q = q.eq('payment_status', only)
    const { error } = await q
    if (error) {
      console.error('update order', error.message)
      return new Response('Error al guardar', { status: 500 }) // Stripe reintentará
    }
  }
  return new Response('ok')
}
