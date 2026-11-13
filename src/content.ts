/**
 * Contenido editable del sitio (CMS). Estos son los valores por defecto;
 * lo que se guarde en el panel (/admin > Sitio) los reemplaza.
 * Imágenes y videos: nombre de archivo de public/images/ o URL completa.
 */
export type SectionId = 'casa' | 'favoritos' | 'pasos' | 'menu' | 'promos' | 'video' | 'nosotros' | 'galeria' | 'ubicacion' | 'cta'
export const SECTION_LABEL: Record<SectionId, string> = {
  casa: 'La casa', favoritos: 'Favoritos', pasos: 'Cómo pedir', menu: 'Carta y tienda', promos: 'Promociones',
  video: 'Video', nosotros: 'Nosotros y horario', galeria: 'Galería', ubicacion: 'Ubicación y mapa', cta: 'Banda final',
}
export type Network = 'facebook' | 'instagram' | 'tiktok' | 'youtube' | 'x' | 'whatsapp' | 'maps' | 'tripadvisor' | 'spotify' | 'web' | 'email'
export const NETWORK_LABEL: Record<Network, string> = {
  facebook: 'Facebook', instagram: 'Instagram', tiktok: 'TikTok', youtube: 'YouTube', x: 'X (Twitter)', whatsapp: 'WhatsApp',
  maps: 'Google Maps', tripadvisor: 'Tripadvisor', spotify: 'Spotify', web: 'Sitio web', email: 'Correo',
}

export interface Schedule { open: string; close: string; days: number[]; leadMinutes: number; maxDays: number; slotMinutes: number }

export interface SiteContent {
  biz: { name: string; tagline: string; phone: string; wa: string; email: string; address: string; city: string; maps: string; days: string }
  socials: { network: Network; url: string }[]
  floating: { whatsapp: boolean; whatsappMessage: string; call: boolean; chat: boolean; top: boolean }
  sections: { id: SectionId; visible: boolean }[]
  hours: { label: string; value: string }[]
  hero: { eyebrow: string; title: string; text: string; media: 'image' | 'video'; image: string; video: string; primary: string; secondary: string }
  marquee: string[]
  about: { title: string; text: string; image: string; stats: { value: string; label: string }[] }
  favorites: { product: string; tag: string; text: string; image: string }[]
  steps: { title: string; items: { title: string; text: string }[] }
  us: { title: string; text: string; features: { icon: string; title: string; text: string }[] }
  video: { title: string; text: string; url: string; poster: string }
  gallery: string[]
  cta: { title: string; text: string }
  footer: { text: string }
  store: { online: boolean; closedMessage: string; pickupNote: string; schedule: Schedule }
}

export const DEFAULT_CONTENT: SiteContent = {
  biz: {
    name: "Pa'dentro Buffet y Cantina",
    tagline: 'Comer, beber y celebrar Puebla',
    phone: '236 112 2856',
    wa: '522361122856',
    email: '',
    address: 'Av. 2 Oriente 811',
    city: 'Centro Histórico, Puebla, Pue.',
    maps: 'https://www.google.com/maps/search/?api=1&query=Av+2+Ote+811+Centro+Historico+Puebla',
    days: 'Martes a domingo',
  },
  socials: [
    { network: 'facebook', url: 'https://www.facebook.com/PadentroBuffetyCantina' },
    { network: 'instagram', url: 'https://www.instagram.com/padentrobufetycantina/' },
  ],
  floating: { whatsapp: true, whatsappMessage: "Hola, quiero hacer una reservación en Pa'dentro", call: false, chat: true, top: true },
  sections: (['casa', 'favoritos', 'pasos', 'menu', 'promos', 'video', 'nosotros', 'galeria', 'ubicacion', 'cta'] as SectionId[])
    .map(id => ({ id, visible: id !== 'video' })),
  hours: [
    { label: 'Días', value: 'Martes a domingo' },
    { label: 'Cocina', value: '1:00 pm – 8:00 pm' },
    { label: 'Barra', value: '1:00 pm – 9:00 pm' },
  ],
  hero: {
    eyebrow: 'Buffet y cantina en el Centro Histórico de Puebla',
    title: "Sabores de Puebla, pa'dentro.",
    text: 'Mesa Poblana, antojitos, café, coctelería y mezcal. Pide para recoger hoy o programa tu pedido con días de anticipación.',
    media: 'image', image: 'hero.jpg', video: '',
    primary: 'Ver la carta', secondary: 'Reservar por WhatsApp',
  },
  marquee: ['Mesa Poblana', 'Antojería', 'Mezcal artesanal', 'Café de especialidad', 'Coctelería de la casa', 'Centro Histórico'],
  about: {
    title: 'El sabor que siempre quieres volver a probar',
    text: "En Pa'dentro reunimos la cocina poblana, la cantina y el buen mezcal en un solo lugar. Beneficio de la casa: disfruta Mesa Poblana sin costo al acumular $350 o más por persona en bebidas y/o postres.",
    image: 'casa.jpg',
    stats: [
      { value: '{productos}', label: 'productos en la carta' },
      { value: '$350', label: 'en bebidas activan Mesa Poblana' },
      { value: '6', label: 'días abiertos a la semana' },
    ],
  },
  favorites: [
    { product: 'Mole poblano con guajolote', tag: 'Mesa Poblana', text: 'Nuestro mole poblano con guajolote o pollo, 200 g.', image: 'fav-mole.jpg' },
    { product: 'Chile en nogada', tag: 'De temporada', text: 'Platillo de temporada, una pieza. No participa en el beneficio Mesa Poblana.', image: 'fav-nogada.jpg' },
    { product: 'Carajillo, el rey', tag: 'Café', text: 'Licor 43 con expresso: el carajillo clásico de la casa.', image: 'fav-carajillo.jpg' },
  ],
  steps: {
    title: 'Pedir es sencillo',
    items: [
      { title: 'Elige de la carta', text: 'Agrega platillos y bebidas a tu pedido.' },
      { title: 'Escoge cuándo', text: 'Para hoy, o programa fecha y hora con hasta 30 días.' },
      { title: 'Paga en línea o al recoger', text: 'Con tarjeta en Stripe, o envíanos el pedido por WhatsApp.' },
      { title: 'Sigue tu pedido', text: 'Con tu código ves cuándo está en preparación y listo.' },
    ],
  },
  us: {
    title: 'Tradición poblana servida con cariño',
    text: "Pa'dentro nació para que Puebla se disfrute completa: comer, beber y celebrar bajo el mismo techo, con recetas de la región y el mejor ambiente de cantina.",
    features: [
      { icon: '🌽', title: 'Cocina poblana', text: 'Antojitos, caldos y platillos fuertes de la tradición de Puebla.' },
      { icon: '🥃', title: 'Cantina y mezcal', text: 'Coctelería de la casa y una amplia selección de mezcales artesanales.' },
      { icon: '🎉', title: 'Salones privados', text: 'Contamos con salones para reuniones privadas. Cotiza tu evento.' },
    ],
  },
  video: { title: 'Así se vive Pa\'dentro', text: '', url: '', poster: '' },
  gallery: ['galeria-1.jpg', 'galeria-2.jpg', 'galeria-3.jpg', 'galeria-4.jpg', 'galeria-5.jpg'],
  cta: {
    title: 'Tu próximo antojo, listo cuando llegues',
    text: 'Pide para hoy o aparta fecha y hora para tu evento, comida familiar o visita a Puebla.',
  },
  footer: { text: 'Buffet y cantina poblana en el Centro Histórico de Puebla.' },
  store: {
    online: true,
    closedMessage: 'Por ahora no estamos recibiendo pagos en línea. Puedes enviarnos tu pedido por WhatsApp.',
    pickupNote: 'Te avisamos por WhatsApp cuando tu pedido esté listo para recoger.',
    schedule: { open: '13:00', close: '20:00', days: [0, 2, 3, 4, 5, 6], leadMinutes: 45, maxDays: 30, slotMinutes: 30 },
  },
}

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v)

/** Mezcla lo guardado sobre los valores por defecto (objetos campo por campo; listas completas). */
function deepMerge<T>(def: T, val: unknown): T {
  if (Array.isArray(def)) return (Array.isArray(val) ? val : def) as T
  if (isObj(def)) {
    const out: Record<string, unknown> = { ...def }
    if (isObj(val)) for (const k of Object.keys(def)) out[k] = deepMerge((def as Record<string, unknown>)[k], val[k])
    return out as T
  }
  return (val === undefined || val === null || typeof val !== typeof def ? def : val) as T
}

export function mergeContent(saved: unknown): SiteContent {
  const c = deepMerge(DEFAULT_CONTENT, saved)
  const s = isObj(saved) ? saved : {}
  // Compatibilidad con la versión anterior del CMS
  const oldHero = isObj(s.hero) ? s.hero : {}
  if (typeof oldHero.highlight === 'string' && oldHero.highlight && typeof oldHero.title === 'string')
    c.hero.title = `${oldHero.title} ${oldHero.highlight}`.replace(/\s+/g, ' ').trim()
  const oldBiz = isObj(s.biz) ? s.biz : {}
  if (!Array.isArray(s.socials)) {
    const soc: SiteContent['socials'] = []
    if (typeof oldBiz.fb === 'string' && oldBiz.fb) soc.push({ network: 'facebook', url: oldBiz.fb })
    if (typeof oldBiz.ig === 'string' && oldBiz.ig) soc.push({ network: 'instagram', url: oldBiz.ig })
    if (soc.length) c.socials = soc
  }
  // Todas las secciones existen una sola vez, en el orden guardado
  const seen = new Set<SectionId>()
  c.sections = c.sections.filter(x => x && x.id in SECTION_LABEL && !seen.has(x.id) && seen.add(x.id))
  for (const d of DEFAULT_CONTENT.sections) if (!seen.has(d.id)) c.sections.push({ ...d })
  c.gallery = c.gallery.filter(g => typeof g === 'string')
  return c
}

/* ---------- Horario y calendario (hora del centro de México, UTC−6 sin horario de verano) ---------- */
export const MX_OFFSET = '-06:00'
const pad = (n: number) => String(n).padStart(2, '0')
/** Fecha/hora actual en Puebla como {date:'2026-11-13', minutes: 870, dow: 5}. */
export function nowMx() {
  const d = new Date(Date.now() - 6 * 3600_000)
  return { date: `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`, minutes: d.getUTCHours() * 60 + d.getUTCMinutes(), dow: d.getUTCDay() }
}
export const toMin = (hhmm: string) => { const [h, m] = hhmm.split(':').map(Number); return (h || 0) * 60 + (m || 0) }
export const fromMin = (m: number) => `${pad(Math.floor(m / 60))}:${pad(m % 60)}`
export const dowOf = (date: string) => new Date(date + 'T12:00:00Z').getUTCDay()
export const addDays = (date: string, n: number) => { const d = new Date(date + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10) }
export const isoMx = (date: string, hhmm: string) => `${date}T${hhmm}:00${MX_OFFSET}`

/** ¿Está abierta la cocina en este momento? */
export function openNow(s: Schedule) {
  const n = nowMx()
  return s.days.includes(n.dow) && n.minutes >= toMin(s.open) && n.minutes < toMin(s.close)
}

/** Horarios disponibles para una fecha, respetando anticipación mínima. */
export function slotsFor(s: Schedule, date: string): string[] {
  if (!s.days.includes(dowOf(date))) return []
  const n = nowMx()
  const earliest = date === n.date ? n.minutes + s.leadMinutes : -1
  const out: string[] = []
  const step = Math.max(15, s.slotMinutes || 30)
  for (let m = toMin(s.open); m <= toMin(s.close); m += step) if (m >= earliest) out.push(fromMin(m))
  return out
}

/** ¿Se puede elegir esta fecha en el calendario? */
export function dayAvailable(s: Schedule, date: string) {
  const n = nowMx()
  return date >= n.date && date <= addDays(n.date, s.maxDays) && slotsFor(s, date).length > 0
}

const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
export const MONTHS = MESES
/** "martes 17 de noviembre, 2:00 pm" a partir de un ISO. */
export function formatWhen(iso: string, short = false) {
  const d = new Date(new Date(iso).getTime() - 6 * 3600_000)
  const h = d.getUTCHours(), m = d.getUTCMinutes()
  const time = `${((h + 11) % 12) + 1}:${pad(m)} ${h < 12 ? 'am' : 'pm'}`
  return short
    ? `${d.getUTCDate()} ${MESES[d.getUTCMonth()].slice(0, 3)}, ${time}`
    : `${DIAS[d.getUTCDay()]} ${d.getUTCDate()} de ${MESES[d.getUTCMonth()]}, ${time}`
}
export const timeLabel = (hhmm: string) => { const m = toMin(hhmm); const h = Math.floor(m / 60); return `${((h + 11) % 12) + 1}:${pad(m % 60)} ${h < 12 ? 'am' : 'pm'}` }
