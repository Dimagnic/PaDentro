import { BIZ, chatUrl, waLink } from './config'

const I = ({ children }: { children: React.ReactNode }) => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{children}</svg>
)
const NAV = [['inicio', 'Inicio'], ['menu', 'Menú'], ['nosotros', 'Nosotros'], ['galeria', 'Galería'], ['ubicacion', 'Ubicación'], ['contacto', 'Contacto']]
const SERV = ['Mesa Poblana', 'Antojería poblana', 'Café y postres', 'Coctelería y mezcal', 'Pedidos por WhatsApp', 'Salones para eventos']

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
            <img src="/logo.png" alt={BIZ.name} className="logo" />
            <p>Buffet y cantina poblana en el Centro Histórico de Puebla.</p>
            <a className="wa-line" href={waLink()} target="_blank" rel="noopener">WhatsApp: +52 {BIZ.phone}</a>
            <div className="socs">
              <a href={BIZ.fb} target="_blank" rel="noopener" aria-label="Facebook"><I><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" /></I></a>
              <a href={BIZ.ig} target="_blank" rel="noopener" aria-label="Instagram"><I><rect x="2" y="2" width="20" height="20" rx="5" /><circle cx="12" cy="12" r="4" /><path d="M17.5 6.5h.01" /></I></a>
            </div>
          </div>

          <div className="fcol"><h5>Navegación</h5><ul>{NAV.map(([id, l]) => <li key={id}><a href={'#' + id}>{l}</a></li>)}</ul></div>
          <div className="fcol"><h5>Servicios</h5><ul>{SERV.map(l => <li key={l}><a href="#menu">{l}</a></li>)}</ul></div>

          <div className="fcol">
            <h5>Legal</h5>
            <p className="legal2">Precios en pesos mexicanos (MXN), con IVA incluido. Propina voluntaria. Sujetos a disponibilidad. Prohibida la venta de bebidas alcohólicas a menores de edad.</p>
            <p className="legal2">{BIZ.address}, {BIZ.city}<br />Martes a domingo.</p>
          </div>

          <div className="fcol">
            <h5>Asistente virtual</h5>
            <a className="qr" href={chatUrl} target="_blank" rel="noopener" aria-label="Abrir asistente virtual"><img src="/qr-asistente.png" alt="QR del asistente virtual de Pa'dentro" /></a>
            <p className="qcap">Escanea el código y chatea con nuestro asistente.</p>
          </div>
        </div>

        <div className="fbar">
          <span>© {new Date().getFullYear()} {BIZ.name}. Todos los derechos reservados.</span>
          <span className="by">Diseñado por <a href="https://cero-new-generation-e19z.vercel.app/" target="_blank" rel="noopener" aria-label="Cero+"><img src="/cero-logo-dark.png" alt="Cero+" /></a></span>
        </div>
      </div></footer>
    </>
  )
}

