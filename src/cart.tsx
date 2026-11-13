import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import type { Line } from './types'
import { waLink } from './config'
import { supabase } from './supabase'

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

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<Line[]>([])
  const [open, setOpen] = useState(false)
  const v = useMemo<Ctx>(() => ({
    lines, open, setOpen,
    count: lines.reduce((a, l) => a + l.qty, 0),
    total: lines.reduce((a, l) => a + l.qty * l.price, 0),
    add: nl => setLines(p =>
      p.some(l => l.key === nl.key)
        ? p.map(l => (l.key === nl.key ? { ...l, qty: l.qty + 1 } : l))
        : [...p, { ...nl, qty: 1 }]),
    change: (key, d) => setLines(p => p.map(l => (l.key === key ? { ...l, qty: l.qty + d } : l)).filter(l => l.qty > 0)),
    clear: () => setLines([]),
  }), [lines, open])
  return <C.Provider value={v}>{children}</C.Provider>
}

/** Guarda el pedido en Supabase (precios calculados en el servidor). Devuelve folio y total, o null. */
async function saveOrder(lines: Line[], note: string): Promise<{ folio: number; total: number } | null> {
  if (!supabase || lines.some(l => l.itemId == null)) return null
  const items = lines.map(l => ({ id: l.itemId, qty: l.qty, variant: l.variant === 'Botella' ? 'Botella' : null }))
  const { data, error } = await supabase.rpc('create_order', { p_items: items, p_notes: note })
  if (error || !data?.[0]) { console.warn('No se pudo guardar el pedido', error); return null }
  return { folio: Number(data[0].folio), total: Number(data[0].total) }
}

export function CartDrawer() {
  const { lines, total, open, setOpen, change, clear } = useCart()
  const [note, setNote] = useState('')
  const [sending, setSending] = useState(false)

  const msg = (folio?: number, tot = total) =>
    `Hola, quiero hacer este pedido en Pa'dentro${folio ? ` (folio #${folio})` : ''}:\n\n` +
    lines.map(l => `• ${l.qty}x ${l.name}${l.variant ? ` (${l.variant})` : ''} — ${mxn(l.qty * l.price)}`).join('\n') +
    `\n\nTotal: ${mxn(tot)}` + (note.trim() ? `\nNotas: ${note.trim()}` : '')

  const send = async () => {
    if (!lines.length || sending) return
    setSending(true)
    // Se abre la pestaña antes de esperar a la red para que el navegador no la bloquee.
    const w = window.open('', '_blank')
    const saved = await saveOrder(lines, note.trim())
    const url = waLink(msg(saved?.folio, saved?.total ?? total))
    if (w) w.location.href = url
    else location.href = url
    setSending(false)
    if (saved) { clear(); setNote(''); setOpen(false) }
  }

  return (
    <>
      <div className={'scrim' + (open ? ' on' : '')} onClick={() => setOpen(false)} />
      <aside className={'drawer' + (open ? ' on' : '')} aria-hidden={!open} aria-label="Tu pedido">
        <header>
          <div><h3>Tu pedido</h3><small>{lines.length ? `${lines.length} producto(s)` : 'Sin productos'}</small></div>
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
                <div><b>{l.name}</b>{l.variant && <em>{l.variant}</em>}<span>{mxn(l.price)}</span></div>
                <div className="qty">
                  <button onClick={() => change(l.key, -1)} aria-label="Quitar">−</button>
                  <i>{l.qty}</i>
                  <button onClick={() => change(l.key, 1)} aria-label="Agregar">+</button>
                </div>
              </div>
            ))}
            <textarea placeholder="Notas (tipo de pedido, mesa, alergias…)" value={note} maxLength={500} onChange={e => setNote(e.target.value)} />
            <button className="link" onClick={clear}>Vaciar pedido</button>
          </div>
        )}
        <footer>
          <div className="tot"><span>TOTAL</span><b>{mxn(total)}</b></div>
          <button className={'btn wa' + (lines.length && !sending ? '' : ' off')} onClick={send} disabled={!lines.length || sending}>
            {sending ? 'Enviando…' : 'Enviar pedido por WhatsApp'}
          </button>
          <p>Confirmaremos disponibilidad y forma de pago por WhatsApp. Precios en MXN con IVA; propina voluntaria.</p>
        </footer>
      </aside>
    </>
  )
}
