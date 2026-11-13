import { useEffect, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import Menu from './Menu'
import Footer from './Footer'
import Photo, { imgUrl } from './Photo'
import type { Category, Item } from './types'
import { ASSISTANT, waLink } from './config'
import { CartDrawer, CartProvider, lineKey, mxn, useCart } from './cart'
import { DataProvider, countItems, useData, useSite } from './data'
import { PaymentResult } from './Payment'
import LoginModal from './LoginModal'
import Icon, { NETWORK_ICON, socialHref } from './icons'
import { NETWORK_LABEL, openNow, timeLabel, type SectionId } from './content'

/** Busca un producto por el inicio de su nombre. Si ya no existe, la tarjeta simplemente no se muestra. */
const find = (menu: Category[], n: string): { it: Item; blockId: string } | undefined => {
  for (const c of menu) for (const b of c.blocks) {
    const it = b.items.find(i => i.name.toLowerCase().startsWith(n.toLowerCase()))
    if (it) return { it, blockId: b.id }
  }
}

/** Banda de azulejo de Talavera: el motivo de la casa. */
export const Talavera = ({ className = '' }: { className?: string }) => <div className={'talavera ' + className} aria-hidden="true" />

const NAV: [SectionId | 'inicio', string][] = [['menu', 'Carta'], ['casa', 'La casa'], ['nosotros', 'Horario'], ['galeria', 'Galería'], ['ubicacion', 'Ubicación']]

function Nav() {
  const { count, setOpen } = useCart()
  const site = useSite()
  const [login, setLogin] = useState(false)
  const [solid, setSolid] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  useEffect(() => { const f = () => setSolid(scrollY > 40); f(); addEventListener('scroll', f, { passive: true }); return () => removeEventListener('scroll', f) }, [])
  const visible = new Set(site.sections.filter(s => s.visible).map(s => s.id))
  return (
    <nav className={'nav' + (solid ? ' solid' : '') + (menuOpen ? ' open' : '')}>
      <div className="wrap bar">
        <a href="#inicio" className="brand-link"><img src="/logo.png" alt={site.biz.name} className="logo" /></a>
        <ul>
          {NAV.filter(([id]) => id === 'inicio' || visible.has(id as SectionId)).map(([id, l]) => <li key={id}><a href={'#' + id}>{l}</a></li>)}
          <li><a href="/pedido">Seguir pedido</a></li>
        </ul>
        <div className="acts">
          <button className="ico-btn" onClick={() => setLogin(true)} aria-label="Acceso administrador" title="Acceso administrador"><Icon name="user" /></button>
          <button className="ico-btn" onClick={() => setOpen(true)} aria-label={`Ver pedido (${count})`}>
            <Icon name="bag" />{count > 0 && <i>{count}</i>}
          </button>
          <a className="btn gold sm hide-m" href="#menu">Ordenar</a>
          <button className="ico-btn burger" onClick={() => setMenuOpen(true)} aria-label="Abrir menú" aria-expanded={menuOpen}><span /><span /><span /></button>
        </div>
      </div>
      {menuOpen && <MobileMenu items={NAV.filter(([id]) => visible.has(id as SectionId))} onClose={() => setMenuOpen(false)} onLogin={() => { setMenuOpen(false); setLogin(true) }} />}
      {login && <LoginModal onClose={() => setLogin(false)} />}
    </nav>
  )
}

/** Menú de pantalla completa para celulares. */
function MobileMenu({ items, onClose, onLogin }: { items: [string, string][]; onClose: () => void; onLogin: () => void }) {
  const { biz, store, socials } = useSite()
  const { count, setOpen } = useCart()
  const open = openNow(store.schedule)
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    addEventListener('keydown', esc)
    return () => { document.body.style.overflow = prev; removeEventListener('keydown', esc) }
  }, [onClose])
  return createPortal(
    <div className="mmenu" role="dialog" aria-modal="true" aria-label="Menú">
      <div className="mmenu-top">
        <img src="/logo.png" alt={biz.name} className="logo" />
        <button className="ico-btn" onClick={onClose} aria-label="Cerrar menú"><Icon name="close" /></button>
      </div>
      <span className={'status ' + (open ? 'on' : 'off')}><i />{open ? `Abierto · cocina hasta ${timeLabel(store.schedule.close)}` : `Cerrado ahora · abrimos a las ${timeLabel(store.schedule.open)}`}</span>
      <nav className="mmenu-links">
        {items.map(([id, l]) => <a key={id} href={'#' + id} onClick={onClose}>{l}<Icon name="arrowR" size={18} /></a>)}
        <a href="/pedido">Seguir mi pedido<Icon name="arrowR" size={18} /></a>
      </nav>
      <div className="mmenu-cta">
        <a className="btn gold" href="#menu" onClick={onClose}>Ordenar en línea</a>
        <button className="btn ghost" onClick={() => { onClose(); setOpen(true) }}><Icon name="bag" size={18} />Mi pedido{count > 0 ? ` (${count})` : ''}</button>
      </div>
      <div className="mmenu-info">
        <a href={waLink()} target="_blank" rel="noopener"><Icon name="chat" size={18} />WhatsApp {biz.phone}</a>
        <a href={biz.maps} target="_blank" rel="noopener"><Icon name="pin" size={18} />{biz.address}, Puebla</a>
      </div>
      <div className="mmenu-foot">
        {socials.length > 0 && <div className="socs">{socials.map((s, i) => (
          <a key={i} href={socialHref(s.network, s.url)} target="_blank" rel="noopener" aria-label={NETWORK_LABEL[s.network]}><Icon name={NETWORK_ICON[s.network]} size={18} /></a>
        ))}</div>}
        <button className="acceso" onClick={onLogin}>Acceso administrador</button>
      </div>
    </div>,
    document.body,
  )
}

function Hero() {
  const { hero, biz, store, hours } = useSite()
  const open = openNow(store.schedule)
  const media = hero.media === 'video' && hero.video ? 'video' : 'image'
  return (
    <header id="inicio" className="hero">
      <div className="hero-media" aria-hidden="true">
        {media === 'video'
          ? <video src={imgUrl(hero.video)} poster={hero.image ? imgUrl(hero.image) : undefined} autoPlay muted loop playsInline />
          : <Photo src={hero.image} label="" className="fill" />}
      </div>
      <div className="wrap hero-in">
        <p className="hero-kicker">{hero.eyebrow}</p>
        <h1>{hero.title}</h1>
        <p className="hero-text">{hero.text}</p>
        <div className="hero-cta">
          <a className="btn gold" href="#menu">{hero.primary}</a>
          <a className="btn ghost" href={waLink()} target="_blank" rel="noopener">{hero.secondary}</a>
        </div>
      </div>
      <div className="hero-strip">
        <div className="wrap strip-in">
          <span className={'status ' + (open ? 'on' : 'off')}><i />{open ? `Abierto · cocina hasta ${timeLabel(store.schedule.close)}` : `Cerrado ahora · abrimos a las ${timeLabel(store.schedule.open)}`}</span>
          <span><Icon name="pin" size={17} />{biz.address}, Puebla</span>
          <span className="hide-m"><Icon name="clock" size={17} />{hours[0]?.value || biz.days}</span>
          <a href="#menu" className="strip-link"><Icon name="calendar" size={17} />Programa tu pedido</a>
        </div>
      </div>
      <Talavera />
    </header>
  )
}

function Marquee() {
  const { marquee } = useSite()
  if (!marquee.length) return null
  return (
    <div className="marq" aria-hidden="true"><div>{[0, 1].map(k => (
      <span key={k}>{marquee.map((t, i) => <b key={i}>{t}<s>✦</s></b>)}</span>
    ))}</div></div>
  )
}

const Sec = ({ id, className = '', children }: { id: string; className?: string; children: ReactNode }) =>
  <section id={id} className={'sec ' + className}>{children}</section>

function About() {
  const { menu } = useData()
  const { about } = useSite()
  return (
    <Sec id="casa"><div className="wrap split">
      <div className="frame"><Photo src={about.image} label="Nuestro espacio" /></div>
      <div>
        <h2>{about.title}</h2>
        <p className="lead">{about.text}</p>
        <dl className="stats">
          {about.stats.map((st, i) => <div key={i}><dt>{st.value.replace('{productos}', String(countItems(menu)))}</dt><dd>{st.label}</dd></div>)}
        </dl>
      </div>
    </div></Sec>
  )
}

function Favs() {
  const { add, setOpen } = useCart()
  const { menu } = useData()
  const { favorites } = useSite()
  const cards = favorites.map(f => ({ f, hit: f.product ? find(menu, f.product) : undefined })).filter(x => x.hit)
  if (!cards.length) return null
  return (
    <Sec id="favoritos" className="porcelain"><div className="wrap">
      <div className="head"><h2>Los favoritos de la casa</h2><p>Lo que nuestros clientes vuelven a pedir.</p></div>
      <div className="favs">
        {cards.map(({ f, hit }, i) => { const { it, blockId } = hit!; const p = it.price; return (
          <article className="fav" key={i}>
            <Photo src={f.image} label={f.tag} />
            <div className="fav-body">
              {f.tag && <span className="tag">{f.tag}</span>}
              <h3>{it.name}</h3><p>{f.text}</p>
              <div className="fav-row">{p != null && it.available
                ? <><b className="price">{mxn(p)}</b><button className="btn dk sm" onClick={() => { add({ key: lineKey(blockId, it.name, it.id), itemId: it.id, name: it.name, price: p }); setOpen(true) }}>Agregar</button></>
                : <span className="soon">{it.available ? it.label || 'Próximamente' : 'Agotado'}</span>}</div>
            </div>
          </article>) })}
      </div>
    </div></Sec>
  )
}

function Steps() {
  const { steps } = useSite()
  if (!steps.items.length) return null
  return (
    <Sec id="pasos" className="night tiled"><div className="wrap">
      <h2>{steps.title}</h2>
      <ol className="steps">
        {steps.items.map((s, i) => <li key={i}><b>{i + 1}</b><h3>{s.title}</h3><p>{s.text}</p></li>)}
      </ol>
      <div className="steps-cta"><a className="btn gold" href="#menu">Empezar mi pedido</a><a className="btn ghost" href="/pedido">Ya tengo un código</a></div>
    </div></Sec>
  )
}

function Promos() {
  const { promos } = useData()
  if (!promos.length) return null
  return (
    <Sec id="promos"><div className="wrap">
      <div className="head"><h2>Promociones y eventos</h2><p>Para celebrar con nosotros.</p></div>
      <div className="promos">
        {promos.map(p => (
          <article className="promo" key={p.id ?? p.title}>
            {p.label && <span className="tag">{p.label}</span>}<h3>{p.title}</h3><p>{p.description}</p>
            {p.cta_text && <a className="btn dk sm" href={waLink(p.cta_message || `Hola, me interesa: ${p.title}`)} target="_blank" rel="noopener">{p.cta_text}</a>}
          </article>
        ))}
      </div>
    </div></Sec>
  )
}

/** Convierte un enlace de YouTube en uno incrustable; otros enlaces se tratan como video directo. */
const ytEmbed = (url: string) => {
  const m = url.match(/(?:youtu\.be\/|v=|shorts\/|embed\/)([\w-]{11})/)
  return m ? `https://www.youtube-nocookie.com/embed/${m[1]}?rel=0` : null
}
function VideoSec() {
  const { video } = useSite()
  if (!video.url) return null
  const yt = ytEmbed(video.url)
  return (
    <Sec id="video" className="porcelain"><div className="wrap">
      <div className="head"><h2>{video.title}</h2>{video.text && <p>{video.text}</p>}</div>
      <div className="video-box">
        {yt ? <iframe src={yt} title={video.title} allow="encrypted-media; picture-in-picture" allowFullScreen loading="lazy" />
            : <video src={imgUrl(video.url)} poster={video.poster ? imgUrl(video.poster) : undefined} controls playsInline preload="metadata" />}
      </div>
    </div></Sec>
  )
}

function Us() {
  const { us, hours, biz } = useSite()
  return (
    <Sec id="nosotros" className="night tiled"><div className="wrap split top">
      <div>
        <h2>{us.title}</h2>
        <p className="lead">{us.text}</p>
        <div className="feats">{us.features.map((f, i) => <div key={i}><span>{f.icon}</span><h3>{f.title}</h3><p>{f.text}</p></div>)}</div>
      </div>
      <aside className="hours">
        <h3>Horario</h3>
        <dl>{hours.map((h, i) => <div key={i}><dt>{h.label}</dt><dd>{h.value}</dd></div>)}</dl>
        <a className="hours-call" href={`tel:+${biz.wa.replace(/\D/g, '')}`}><Icon name="phone" size={18} />Reservaciones {biz.phone}</a>
      </aside>
    </div></Sec>
  )
}

function Gallery() {
  const { gallery } = useSite()
  const pics = gallery.filter(Boolean).slice(0, 8)
  if (!pics.length) return null
  return (
    <Sec id="galeria"><div className="wrap">
      <div className="head"><h2>Lo que se vive en Pa'dentro</h2><p>Nuestro espacio y quienes ya nos visitaron.</p></div>
      <div className={'gal n' + pics.length}>{pics.map((g, i) => <Photo key={i} src={g} label="Pa'dentro" />)}</div>
    </div></Sec>
  )
}

function Location() {
  const { biz, socials } = useSite()
  const q = encodeURIComponent(`${biz.address}, ${biz.city}`)
  return (
    <Sec id="ubicacion" className="porcelain"><div className="wrap split">
      <div>
        <h2>Encuéntranos</h2>
        <address className="addr">{biz.address}<br />{biz.city}</address>
        <ul className="contact">
          <li><Icon name="phone" size={18} /><a href={`tel:+${biz.wa.replace(/\D/g, '')}`}>{biz.phone}</a></li>
          <li><Icon name="chat" size={18} /><a href={waLink()} target="_blank" rel="noopener">WhatsApp</a></li>
          {biz.email && <li><Icon name="mail" size={18} /><a href={`mailto:${biz.email}`}>{biz.email}</a></li>}
        </ul>
        <a className="btn dk" href={biz.maps} target="_blank" rel="noopener">Cómo llegar</a>
        {socials.length > 0 && <div className="socs">{socials.map((s, i) => (
          <a key={i} href={socialHref(s.network, s.url)} target="_blank" rel="noopener" aria-label={NETWORK_LABEL[s.network]} title={NETWORK_LABEL[s.network]}><Icon name={NETWORK_ICON[s.network]} /></a>
        ))}</div>}
      </div>
      <iframe className="gmap" title={`Mapa: ${biz.name}`} src={`https://www.google.com/maps?q=${q}&output=embed`} loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
    </div></Sec>
  )
}

function CtaBand() {
  const { cta } = useSite()
  return (
    <section className="cta-band" id="contacto"><div className="wrap">
      <h2>{cta.title}</h2><p>{cta.text}</p>
      <div className="hero-cta"><a className="btn gold" href="#menu">Ordenar ahora</a><a className="btn ghost" href={waLink()} target="_blank" rel="noopener">Escribir por WhatsApp</a></div>
    </div></section>
  )
}

/** Botones flotantes configurables desde el CMS. */
function Floaters() {
  const { floating, biz } = useSite()
  const [up, setUp] = useState(false)
  useEffect(() => { const f = () => setUp(scrollY > 700); addEventListener('scroll', f, { passive: true }); return () => removeEventListener('scroll', f) }, [])
  // El asistente virtual se carga solo si está activo en el CMS.
  useEffect(() => {
    if (!floating.chat || document.getElementById('clienteai-widget')) return
    const s = document.createElement('script')
    s.id = 'clienteai-widget'; s.async = true; s.src = 'https://clienteai.site/widget.js'; s.dataset.token = ASSISTANT.token
    document.body.appendChild(s)
  }, [floating.chat])
  return (
    <div className={'floaters' + (floating.chat ? ' with-chat' : '')}>
      {floating.top && <button className={'fl top' + (up ? ' on' : '')} onClick={() => scrollTo({ top: 0, behavior: 'smooth' })} aria-label="Subir"><Icon name="up" /></button>}
      {floating.call && <a className="fl call" href={`tel:+${biz.wa.replace(/\D/g, '')}`} aria-label="Llamar"><Icon name="phone" /></a>}
      {floating.whatsapp && <a className="fl wa" href={waLink(floating.whatsappMessage)} target="_blank" rel="noopener" aria-label="WhatsApp"><Icon name="chat" size={26} /></a>}
    </div>
  )
}

const SECTIONS: Record<SectionId, () => ReactNode> = {
  casa: () => <About />, favoritos: () => <Favs />, pasos: () => <Steps />, menu: () => <Menu />, promos: () => <Promos />,
  video: () => <VideoSec />, nosotros: () => <Us />, galeria: () => <Gallery />, ubicacion: () => <Location />, cta: () => <CtaBand />,
}

function Page() {
  const { sections } = useSite()
  return (
    <>
      <Nav /><Hero /><Marquee />
      {sections.filter(s => s.visible).map(s => <div key={s.id} className="slot">{SECTIONS[s.id]()}</div>)}
      <Footer />
      <Floaters /><CartDrawer /><PaymentResult />
    </>
  )
}

export default function App() {
  return <DataProvider><CartProvider><Page /></CartProvider></DataProvider>
}
