import { useEffect, useState } from 'react'
import type { Category, Item } from './types'
import { waLink } from './config'
import { CartDrawer, CartProvider, lineKey, mxn, useCart } from './cart'
import { DataProvider, countItems, useData, useSite } from './data'
import { PaymentResult } from './Payment'
import Menu from './Menu'
import Photo from './Photo'
import Footer from './Footer'

const NAV = [['inicio', 'Inicio'], ['menu', 'Menú'], ['nosotros', 'Nosotros'], ['galeria', 'Galería'], ['ubicacion', 'Ubicación'], ['contacto', 'Contacto']]
/** Busca un producto por el inicio de su nombre. Si ya no existe, la tarjeta simplemente no se muestra. */
const find = (menu: Category[], n: string): { it: Item; blockId: string } | undefined => {
  for (const c of menu) for (const b of c.blocks) {
    const it = b.items.find(i => i.name.startsWith(n))
    if (it) return { it, blockId: b.id }
  }
}
const Ico = ({ d }: { d: string }) => <svg viewBox="0 0 24 24" width="22" height="22"><path d={d} fill="currentColor" /></svg>
const WA = 'M17.47 14.38c-.3-.15-1.76-.87-2.03-.97s-.47-.15-.67.15-.77.97-.94 1.16-.35.22-.64.07c-.3-.15-1.26-.46-2.39-1.47a9 9 0 0 1-1.65-2.06c-.17-.3 0-.46.13-.6l.45-.52c.15-.17.2-.3.3-.5s.05-.37-.02-.52-.67-1.61-.92-2.2c-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.08-.8.37s-1.04 1.02-1.04 2.48 1.07 2.88 1.21 3.07 2.1 3.2 5.08 4.49c.71.3 1.26.49 1.69.62.71.23 1.36.2 1.87.12.57-.08 1.76-.72 2-1.41s.25-1.29.17-1.41-.27-.2-.57-.35M12.05 21.8a9.9 9.9 0 0 1-5.03-1.38l-.36-.21-3.74.98 1-3.65-.24-.37a9.86 9.86 0 0 1 8.37-15.14c2.64 0 5.12 1.03 6.99 2.9a9.8 9.8 0 0 1 2.89 7c0 5.44-4.43 9.87-9.88 9.87M20.46 3.49A11.8 11.8 0 0 0 12.05 0C5.5 0 .16 5.34.16 11.9c0 2.1.55 4.14 1.59 5.95L.06 24l6.3-1.65a11.9 11.9 0 0 0 5.69 1.45c6.55 0 11.89-5.34 11.89-11.9 0-3.18-1.24-6.17-3.48-8.41'

function Nav() {
  const { count, setOpen } = useCart()
  const site = useSite()
  return (
    <nav className="nav"><div className="wrap bar">
      <a href="#inicio"><img src="/logo.png" alt={site.biz.name} className="logo" /></a>
      <ul>{NAV.map(([id, l]) => <li key={id}><a href={'#' + id}>{l}</a></li>)}</ul>
      <div className="acts">
        <button className="bag" onClick={() => setOpen(true)} aria-label="Ver pedido">
          <Ico d="M7 4h10l1 4H6zM5 9h14l-1.2 11H6.2z" />{count > 0 && <i>{count}</i>}
        </button>
        <a className="btn coral sm" href="#menu">Ordenar en línea</a>
      </div>
    </div></nav>
  )
}

function Hero() {
  const { hero, biz } = useSite()
  return (
    <header id="inicio" className="hero"><div className="wrap two">
      <div>
        <span className="eyebrow dark"><i />{hero.eyebrow}</span>
        <h1>{hero.title} <em>{hero.highlight}</em></h1>
        <p>{hero.text}</p>
        <div className="cta">
          <a className="btn coral" href="#menu">Ver carta y ordenar ↓</a>
          <a className="btn ghost" href={waLink()} target="_blank" rel="noopener">Reservar por WhatsApp</a>
        </div>
        <small>{biz.days} · {biz.address}, Puebla</small>
      </div>
      <Photo src={hero.image} label="Foto principal" className="tall" />
    </div></header>
  )
}

function Marquee() {
  const { marquee } = useSite()
  return (
    <div className="marq"><div>{[0, 1].map(k => (
      <span key={k}>{marquee.map((t, i) => <b key={i}>{t}<s>✦</s></b>)}</span>
    ))}</div></div>
  )
}

function About() {
  const { menu } = useData()
  const { about } = useSite()
  return (
    <section className="sec" id="casa"><div className="wrap two rev">
      <Photo src={about.image} label="Nuestro espacio" />
      <div>
        <span className="eyebrow"><i>01</i>La casa</span>
        <h2>{about.title}</h2>
        <p className="lead">{about.text}</p>
        <div className="stats">
          {about.stats.map((st, i) => <div key={i}><b>{st.value.replace('{productos}', String(countItems(menu)))}</b><span>{st.label}</span></div>)}
        </div>
      </div>
    </div></section>
  )
}

function Favs() {
  const { add } = useCart()
  const { menu } = useData()
  const { favorites } = useSite()
  return (
    <section className="sec soft" id="favoritos"><div className="wrap">
      <div className="head"><div><span className="eyebrow"><i>02</i>Especialidades</span><h2>Los favoritos de Pa'dentro</h2></div>
        <p>Platillos y bebidas que nuestros clientes siempre quieren volver a pedir.</p></div>
      <div className="cards3">
        {favorites.map((f, i) => { const hit = f.product ? find(menu, f.product) : undefined; if (!hit) return null; const { it, blockId } = hit; const p = it.price; return (
          <article className="fav" key={i}>
            <Photo src={f.image} label={f.tag} />{f.tag && <em>{f.tag}</em>}
            <div><h3>{it.name}</h3><p>{f.text}</p>
              <div className="row">{p != null && it.available
                ? <><b className="pr">{mxn(p)}</b><button className="add" onClick={() => add({ key: lineKey(blockId, it.name, it.id), itemId: it.id, name: it.name, price: p })}>+ Agregar</button></>
                : <span className="soon">{it.available ? it.label || 'Próximamente' : 'Agotado'}</span>}</div></div>
          </article>) })}
      </div>
    </div></section>
  )
}

function Promos() {
  const { promos } = useData()
  if (!promos.length) return null
  return (
    <section className="sec dark" id="promos"><div className="wrap">
      <span className="eyebrow"><i>★</i>Promociones y eventos</span><h2>Celebra con nosotros</h2>
      <div className={'cards3' + (promos.length === 2 ? ' two' : '')}>
        {promos.map(p => (
          <article className="promo" key={p.id ?? p.title}>
            {p.label && <span>{p.label}</span>}<h3>{p.title}</h3><p>{p.description}</p>
            {p.cta_text && <a className="btn ghost sm" href={waLink(p.cta_message || `Hola, me interesa: ${p.title}`)} target="_blank" rel="noopener">{p.cta_text}</a>}
          </article>
        ))}
      </div>
    </div></section>
  )
}

function Us() {
  const { us, hours, biz } = useSite()
  return (
    <section className="sec dark" id="nosotros"><div className="wrap two">
      <div>
        <span className="eyebrow"><i>04</i>Nosotros</span>
        <h2>{us.title}</h2>
        <p className="lead">{us.text}</p>
        <div className="feats">{us.features.map((f, i) => <div key={i}><span>{f.icon}</span><h4>{f.title}</h4><p>{f.text}</p></div>)}</div>
      </div>
      <aside className="hours"><h3>🕐 Te esperamos</h3>
        {hours.map((h, i) => <div key={i}><span>{h.label}</span><span>{h.value}</span></div>)}
        <p>Reservas: <a href={`tel:+${biz.wa.replace(/\D/g, '')}`}>{biz.phone}</a></p></aside>
    </div></section>
  )
}

function Gallery() {
  const { gallery } = useSite()
  if (!gallery.length) return null
  return (
    <section className="sec" id="galeria"><div className="wrap">
      <div className="head"><div><span className="eyebrow"><i>05</i>Galería</span><h2>Lo que se vive en Pa'dentro</h2></div>
        <p>Un vistazo a nuestro espacio y a quienes ya nos visitaron.</p></div>
      <div className="gal">{gallery.slice(0, 5).map((g, i) => <Photo key={i} src={g} label="Foto" className={'g' + (i + 1)} />)}</div>
    </div></section>
  )
}

function Location() {
  const { biz } = useSite()
  const q = encodeURIComponent(`${biz.address}, ${biz.city}`)
  return (
    <section className="sec soft" id="ubicacion"><div className="wrap two">
      <div>
        <span className="eyebrow"><i>06</i>Ubicación</span><h2>Encuéntranos</h2>
        <p className="lead">📍 {biz.address}, {biz.city}</p>
        <a className="btn dk" href={biz.maps} target="_blank" rel="noopener">➤ Cómo llegar</a>
      </div>
      <iframe className="gmap" title={`Mapa: ${biz.name}`} src={`https://www.google.com/maps?q=${q}&output=embed`} loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
    </div></section>
  )
}

function Floaters() {
  const [up, setUp] = useState(false)
  useEffect(() => { const f = () => setUp(scrollY > 600); addEventListener('scroll', f); return () => removeEventListener('scroll', f) }, [])
  return (
    <>
      <button className={'top' + (up ? ' on' : '')} onClick={() => scrollTo({ top: 0, behavior: 'smooth' })} aria-label="Subir">↑</button>
      <a className="fab" href={waLink()} target="_blank" rel="noopener" aria-label="WhatsApp"><svg viewBox="0 0 24 24" width="30" height="30"><path d={WA} fill="#fff" /></svg></a>
    </>
  )
}

export default function App() {
  return (
    <DataProvider><CartProvider>
      <Nav /><Hero /><Marquee /><About /><Favs /><Menu /><Promos /><Us /><Gallery /><Location /><Footer />
      <Floaters /><CartDrawer /><PaymentResult />
    </CartProvider></DataProvider>
  )
}
