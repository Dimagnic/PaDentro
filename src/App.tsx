import { useEffect, useState } from 'react'
import data from './menu.json'
import type { Category } from './types'
import { BIZ, waLink } from './config'
import { CartDrawer, CartProvider, mxn, useCart } from './cart'
import Menu from './Menu'
import Photo from './Photo'

const NAV = [['inicio', 'Inicio'], ['menu', 'Menú'], ['nosotros', 'Nosotros'], ['galeria', 'Galería'], ['ubicacion', 'Ubicación'], ['contacto', 'Contacto']]
const find = (n: string) => (data as Category[]).flatMap(c => c.blocks.flatMap(b => b.items)).find(i => i.name.startsWith(n))!
const total = (data as Category[]).reduce((a, c) => a + c.blocks.reduce((x, b) => x + b.items.length, 0), 0)
const FAV = [
  { n: 'Mole poblano con guajolote', tag: 'Mesa Poblana', d: 'Nuestro mole poblano con guajolote o pollo, 200 g.', img: 'fav-mole.jpg' },
  { n: 'Chile en nogada', tag: 'De temporada', d: 'Platillo de temporada, una pieza. No participa en el beneficio Mesa Poblana.', img: 'fav-nogada.jpg' },
  { n: 'Carajillo, el rey', tag: 'Café', d: 'Licor 43 con expresso: el carajillo clásico de la casa.', img: 'fav-carajillo.jpg' },
]
const Ico = ({ d }: { d: string }) => <svg viewBox="0 0 24 24" width="22" height="22"><path d={d} fill="currentColor" /></svg>
const WA = 'M17.47 14.38c-.3-.15-1.76-.87-2.03-.97s-.47-.15-.67.15-.77.97-.94 1.16-.35.22-.64.07c-.3-.15-1.26-.46-2.39-1.47a9 9 0 0 1-1.65-2.06c-.17-.3 0-.46.13-.6l.45-.52c.15-.17.2-.3.3-.5s.05-.37-.02-.52-.67-1.61-.92-2.2c-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.08-.8.37s-1.04 1.02-1.04 2.48 1.07 2.88 1.21 3.07 2.1 3.2 5.08 4.49c.71.3 1.26.49 1.69.62.71.23 1.36.2 1.87.12.57-.08 1.76-.72 2-1.41s.25-1.29.17-1.41-.27-.2-.57-.35M12.05 21.8a9.9 9.9 0 0 1-5.03-1.38l-.36-.21-3.74.98 1-3.65-.24-.37a9.86 9.86 0 0 1 8.37-15.14c2.64 0 5.12 1.03 6.99 2.9a9.8 9.8 0 0 1 2.89 7c0 5.44-4.43 9.87-9.88 9.87M20.46 3.49A11.8 11.8 0 0 0 12.05 0C5.5 0 .16 5.34.16 11.9c0 2.1.55 4.14 1.59 5.95L.06 24l6.3-1.65a11.9 11.9 0 0 0 5.69 1.45c6.55 0 11.89-5.34 11.89-11.9 0-3.18-1.24-6.17-3.48-8.41'

function Nav() {
  const { count, setOpen } = useCart()
  return (
    <nav className="nav"><div className="wrap bar">
      <a href="#inicio"><img src="/logo.png" alt={BIZ.name} className="logo" /></a>
      <ul>{NAV.map(([id, l]) => <li key={id}><a href={'#' + id}>{l}</a></li>)}</ul>
      <div className="acts">
        <button className="bag" onClick={() => setOpen(true)} aria-label="Ver pedido">
          <Ico d="M7 4h10l1 4H6zM5 9h14l-1.2 11H6.2z" />{count > 0 && <i>{count}</i>}
        </button>
        <a className="btn coral sm" href={waLink()} target="_blank" rel="noopener">Pedir por WhatsApp</a>
      </div>
    </div></nav>
  )
}

function Hero() {
  return (
    <header id="inicio" className="hero"><div className="wrap two">
      <div>
        <span className="eyebrow dark"><i />Buffet y cantina poblana</span>
        <h1>Sabores de Puebla, <em>pa'dentro.</em></h1>
        <p>Mesa Poblana, antojitos, café, coctelería y mezcal en pleno Centro Histórico. Ven a comer, beber y celebrar.</p>
        <div className="cta">
          <a className="btn coral" href="#menu">Ver carta ↓</a>
          <a className="btn ghost" href={waLink()} target="_blank" rel="noopener">Reservar por WhatsApp</a>
        </div>
        <small>Martes a domingo · {BIZ.address}, Puebla</small>
      </div>
      <Photo src="hero.jpg" label="Foto principal" className="tall" />
    </div></header>
  )
}

const Marquee = () => (
  <div className="marq"><div>{[...Array(2)].map((_, k) => (
    <span key={k}>{['Mesa Poblana', 'Antojería', 'Mezcal artesanal', 'Café de especialidad', 'Coctelería de la casa', 'Centro Histórico'].map(t => <b key={t}>{t}<s>✦</s></b>)}</span>
  ))}</div></div>
)

function About() {
  return (
    <section className="sec" id="casa"><div className="wrap two rev">
      <Photo src="casa.jpg" label="Nuestro espacio" />
      <div>
        <span className="eyebrow"><i>01</i>La casa</span>
        <h2>El sabor que siempre quieres volver a probar</h2>
        <p className="lead">En Pa'dentro reunimos la cocina poblana, la cantina y el buen mezcal en un solo lugar. Beneficio de la casa: disfruta Mesa Poblana sin costo al acumular $350 o más por persona en bebidas y/o postres.</p>
        <div className="stats">
          <div><b>{total}</b><span>productos en carta</span></div>
          <div><b>$350</b><span>activan Mesa Poblana</span></div>
          <div><b>6 días</b><span>abiertos a la semana</span></div>
        </div>
      </div>
    </div></section>
  )
}

function Favs() {
  const { add } = useCart()
  return (
    <section className="sec soft" id="favoritos"><div className="wrap">
      <div className="head"><div><span className="eyebrow"><i>02</i>Especialidades</span><h2>Los favoritos de Pa'dentro</h2></div>
        <p>Platillos y bebidas que nuestros clientes siempre quieren volver a pedir.</p></div>
      <div className="cards3">
        {FAV.map(f => { const it = find(f.n); const p = Number(it.price.replace(/,/g, '').split('/')[0]); return (
          <article className="fav" key={f.n}>
            <Photo src={f.img} label={f.tag} /><em>{f.tag}</em>
            <div><h3>{it.name}</h3><p>{f.d}</p>
              <div className="row"><b className="pr">{mxn(p)}</b><button className="add" onClick={() => add(it.name, p)}>+ Agregar</button></div></div>
          </article>) })}
      </div>
    </div></section>
  )
}

function Promos() {
  return (
    <section className="sec dark" id="promos"><div className="wrap">
      <span className="eyebrow"><i>★</i>Promociones y eventos</span><h2>Celebra con nosotros</h2>
      <div className="cards3 two">
        <article className="promo"><span>Jueves y viernes</span><h3>De Bandidas</h3><p>Toda la coctelería al 2x1.</p></article>
        <article className="promo"><span>17 de octubre</span><h3>Cena Maridaje</h3><p>Pa'dentro y mezcal: entre maíz, fuego y agave. Recepción 4:30 pm, inicio 5:00 pm.</p>
          <a className="btn ghost sm" href={waLink('Hola, quiero reservar para la Cena Maridaje del 17 de octubre')} target="_blank" rel="noopener">Reservar lugar</a></article>
      </div>
    </div></section>
  )
}

function Us() {
  const F = [['🌽', 'Cocina poblana', 'Antojitos, caldos y platillos fuertes de la tradición de Puebla.'], ['🥃', 'Cantina y mezcal', 'Coctelería de la casa y una amplia selección de mezcales artesanales.'], ['🎉', 'Salones privados', 'Contamos con salones para reuniones privadas. Cotiza tu evento.']]
  return (
    <section className="sec dark" id="nosotros"><div className="wrap two">
      <div>
        <span className="eyebrow"><i>04</i>Nosotros</span>
        <h2>Tradición poblana servida con cariño</h2>
        <p className="lead">Pa'dentro nació para que Puebla se disfrute completa: comer, beber y celebrar bajo el mismo techo, con recetas de la región y el mejor ambiente de cantina.</p>
        <div className="feats">{F.map(([e, t, d]) => <div key={t}><span>{e}</span><h4>{t}</h4><p>{d}</p></div>)}</div>
      </div>
      <aside className="hours"><h3>🕐 Te esperamos</h3>
        {BIZ.hours.map(([a, b]) => <div key={a}><span>{a}</span><span>{b}</span></div>)}
        <p>Reservas: <a href={`tel:+${BIZ.wa}`}>{BIZ.phone}</a></p></aside>
    </div></section>
  )
}

function Gallery() {
  return (
    <section className="sec" id="galeria"><div className="wrap">
      <div className="head"><div><span className="eyebrow"><i>05</i>Galería</span><h2>Lo que se vive en Pa'dentro</h2></div>
        <p>Un vistazo a nuestro espacio y a quienes ya nos visitaron.</p></div>
      <div className="gal">{[1, 2, 3, 4, 5].map(n => <Photo key={n} src={`galeria-${n}.jpg`} label="Foto" className={'g' + n} />)}</div>
    </div></section>
  )
}

function Location() {
  return (
    <section className="sec soft" id="ubicacion"><div className="wrap two">
      <div>
        <span className="eyebrow"><i>06</i>Ubicación</span><h2>Encuéntranos</h2>
        <p className="lead">📍 {BIZ.address}, {BIZ.city}</p>
        <a className="btn dk" href={BIZ.maps} target="_blank" rel="noopener">➤ Cómo llegar</a>
      </div>
      <div className="map"><i className="pin" /><div><b>Pa'dentro</b><small>{BIZ.address}, {BIZ.city}</small></div></div>
    </div></section>
  )
}

function Footer() {
  return (
    <>
      <section className="cta-band" id="contacto"><div className="wrap">
        <h2>Tu próximo antojo está a unos cuantos clics</h2>
        <p>Explora la carta, elige tus favoritos y envíanos tu pedido directo por WhatsApp.</p>
        <div className="cta"><a className="btn coral" href="#menu">Ver carta</a><a className="btn ghost" href={waLink()} target="_blank" rel="noopener">Pedir por WhatsApp</a></div>
      </div></section>
      <footer><div className="wrap foot">
        <div><img src="/logo.png" alt={BIZ.name} className="logo" /><p>{BIZ.tagline}</p></div>
        <ul>{NAV.map(([id, l]) => <li key={id}><a href={'#' + id}>{l}</a></li>)}</ul>
        <div className="soc"><a href={BIZ.fb} target="_blank" rel="noopener">Facebook</a><a href={BIZ.ig} target="_blank" rel="noopener">Instagram</a></div>
      </div><p className="copy wrap">© {new Date().getFullYear()} {BIZ.name} · Puebla</p></footer>
    </>
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
    <CartProvider>
      <Nav /><Hero /><Marquee /><About /><Favs /><Menu /><Promos /><Us /><Gallery /><Location /><Footer />
      <Floaters /><CartDrawer />
    </CartProvider>
  )
}
