import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Line } from './types'
import { waLink } from './config'
import { supabase } from './supabase'
import { useSite } from './data'
import { formatWhen, isoMx, openNow } from './content'
import DatePicker, { type When } from './DatePicker'
import Icon from './icons'

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

export const trackUrl = (code: string) => `${location.origin}/pedido?c=${code}`
const toItems = (lines: Line[]) => lines.map(l => ({ id: l.itemId, qty: l.qty, variant: l.variant === 'Botella' ? 'Botella' : null }))

/** Guarda el pedido de WhatsApp en Supabase (precios calculados en el servidor). */
async function saveOrder(lines: Line[], note: string, scheduled: string | null): Promise<{ folio: number; total: number; code: string } | { error: string } | null> {
  if (!supabase || lines.some(l => l.itemId == null)) return null
  const { data, error } = await supabase.rpc('create_order', { p_items: toItems(lines), p_notes: note, p_scheduled: scheduled })
  if (error) return /anticipación|no abrimos|Elige una hora|no disponible/i.test(error.message) ? { error: error.message } : null
  if (!data?.[0]) return null
  return { folio: Number(data[0].folio), total: Number(data[0].total), code: data[0].tracking_code }
}

/**
 * Crea el pago en Stripe (función de servidor) y devuelve la URL de pago.
 * El carrito solo manda productos y notas: Stripe pide tarjeta, nombre, teléfono y hora de recogida.
 */
async function startCheckout(lines: Line[], note: string, scheduled: string | null): Promise<string> {
  const { data, error } = await supabase!.functions.invoke('create-checkout', {
    body: { items: toItems(lines), notes: note, scheduled },
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
  const [busy, setBusy] = useState(false)
  const [paying, setPaying] = useState(false)
  const [err, setErr] = useState('')

  const canPayOnline = !!supabase && store.online && lines.length > 0 && lines.every(l => l.itemId != null)
  const isOpen = openNow(store.schedule)
  const [whenMode, setWhenMode] = useState<'asap' | 'later'>(isOpen ? 'asap' : 'later')
  const [when, setWhen] = useState<When | null>(null)
  useEffect(() => { if (!isOpen) setWhenMode('later') }, [isOpen])
  const scheduled = whenMode === 'later' && when?.time ? isoMx(when.date, when.time) : null
  const whenOk = whenMode === 'asap' ? isOpen : !!scheduled
  useEffect(() => { if (!open) setErr('') }, [open])
  // Si el cliente regresa con el botón "atrás" desde Stripe, el botón vuelve a estar disponible.
  useEffect(() => { const f = (e: PageTransitionEvent) => { if (e.persisted) setPaying(false) }; addEventListener('pageshow', f); return () => removeEventListener('pageshow', f) }, [])

  const msg = (folio?: number, tot = total, code?: string) =>
    `Hola, quiero hacer este pedido en Pa'dentro${folio ? ` (folio #${folio})` : ''}:\n\n` +
    lines.map(l => `• ${l.qty}x ${l.name}${l.variant ? ` (${l.variant})` : ''} — ${mxn(l.qty * l.price)}`).join('\n') +
    `\n\nTotal: ${mxn(tot)}` +
    `\nPara: ${scheduled ? formatWhen(scheduled) : 'lo antes posible'}` +
    (note.trim() ? `\nNotas: ${note.trim()}` : '') +
    (code ? `\nSeguimiento: ${trackUrl(code)}` : '')

  const sendWhatsApp = async () => {
    if (!lines.length || busy) return
    if (!whenOk) return setErr(whenMode === 'later' ? 'Elige el día y la hora en el calendario.' : 'Ahora estamos cerrados: programa fecha y hora.')
    setBusy(true); setErr('')
    const w = window.open('', '_blank') // se abre antes de esperar para que el navegador no la bloquee
    const saved = await saveOrder(lines, note.trim(), scheduled)
    if (saved && 'error' in saved) { w?.close(); setBusy(false); return setErr(saved.error) }
    const url = waLink(msg(saved?.folio, saved?.total ?? total, saved?.code))
    if (w) w.location.href = url
    else location.href = url
    setBusy(false)
    if (saved) { clear(); setNote(''); setWhen(null); setOpen(false) }
  }

  /** Va directo al formulario oficial de Stripe. */
  const pay = async () => {
    if (paying || busy) return
    if (!whenOk) return setErr(whenMode === 'later' ? 'Elige el día y la hora en el calendario.' : 'Ahora estamos cerrados: programa fecha y hora.')
    setPaying(true); setErr('')
    try {
      location.href = await startCheckout(lines, note.trim(), scheduled)
    } catch (x) {
      setErr(x instanceof Error ? x.message : 'No se pudo iniciar el pago.')
      setPaying(false)
    }
  }

  return (
    <>
      <div className={'scrim' + (open ? ' on' : '')} onClick={() => setOpen(false)} />
      <aside className={'drawer' + (open ? ' on' : '')} aria-hidden={!open} aria-label="Tu pedido">
        <header>
          <div>
            <h3>Tu pedido</h3>
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
        ) : (
          <div className="lines">
            {lines.map(l => (
              <div className="line" key={l.key}>
                <div><b>{l.name}</b>{l.variant && <em>{l.variant}</em>}<span>{mxn(l.price)} c/u · {mxn(l.qty * l.price)}</span></div>
                <div className="qty">
                  <button onClick={() => change(l.key, -1)} aria-label="Quitar" disabled={paying}>−</button>
                  <i>{l.qty}</i>
                  <button onClick={() => change(l.key, 1)} aria-label="Agregar" disabled={paying}>+</button>
                </div>
              </div>
            ))}
            <button className="link" onClick={clear} disabled={paying}>Vaciar pedido</button>
            <div className="when">
              <h4>¿Para cuándo?</h4>
              <div className="seg">
                <button className={whenMode === 'asap' ? 'on' : ''} disabled={!isOpen} onClick={() => setWhenMode('asap')}>
                  <Icon name="clock" size={17} />Hoy, lo antes posible
                </button>
                <button className={whenMode === 'later' ? 'on' : ''} onClick={() => setWhenMode('later')}>
                  <Icon name="calendar" size={17} />Programar fecha
                </button>
              </div>
              {!isOpen && <p className="when-note">Ahora la cocina está cerrada. Elige día y hora para recoger.</p>}
              {whenMode === 'later' && <DatePicker schedule={store.schedule} value={when} onChange={setWhen} />}
              {scheduled && <p className="when-pick"><Icon name="check" size={16} />Recoges el {formatWhen(scheduled)}</p>}
            </div>
            <textarea placeholder="Notas para la cocina (sin cebolla, alergias…)" value={note} maxLength={500} onChange={e => setNote(e.target.value)} />
          </div>
        )}

        <footer>
          <div className="tot"><span>TOTAL</span><b>{mxn(total)}</b></div>
          {err && <p className="pay-err">{err}</p>}
          {canPayOnline && (
            <button className={'btn gold full' + (paying ? ' off' : '')} onClick={pay} disabled={paying}>
              {paying ? 'Abriendo pago seguro…' : `💳 Proceder al pago · ${mxn(total)}`}
            </button>
          )}
          {!store.online && lines.length > 0 && <p className="closed">{store.closedMessage}</p>}
          <button className={'btn wa' + (lines.length && !busy && !paying ? '' : ' off')} onClick={sendWhatsApp} disabled={!lines.length || busy || paying}>
            {busy ? 'Enviando…' : canPayOnline ? 'Pedir por WhatsApp (pagas en el local)' : 'Enviar pedido por WhatsApp'}
          </button>
          <p>{canPayOnline ? `🔒 El pago se hace en Stripe, que te pedirá tus datos de tarjeta. Recoges en el local. ${store.pickupNote}` : 'Precios en MXN con IVA; propina voluntaria.'}</p>
        </footer>
      </aside>
    </>
  )
}
