import { useEffect, useState, type FormEvent } from 'react'
import { supabase } from './supabase'
import { DataProvider, useSite } from './data'
import { formatWhen } from './content'
import { mxn } from './cart'
import { waLink } from './config'
import Icon from './icons'

interface Tracked {
  folio: number; status: string; created_at: string; scheduled_for: string | null; channel: string
  payment_status: string; total: number; amount_paid: number; name: string
  history: { status: string; at: string }[]; items: { name: string; variant: string | null; qty: number }[]
}

const STEPS: [string, string, string][] = [
  ['nuevo', 'Recibido', 'Tenemos tu pedido.'],
  ['confirmado', 'Confirmado', 'La cocina ya lo tiene en su lista.'],
  ['preparando', 'En preparación', 'Estamos cocinando tu pedido.'],
  ['listo', 'Listo para recoger', 'Pasa por él a la barra.'],
  ['entregado', 'Entregado', '¡Buen provecho!'],
]
const hhmm = (iso: string) => new Date(iso).toLocaleTimeString('es-MX', { hour: 'numeric', minute: '2-digit', timeZone: 'America/Mexico_City' })

function TrackPage() {
  const site = useSite()
  const [code, setCode] = useState(() => new URLSearchParams(location.search).get('c') ?? '')
  const [order, setOrder] = useState<Tracked | null>(null)
  const [state, setState] = useState<'idle' | 'loading' | 'missing'>('idle')

  const lookup = async (c: string, quiet = false) => {
    if (!supabase || c.trim().length < 6) return
    if (!quiet) setState('loading')
    const { data } = await supabase.rpc('track_order', { p_code: c.trim() })
    if (data) { setOrder(data as Tracked); setState('idle') }
    else if (!quiet) { setOrder(null); setState('missing') }
  }
  useEffect(() => { if (code) lookup(code) }, []) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!order || ['entregado', 'cancelado'].includes(order.status)) return
    const t = setInterval(() => lookup(code, true), 20000)
    return () => clearInterval(t)
  }, [order, code]) // eslint-disable-line react-hooks/exhaustive-deps

  const submit = (e: FormEvent) => {
    e.preventDefault()
    history.replaceState(null, '', `/pedido?c=${code.trim().toUpperCase()}`)
    lookup(code)
  }
  const at = (st: string) => { const hs = order?.history.filter(h => h.status === st) ?? []; return hs[hs.length - 1]?.at }
  const idx = order ? STEPS.findIndex(s => s[0] === order.status) : -1
  const saldo = order ? Math.max(order.total - order.amount_paid, 0) : 0

  return (
    <div className="track">
      <header className="track-top">
        <a href="/"><img src="/logo.png" alt={site.biz.name} /></a>
        <a href="/#menu" className="btn ghost sm">Volver a la carta</a>
      </header>
      <main className="track-main">
        <h1>Sigue tu pedido</h1>
        <form className="track-form" onSubmit={submit}>
          <label htmlFor="code">Código de seguimiento</label>
          <div>
            <input id="code" value={code} onChange={e => setCode(e.target.value.toUpperCase())} placeholder="Ej. 7F3A9C21" maxLength={12} autoComplete="off" />
            <button className="btn gold">Buscar</button>
          </div>
          <small>Viene en tu mensaje de WhatsApp y en la confirmación de pago.</small>
        </form>

        {state === 'loading' && <p className="track-msg">Buscando…</p>}
        {state === 'missing' && <p className="track-msg err">No encontramos un pedido con ese código. Revisa que esté completo o escríbenos por WhatsApp.</p>}

        {order && (
          <section className="track-card">
            <div className="track-head">
              <div>
                <span>Pedido</span>
                <b>#{order.folio}</b>
              </div>
              {order.name && <p>Hola, {order.name}</p>}
            </div>
            {order.scheduled_for && (
              <p className="track-when"><Icon name="calendar" size={18} />Para recoger el <b>{formatWhen(order.scheduled_for)}</b></p>
            )}
            {order.status === 'cancelado' ? (
              <p className="track-msg err">Este pedido fue cancelado. Si crees que es un error, escríbenos.</p>
            ) : (
              <ol className="steps-track">
                {STEPS.map(([st, label, help], i) => (
                  <li key={st} className={i < idx ? 'done' : i === idx ? 'now' : ''}>
                    <i>{i <= idx ? <Icon name="check" size={14} stroke={2.4} /> : null}</i>
                    <div><b>{label}</b><small>{i === idx ? help : at(st) ? hhmm(at(st)!) : ''}</small></div>
                  </li>
                ))}
              </ol>
            )}
            <ul className="track-items">
              {order.items.map((l, k) => <li key={k}><span>{l.qty}×</span>{l.name}{l.variant ? ` (${l.variant})` : ''}</li>)}
            </ul>
            <div className="track-total">
              <span>Total {mxn(order.total)}</span>
              {order.payment_status === 'paid' ? <em className="ok">Pagado</em> : saldo > 0 ? <em>Por pagar al recoger: {mxn(saldo)}</em> : null}
            </div>
            <a className="btn ghost-dk" href={waLink(`Hola, tengo una duda sobre mi pedido #${order.folio} (código ${code.trim().toUpperCase()}).`)} target="_blank" rel="noopener">Escribir por WhatsApp</a>
            {!['entregado', 'cancelado'].includes(order.status) && <small className="track-auto">Esta página se actualiza sola.</small>}
          </section>
        )}
      </main>
    </div>
  )
}

export default function Track() {
  return <DataProvider><TrackPage /></DataProvider>
}
