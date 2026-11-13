import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { supabase } from '../supabase'

export const sb = supabase!
export const money = (n: number | null | undefined) => (n == null ? '—' : '$' + Number(n).toLocaleString('es-MX', { maximumFractionDigits: 2 }))

export type Status = 'nuevo' | 'confirmado' | 'preparando' | 'listo' | 'entregado' | 'cancelado'
export const STATUSES: Status[] = ['nuevo', 'confirmado', 'preparando', 'listo', 'entregado', 'cancelado']
export const STATUS_LABEL: Record<Status, string> = {
  nuevo: 'Nuevo', confirmado: 'Confirmado', preparando: 'En preparación', listo: 'Listo para recoger', entregado: 'Entregado', cancelado: 'Cancelado',
}
export const NEXT: Partial<Record<Status, Status>> = { nuevo: 'confirmado', confirmado: 'preparando', preparando: 'listo', listo: 'entregado' }
export const CHANNEL_LABEL: Record<string, string> = { online: 'Web · pagado en línea', whatsapp: 'Web · WhatsApp', pos: 'Mostrador', telefono: 'Teléfono' }
export const PAY_LABEL: Record<string, string> = {
  paid: 'Pagado', partial: 'Pago parcial', none: 'Por cobrar', pending: 'Esperando pago en línea', expired: 'Pago no completado', refunded: 'Reembolsado',
}

export interface OrderLine { item_id?: number; name: string; variant: string | null; price: number; qty: number; subtotal: number }
export interface Order {
  id: string; folio: number; created_at: string; updated_at: string; total: number; discount: number; notes: string; status: Status
  items: OrderLine[]; channel: 'whatsapp' | 'online' | 'pos' | 'telefono'
  payment_status: 'none' | 'pending' | 'partial' | 'paid' | 'expired' | 'refunded'; payment_method: string; amount_paid: number
  customer_name: string; customer_phone: string; pickup_time: string; scheduled_for: string | null; tracking_code: string
  status_history: { status: Status; at: string }[]
}
/** Un pedido en línea solo cuenta (y se prepara) cuando ya está pagado. */
export const counts = (o: Order) => o.channel !== 'online' || ['paid', 'partial', 'refunded'].includes(o.payment_status)
export const balance = (o: Order) => Math.max(Number(o.total) - Number(o.amount_paid), 0)

export const fmtDate = (iso: string, opts: Intl.DateTimeFormatOptions = { dateStyle: 'medium', timeStyle: 'short' }) =>
  new Date(iso).toLocaleString('es-MX', { timeZone: 'America/Mexico_City', ...opts })
export const mxDay = (iso: string) => new Date(new Date(iso).getTime() - 6 * 3600_000).toISOString().slice(0, 10)
export const waTo = (phone: string, text: string) => {
  const d = phone.replace(/\D/g, '')
  return `https://wa.me/${d.length === 10 ? '52' + d : d}?text=${encodeURIComponent(text)}`
}

export function beep() {
  try {
    const ctx = new AudioContext(); const o = ctx.createOscillator(); const g = ctx.createGain()
    o.connect(g); g.connect(ctx.destination); o.frequency.value = 880; g.gain.value = 0.15
    o.start(); o.frequency.setValueAtTime(660, ctx.currentTime + 0.15); o.stop(ctx.currentTime + 0.35)
  } catch { /* sin audio */ }
}

/* ---------- Pedidos en tiempo real, compartidos por Caja, Pedidos y Calendario ---------- */
interface OrdersCtx { orders: Order[]; loading: boolean; error: string; reload: () => Promise<void>; sound: boolean; setSound: (v: boolean) => void; open: (id: string | null) => void; openId: string | null }
const OC = createContext<OrdersCtx>(null!)
export const useOrders = () => useContext(OC)

export function OrdersProvider({ children }: { children: ReactNode }) {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [sound, setSound] = useState(() => localStorage.getItem('pd-sound') !== '0')
  const [openId, open] = useState<string | null>(null)
  const seen = useRef<Set<string> | null>(null)
  const soundRef = useRef(sound)
  soundRef.current = sound

  const reload = useCallback(async () => {
    const since = new Date(Date.now() - 120 * 86400_000).toISOString()
    const { data, error } = await sb.from('orders').select('*')
      .or(`created_at.gte.${since},scheduled_for.gte.${new Date().toISOString()}`)
      .order('created_at', { ascending: false }).limit(2000)
    setLoading(false)
    if (error) return setError(error.message)
    setError('')
    const list = data as Order[]
    const relevant = list.filter(counts).map(o => o.id)
    if (seen.current && soundRef.current && relevant.some(id => !seen.current!.has(id))) beep()
    seen.current = new Set(relevant)
    setOrders(list)
  }, [])

  useEffect(() => {
    reload()
    let t: number | undefined
    const ch = sb.channel('admin-pedidos')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => { clearTimeout(t); t = window.setTimeout(reload, 250) })
      .subscribe()
    const poll = setInterval(reload, 30000) // respaldo por si se corta la conexión en tiempo real
    return () => { sb.removeChannel(ch); clearInterval(poll) }
  }, [reload])

  const nuevos = orders.filter(o => counts(o) && o.status === 'nuevo').length
  useEffect(() => { document.title = (nuevos ? `(${nuevos}) ` : '') + "Panel · Pa'dentro" }, [nuevos])

  return (
    <OC.Provider value={{ orders, loading, error, reload, sound, setSound: v => { setSound(v); localStorage.setItem('pd-sound', v ? '1' : '0'); if (v) beep() }, open, openId }}>
      {children}
    </OC.Provider>
  )
}

/* ---------- Carta para la caja y para agregar productos ---------- */
export interface PosItem { id: number; name: string; price: number | null; bottle: number | null; available: boolean; section: string; sub: string; cat: string }
export function useCatalog() {
  const [items, setItems] = useState<PosItem[]>([])
  useEffect(() => {
    sb.from('menu_categories').select('tab, sort, active, menu_sections(title, sub, sort, active, menu_items(id, name, price, bottle_price, available, sort))').order('sort')
      .then(({ data }) => {
        type S = { title: string; sub: string; sort: number; active: boolean; menu_items: { id: number; name: string; price: number | null; bottle_price: number | null; available: boolean; sort: number }[] }
        const out: PosItem[] = []
        for (const c of (data ?? []) as { tab: string; active: boolean; menu_sections: S[] }[]) {
          if (!c.active) continue
          for (const s of [...c.menu_sections].sort((a, b) => a.sort - b.sort)) {
            if (!s.active) continue
            for (const i of [...s.menu_items].sort((a, b) => a.sort - b.sort))
              out.push({ id: i.id, name: i.name, price: i.price == null ? null : Number(i.price), bottle: i.bottle_price == null ? null : Number(i.bottle_price), available: i.available, section: s.title, sub: s.sub, cat: c.tab })
          }
        }
        setItems(out)
      })
  }, [])
  return items
}

/** Imprime el ticket de un pedido (58/80 mm). */
export function printTicket(o: Pick<Order, 'folio' | 'created_at' | 'items' | 'total' | 'discount' | 'amount_paid' | 'payment_method' | 'customer_name' | 'scheduled_for' | 'tracking_code' | 'notes'>, bizName: string) {
  const w = window.open('', '_blank', 'width=380,height=640')
  if (!w) return
  const esc = (s: string) => s.replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]!))
  const rows = o.items.map(l => `<tr><td>${l.qty}× ${esc(l.name)}${l.variant ? ` (${esc(l.variant)})` : ''}</td><td>${money(l.subtotal)}</td></tr>`).join('')
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Ticket #${o.folio}</title><style>
    body{font:13px/1.4 ui-monospace,Menlo,Consolas,monospace;width:72mm;margin:0 auto;padding:6mm 0;color:#000}
    h1{font-size:15px;text-align:center;margin:0 0 4px}p{margin:2px 0;text-align:center}table{width:100%;border-collapse:collapse;margin:8px 0}
    td{padding:2px 0;vertical-align:top}td+td{text-align:right;white-space:nowrap;padding-left:8px}hr{border:0;border-top:1px dashed #000}
    .t td{font-weight:700;font-size:15px}@media print{@page{margin:0}}</style></head><body>
    <h1>${esc(bizName)}</h1><p>Pedido #${o.folio}</p><p>${fmtDate(o.created_at)}</p>
    ${o.customer_name ? `<p>Cliente: ${esc(o.customer_name)}</p>` : ''}
    ${o.scheduled_for ? `<p><b>Recoge: ${fmtDate(o.scheduled_for, { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}</b></p>` : ''}
    <hr><table>${rows}${Number(o.discount) > 0 ? `<tr><td>Descuento</td><td>-${money(o.discount)}</td></tr>` : ''}<tr class="t"><td>Total</td><td>${money(o.total)}</td></tr>
    <tr><td>Pagado${o.payment_method ? ' (' + esc(o.payment_method) + ')' : ''}</td><td>${money(o.amount_paid)}</td></tr>
    ${Number(o.total) - Number(o.amount_paid) > 0 ? `<tr><td>Saldo</td><td>${money(Number(o.total) - Number(o.amount_paid))}</td></tr>` : ''}</table>
    ${o.notes ? `<hr><p>Notas: ${esc(o.notes)}</p>` : ''}<hr><p>Sigue tu pedido: ${location.origin}/pedido?c=${o.tracking_code}</p><p>¡Gracias por su visita!</p>
    <script>onload=()=>{print();setTimeout(()=>close(),300)}<\/script></body></html>`)
  w.document.close()
}
