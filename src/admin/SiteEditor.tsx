import { useEffect, useState, type ReactNode } from 'react'
import { sb } from './shared'
import { DEFAULT_CONTENT, mergeContent, NETWORK_LABEL, SECTION_LABEL, type Network, type SiteContent } from '../content'
import { imgUrl } from '../Photo'
import Icon, { NETWORK_ICON } from '../icons'

/* ---------- Subida de archivos ---------- */
async function shrink(file: File): Promise<Blob> {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return file
  const bmp = await createImageBitmap(file)
  const k = Math.min(1, 1920 / Math.max(bmp.width, bmp.height))
  const c = document.createElement('canvas')
  c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k)
  c.getContext('2d')!.drawImage(bmp, 0, 0, c.width, c.height)
  return new Promise(res => c.toBlob(b => res(b ?? file), 'image/jpeg', 0.84))
}
async function upload(file: File, slot: string): Promise<string> {
  const video = file.type.startsWith('video/')
  if (video && file.size > 45 * 1024 * 1024) throw new Error('El video pesa más de 45 MB. Recórtalo o súbelo a YouTube y pega el enlace.')
  const blob = video ? file : await shrink(file)
  const ext = video ? (file.name.split('.').pop() || 'mp4').toLowerCase() : 'jpg'
  const path = `${slot}-${Date.now()}.${ext}`
  const { error } = await sb.storage.from('site').upload(path, blob, { contentType: video ? file.type : 'image/jpeg', upsert: true, cacheControl: '31536000' })
  if (error) throw new Error(error.message)
  return sb.storage.from('site').getPublicUrl(path).data.publicUrl
}

/* ---------- Campos ---------- */
const Field = ({ label, value, onChange, area, hint, placeholder }: { label: string; value: string; onChange: (v: string) => void; area?: boolean; hint?: string; placeholder?: string }) => (
  <label className="cms-f">{label}
    {area ? <textarea rows={3} value={value} placeholder={placeholder} onChange={e => onChange(e.target.value)} /> : <input value={value} placeholder={placeholder} onChange={e => onChange(e.target.value)} />}
    {hint && <small>{hint}</small>}
  </label>
)
const Toggle = ({ label, checked, onChange, hint }: { label: string; checked: boolean; onChange: (v: boolean) => void; hint?: string }) => (
  <label className="cms-toggle"><input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} /><i /><span>{label}{hint && <small>{hint}</small>}</span></label>
)

function MediaField({ label, value, slot, onChange, video }: { label: string; value: string; slot: string; onChange: (v: string) => void; video?: boolean }) {
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [bad, setBad] = useState(false)
  useEffect(() => setBad(false), [value])
  return (
    <div className="cms-img">
      <span>{label}</span>
      <div className="cms-thumb">
        {value && !bad ? (video ? <video src={imgUrl(value)} muted playsInline controls /> : <img src={imgUrl(value)} alt="" onError={() => setBad(true)} />) : <i>{video ? 'Sin video' : 'Sin foto'}</i>}
      </div>
      <div className="cms-img-acts">
        <label className="ad-btn sm ghost">
          {busy ? 'Subiendo…' : value && !bad ? 'Cambiar' : 'Subir'}
          <input type="file" accept={video ? 'video/mp4,video/webm' : 'image/jpeg,image/png,image/webp'} hidden disabled={busy} onChange={async e => {
            const file = e.target.files?.[0]; e.target.value = ''
            if (!file) return
            setBusy(true); setErr('')
            try { onChange(await upload(file, slot)) } catch (x) { setErr(x instanceof Error ? x.message : 'Error al subir') }
            setBusy(false)
          }} />
        </label>
        {value && <button type="button" className="cms-link" onClick={() => onChange('')}>Quitar</button>}
      </div>
      {err && <small className="ad-err">{err}</small>}
    </div>
  )
}

const Card = ({ title, sub, children }: { title: string; sub?: string; children: ReactNode }) => (
  <section className="cms-card"><h3>{title}</h3>{sub && <p className="ad-muted">{sub}</p>}{children}</section>
)
/** Botones para mover un elemento de una lista. */
function Mover({ i, n, move, remove }: { i: number; n: number; move: (from: number, to: number) => void; remove?: () => void }) {
  return (
    <span className="mover">
      <button type="button" disabled={i === 0} onClick={() => move(i, i - 1)} aria-label="Subir">↑</button>
      <button type="button" disabled={i === n - 1} onClick={() => move(i, i + 1)} aria-label="Bajar">↓</button>
      {remove && <button type="button" onClick={remove} aria-label="Quitar">✕</button>}
    </span>
  )
}
const moved = <T,>(arr: T[], from: number, to: number) => { const a = [...arr]; const [x] = a.splice(from, 1); a.splice(to, 0, x); return a }

type Part = 'tienda' | 'negocio' | 'redes' | 'flotantes' | 'secciones' | 'portada' | 'casa' | 'favoritos' | 'pasos' | 'nosotros' | 'video' | 'galeria' | 'final'
const PARTS: [string, [Part, string][]][] = [
  ['General', [['tienda', 'Tienda y horario'], ['negocio', 'Negocio y contacto'], ['redes', 'Redes sociales'], ['flotantes', 'Botones flotantes'], ['secciones', 'Orden de secciones']]],
  ['Contenido', [['portada', 'Portada'], ['casa', 'La casa'], ['favoritos', 'Favoritos'], ['pasos', 'Cómo pedir'], ['nosotros', 'Nosotros'], ['video', 'Video'], ['galeria', 'Galería'], ['final', 'Banda final y pie']]],
]
const DAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

export default function SiteEditor() {
  const [c, setC] = useState<SiteContent | null>(null)
  const [saved, setSaved] = useState('')
  const [msg, setMsg] = useState('')
  const [part, setPart] = useState<Part>('tienda')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    sb.from('site_settings').select('content').eq('id', 1).maybeSingle().then(({ data, error }) => {
      if (error) setMsg(error.message)
      const m = mergeContent(data?.content); setC(m); setSaved(JSON.stringify(m))
    })
  }, [])
  const dirty = !!c && JSON.stringify(c) !== saved
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => { if (dirty) e.preventDefault() }
    addEventListener('beforeunload', warn); return () => removeEventListener('beforeunload', warn)
  }, [dirty])
  if (!c) return <p className="ad-muted">Cargando contenido…</p>

  /** Cambia un valor por ruta: "hero.title", "socials.0.url". */
  const set = (path: string, v: unknown) => setC(prev => {
    const next = structuredClone(prev!) as unknown as Record<string, unknown>
    const ks = path.split('.'); let o = next as Record<string, unknown>
    ks.slice(0, -1).forEach(k => { o = o[k] as Record<string, unknown> })
    o[ks[ks.length - 1]] = v
    return next as unknown as SiteContent
  })
  const save = async () => {
    setSaving(true); setMsg('')
    const { error } = await sb.from('site_settings').upsert({ id: 1, content: c })
    setSaving(false)
    if (error) return setMsg('No se pudo guardar: ' + error.message)
    setSaved(JSON.stringify(c)); setMsg('Guardado. La página ya muestra los cambios.')
  }
  const sch = c.store.schedule

  return (
    <section className="cms">
      <div className="ad-head cms-bar">
        <h2>Sitio web</h2>
        <div className="cms-save">
          {msg && <span className={msg.startsWith('Guardado') ? 'ok' : 'ad-err'}>{msg}</span>}
          {dirty && <button className="ad-btn sm ghost" onClick={() => setC(JSON.parse(saved))}>Descartar</button>}
          <a className="ad-btn sm ghost" href="/" target="_blank" rel="noopener">Ver sitio</a>
          <button className="ad-btn gold" disabled={!dirty || saving} onClick={save}>{saving ? 'Guardando…' : dirty ? 'Guardar cambios' : 'Todo guardado'}</button>
        </div>
      </div>

      <div className="cms-layout">
        <nav className="cms-nav">
          {PARTS.map(([group, items]) => (
            <div key={group}><span>{group}</span>{items.map(([k, l]) => <button key={k} className={part === k ? 'on' : ''} onClick={() => setPart(k)}>{l}</button>)}</div>
          ))}
        </nav>

        <div className="cms-body">
          {part === 'tienda' && <>
            <Card title="Tienda en línea">
              <Toggle label="Recibir pagos en línea con tarjeta" checked={c.store.online} onChange={v => set('store.online', v)} hint="Si lo apagas, los clientes solo pueden pedir por WhatsApp." />
              <Field label="Mensaje cuando la tienda en línea está cerrada" value={c.store.closedMessage} onChange={v => set('store.closedMessage', v)} area />
              <Field label="Indicación para recoger" value={c.store.pickupNote} onChange={v => set('store.pickupNote', v)} area />
            </Card>
            <Card title="Horario para pedidos" sub="Define qué días y horas se pueden recoger pedidos. El calendario del carrito solo muestra lo que esté dentro de este horario.">
              <div className="days">{DAYS.map((d, i) => (
                <label key={d} className={sch.days.includes(i) ? 'on' : ''}><input type="checkbox" checked={sch.days.includes(i)} onChange={e => set('store.schedule.days', e.target.checked ? [...sch.days, i].sort() : sch.days.filter(x => x !== i))} />{d}</label>
              ))}</div>
              <div className="cms-3">
                <label className="cms-f">Abre<input type="time" value={sch.open} onChange={e => set('store.schedule.open', e.target.value)} /></label>
                <label className="cms-f">Último horario para recoger<input type="time" value={sch.close} onChange={e => set('store.schedule.close', e.target.value)} /></label>
                <label className="cms-f">Intervalo entre horarios<select value={sch.slotMinutes} onChange={e => set('store.schedule.slotMinutes', Number(e.target.value))}>{[15, 30, 60].map(n => <option key={n} value={n}>{n} minutos</option>)}</select></label>
                <label className="cms-f">Anticipación mínima<select value={sch.leadMinutes} onChange={e => set('store.schedule.leadMinutes', Number(e.target.value))}>{[20, 30, 45, 60, 90, 120, 240, 1440].map(n => <option key={n} value={n}>{n < 60 ? `${n} minutos` : n === 1440 ? '1 día' : `${n / 60} h`}</option>)}</select></label>
                <label className="cms-f">Programar hasta<select value={sch.maxDays} onChange={e => set('store.schedule.maxDays', Number(e.target.value))}>{[7, 14, 30, 60, 90].map(n => <option key={n} value={n}>{n} días antes</option>)}</select></label>
              </div>
            </Card>
            <Card title="Horario que se muestra en la página">
              {c.hours.map((h, i) => (
                <div className="cms-row" key={i}>
                  <input value={h.label} placeholder="Ej. Cocina" onChange={e => set(`hours.${i}.label`, e.target.value)} />
                  <input value={h.value} placeholder="Ej. 1:00 pm – 8:00 pm" onChange={e => set(`hours.${i}.value`, e.target.value)} />
                  <Mover i={i} n={c.hours.length} move={(a, b) => set('hours', moved(c.hours, a, b))} remove={() => set('hours', c.hours.filter((_, k) => k !== i))} />
                </div>
              ))}
              <button type="button" className="cms-link" onClick={() => set('hours', [...c.hours, { label: '', value: '' }])}>+ Agregar renglón</button>
            </Card>
          </>}

          {part === 'negocio' && <Card title="Negocio y contacto">
            <div className="cms-2">
              <Field label="Nombre" value={c.biz.name} onChange={v => set('biz.name', v)} />
              <Field label="Frase corta" value={c.biz.tagline} onChange={v => set('biz.tagline', v)} />
              <Field label="Teléfono visible" value={c.biz.phone} onChange={v => set('biz.phone', v)} />
              <Field label="WhatsApp (con 52, solo números)" value={c.biz.wa} onChange={v => set('biz.wa', v.replace(/\D/g, ''))} hint="Aquí llegan los pedidos. Ej. 522361122856" />
              <Field label="Correo" value={c.biz.email} onChange={v => set('biz.email', v)} placeholder="Opcional" />
              <Field label="Días que abren" value={c.biz.days} onChange={v => set('biz.days', v)} />
              <Field label="Dirección" value={c.biz.address} onChange={v => set('biz.address', v)} />
              <Field label="Colonia y ciudad" value={c.biz.city} onChange={v => set('biz.city', v)} />
            </div>
            <Field label="Enlace de Google Maps (botón Cómo llegar)" value={c.biz.maps} onChange={v => set('biz.maps', v)} hint="El mapa de la página se genera solo con la dirección." />
          </Card>}

          {part === 'redes' && <Card title="Redes sociales" sub="Aparecen en la sección de ubicación y en el pie de página, en este orden.">
            {c.socials.map((s, i) => (
              <div className="soc-row" key={i}>
                <span className="soc-ico"><Icon name={NETWORK_ICON[s.network]} /></span>
                <select value={s.network} onChange={e => set(`socials.${i}.network`, e.target.value as Network)}>
                  {(Object.keys(NETWORK_LABEL) as Network[]).map(n => <option key={n} value={n}>{NETWORK_LABEL[n]}</option>)}
                </select>
                <input value={s.url} placeholder={s.network === 'email' ? 'correo@ejemplo.com' : 'https://…'} onChange={e => set(`socials.${i}.url`, e.target.value)} />
                <Mover i={i} n={c.socials.length} move={(a, b) => set('socials', moved(c.socials, a, b))} remove={() => set('socials', c.socials.filter((_, k) => k !== i))} />
              </div>
            ))}
            <button type="button" className="ad-btn sm ghost" onClick={() => set('socials', [...c.socials, { network: 'instagram', url: '' }])}>+ Agregar red social</button>
          </Card>}

          {part === 'flotantes' && <Card title="Botones flotantes" sub="Los botones que siempre quedan visibles en la esquina de la pantalla.">
            <Toggle label="Botón de WhatsApp" checked={c.floating.whatsapp} onChange={v => set('floating.whatsapp', v)} />
            {c.floating.whatsapp && <Field label="Mensaje inicial de WhatsApp" value={c.floating.whatsappMessage} onChange={v => set('floating.whatsappMessage', v)} />}
            <Toggle label="Botón para llamar" checked={c.floating.call} onChange={v => set('floating.call', v)} hint={`Marca al ${c.biz.phone}`} />
            <Toggle label="Asistente virtual (chat)" checked={c.floating.chat} onChange={v => set('floating.chat', v)} hint="Al apagarlo, deja de aparecer en las siguientes visitas." />
            <Toggle label="Botón para subir al inicio" checked={c.floating.top} onChange={v => set('floating.top', v)} />
          </Card>}

          {part === 'secciones' && <Card title="Orden de secciones" sub="La portada siempre va primero y el pie de página al final. Mueve o esconde las demás.">
            {c.sections.map((s, i) => (
              <div className={'sec-row' + (s.visible ? '' : ' off')} key={s.id}>
                <b>{i + 1}</b><span>{SECTION_LABEL[s.id]}</span>
                <Toggle label={s.visible ? 'Visible' : 'Oculta'} checked={s.visible} onChange={v => set(`sections.${i}.visible`, v)} />
                <Mover i={i} n={c.sections.length} move={(a, b) => set('sections', moved(c.sections, a, b))} />
              </div>
            ))}
          </Card>}

          {part === 'portada' && <Card title="Portada">
            <div className="cms-split">
              <div>
                <Field label="Texto superior" value={c.hero.eyebrow} onChange={v => set('hero.eyebrow', v)} />
                <Field label="Título" value={c.hero.title} onChange={v => set('hero.title', v)} />
                <Field label="Descripción" value={c.hero.text} onChange={v => set('hero.text', v)} area />
                <div className="cms-2">
                  <Field label="Botón principal" value={c.hero.primary} onChange={v => set('hero.primary', v)} />
                  <Field label="Botón secundario (WhatsApp)" value={c.hero.secondary} onChange={v => set('hero.secondary', v)} />
                </div>
                <Field label="Cinta de palabras (separadas por coma)" value={c.marquee.join(', ')} onChange={v => set('marquee', v.split(',').map(s => s.trim()).filter(Boolean))} />
              </div>
              <div>
                <div className="seg-ad full">
                  <button className={c.hero.media === 'image' ? 'on' : ''} onClick={() => set('hero.media', 'image')}>Foto</button>
                  <button className={c.hero.media === 'video' ? 'on' : ''} onClick={() => set('hero.media', 'video')}>Video</button>
                </div>
                <MediaField label="Foto de portada" slot="hero" value={c.hero.image} onChange={v => set('hero.image', v)} />
                {c.hero.media === 'video' && <MediaField label="Video de fondo (MP4, sin sonido, máx. 45 MB)" slot="hero-video" video value={c.hero.video} onChange={v => set('hero.video', v)} />}
              </div>
            </div>
          </Card>}

          {part === 'casa' && <Card title="La casa">
            <div className="cms-split">
              <div>
                <Field label="Título" value={c.about.title} onChange={v => set('about.title', v)} />
                <Field label="Texto" value={c.about.text} onChange={v => set('about.text', v)} area />
                {c.about.stats.map((s, i) => (
                  <div className="cms-row two" key={i}>
                    <input value={s.value} onChange={e => set(`about.stats.${i}.value`, e.target.value)} />
                    <input value={s.label} onChange={e => set(`about.stats.${i}.label`, e.target.value)} />
                  </div>
                ))}
                <small className="ad-muted">Escribe {'{productos}'} para mostrar el número de productos de la carta.</small>
              </div>
              <MediaField label="Foto" slot="casa" value={c.about.image} onChange={v => set('about.image', v)} />
            </div>
          </Card>}

          {part === 'favoritos' && <Card title="Favoritos" sub="Escribe el inicio del nombre del producto como está en la carta; el precio y el botón se toman de ahí.">
            <div className="cms-3">
              {c.favorites.map((f, i) => (
                <div className="cms-fav" key={i}>
                  <MediaField label={`Favorito ${i + 1}`} slot={`fav${i + 1}`} value={f.image} onChange={v => set(`favorites.${i}.image`, v)} />
                  <Field label="Producto de la carta" value={f.product} onChange={v => set(`favorites.${i}.product`, v)} />
                  <Field label="Etiqueta" value={f.tag} onChange={v => set(`favorites.${i}.tag`, v)} />
                  <Field label="Descripción" value={f.text} onChange={v => set(`favorites.${i}.text`, v)} area />
                  <Mover i={i} n={c.favorites.length} move={(a, b) => set('favorites', moved(c.favorites, a, b))} remove={() => set('favorites', c.favorites.filter((_, k) => k !== i))} />
                </div>
              ))}
            </div>
            {c.favorites.length < 6 && <button type="button" className="ad-btn sm ghost" onClick={() => set('favorites', [...c.favorites, { product: '', tag: '', text: '', image: '' }])}>+ Agregar favorito</button>}
          </Card>}

          {part === 'pasos' && <Card title="Cómo pedir">
            <Field label="Título" value={c.steps.title} onChange={v => set('steps.title', v)} />
            {c.steps.items.map((s, i) => (
              <div className="cms-row step" key={i}>
                <b>{i + 1}</b>
                <input value={s.title} onChange={e => set(`steps.items.${i}.title`, e.target.value)} />
                <input value={s.text} onChange={e => set(`steps.items.${i}.text`, e.target.value)} />
                <Mover i={i} n={c.steps.items.length} move={(a, b) => set('steps.items', moved(c.steps.items, a, b))} remove={() => set('steps.items', c.steps.items.filter((_, k) => k !== i))} />
              </div>
            ))}
            {c.steps.items.length < 6 && <button type="button" className="cms-link" onClick={() => set('steps.items', [...c.steps.items, { title: '', text: '' }])}>+ Agregar paso</button>}
          </Card>}

          {part === 'nosotros' && <Card title="Nosotros">
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
          </Card>}

          {part === 'video' && <Card title="Sección de video" sub="Pega un enlace de YouTube o sube un video MP4. Recuerda activar la sección en Orden de secciones.">
            <Field label="Título" value={c.video.title} onChange={v => set('video.title', v)} />
            <Field label="Texto (opcional)" value={c.video.text} onChange={v => set('video.text', v)} />
            <div className="cms-split">
              <Field label="Enlace de YouTube o del video" value={/^https?:\/\/[^ ]*supabase/.test(c.video.url) ? '' : c.video.url} onChange={v => set('video.url', v)} placeholder="https://www.youtube.com/watch?v=…" />
              <MediaField label="…o sube un video" slot="video" video value={/supabase/.test(c.video.url) ? c.video.url : ''} onChange={v => set('video.url', v)} />
            </div>
            <MediaField label="Imagen de portada del video (opcional)" slot="video-poster" value={c.video.poster} onChange={v => set('video.poster', v)} />
          </Card>}

          {part === 'galeria' && <Card title="Galería" sub="Hasta 8 fotos. La primera se muestra más grande.">
            <div className="cms-gal">
              {c.gallery.map((g, i) => (
                <div key={i} className="cms-fav">
                  <MediaField label={`Foto ${i + 1}`} slot={`galeria${i + 1}`} value={g} onChange={v => set(`gallery.${i}`, v)} />
                  <Mover i={i} n={c.gallery.length} move={(a, b) => set('gallery', moved(c.gallery, a, b))} remove={() => set('gallery', c.gallery.filter((_, k) => k !== i))} />
                </div>
              ))}
            </div>
            {c.gallery.length < 8 && <button type="button" className="ad-btn sm ghost" onClick={() => set('gallery', [...c.gallery, ''])}>+ Agregar foto</button>}
          </Card>}

          {part === 'final' && <Card title="Banda final y pie de página">
            <Field label="Título de la banda final" value={c.cta.title} onChange={v => set('cta.title', v)} />
            <Field label="Texto de la banda final" value={c.cta.text} onChange={v => set('cta.text', v)} area />
            <Field label="Texto del pie de página" value={c.footer.text} onChange={v => set('footer.text', v)} />
          </Card>}

          <p className="ad-muted">¿Algo salió mal? <button type="button" className="cms-link" onClick={() => { if (confirm('¿Restaurar todos los textos y ajustes originales? No se guarda hasta que presiones Guardar.')) setC(structuredClone(DEFAULT_CONTENT)) }}>Restaurar valores originales</button></p>
        </div>
      </div>
    </section>
  )
}
