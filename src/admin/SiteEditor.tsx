import { useEffect, useState, type ReactNode } from 'react'
import { supabase } from '../supabase'
import { DEFAULT_CONTENT, mergeContent, type SiteContent } from '../content'
import { imgUrl } from '../Photo'

const sb = supabase!

/** Reduce la foto (máx. 1600 px, JPEG 82 %) antes de subirla, para que el sitio cargue rápido. */
async function shrink(file: File): Promise<Blob> {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return file
  const bmp = await createImageBitmap(file)
  const k = Math.min(1, 1600 / Math.max(bmp.width, bmp.height))
  const c = document.createElement('canvas')
  c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k)
  c.getContext('2d')!.drawImage(bmp, 0, 0, c.width, c.height)
  return new Promise(res => c.toBlob(b => res(b ?? file), 'image/jpeg', 0.82))
}

async function upload(file: File, slot: string): Promise<string> {
  const blob = await shrink(file)
  const path = `${slot}-${Date.now()}.jpg`
  const { error } = await sb.storage.from('site').upload(path, blob, { contentType: 'image/jpeg', upsert: true, cacheControl: '31536000' })
  if (error) throw new Error(error.message)
  return sb.storage.from('site').getPublicUrl(path).data.publicUrl
}

/* ---------- Campos reutilizables ---------- */
const Field = ({ label, value, onChange, area, hint }: { label: string; value: string; onChange: (v: string) => void; area?: boolean; hint?: string }) => (
  <label className="cms-f">{label}
    {area ? <textarea rows={3} value={value} onChange={e => onChange(e.target.value)} /> : <input value={value} onChange={e => onChange(e.target.value)} />}
    {hint && <small>{hint}</small>}
  </label>
)

function ImageField({ label, value, slot, onChange }: { label: string; value: string; slot: string; onChange: (v: string) => void }) {
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [bad, setBad] = useState(false)
  useEffect(() => setBad(false), [value])
  return (
    <div className="cms-img">
      <span>{label}</span>
      <div className="cms-thumb">{value && !bad ? <img src={imgUrl(value)} alt="" onError={() => setBad(true)} /> : <i>Sin foto</i>}</div>
      <label className="ad-btn sm ghost">
        {busy ? 'Subiendo…' : value && !bad ? 'Cambiar foto' : 'Subir foto'}
        <input type="file" accept="image/jpeg,image/png,image/webp" hidden disabled={busy} onChange={async e => {
          const file = e.target.files?.[0]; e.target.value = ''
          if (!file) return
          setBusy(true); setErr('')
          try { onChange(await upload(file, slot)) } catch (x) { setErr(x instanceof Error ? x.message : 'Error al subir') }
          setBusy(false)
        }} />
      </label>
      {value && <button type="button" className="cms-link" onClick={() => onChange('')}>Quitar</button>}
      {err && <small className="ad-err">{err}</small>}
    </div>
  )
}

const Card = ({ title, children, sub }: { title: string; sub?: string; children: ReactNode }) => (
  <section className="cms-card"><h3>{title}</h3>{sub && <p className="ad-muted">{sub}</p>}{children}</section>
)

/* ---------- Editor ---------- */
export default function SiteEditor() {
  const [c, setC] = useState<SiteContent | null>(null)
  const [saved, setSaved] = useState('')
  const [dirty, setDirty] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    sb.from('site_settings').select('content').eq('id', 1).maybeSingle().then(({ data, error }) => {
      if (error) setMsg(error.message)
      const m = mergeContent(data?.content)
      setC(m); setSaved(JSON.stringify(m))
    })
  }, [])
  useEffect(() => { if (c) setDirty(JSON.stringify(c) !== saved) }, [c, saved])
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => { if (dirty) e.preventDefault() }
    addEventListener('beforeunload', warn); return () => removeEventListener('beforeunload', warn)
  }, [dirty])

  if (!c) return <p className="ad-muted">Cargando contenido…</p>

  /** Actualiza un campo con ruta tipo "hero.title" o "hours.1.value". */
  const set = (path: string, v: unknown) => setC(prev => {
    const next = structuredClone(prev!) as unknown as Record<string, unknown>
    const ks = path.split('.')
    let o = next as Record<string, unknown>
    ks.slice(0, -1).forEach(k => { o = o[k] as Record<string, unknown> })
    o[ks[ks.length - 1]] = v
    return next as unknown as SiteContent
  })

  const save = async () => {
    setMsg('')
    const { error } = await sb.from('site_settings').upsert({ id: 1, content: c })
    if (error) return setMsg('No se pudo guardar: ' + error.message)
    setSaved(JSON.stringify(c)); setMsg('✓ Guardado. Los cambios ya se ven en el sitio.')
  }

  return (
    <section className="cms">
      <div className="ad-head">
        <h2>Contenido del sitio</h2>
        <div className="cms-save">
          {msg && <span className={msg.startsWith('✓') ? 'ok' : 'ad-err'}>{msg}</span>}
          <a className="ad-btn sm ghost" href="/" target="_blank" rel="noopener">Ver sitio ↗</a>
          <button className="ad-btn gold" disabled={!dirty} onClick={save}>{dirty ? 'Guardar cambios' : 'Sin cambios'}</button>
        </div>
      </div>

      <Card title="Tienda en línea" sub="Controla si los clientes pueden pagar con tarjeta para recoger.">
        <label className="ad-check big"><input type="checkbox" checked={c.store.online} onChange={e => set('store.online', e.target.checked)} /> Recibir pagos en línea</label>
        <Field label="Mensaje cuando la tienda está cerrada" value={c.store.closedMessage} onChange={v => set('store.closedMessage', v)} area />
        <Field label="Indicación para recoger" value={c.store.pickupNote} onChange={v => set('store.pickupNote', v)} area />
      </Card>

      <Card title="Datos del negocio">
        <div className="cms-2">
          <Field label="Nombre" value={c.biz.name} onChange={v => set('biz.name', v)} />
          <Field label="Días que abren" value={c.biz.days} onChange={v => set('biz.days', v)} />
          <Field label="Teléfono visible" value={c.biz.phone} onChange={v => set('biz.phone', v)} />
          <Field label="WhatsApp (con 52, solo números)" value={c.biz.wa} onChange={v => set('biz.wa', v.replace(/\D/g, ''))} hint="Aquí llegan los pedidos. Ej. 522361122856" />
          <Field label="Dirección" value={c.biz.address} onChange={v => set('biz.address', v)} />
          <Field label="Colonia / ciudad" value={c.biz.city} onChange={v => set('biz.city', v)} />
          <Field label="Enlace de Google Maps" value={c.biz.maps} onChange={v => set('biz.maps', v)} />
          <Field label="Facebook" value={c.biz.fb} onChange={v => set('biz.fb', v)} />
          <Field label="Instagram" value={c.biz.ig} onChange={v => set('biz.ig', v)} />
        </div>
      </Card>

      <Card title="Horarios">
        {c.hours.map((h, i) => (
          <div className="cms-row" key={i}>
            <input value={h.label} placeholder="Ej. Cocina" onChange={e => set(`hours.${i}.label`, e.target.value)} />
            <input value={h.value} placeholder="Ej. 1:00 pm – 8:00 pm" onChange={e => set(`hours.${i}.value`, e.target.value)} />
            <button type="button" className="ad-btn sm ghost" onClick={() => set('hours', c.hours.filter((_, k) => k !== i))}>🗑</button>
          </div>
        ))}
        <button type="button" className="cms-link" onClick={() => set('hours', [...c.hours, { label: '', value: '' }])}>+ Agregar renglón</button>
      </Card>

      <Card title="Portada">
        <div className="cms-split">
          <div>
            <Field label="Texto pequeño superior" value={c.hero.eyebrow} onChange={v => set('hero.eyebrow', v)} />
            <div className="cms-2">
              <Field label="Título" value={c.hero.title} onChange={v => set('hero.title', v)} />
              <Field label="Título resaltado (cursiva)" value={c.hero.highlight} onChange={v => set('hero.highlight', v)} />
            </div>
            <Field label="Descripción" value={c.hero.text} onChange={v => set('hero.text', v)} area />
            <Field label="Cinta de palabras (separadas por coma)" value={c.marquee.join(', ')} onChange={v => set('marquee', v.split(',').map(s => s.trim()).filter(Boolean))} />
          </div>
          <ImageField label="Foto principal" slot="hero" value={c.hero.image} onChange={v => set('hero.image', v)} />
        </div>
      </Card>

      <Card title="La casa">
        <div className="cms-split">
          <div>
            <Field label="Título" value={c.about.title} onChange={v => set('about.title', v)} />
            <Field label="Texto" value={c.about.text} onChange={v => set('about.text', v)} area />
            {c.about.stats.map((s, i) => (
              <div className="cms-row" key={i}>
                <input value={s.value} onChange={e => set(`about.stats.${i}.value`, e.target.value)} />
                <input value={s.label} onChange={e => set(`about.stats.${i}.label`, e.target.value)} />
              </div>
            ))}
            <small className="ad-muted">Escribe {'{productos}'} para mostrar automáticamente el número de productos de la carta.</small>
          </div>
          <ImageField label="Foto" slot="casa" value={c.about.image} onChange={v => set('about.image', v)} />
        </div>
      </Card>

      <Card title="Favoritos" sub="Escribe el inicio del nombre del producto tal como está en la carta; el precio y el botón se toman de ahí.">
        <div className="cms-3">
          {c.favorites.map((f, i) => (
            <div className="cms-fav" key={i}>
              <ImageField label={`Favorito ${i + 1}`} slot={`fav${i + 1}`} value={f.image} onChange={v => set(`favorites.${i}.image`, v)} />
              <Field label="Producto de la carta" value={f.product} onChange={v => set(`favorites.${i}.product`, v)} />
              <Field label="Etiqueta" value={f.tag} onChange={v => set(`favorites.${i}.tag`, v)} />
              <Field label="Descripción" value={f.text} onChange={v => set(`favorites.${i}.text`, v)} area />
            </div>
          ))}
        </div>
      </Card>

      <Card title="Nosotros">
        <Field label="Título" value={c.us.title} onChange={v => set('us.title', v)} />
        <Field label="Texto" value={c.us.text} onChange={v => set('us.text', v)} area />
        <div className="cms-3">
          {c.us.features.map((f, i) => (
            <div key={i} className="cms-fav">
              <Field label="Ícono (emoji)" value={f.icon} onChange={v => set(`us.features.${i}.icon`, v)} />
              <Field label="Título" value={f.title} onChange={v => set(`us.features.${i}.title`, v)} />
              <Field label="Texto" value={f.text} onChange={v => set(`us.features.${i}.text`, v)} area />
            </div>
          ))}
        </div>
      </Card>

      <Card title="Galería" sub="Hasta 5 fotos.">
        <div className="cms-5">
          {[0, 1, 2, 3, 4].map(i => (
            <ImageField key={i} label={`Foto ${i + 1}`} slot={`galeria${i + 1}`} value={c.gallery[i] ?? ''} onChange={v => {
              const g = [...c.gallery]; while (g.length <= i) g.push(''); g[i] = v; set('gallery', g)
            }} />
          ))}
        </div>
      </Card>

      <Card title="Cierre y pie de página">
        <Field label="Título de la banda final" value={c.cta.title} onChange={v => set('cta.title', v)} />
        <Field label="Texto de la banda final" value={c.cta.text} onChange={v => set('cta.text', v)} area />
        <Field label="Texto del pie de página" value={c.footer.text} onChange={v => set('footer.text', v)} />
      </Card>

      <p className="ad-muted">¿Algo salió mal? <button type="button" className="cms-link" onClick={() => { if (confirm('¿Restaurar todos los textos originales? (no se guarda hasta que presiones Guardar)')) setC(structuredClone(DEFAULT_CONTENT)) }}>Restaurar textos originales</button></p>
    </section>
  )
}
