import { BIZ, chatUrl, waLink } from './config'

const I = ({ children }: { children: React.ReactNode }) => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{children}</svg>
)
const NAV = [['inicio', 'Inicio'], ['menu', 'Menú'], ['nosotros', 'Nosotros'], ['galeria', 'Galería'], ['ubicacion', 'Ubicación'], ['contacto', 'Contacto']]
const CARTA = ['Mesa Poblana', 'Antojería', 'Café y postres', 'Coctelería', 'Mezcal y destilados', 'Cerveza y sin alcohol']

export default function Footer() {
  return (
    <>
      <section className="cta-band" id="contacto"><div className="wrap">
        <h2>Tu próximo antojo está a unos cuantos clics</h2>
        <p>Explora la carta, elige tus favoritos y envíanos tu pedido directo por WhatsApp.</p>
        <div className="cta"><a className="btn coral" href="#menu">Ver carta</a><a className="btn ghost" href={waLink()} target="_blank" rel="noopener">Pedir por WhatsApp</a></div>
      </div></section>

      <footer className="ft"><div className="wrap">
        <div className="fgrid">
          <div className="fcol brand">
            <img src="/cero-logo.png" alt="Cero+" className="logo dev" />
            <p>{BIZ.tagline}.</p>
            <p className="addr">{BIZ.address}<br />{BIZ.city}</p>
            <a className="wa-line" href={waLink()} target="_blank" rel="noopener">WhatsApp: +52 {BIZ.phone}</a>
            <div className="socs">
              <a href={BIZ.fb} target="_blank" rel="noopener" aria-label="Facebook"><I><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" /></I></a>
              <a href={BIZ.ig} target="_blank" rel="noopener" aria-label="Instagram"><I><rect x="2" y="2" width="20" height="20" rx="5" /><circle cx="12" cy="12" r="4" /><path d="M17.5 6.5h.01" /></I></a>
              <a href={waLink()} target="_blank" rel="noopener" aria-label="WhatsApp"><I><path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8z" /></I></a>
            </div>
          </div>

          <div className="fcol"><h5>Navegación</h5><ul>{NAV.map(([id, l]) => <li key={id}><a href={'#' + id}>{l}</a></li>)}</ul></div>
          <div className="fcol"><h5>La carta</h5><ul>{CARTA.map(l => <li key={l}><a href="#menu">{l}</a></li>)}</ul></div>

          <div className="fcol">
            <h5>Información</h5>
            <ul className="hrs">{BIZ.hours.map(([a, b]) => <li key={a}>{a}{b && <><br /><span>{b}</span></>}</li>)}</ul>
            <p className="legal2">Precios en pesos mexicanos, con IVA. Propina voluntaria. Sujeto a disponibilidad. Prohibida la venta de bebidas alcohólicas a menores de edad.</p>
          </div>

          <div className="fcol">
            <h5>Asistente virtual</h5>
            <a className="qr" href={chatUrl} target="_blank" rel="noopener" aria-label="Abrir asistente virtual"><img src="/qr-asistente.png" alt="QR del asistente virtual de Pa'dentro" /></a>
            <p className="qcap">Escanea el código y chatea con nuestro asistente.</p>
          </div>
        </div>

        <div className="fbar"><span>© {new Date().getFullYear()} {BIZ.name}. Todos los derechos reservados.</span><b>Diseñado por Cero+</b></div>
      </div></footer>
    </>
  )
}
