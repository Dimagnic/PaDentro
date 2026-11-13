import { useMemo, useState } from 'react'
import {
  balance, beep, CHANNEL_LABEL, counts, fmtDate, money, mxDay, NEXT, PAY_LABEL, printTicket, sb, STATUS_LABEL, STATUSES,
  useCatalog, useOrders, waTo, type Order, type PosItem, type Status,
} from './shared'
import { DEFAULT_CONTENT } from '../content'

const BIZ = DEFAULT_CONTENT.biz.name
const BOARD: Status[] = ['nuevo', 'confirmado', 'preparando', 'listo']

/* ---------------------------- Tarjeta ---------------------------- */
function OrderCard({ o }: { o: Order }) {
  const { open } = useOrders()
  const due = balance(o)
  return (
    <button className={'oc st-' + o.status} onClick={() => open(o.id)}>
      <div className="oc-top"><b>#{o.folio}</b><span className={'pill ch-' + o.channel}>{CHANNEL_LABEL[o.channel]}</span></div>
      {o.scheduled_for
        ? <div className="oc-when sched">📅 {fmtDate(o.scheduled_for, { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}</div>
        : <div className="oc-when">Lo antes posible · {fmtDate(o.created_at, { hour: 'numeric', minute: '2-digit' })}</div>}
      {o.customer_name && <div className="oc-name">{o.customer_name}</div>}
      <ul>{o.items.slice(0, 4).map((l, k) => <li key={k}>{l.qty}× {l.name}{l.variant ? ` (${l.variant})` : ''}</li>)}{o.items.length > 4 && <li>+{o.items.length - 4} más</li>}</ul>
      <div className="oc-foot"><b>{money(o.total)}</b><span className={'pay ' + (due > 0 ? 'due' : 'ok')}>{due > 0 ? `Saldo ${money(due)}` : 'Pagado'}</span></div>
    </button>
  )
}

/* ---------------------------- Tablero ---------------------------- */
export function Board() {
  const { orders, sound, setSound, reload, error } = useOrders()
  const [day, setDay] = useState<'hoy' | 'todos'>('hoy')
  const today = mxDay(new Date().toISOString())
  const active = orders.filter(o => counts(o) && BOARD.includes(o.status))
    .filter(o => day === 'todos' || !o.scheduled_for || mxDay(o.scheduled_for) <= today)
    .sort((a, b) => (a.scheduled_for ?? a.created_at).localeCompare(b.scheduled_for ?? b.created_at))
  const later = orders.filter(o => counts(o) && BOARD.includes(o.status) && o.scheduled_for && mxDay(o.scheduled_for) > today).length
  const waiting = orders.filter(o => o.channel === 'online' && o.payment_status === 'pending').length

  return (
    <section>
      <div className="ad-head">
        <h2>Pedidos en curso</h2>
        <div className="ad-tools">
          <div className="seg-ad">
            <button className={day === 'hoy' ? 'on' : ''} onClick={() => setDay('hoy')}>Para hoy</button>
            <button className={day === 'todos' ? 'on' : ''} onClick={() => setDay('todos')}>Todos {later > 0 && <i>{later} programados</i>}</button>
          </div>
          <label className="ad-check" title="Sonar cuando llegue un pedido"><input type="checkbox" checked={sound} onChange={e => setSound(e.target.checked)} /> Sonido</label>
          <button className="ad-btn sm ghost" onClick={reload}>Actualizar</button>
        </div>
      </div>
      {error && <p className="ad-err">{error}</p>}
      {waiting > 0 && <p className="ad-muted">{waiting} pedido(s) web esperando que el cliente termine de pagar; aparecerán aquí al confirmarse.</p>}
      <div className="board">
        {BOARD.map(st => {
          const col = active.filter(o => o.status === st)
          return (
            <div className="col" key={st}>
              <h3>{STATUS_LABEL[st]} <span>{col.length}</span></h3>
              {col.map(o => <OrderCard key={o.id} o={o} />)}
              {!col.length && <p className="col-empty">Sin pedidos</p>}
            </div>
          )
        })}
      </div>
    </section>
  )
}

/* ---------------------------- Historial ---------------------------- */
const csvCell = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`
export function History() {
  const { orders } = useOrders()
  const today = mxDay(new Date().toISOString())
  const [from, setFrom] = useState(() => mxDay(new Date(Date.now() - 6 * 86400_000).toISOString()))
  const [to, setTo] = useState(today)
  const [q, setQ] = useState('')
  const [st, setSt] = useState<string>('')
  const [ch, setCh] = useState<string>('')
  const { open } = useOrders()

  const rows = useMemo(() => orders.filter(o => {
    const d = mxDay(o.created_at)
    if (d < from || d > to) return false
    if (st && o.status !== st) return false
    if (ch && o.channel !== ch) return false
    if (!counts(o) && st !== 'cancelado') return false
    const s = q.trim().toLowerCase()
    return !s || String(o.folio) === s.replace('#', '') || o.customer_name.toLowerCase().includes(s) || o.customer_phone.includes(s) || o.tracking_code.toLowerCase() === s
  }), [orders, from, to, q, st, ch])

  const valid = rows.filter(o => o.status !== 'cancelado')
  const sales = valid.reduce((a, o) => a + Number(o.total), 0)
  const cobrado = valid.reduce((a, o) => a + Number(o.amount_paid), 0)
  const byMethod = valid.reduce<Record<string, number>>((a, o) => { const k = o.payment_method || 'sin cobrar'; a[k] = (a[k] ?? 0) + Number(o.amount_paid); return a }, {})

  const exportCsv = () => {
    const head = ['Folio', 'Fecha', 'Canal', 'Estado', 'Pago', 'Método', 'Cliente', 'Teléfono', 'Programado para', 'Productos', 'Descuento', 'Total', 'Pagado', 'Saldo', 'Notas', 'Código']
    const lines = rows.map(o => [o.folio, fmtDate(o.created_at), CHANNEL_LABEL[o.channel], STATUS_LABEL[o.status], PAY_LABEL[o.payment_status], o.payment_method, o.customer_name, o.customer_phone,
      o.scheduled_for ? fmtDate(o.scheduled_for) : '', o.items.map(l => `${l.qty}x ${l.name}${l.variant ? ` (${l.variant})` : ''}`).join('; '), o.discount, o.total, o.amount_paid, balance(o), o.notes, o.tracking_code].map(csvCell).join(','))
    const blob = new Blob(['﻿' + [head.map(csvCell).join(','), ...lines].join('\n')], { type: 'text/csv;charset=utf-8' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `pedidos_${from}_a_${to}.csv`; a.click()
  }

  return (
    <section>
      <div className="ad-head"><h2>Registro de pedidos</h2><button className="ad-btn sm ghost" onClick={exportCsv} disabled={!rows.length}>Descargar Excel (CSV)</button></div>
      <div className="filters-ad">
        <label>Desde<input type="date" value={from} max={to} onChange={e => setFrom(e.target.value)} /></label>
        <label>Hasta<input type="date" value={to} min={from} onChange={e => setTo(e.target.value)} /></label>
        <label>Estado<select value={st} onChange={e => setSt(e.target.value)}><option value="">Todos</option>{STATUSES.map(s => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}</select></label>
        <label>Canal<select value={ch} onChange={e => setCh(e.target.value)}><option value="">Todos</option>{Object.entries(CHANNEL_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
        <label className="grow">Buscar<input placeholder="Folio, nombre, teléfono o código" value={q} onChange={e => setQ(e.target.value)} /></label>
      </div>
      <div className="kpis">
        <div><span>Pedidos</span><b>{valid.length}</b></div>
        <div><span>Ventas</span><b>{money(sales)}</b></div>
        <div><span>Cobrado</span><b>{money(cobrado)}</b></div>
        <div><span>Ticket promedio</span><b>{money(valid.length ? sales / valid.length : 0)}</b></div>
        <div className="wide"><span>Por método</span><p>{Object.entries(byMethod).map(([k, v]) => <em key={k}>{k}: {money(v)}</em>)}</p></div>
      </div>
      <div className="table-wrap">
        <table className="tbl">
          <thead><tr><th>Folio</th><th>Fecha</th><th>Canal</th><th>Cliente</th><th>Para</th><th>Estado</th><th>Pago</th><th className="r">Total</th></tr></thead>
          <tbody>
            {rows.map(o => (
              <tr key={o.id} onClick={() => open(o.id)}>
                <td><b>#{o.folio}</b></td>
                <td>{fmtDate(o.created_at, { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}</td>
                <td>{CHANNEL_LABEL[o.channel]}</td>
                <td>{o.customer_name || '—'}</td>
                <td>{o.scheduled_for ? fmtDate(o.scheduled_for, { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) : 'Inmediato'}</td>
                <td><span className={'st st-' + o.status}>{STATUS_LABEL[o.status]}</span></td>
                <td>{PAY_LABEL[o.payment_status]}</td>
                <td className="r">{money(o.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!rows.length && <p className="ad-muted pad">No hay pedidos con estos filtros.</p>}
      </div>
    </section>
  )
}

/* ---------------------------- Selector de productos ---------------------------- */
export function ProductPicker({ catalog, onPick }: { catalog: PosItem[]; onPick: (it: PosItem, variant: 'Botella' | null) => void }) {
  const [q, setQ] = useState('')
  const s = q.trim().toLowerCase()
  const list = s ? catalog.filter(i => i.name.toLowerCase().includes(s) || i.section.toLowerCase().includes(s)).slice(0, 30) : []
  return (
    <div className="picker">
      <input placeholder="Buscar producto para agregar…" value={q} onChange={e => setQ(e.target.value)} autoFocus />
      {list.length > 0 && (
        <ul>
          {list.map(i => (
            <li key={i.id} className={i.available ? '' : 'off'}>
              <span>{i.name}<small>{i.section}</small></span>
              {i.price != null && <button disabled={!i.available} onClick={() => onPick(i, null)}>{i.bottle != null ? 'Copa ' : ''}{money(i.price)}</button>}
              {i.bottle != null && <button disabled={!i.available} onClick={() => onPick(i, 'Botella')}>Botella {money(i.bottle)}</button>}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/* ---------------------------- Detalle del pedido ---------------------------- */
export function OrderDrawer() {
  const { orders, openId, open, reload } = useOrders()
  const catalog = useCatalog()
  const o = orders.find(x => x.id === openId)
  const [adding, setAdding] = useState(false)
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  if (!o) return null

  const run = async (fn: () => PromiseLike<{ error: { message: string } | null }>) => {
    setBusy(true); setErr('')
    const { error } = await fn()
    setBusy(false)
    if (error) setErr(error.message.replace(/^.*?: /, ''))
    await reload()
  }
  const setStatus = (status: Status) => run(() => sb.from('orders').update({ status }).eq('id', o.id))
  const due = balance(o)
  const next = NEXT[o.status]
  const track = `${location.origin}/pedido?c=${o.tracking_code}`
  const closed = ['entregado', 'cancelado'].includes(o.status)

  return (
    <>
      <div className="ad-scrim" onClick={() => open(null)} />
      <aside className="ad-drawer" role="dialog" aria-label={`Pedido ${o.folio}`}>
        <header>
          <div><h2>Pedido #{o.folio}</h2><p>{CHANNEL_LABEL[o.channel]} · {fmtDate(o.created_at)}</p></div>
          <button className="ad-x" onClick={() => open(null)} aria-label="Cerrar">✕</button>
        </header>
        <div className="ad-dbody">
          {err && <p className="ad-err">{err}</p>}
          <div className={'st-big st-' + o.status}>{STATUS_LABEL[o.status]}</div>
          <div className="steps-ad">
            {(['nuevo', 'confirmado', 'preparando', 'listo', 'entregado'] as Status[]).map(s => (
              <button key={s} className={o.status === s ? 'on' : ''} disabled={busy || o.status === 'cancelado'} onClick={() => setStatus(s)}>{STATUS_LABEL[s]}</button>
            ))}
          </div>
          {next && <button className="ad-btn gold full" disabled={busy} onClick={() => setStatus(next)}>Marcar como {STATUS_LABEL[next].toLowerCase()}</button>}

          <div className="dsec">
            <h3>Cliente</h3>
            <p><b>{o.customer_name || 'Sin nombre'}</b>{o.customer_phone && <> · {o.customer_phone}</>}</p>
            <p>{o.scheduled_for ? <>📅 Recoge el <b>{fmtDate(o.scheduled_for, { weekday: 'long', day: 'numeric', month: 'long', hour: 'numeric', minute: '2-digit' })}</b></> : 'Lo antes posible'}</p>
            {o.notes && <p className="ad-note">📝 {o.notes}</p>}
            <div className="row-btns">
              {o.customer_phone && <a className="ad-btn sm ghost" href={waTo(o.customer_phone, `Hola ${o.customer_name.split(' ')[0] || ''}, tu pedido #${o.folio} de Pa'dentro está listo para recoger. Seguimiento: ${track}`)} target="_blank" rel="noopener">Avisar "listo" por WhatsApp</a>}
              <button className="ad-btn sm ghost" onClick={() => navigator.clipboard?.writeText(track)}>Copiar enlace de seguimiento</button>
            </div>
            <small className="ad-muted">Código {o.tracking_code}</small>
          </div>

          <div className="dsec">
            <h3>Productos</h3>
            <ul className="dlines">
              {o.items.map((l, k) => (
                <li key={k}>
                  <span>{l.qty}× {l.name}{l.variant ? ` (${l.variant})` : ''}</span>
                  <b>{money(l.subtotal)}</b>
                  {!closed && o.items.length > 1 && <button className="ad-x sm" title="Quitar" disabled={busy}
                    onClick={() => confirm(`¿Quitar "${l.name}" del pedido?`) && run(() => sb.rpc('pos_remove_line', { p_order: o.id, p_index: k }))}>✕</button>}
                </li>
              ))}
              {Number(o.discount) > 0 && <li><span>Descuento</span><b>−{money(o.discount)}</b></li>}
            </ul>
            {!closed && (adding
              ? <ProductPicker catalog={catalog} onPick={(it, variant) => run(() => sb.rpc('pos_add_items', { p_order: o.id, p_items: [{ id: it.id, qty: 1, variant }] }))} />
              : <button className="ad-btn sm ghost" onClick={() => setAdding(true)}>+ Agregar productos</button>)}
          </div>

          <div className="dsec">
            <h3>Pago</h3>
            <dl className="dpay">
              <div><dt>Total</dt><dd>{money(o.total)}</dd></div>
              <div><dt>Pagado{o.payment_method ? ` (${o.payment_method})` : ''}</dt><dd>{money(o.amount_paid)}</dd></div>
              <div className={due > 0 ? 'due' : ''}><dt>Saldo</dt><dd>{money(due)}</dd></div>
            </dl>
            {due > 0 && o.status !== 'cancelado' && (
              <div className="row-btns">
                {(['efectivo', 'tarjeta', 'transferencia'] as const).map(m => (
                  <button key={m} className="ad-btn sm" disabled={busy} onClick={() => run(() => sb.rpc('pos_register_payment', { p_order: o.id, p_method: m })).then(() => beep())}>Cobrar {money(due)} en {m}</button>
                ))}
              </div>
            )}
          </div>
        </div>
        <footer>
          <button className="ad-btn ghost" onClick={() => printTicket(o, BIZ)}>Imprimir ticket</button>
          {o.status !== 'cancelado' && o.status !== 'entregado' && <button className="ad-btn ghost danger" disabled={busy} onClick={() => confirm('¿Cancelar este pedido?') && setStatus('cancelado')}>Cancelar pedido</button>}
          {o.status === 'cancelado' && <button className="ad-btn ghost" disabled={busy} onClick={() => setStatus('confirmado')}>Reactivar</button>}
        </footer>
      </aside>
    </>
  )
}
