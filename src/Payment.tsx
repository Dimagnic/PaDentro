import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import { mxn, useCart } from './cart'
import { useSite } from './data'
import { waLink } from './config'

type State =
  | { kind: 'checking' }
  | { kind: 'paid'; folio: number; total: number }
  | { kind: 'pending'; folio?: number }
  | { kind: 'cancelled' }

/** Muestra el resultado cuando el cliente regresa de Stripe (?pago=ok | ?pago=cancelado). */
export function PaymentResult() {
  const { clear } = useCart()
  const { store } = useSite()
  const [st, setSt] = useState<State | null>(null)

  useEffect(() => {
    const qs = new URLSearchParams(location.search)
    const pago = qs.get('pago')
    if (!pago) return
    history.replaceState(null, '', location.pathname + location.hash)
    if (pago === 'cancelado') return setSt({ kind: 'cancelled' })
    const session = qs.get('session_id')
    if (pago !== 'ok' || !session) return
    clear()
    setSt({ kind: 'checking' })
    // El aviso de Stripe puede tardar unos segundos: se consulta varias veces.
    let tries = 0, alive = true
    const check = async () => {
      const { data } = await supabase!.rpc('order_payment_status', { p_session: session })
      const row = data?.[0] as { folio: number; payment_status: string; total: number } | undefined
      if (!alive) return
      if (row?.payment_status === 'paid') return setSt({ kind: 'paid', folio: Number(row.folio), total: Number(row.total) })
      if (++tries < 8) return void setTimeout(check, 2000)
      setSt({ kind: 'pending', folio: row ? Number(row.folio) : undefined })
    }
    if (supabase) check(); else setSt({ kind: 'pending' })
    return () => { alive = false }
  }, [clear])

  if (!st) return null
  const close = () => setSt(null)
  return (
    <div className="modal-bg" onClick={close}>
      <div className="modal center" onClick={e => e.stopPropagation()} role="dialog">
        <button className="x" onClick={close} aria-label="Cerrar">✕</button>
        {st.kind === 'checking' && <><div className="big">⏳</div><h3>Confirmando tu pago…</h3><p>Esto toma solo unos segundos.</p></>}
        {st.kind === 'paid' && <>
          <div className="big">✅</div><h3>¡Pago recibido!</h3>
          <p className="folio">Pedido <b>#{st.folio}</b> · {mxn(st.total)}</p>
          <p>{store.pickupNote}</p>
          <a className="btn wa" href={waLink(`Hola, ya pagué en línea mi pedido #${st.folio}.`)} target="_blank" rel="noopener">Avisar por WhatsApp</a>
        </>}
        {st.kind === 'pending' && <>
          <div className="big">🕐</div><h3>Estamos confirmando tu pago</h3>
          <p>{st.folio ? <>Tu pedido es el <b>#{st.folio}</b>. </> : null}Si se realizó el cargo, lo verás confirmado en unos minutos. Cualquier duda, escríbenos por WhatsApp.</p>
          <a className="btn wa" href={waLink(`Hola, hice un pago en línea${st.folio ? ` (pedido #${st.folio})` : ''} y quiero confirmarlo.`)} target="_blank" rel="noopener">Escribir por WhatsApp</a>
        </>}
        {st.kind === 'cancelled' && <>
          <div className="big">↩️</div><h3>Pago cancelado</h3>
          <p>No se hizo ningún cargo. Tu pedido sigue en el carrito por si quieres intentarlo de nuevo.</p>
          <button className="btn gold" onClick={close}>Entendido</button>
        </>}
      </div>
    </div>
  )
}
