import { useCallback, useEffect, useMemo, useState } from 'react'
import { sb } from './shared'

/* ----------------------------- Carta ------------------------------ */
interface MItem { id: number; section_id: number; name: string; price: number | null; bottle_price: number | null; label: string; available: boolean; sort: number }
interface MSection { id: number; title: string; sub: string; sort: number; active: boolean; menu_items: MItem[] }
interface MCat { id: number; tab: string; sort: number; menu_sections: MSection[] }

export function MenuEditor() {
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

export function PromosEditor() {
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
