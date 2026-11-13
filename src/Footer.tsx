import { useState } from 'react'
import { chatUrl, waLink } from './config'
import { useSite } from './data'
import LoginModal from './LoginModal'
import Icon, { NETWORK_ICON, socialHref } from './icons'
import { NETWORK_LABEL } from './content'

const NAV: [string, string][] = [['menu', 'Carta y pedidos'], ['casa', 'La casa'], ['nosotros', 'Horario'], ['galeria', 'Galería'], ['ubicacion', 'Ubicación']]

export default function Footer() {
  const { biz, footer, socials, floating, hours } = useSite()
  const [login, setLogin] = useState(false)
  return (
    <footer className="ft">
      <div className="talavera" aria-hidden="true" />
      <div className="wrap fgrid">
        <div className="fcol brand">
          <img src="/logo.png" alt={biz.name} className="logo" />
          <p>{footer.text}</p>
          {socials.length > 0 && <div className="socs">{socials.map((s, i) => (
            <a key={i} href={socialHref(s.network, s.url)} target="_blank" rel="noopener" aria-label={NETWORK_LABEL[s.network]} title={NETWORK_LABEL[s.network]}><Icon name={NETWORK_ICON[s.network]} size={18} /></a>
          ))}</div>}
        </div>
        <div className="fcol">
          <h3>Visítanos</h3>
          <p>{biz.address}<br />{biz.city}</p>
          <dl className="fhours">{hours.map((h, i) => <div key={i}><dt>{h.label}</dt><dd>{h.value}</dd></div>)}</dl>
        </div>
        <div className="fcol">
          <h3>Pedidos</h3>
          <ul>
            {NAV.map(([id, l]) => <li key={id}><a href={'/#' + id}>{l}</a></li>)}
            <li><a href="/pedido">Seguir mi pedido</a></li>
            <li><a href={waLink()} target="_blank" rel="noopener">WhatsApp +52 {biz.phone}</a></li>
          </ul>
        </div>
        {floating.chat && (
          <div className="fcol">
            <h3>Asistente virtual</h3>
            <a className="qr" href={chatUrl} target="_blank" rel="noopener" aria-label="Abrir asistente virtual"><img src="/qr-asistente.png" alt="Código QR del asistente virtual" /></a>
            <p className="small">Escanea el código y chatea con nuestro asistente.</p>
          </div>
        )}
      </div>
      <div className="wrap fbar">
        <p className="small">Precios en pesos mexicanos con IVA incluido. Propina voluntaria. Sujeto a disponibilidad. Prohibida la venta de bebidas alcohólicas a menores de edad.</p>
        <div className="fbar-row">
          <span>© {new Date().getFullYear()} {biz.name}</span>
          <button className="acceso" onClick={() => setLogin(true)}>Acceso administrador</button>
          <span className="by">Diseñado por <a href="https://cero-new-generation-e19z.vercel.app/" target="_blank" rel="noopener" aria-label="Cero+"><img src="/cero-logo-dark.png" alt="Cero+" /></a></span>
        </div>
      </div>
      {login && <LoginModal onClose={() => setLogin(false)} />}
    </footer>
  )
}
