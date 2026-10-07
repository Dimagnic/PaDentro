import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import type { Line } from './types'
import { waLink } from './config'

interface Ctx {
  lines: Line[]; count: number; total: number; open: boolean
  setOpen: (v: boolean) => void
  add: (name: string, price: number, variant?: string) => void
  change: (key: string, d: number) => void
  clear: () => void
}
const C = createContext<Ctx>(null!)
export const useCart = () => useContext(C)
export const mxn = (n: number) => '$' + n.toLocaleString('es-MX')

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<Line[]>([])
  const [open, setOpen] = useState(false)
  const v = useMemo<Ctx>(() => ({
    lines, open, setOpen,
    count: lines.reduce((a, l) => a + l.qty, 0),
    total: lines.reduce((a, l) => a + l.qty * l.price, 0),
    add: (name, price, variant) => setLines(p => {
      const key = name + (variant ? '|' + variant : '')
      return p.some(l => l.key === key)
        ? p.map(l => (l.key === key ? { ...l, qty: l.qty + 1 } : l))
        : [...p, { key, name, variant, price, qty: 1 }]
    }),
    change: (key, d) => setLines(p => p.map(l => (l.key === key ? { ...l, qty: l.qty + d } : l)).filter(l => l.qty > 0)),
    clear: () => setLines([]),
  }), [lines, open])
  return <C.Provider value={v}>{children}</C.Provider>
}

export function CartDrawer() {
  const { lines, total, open, setOpen, change, clear } = useCart()
  const [note, setNote] = useState('')
  const msg = () =>
    `Hola, quiero hacer este pedido en Pa'dentro:\n\n` +
    lines.map(l => `• ${l.qty}x ${l.name}${l.variant ? ` (${l.variant})` : ''} — ${mxn(l.qty * l.price)}`).join('\n') +
    `\n\nTotal: ${mxn(total)}` + (note.trim() ? `\nNotas: ${note.trim()}` : '')
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
            <textarea placeholder="Notas (tipo de pedido, mesa, alergias…)" value={note} onChange={e => setNote(e.target.value)} />
            <button className="link" onClick={clear}>Vaciar pedido</button>
          </div>
        )}
        <footer>
          <div className="tot"><span>TOTAL</span><b>{mxn(total)}</b></div>
          <a className={'btn wa' + (lines.length ? '' : ' off')} href={lines.length ? waLink(msg()) : undefined} target="_blank" rel="noopener">
            Enviar pedido por WhatsApp
          </a>
          <p>Confirmaremos disponibilidad y forma de pago por WhatsApp. Precios en MXN con IVA; propina voluntaria.</p>
        </footer>
      </aside>
    </>
  )
}
