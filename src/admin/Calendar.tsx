import { useMemo, useState } from 'react'
import { counts, fmtDate, money, mxDay, STATUS_LABEL, useOrders, type Order } from './shared'
import { MONTHS } from '../content'

/** Calendario de pedidos programados (recoger en fecha futura). */
export default function Calendar() {
  const { orders, open } = useOrders()
  const today = mxDay(new Date().toISOString())
  const [month, setMonth] = useState(today.slice(0, 7))
  const [day, setDay] = useState(today)
  const [y, m] = month.split('-').map(Number)

  const byDay = useMemo(() => {
    const map: Record<string, Order[]> = {}
    for (const o of orders) {
      if (!o.scheduled_for || !counts(o) || o.status === 'cancelado') continue
      const d = mxDay(o.scheduled_for); (map[d] ??= []).push(o)
    }
    for (const k in map) map[k].sort((a, b) => a.scheduled_for!.localeCompare(b.scheduled_for!))
    return map
  }, [orders])

  const cells = useMemo(() => {
    const lead = new Date(`${month}-01T12:00:00Z`).getUTCDay()
    const n = new Date(Date.UTC(y, m, 0)).getUTCDate()
    return [...Array(lead).fill(null), ...Array.from({ length: n }, (_, i) => `${month}-${String(i + 1).padStart(2, '0')}`)] as (string | null)[]
  }, [month, y, m])
  const shift = (n: number) => setMonth(new Date(Date.UTC(y, m - 1 + n, 1)).toISOString().slice(0, 7))
  const list = byDay[day] ?? []
  const upcoming = Object.keys(byDay).filter(d => d >= today).sort().slice(0, 7)

  return (
    <section>
      <div className="ad-head"><h2>Calendario de pedidos programados</h2></div>
      <div className="cal-layout">
        <div className="cal">
          <div className="cal-head">
            <button className="ad-btn sm ghost" onClick={() => shift(-1)}>‹</button>
            <b>{MONTHS[m - 1]} {y}</b>
            <button className="ad-btn sm ghost" onClick={() => shift(1)}>›</button>
            <button className="ad-btn sm ghost" onClick={() => { setMonth(today.slice(0, 7)); setDay(today) }}>Hoy</button>
          </div>
          <div className="cal-grid">
            {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map(d => <span key={d} className="cal-dow">{d}</span>)}
            {cells.map((d, i) => d == null ? <span key={i} /> : (
              <button key={d} className={(d === day ? 'on ' : '') + (d === today ? 'today ' : '') + (d < today ? 'past' : '')} onClick={() => setDay(d)}>
                <i>{Number(d.slice(8))}</i>
                {byDay[d] && <><b>{byDay[d].length} pedido{byDay[d].length > 1 ? 's' : ''}</b><small>{money(byDay[d].reduce((a, o) => a + Number(o.total), 0))}</small></>}
              </button>
            ))}
          </div>
        </div>
        <aside className="cal-side">
          <h3>{fmtDate(day + 'T18:00:00Z', { weekday: 'long', day: 'numeric', month: 'long' })}</h3>
          {list.length === 0 && <p className="ad-muted">No hay pedidos programados para este día.</p>}
          {list.map(o => (
            <button key={o.id} className={'cal-item st-' + o.status} onClick={() => open(o.id)}>
              <time>{fmtDate(o.scheduled_for!, { hour: 'numeric', minute: '2-digit' })}</time>
              <div><b>#{o.folio} {o.customer_name}</b><small>{o.items.map(l => `${l.qty}× ${l.name}`).join(', ')}</small></div>
              <span>{STATUS_LABEL[o.status]}<em>{money(o.total)}</em></span>
            </button>
          ))}
          {upcoming.length > 0 && <>
            <h4>Próximos días con pedidos</h4>
            <ul className="cal-up">{upcoming.map(d => <li key={d}><button onClick={() => { setDay(d); setMonth(d.slice(0, 7)) }}>{fmtDate(d + 'T18:00:00Z', { weekday: 'short', day: 'numeric', month: 'short' })}<b>{byDay[d].length}</b></button></li>)}</ul>
          </>}
        </aside>
      </div>
    </section>
  )
}
