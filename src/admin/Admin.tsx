import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../supabase'
import { DEFAULT_CONTENT } from '../content'
import SiteEditor from './SiteEditor'

const BIZ = DEFAULT_CONTENT.biz
import './admin.css'

const sb = supabase!
const money = (n: number | null | undefined) => (n == null ? '—' : '$' + Number(n).toLocaleString('es-MX'))
const STATUS = ['nuevo', 'confirmado', 'preparando', 'entregado', 'cancelado'] as const

/* ------------------------------------------------------------------ */
export default function Admin() {
  const [session, setSession] = useState<Session | null | undefined>(undefined)
  const [ok, setOk] = useState<boolean | null>(null)

  useEffect(() => {
    if (!supabase) return
    sb.auth.getSession().then(({ data }) => setSession(data.session))
    const { data } = sb.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => data.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    setOk(null)
    if (session) sb.rpc('is_admin').then(({ data }) => setOk(!!data))
  }, [session])

  if (!supabase) return <Shell><div className="ad-box"><h2>Falta configurar Supabase</h2><p>Define <code>VITE_SUPABASE_URL</code> y <code>VITE_SUPABASE_ANON_KEY</code> (ver <code>.env.example</code>).</p></div></Shell>
  if (session === undefined) return <Shell><p className="ad-muted">Cargando…</p></Shell>
  if (!session) return <Shell><Login /></Shell>
  if (ok === null) return <Shell><p className="ad-muted">Verificando permisos…</p></Shell>
  if (!ok) return (
    <Shell><div className="ad-box"><h2>Sin permiso</h2>
      <p>La cuenta <b>{session.user.email}</b> no está registrada como administrador.</p>
      <button className="ad-btn" onClick={() => sb.auth.signOut()}>Cerrar sesión</button></div></Shell>
  )
  return <Panel email={session.user.email ?? ''} />
}

function Shell({ children }: { children: React.ReactNode }) {
  return <div className="ad"><header className="ad-top"><a href="/"><img src="/logo.png" alt={BIZ.name} /></a><b>Panel de administración</b></header><main className="ad-main">{children}</main></div>
}

function Login() {
  const [email, setEmail] = useState('')
  const [pass, setPass] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const submit = async (e: FormEvent) => {
    e.preventDefault(); setBusy(true); setErr('')
    const { error } = await sb.auth.signInWithPassword({ email, password: pass })
    if (error) setErr('Correo o contraseña incorrectos.')
    setBusy(false)
  }
  return (
    <form className="ad-box ad-login" onSubmit={submit}>
      <h2>Iniciar sesión</h2>
      <label>Correo<input type="email" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="username" /></label>
      <label>Contraseña<input type="password" value={pass} onChange={e => setPass(e.target.value)} required autoComplete="current-password" /></label>
      {err && <p className="ad-err">{err}</p>}
      <button className="ad-btn gold" disabled={busy}>{busy ? 'Entrando…' : 'Entrar'}</button>
    </form>
  )
}

function Panel({ email }: { email: string }) {
  type Tab = 'pedidos' | 'carta' | 'promos' | 'sitio'
  const [tab, setTab] = useState<Tab>('pedidos')
  const LABEL: Record<Tab, string> = { pedidos: 'Pedidos', carta: 'Carta', promos: 'Promociones', sitio: 'Sitio' }
  return (
    <div className="ad">
      <header className="ad-top">
        <a href="/"><img src="/logo.png" alt={BIZ.name} /></a>
        <nav>{(Object.keys(LABEL) as Tab[]).map(t =>
          <button key={t} className={tab === t ? 'on' : ''} onClick={() => setTab(t)}>{LABEL[t]}</button>)}</nav>
        <span className="ad-user">{email}<button onClick={() => sb.auth.signOut()}>Salir</button></span>
      </header>
      <main className="ad-main">
        {tab === 'pedidos' && <Orders />}
        {tab === 'carta' && <MenuEditor />}
        {tab === 'promos' && <PromosEditor />}
        {tab === 'sitio' && <SiteEditor />}
      </main>
    </div>
  )
}

/* ---------------------------- Pedidos ----------------------------- */
interface Order {
  id: string; folio: number; created_at: string; total: number; notes: string; status: string
  items: { name: string; variant: string | null; qty: number; subtotal: number }[]
  channel: 'whatsapp' | 'online'; payment_status: 'none' | 'pending' | 'paid' | 'expired' | 'refunded'
  customer_name: string; customer_phone: string; pickup_time: string
}
const PAY: Record<string, [string, string]> = {
  paid: ['💳 Pagado en línea', 'paid'], pending: ['⏳ Esperando pago', 'pend'], expired: ['✕ Pago no completado', 'exp'],
  refunded: ['↩ Reembolsado', 'exp'], none: ['💬 WhatsApp · paga en local', 'wa'],
}
/** Un pedido en línea solo cuenta (y se prepara) cuando ya está pagado. */
const counts = (o: Order) => o.channel !== 'online' || o.payment_status === 'paid'

function beep() {
  try {
    const ctx = new AudioContext(); const o = ctx.createOscillator(); const g = ctx.createGain()
    o.connect(g); g.connect(ctx.destination); o.frequency.value = 880; g.gain.value = 0.15
    o.start(); o.frequency.setValueAtTime(660, ctx.currentTime + 0.15); o.stop(ctx.currentTime + 0.35)
  } catch { /* sin audio */ }
}

function Orders() {
  const [rows, setRows] = useState<Order[]>([])
  const [filter, setFilter] = useState<string>('activos')
  const [err, setErr] = useState('')
  const [sound, setSound] = useState(true)
  const [seen] = useState(() => new Set<string>())
  const [first, setFirst] = useState(true)

  const load = useCallback(async () => {
    const { data, error } = await sb.from('orders').select('*').order('created_at', { ascending: false }).limit(200)
    if (error) return setErr(error.message)
    setErr('')
    const list = data as Order[]
    const fresh = list.filter(o => counts(o) && o.status === 'nuevo' && !seen.has(o.id))
    list.forEach(o => { if (counts(o)) seen.add(o.id) })
    setRows(list)
    setFirst(f => { if (!f && fresh.length && sound) beep(); return false })
  }, [seen, sound])
  useEffect(() => { load(); const t = setInterval(load, 15000); return () => clearInterval(t) }, [load])

  const nuevos = rows.filter(o => counts(o) && o.status === 'nuevo').length
  useEffect(() => { document.title = (nuevos ? `(${nuevos}) ` : '') + 'Panel · Pa\'dentro' }, [nuevos])

  const setStatus = async (o: Order, status: string) => {
    setRows(r => r.map(x => (x.id === o.id ? { ...x, status } : x)))
    const { error } = await sb.from('orders').update({ status }).eq('id', o.id)
    if (error) { setErr(error.message); load() }
  }
  const shown = rows.filter(o =>
    filter === 'todos' ? true
    : filter === 'activos' ? counts(o) && !['entregado', 'cancelado'].includes(o.status)
    : filter === 'en línea' ? o.channel === 'online'
    : filter === 'whatsapp' ? o.channel === 'whatsapp'
    : o.status === filter)
  const today = new Date().toDateString()
  const todays = rows.filter(o => new Date(o.created_at).toDateString() === today && o.status !== 'cancelado' && counts(o))
  const paidToday = todays.filter(o => o.payment_status === 'paid').reduce((a, o) => a + Number(o.total), 0)

  return (
    <section>
      <div className="ad-head">
        <h2>Pedidos {nuevos > 0 && <span className="ad-badge">{nuevos} nuevo{nuevos > 1 ? 's' : ''}</span>}</h2>
        <div className="ad-kpis">
          <span><b>{todays.length}</b> hoy</span>
          <span><b>{money(todays.reduce((a, o) => a + Number(o.total), 0))}</b> en pedidos</span>
          <span><b>{money(paidToday)}</b> cobrado en línea</span>
        </div>
      </div>
      <div className="ad-bar">
        {['activos', 'en línea', 'whatsapp', ...STATUS, 'todos'].map(s => <button key={s} className={filter === s ? 'on' : ''} onClick={() => setFilter(s)}>{s[0].toUpperCase() + s.slice(1)}</button>)}
        <label className="ad-check" title="Sonar cuando llegue un pedido"><input type="checkbox" checked={sound} onChange={e => { setSound(e.target.checked); if (e.target.checked) beep() }} /> 🔔</label>
        <button className="ad-btn sm" onClick={load}>↻ Actualizar</button>
      </div>
      {err && <p className="ad-err">{err}</p>}
      {shown.length === 0 && <p className="ad-muted">{first ? 'Cargando…' : 'No hay pedidos en esta vista. Se actualiza solo cada 15 segundos.'}</p>}
      <div className="ad-orders">
        {shown.map(o => {
          const [payLabel, payCls] = PAY[o.payment_status] ?? PAY.none
          const tel = o.customer_phone.replace(/\D/g, '')
          return (
            <article key={o.id} className={'ad-order st-' + o.status}>
              <header><b>#{o.folio}</b><time>{new Date(o.created_at).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' })}</time></header>
              <span className={'ad-pay ' + payCls}>{payLabel}</span>
              {o.customer_name && (
                <div className="ad-cust">
                  <b>{o.customer_name}</b>
                  {tel && <a href={`https://wa.me/${tel.length === 10 ? '52' + tel : tel}?text=${encodeURIComponent(`Hola ${o.customer_name}, tu pedido #${o.folio} de Pa'dentro está listo para recoger.`)}`} target="_blank" rel="noopener">💬 {o.customer_phone}</a>}
                  {o.pickup_time && <small>Recoge: {o.pickup_time}</small>}
                </div>
              )}
              <ul>{o.items.map((l, k) => <li key={k}><span>{l.qty}× {l.name}{l.variant ? ` (${l.variant})` : ''}</span><span>{money(l.subtotal)}</span></li>)}</ul>
              {o.notes && <p className="ad-note">📝 {o.notes}</p>}
              <footer>
                <b>{money(o.total)}</b>
                <select value={o.status} onChange={e => setStatus(o, e.target.value)}>{STATUS.map(s => <option key={s}>{s}</option>)}</select>
              </footer>
            </article>
          )
        })}
      </div>
    </section>
  )
}

/* ----------------------------- Carta ------------------------------ */
interface MItem { id: number; section_id: number; name: string; price: number | null; bottle_price: number | null; label: string; available: boolean; sort: number }
interface MSection { id: number; title: string; sub: string; sort: number; active: boolean; menu_items: MItem[] }
interface MCat { id: number; tab: string; sort: number; menu_sections: MSection[] }

function MenuEditor() {
  const [cats, setCats] = useState<MCat[]>([])
  const [ci, setCi] = useState(0)
  const [q, setQ] = useState('')
  const [err, setErr] = useState('')
  const load = useCallback(async () => {
    const { data, error } = await sb.from('menu_categories')
      .select('id, tab, sort, menu_sections(id, title, sub, sort, active, menu_items(*))').order('sort')
    if (error) return setErr(error.message)
    const by = <T extends { sort: number }>(a: T, b: T) => a.sort - b.sort
    setCats((data as MCat[]).map(c => ({ ...c, menu_sections: c.menu_sections.sort(by).map(s => ({ ...s, menu_items: s.menu_items.sort(by) })) })))
  }, [])
  useEffect(() => { load() }, [load])

  const s = q.trim().toLowerCase()
  const sections = useMemo(() => {
    const pool = s ? cats.flatMap(c => c.menu_sections) : cats[ci]?.menu_sections ?? []
    return pool.map(x => ({ ...x, menu_items: s ? x.menu_items.filter(i => i.name.toLowerCase().includes(s)) : x.menu_items })).filter(x => !s || x.menu_items.length)
  }, [cats, ci, s])

  return (
    <section>
      <div className="ad-head"><h2>Carta</h2><input className="ad-search" placeholder="Buscar producto…" value={q} onChange={e => setQ(e.target.value)} /></div>
      <div className="ad-bar">{cats.map((c, n) => <button key={c.id} className={n === ci && !s ? 'on' : ''} onClick={() => { setCi(n); setQ('') }}>{c.tab}</button>)}</div>
      {err && <p className="ad-err">{err}</p>}
      <p className="ad-muted">Los cambios se guardan al presionar ✓. "Disponible" apagado = aparece como <i>Agotado</i> en la carta. Para productos con copa y botella llena ambos precios.</p>
      {sections.map(sec => (
        <div className="ad-sec" key={sec.id}>
          <h3>{sec.title}{sec.sub && <small>{sec.sub}</small>}</h3>
          <div className="ad-grid ad-ghead"><span>Producto</span><span>Precio / copa</span><span>Botella</span><span>Texto sin precio</span><span>Disponible</span><span /></div>
          {sec.menu_items.map(it => <ItemRow key={it.id} it={it} onDone={load} onErr={setErr} />)}
          {!s && <NewItem sectionId={sec.id} nextSort={(sec.menu_items[sec.menu_items.length - 1]?.sort ?? -1) + 1} onDone={load} onErr={setErr} />}
        </div>
      ))}
    </section>
  )
}

const numOrNull = (v: string) => (v.trim() === '' ? null : Number(v))

function ItemRow({ it, onDone, onErr }: { it: MItem; onDone: () => void; onErr: (e: string) => void }) {
  const [f, setF] = useState({ name: it.name, price: it.price?.toString() ?? '', bottle: it.bottle_price?.toString() ?? '', label: it.label })
  const [avail, setAvail] = useState(it.available)
  const dirty = f.name !== it.name || f.price !== (it.price?.toString() ?? '') || f.bottle !== (it.bottle_price?.toString() ?? '') || f.label !== it.label
  const save = async (patch: Partial<MItem>) => {
    const { error } = await sb.from('menu_items').update(patch).eq('id', it.id)
    if (error) onErr(error.message); else onDone()
  }
  return (
    <div className={'ad-grid' + (avail ? '' : ' off')}>
      <input value={f.name} onChange={e => setF({ ...f, name: e.target.value })} />
      <input inputMode="decimal" value={f.price} onChange={e => setF({ ...f, price: e.target.value })} placeholder="—" />
      <input inputMode="decimal" value={f.bottle} onChange={e => setF({ ...f, bottle: e.target.value })} placeholder="—" />
      <input value={f.label} onChange={e => setF({ ...f, label: e.target.value })} placeholder="ej. Próximamente" />
      <label className="ad-switch"><input type="checkbox" checked={avail} onChange={e => { setAvail(e.target.checked); save({ available: e.target.checked }) }} /><i /></label>
      <span className="ad-acts">
        {dirty && <button className="ad-btn sm gold" title="Guardar" onClick={() => save({ name: f.name.trim(), price: numOrNull(f.price), bottle_price: numOrNull(f.bottle), label: f.label.trim() })}>✓</button>}
        <button className="ad-btn sm ghost" title="Eliminar" onClick={async () => {
          if (!confirm(`¿Eliminar "${it.name}" de la carta?`)) return
          const { error } = await sb.from('menu_items').delete().eq('id', it.id)
          if (error) onErr(error.message); else onDone()
        }}>🗑</button>
      </span>
    </div>
  )
}

function NewItem({ sectionId, nextSort, onDone, onErr }: { sectionId: number; nextSort: number; onDone: () => void; onErr: (e: string) => void }) {
  const [f, setF] = useState({ name: '', price: '', bottle: '' })
  const add = async () => {
    if (!f.name.trim()) return
    const { error } = await sb.from('menu_items').insert({ section_id: sectionId, name: f.name.trim(), price: numOrNull(f.price), bottle_price: numOrNull(f.bottle), sort: nextSort })
    if (error) onErr(error.message); else { setF({ name: '', price: '', bottle: '' }); onDone() }
  }
  return (
    <div className="ad-grid ad-new">
      <input value={f.name} onChange={e => setF({ ...f, name: e.target.value })} placeholder="+ Nuevo producto" />
      <input inputMode="decimal" value={f.price} onChange={e => setF({ ...f, price: e.target.value })} placeholder="Precio" />
      <input inputMode="decimal" value={f.bottle} onChange={e => setF({ ...f, bottle: e.target.value })} placeholder="Botella" />
      <span /><span />
      <span className="ad-acts">{f.name.trim() && <button className="ad-btn sm gold" onClick={add}>Agregar</button>}</span>
    </div>
  )
}

/* -------------------------- Promociones --------------------------- */
interface PromoRow { id?: number; label: string; title: string; description: string; cta_text: string; cta_message: string; starts_on: string | null; ends_on: string | null; active: boolean; sort: number }
const EMPTY: PromoRow = { label: '', title: '', description: '', cta_text: '', cta_message: '', starts_on: null, ends_on: null, active: true, sort: 0 }

function PromosEditor() {
  const [rows, setRows] = useState<PromoRow[]>([])
  const [err, setErr] = useState('')
  const load = useCallback(async () => {
    const { data, error } = await sb.from('promos').select('*').order('sort')
    if (error) setErr(error.message); else setRows(data as PromoRow[])
  }, [])
  useEffect(() => { load() }, [load])
  return (
    <section>
      <div className="ad-head"><h2>Promociones</h2>
        <button className="ad-btn gold" onClick={() => setRows(r => [...r, { ...EMPTY, sort: (r[r.length - 1]?.sort ?? -1) + 1 }])}>+ Nueva promoción</button></div>
      {err && <p className="ad-err">{err}</p>}
      <p className="ad-muted">Las promociones con fecha de fin se ocultan solas al día siguiente. Si llenas "Texto del botón", aparece un botón que abre WhatsApp con el mensaje indicado.</p>
      <div className="ad-promos">{rows.map((p, k) => <PromoCard key={p.id ?? 'new' + k} p={p} onDone={load} onErr={setErr} />)}</div>
    </section>
  )
}

function PromoCard({ p, onDone, onErr }: { p: PromoRow; onDone: () => void; onErr: (e: string) => void }) {
  const [f, setF] = useState(p)
  const set = (k: keyof PromoRow) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setF({ ...f, [k]: e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.type === 'date' ? e.target.value || null : e.target.value })
  const today = new Date().toISOString().slice(0, 10)
  const expired = !!f.ends_on && f.ends_on < today
  const save = async () => {
    if (!f.title.trim()) return onErr('La promoción necesita un título.')
    const { id, ...rest } = f
    const { error } = id ? await sb.from('promos').update(rest).eq('id', id) : await sb.from('promos').insert(rest)
    if (error) onErr(error.message); else onDone()
  }
  return (
    <article className={'ad-promo' + (!f.active || expired ? ' off' : '')}>
      <div className="ad-row2">
        <label>Etiqueta<input value={f.label} onChange={set('label')} placeholder="Jueves y viernes" /></label>
        <label>Título<input value={f.title} onChange={set('title')} placeholder="De Bandidas" /></label>
      </div>
      <label>Descripción<textarea value={f.description} onChange={set('description')} rows={2} /></label>
      <div className="ad-row2">
        <label>Texto del botón<input value={f.cta_text} onChange={set('cta_text')} placeholder="Reservar lugar" /></label>
        <label>Mensaje de WhatsApp<input value={f.cta_message} onChange={set('cta_message')} placeholder="Hola, quiero reservar…" /></label>
      </div>
      <div className="ad-row2">
        <label>Desde<input type="date" value={f.starts_on ?? ''} onChange={set('starts_on')} /></label>
        <label>Hasta<input type="date" value={f.ends_on ?? ''} onChange={set('ends_on')} /></label>
      </div>
      <footer>
        <label className="ad-check"><input type="checkbox" checked={f.active} onChange={set('active')} /> Activa {expired && <em>(vencida)</em>}</label>
        <span>
          {p.id && <button className="ad-btn sm ghost" onClick={async () => {
            if (!confirm(`¿Eliminar la promoción "${p.title}"?`)) return
            const { error } = await sb.from('promos').delete().eq('id', p.id!)
            if (error) onErr(error.message); else onDone()
          }}>Eliminar</button>}
          <button className="ad-btn sm gold" onClick={save}>Guardar</button>
        </span>
      </footer>
    </article>
  )
}
