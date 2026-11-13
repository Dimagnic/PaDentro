import { createContext, useCallback, useContext, useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react'
import type { Line } from './types'
import { waLink } from './config'
import { supabase } from './supabase'
import { useSite } from './data'

type NewLine = Omit<Line, 'qty'>
interface Ctx {
  lines: Line[]; count: number; total: number; open: boolean
  setOpen: (v: boolean) => void
  add: (l: NewLine) => void
  change: (key: string, d: number) => void
  clear: () => void
}
const C = createContext<Ctx>(null!)
export const useCart = () => useContext(C)
export const mxn = (n: number) => '$' + n.toLocaleString('es-MX')

/** Clave única por producto+variante. Usa el id de la base cuando existe; si no, sección+nombre. */
export const lineKey = (blockId: string, name: string, id?: number, variant?: string) =>
  (id != null ? `#${id}` : `${blockId}|${name}`) + (variant ? `|${variant}` : '')

const STORE_KEY = 'padentro-carrito'
const loadLines = (): Line[] => {
  try { const v = JSON.parse(localStorage.getItem(STORE_KEY) ?? '[]'); return Array.isArray(v) ? v : [] } catch { return [] }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<Line[]>(loadLines)
  const [open, setOpen] = useState(false)
  useEffect(() => { try { localStorage.setItem(STORE_KEY, JSON.stringify(lines)) } catch { /* sin almacenamiento */ } }, [lines])

  const add = useCallback((nl: NewLine) => setLines(p =>
    p.some(l => l.key === nl.key)
      ? p.map(l => (l.key === nl.key ? { ...l, qty: l.qty + 1 } : l))
      : [...p, { ...nl, qty: 1 }]), [])
  const change = useCallback((key: string, d: number) =>
    setLines(p => p.map(l => (l.key === key ? { ...l, qty: l.qty + d } : l)).filter(l => l.qty > 0)), [])
  const clear = useCallback(() => setLines([]), [])

  const v = useMemo<Ctx>(() => ({
    lines, open, setOpen, add, change, clear,
    count: lines.reduce((a, l) => a + l.qty, 0),
    total: lines.reduce((a, l) => a + l.qty * l.price, 0),
  }), [lines, open, add, change, clear])
  return <C.Provider value={v}>{children}</C.Provider>
}

/** Guarda el pedido de WhatsApp en Supabase (precios calculados en el servidor). */
async function saveOrder(lines: Line[], note: string): Promise<{ folio: number; total: number } | null> {
  if (!supabase || lines.some(l => l.itemId == null)) return null
  const items = lines.map(l => ({ id: l.itemId, qty: l.qty, variant: l.variant === 'Botella' ? 'Botella' : null }))
  const { data, error } = await supabase.rpc('create_order', { p_items: items, p_notes: note })
  if (error || !data?.[0]) { console.warn('No se pudo guardar el pedido', error); return null }
  return { folio: Number(data[0].folio), total: Number(data[0].total) }
}

/** Crea el pago en Stripe (función de servidor) y devuelve la URL de pago. */
async function startCheckout(lines: Line[], f: { name: string; phone: string; pickup: string; note: string }): Promise<string> {
  const items = lines.map(l => ({ id: l.itemId, qty: l.qty, variant: l.variant === 'Botella' ? 'Botella' : null }))
  const { data, error } = await supabase!.functions.invoke('create-checkout', {
    body: { items, name: f.name, phone: f.phone, pickup: f.pickup, notes: f.note },
  })
  if (error) {
    let msg = 'No se pudo iniciar el pago. Intenta de nuevo o pide por WhatsApp.'
    try { const j = await (error as { context?: Response }).context?.json(); if (j?.error) msg = j.error } catch { /* sin detalle */ }
    throw new Error(msg)
  }
  if (!data?.url) throw new Error('No se pudo iniciar el pago.')
  return data.url as string
}

export function CartDrawer() {
  const { lines, total, open, setOpen, change, clear } = useCart()
  const { store } = useSite()
  const [note, setNote] = useState('')
  const [mode, setMode] = useState<'cart' | 'pay'>('cart')
  const [f, setF] = useState({ name: '', phone: '', pickup: 'Lo antes posible' })
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  const canPayOnline = !!supabase && store.online && lines.length > 0 && lines.every(l => l.itemId != null)
  useEffect(() => { if (!lines.length) setMode('cart') }, [lines.length])
  useEffect(() => { if (!open) setErr('') }, [open])

  const msg = (folio?: number, tot = total) =>
    `Hola, quiero hacer este pedido en Pa'dentro${folio ? ` (folio #${folio})` : ''}:\n\n` +
    lines.map(l => `• ${l.qty}x ${l.name}${l.variant ? ` (${l.variant})` : ''} — ${mxn(l.qty * l.price)}`).join('\n') +
    `\n\nTotal: ${mxn(tot)}` + (note.trim() ? `\nNotas: ${note.trim()}` : '')

  const sendWhatsApp = async () => {
    if (!lines.length || busy) return
    setBusy(true)
    const w = window.open('', '_blank') // se abre antes de esperar para que el navegador no la bloquee
    const saved = await saveOrder(lines, note.trim())
    const url = waLink(msg(saved?.folio, saved?.total ?? total))
    if (w) w.location.href = url
    else location.href = url
    setBusy(false)
    if (saved) { clear(); setNote(''); setOpen(false) }
  }

  const pay = async (e: FormEvent) => {
    e.preventDefault()
    if (busy) return
    setBusy(true); setErr('')
    try {
      location.href = await startCheckout(lines, { ...f, note: note.trim() })
    } catch (x) {
      setErr(x instanceof Error ? x.message : 'No se pudo iniciar el pago.')
      setBusy(false)
    }
  }

  return (
    <>
      <div className={'scrim' + (open ? ' on' : '')} onClick={() => setOpen(false)} />
      <aside className={'drawer' + (open ? ' on' : '')} aria-hidden={!open} aria-label="Tu pedido">
        <header>
          <div>
            <h3>{mode === 'pay' ? 'Pagar y recoger' : 'Tu pedido'}</h3>
            <small>{lines.length ? `${lines.length} producto(s)` : 'Sin productos'}</small>
          </div>
          <button className="x" onClick={() => setOpen(false)} aria-label="Cerrar">✕</button>
        </header>

        {lines.length === 0 ? (
          <div className="empty">
            <div className="ico">🛒</div><h4>Tu pedido está vacío</h4>
            <p>Agrega tus platillos y bebidas favoritos de la carta para comenzar.</p>
            <a className="btn gold" href="#menu" onClick={() => setOpen(false)}>Ver carta</a>
          </div>
        ) : mode === 'cart' ? (
          <div className="lines">
            {lines.map(l => (
              <div className="line" key={l.key}>
                <div><b>{l.name}</b>{l.variant && <em>{l.variant}</em>}<span>{mxn(l.price)}</span></div>
                <div className="qty">
                  <button onClick={() => change(l.key, -1)} aria-label="Quitar">−</button>
                  <i>{l.qty}</i>
                  <button onClick={() => change(l.key, 1)} aria-label="Agregar">+</button>
                </div>
              </div>
            ))}
            <textarea placeholder="Notas (sin cebolla, alergias…)" value={note} maxLength={500} onChange={e => setNote(e.target.value)} />
            <button className="link" onClick={clear}>Vaciar pedido</button>
          </div>
        ) : (
          <form id="payform" className="lines payform" onSubmit={pay}>
            <p className="pickup">📍 Recoges en el local. {store.pickupNote}</p>
            <label>Nombre<input value={f.name} onChange={e => setF({ ...f, name: e.target.value })} required minLength={2} maxLength={80} autoComplete="name" /></label>
            <label>WhatsApp / teléfono<input type="tel" value={f.phone} onChange={e => setF({ ...f, phone: e.target.value })} required pattern="[0-9 +\-\(\)]{10,20}" title="10 dígitos" autoComplete="tel" placeholder="222 123 4567" /></label>
            <label>¿Cuándo pasas?
              <select value={f.pickup} onChange={e => setF({ ...f, pickup: e.target.value })}>
                {['Lo antes posible', 'En 30 minutos', 'En 1 hora', 'En 2 horas'].map(o => <option key={o}>{o}</option>)}
              </select>
            </label>
            <ul className="resume">{lines.map(l => <li key={l.key}><span>{l.qty}× {l.name}{l.variant ? ` (${l.variant})` : ''}</span><span>{mxn(l.qty * l.price)}</span></li>)}</ul>
            {err && <p className="pay-err">{err}</p>}
            <button type="button" className="link" onClick={() => setMode('cart')}>← Volver al pedido</button>
          </form>
        )}

        <footer>
          <div className="tot"><span>TOTAL</span><b>{mxn(total)}</b></div>
          {mode === 'cart' ? <>
            {canPayOnline && (
              <button className={'btn gold full' + (lines.length ? '' : ' off')} onClick={() => setMode('pay')} disabled={!lines.length}>
                💳 Pagar en línea y recoger
              </button>
            )}
            {!store.online && lines.length > 0 && <p className="closed">{store.closedMessage}</p>}
            <button className={'btn wa' + (lines.length && !busy ? '' : ' off')} onClick={sendWhatsApp} disabled={!lines.length || busy}>
              {busy ? 'Enviando…' : canPayOnline ? 'Pedir por WhatsApp (pagas en el local)' : 'Enviar pedido por WhatsApp'}
            </button>
            <p>Precios en MXN con IVA; propina voluntaria.</p>
          </> : <>
            <button form="payform" className={'btn gold full' + (busy ? ' off' : '')} disabled={busy}>
              {busy ? 'Abriendo pago seguro…' : `Pagar ${mxn(total)} con tarjeta`}
            </button>
            <p>🔒 Pago seguro con Stripe. Pa'dentro no ve ni guarda los datos de tu tarjeta.</p>
          </>}
        </footer>
      </aside>
    </>
  )
}
