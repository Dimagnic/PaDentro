import { useMemo, useState } from 'react'
import { beep, money, printTicket, sb, useCatalog, useOrders, type OrderLine, type PosItem } from './shared'
import { DEFAULT_CONTENT, isoMx, nowMx } from '../content'

type Line = { key: string; id: number; name: string; variant: 'Botella' | null; price: number; qty: number }
type Method = 'efectivo' | 'tarjeta' | 'transferencia' | ''
const METHODS: [Method, string][] = [['efectivo', 'Efectivo'], ['tarjeta', 'Tarjeta'], ['transferencia', 'Transferencia'], ['', 'Por cobrar']]

/** Punto de venta: ventas de mostrador y pedidos por teléfono. */
export default function Pos() {
  const catalog = useCatalog()
  const { reload, open } = useOrders()
  const cats = useMemo(() => [...new Set(catalog.map(i => i.cat))], [catalog])
  const [cat, setCat] = useState('')
  const [q, setQ] = useState('')
  const [lines, setLines] = useState<Line[]>([])
  const [channel, setChannel] = useState<'pos' | 'telefono' | 'whatsapp'>('pos')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [later, setLater] = useState(false)
  const [date, setDate] = useState(nowMx().date)
  const [time, setTime] = useState('14:00')
  const [discount, setDiscount] = useState('')
  const [notes, setNotes] = useState('')
  const [method, setMethod] = useState<Method>('efectivo')
  const [received, setReceived] = useState('')
  const [deliverNow, setDeliverNow] = useState(true)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [done, setDone] = useState<{ id: string; folio: number; total: number; code: string; snapshot: OrderLine[] } | null>(null)

  const activeCat = cat || cats[0] || ''
  const s = q.trim().toLowerCase()
  const shown = catalog.filter(i => (s ? i.name.toLowerCase().includes(s) : i.cat === activeCat))
  const sections = [...new Set(shown.map(i => i.section))]

  const subtotal = lines.reduce((a, l) => a + l.price * l.qty, 0)
  const disc = Math.min(Math.max(Number(discount) || 0, 0), subtotal)
  const total = subtotal - disc
  const change = method === 'efectivo' && Number(received) > total ? Number(received) - total : 0

  const add = (it: PosItem, variant: 'Botella' | null) => {
    const price = variant === 'Botella' ? it.bottle : it.price
    if (price == null || !it.available) return
    const key = `${it.id}|${variant ?? ''}`
    setLines(p => p.some(l => l.key === key) ? p.map(l => l.key === key ? { ...l, qty: l.qty + 1 } : l) : [...p, { key, id: it.id, name: it.name, variant, price, qty: 1 }])
  }
  const qty = (key: string, d: number) => setLines(p => p.map(l => l.key === key ? { ...l, qty: l.qty + d } : l).filter(l => l.qty > 0))
  const reset = () => { setLines([]); setName(''); setPhone(''); setLater(false); setDiscount(''); setNotes(''); setMethod('efectivo'); setReceived(''); setDeliverNow(true); setErr('') }

  const immediate = !later && channel === 'pos'
  const submit = async () => {
    if (!lines.length || busy) return
    if (later && (!date || !time)) return setErr('Elige fecha y hora.')
    setBusy(true); setErr('')
    const { data, error } = await sb.rpc('pos_create_order', {
      p_items: lines.map(l => ({ id: l.id, qty: l.qty, variant: l.variant })),
      p_channel: channel, p_customer_name: name, p_customer_phone: phone, p_notes: notes,
      p_scheduled: later ? isoMx(date, time) : null, p_discount: disc, p_payment_method: method,
      p_status: immediate && deliverNow && method ? 'entregado' : 'confirmado',
    })
    setBusy(false)
    if (error || !data?.[0]) return setErr(error?.message ?? 'No se pudo registrar la venta.')
    beep()
    setDone({ id: data[0].id, folio: Number(data[0].folio), total: Number(data[0].total), code: data[0].tracking_code,
      snapshot: lines.map(l => ({ name: l.name, variant: l.variant, price: l.price, qty: l.qty, subtotal: l.price * l.qty })) })
    reload()
  }

  if (done) return (
    <section className="pos-done">
      <div className="pos-done-card">
        <span>Venta registrada</span>
        <h2>Pedido #{done.folio}</h2>
        <p className="big">{money(done.total)}</p>
        {change > 0 && <p className="change">Cambio: <b>{money(change)}</b></p>}
        <p className="ad-muted">Código de seguimiento {done.code}</p>
        <div className="row-btns center">
          <button className="ad-btn ghost" onClick={() => printTicket({ folio: done.folio, created_at: new Date().toISOString(), items: done.snapshot, total: done.total, discount: disc,
            amount_paid: method ? done.total : 0, payment_method: method, customer_name: name, scheduled_for: later ? isoMx(date, time) : null, tracking_code: done.code, notes }, DEFAULT_CONTENT.biz.name)}>Imprimir ticket</button>
          <button className="ad-btn ghost" onClick={() => open(done.id)}>Ver pedido</button>
          <button className="ad-btn gold" onClick={() => { setDone(null); reset() }}>Nueva venta</button>
        </div>
      </div>
    </section>
  )

  return (
    <section className="pos">
      <div className="pos-products">
        <input className="pos-search" placeholder="Buscar producto…" value={q} onChange={e => setQ(e.target.value)} />
        {!s && <div className="chips">{cats.map(c => <button key={c} className={c === activeCat ? 'on' : ''} onClick={() => setCat(c)}>{c}</button>)}</div>}
        <div className="pos-scroll">
          {sections.map(sec => (
            <div key={sec}>
              <h4>{sec}</h4>
              <div className="pgrid">
                {shown.filter(i => i.section === sec).map(i => i.bottle != null ? (
                  <div key={i.id} className={'pbtn dual' + (i.available ? '' : ' off')}>
                    <b>{i.name}</b>
                    <div><button disabled={!i.available || i.price == null} onClick={() => add(i, null)}>Copa {money(i.price)}</button><button disabled={!i.available} onClick={() => add(i, 'Botella')}>Botella {money(i.bottle)}</button></div>
                  </div>
                ) : (
                  <button key={i.id} className={'pbtn' + (i.available && i.price != null ? '' : ' off')} disabled={!i.available || i.price == null} onClick={() => add(i, null)}>
                    <b>{i.name}</b><span>{i.price == null ? 'Sin precio' : i.available ? money(i.price) : 'Agotado'}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
          {!shown.length && <p className="ad-muted">{catalog.length ? 'Sin resultados.' : 'Cargando carta…'}</p>}
        </div>
      </div>

      <aside className="pos-ticket">
        <div className="seg-ad full">
          {([['pos', 'Mostrador'], ['telefono', 'Teléfono'], ['whatsapp', 'WhatsApp']] as const).map(([k, l]) => <button key={k} className={channel === k ? 'on' : ''} onClick={() => setChannel(k)}>{l}</button>)}
        </div>
        <ul className="tlines">
          {lines.map(l => (
            <li key={l.key}>
              <div><b>{l.name}</b>{l.variant && <em>{l.variant}</em>}<small>{money(l.price)} c/u</small></div>
              <div className="tq"><button onClick={() => qty(l.key, -1)}>−</button><i>{l.qty}</i><button onClick={() => qty(l.key, 1)}>+</button></div>
              <span>{money(l.price * l.qty)}</span>
            </li>
          ))}
          {!lines.length && <li className="empty-t">Toca productos de la izquierda para agregarlos.</li>}
        </ul>

        <div className="tform">
          <div className="two-ad">
            <label>Cliente<input value={name} onChange={e => setName(e.target.value)} placeholder={channel === 'pos' ? 'Opcional' : 'Nombre'} /></label>
            <label>Teléfono<input value={phone} onChange={e => setPhone(e.target.value)} inputMode="tel" placeholder="Opcional" /></label>
          </div>
          <label className="ad-check"><input type="checkbox" checked={later} onChange={e => setLater(e.target.checked)} /> Programar para otra fecha u hora</label>
          {later && <div className="two-ad">
            <label>Fecha<input type="date" value={date} min={nowMx().date} onChange={e => setDate(e.target.value)} /></label>
            <label>Hora<input type="time" value={time} step={900} onChange={e => setTime(e.target.value)} /></label>
          </div>}
          <div className="two-ad">
            <label>Descuento ($)<input inputMode="decimal" value={discount} onChange={e => setDiscount(e.target.value.replace(/[^\d.]/g, ''))} placeholder="0" /></label>
            <label>Notas<input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Sin cebolla, mesa 4…" /></label>
          </div>
          <div className="methods">{METHODS.map(([k, l]) => <button key={l} className={method === k ? 'on' : ''} onClick={() => setMethod(k)}>{l}</button>)}</div>
          {method === 'efectivo' && <label className="recv">Recibido<input inputMode="decimal" value={received} onChange={e => setReceived(e.target.value.replace(/[^\d.]/g, ''))} placeholder={String(total)} />{change > 0 && <b>Cambio {money(change)}</b>}</label>}
          {immediate && method && <label className="ad-check"><input type="checkbox" checked={deliverNow} onChange={e => setDeliverNow(e.target.checked)} /> Entregado en el momento (no pasa a cocina)</label>}
        </div>

        <div className="ttot">
          {disc > 0 && <div><span>Subtotal</span><span>{money(subtotal)}</span></div>}
          {disc > 0 && <div><span>Descuento</span><span>−{money(disc)}</span></div>}
          <div className="grand"><span>Total</span><b>{money(total)}</b></div>
        </div>
        {err && <p className="ad-err">{err}</p>}
        <button className="ad-btn gold big" disabled={!lines.length || busy} onClick={submit}>
          {busy ? 'Registrando…' : method ? `Cobrar ${money(total)}` : `Registrar pedido · ${money(total)}`}
        </button>
        {lines.length > 0 && <button className="ad-link" onClick={reset}>Vaciar</button>}
      </aside>
    </section>
  )
}
