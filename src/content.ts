/**
 * Contenido editable del sitio (CMS). Estos son los valores por defecto;
 * lo que se guarde en el panel (/admin > Sitio) los reemplaza campo por campo.
 * Las imágenes pueden ser un nombre de archivo de public/images/ o una URL completa.
 */
export interface SiteContent {
  biz: { name: string; tagline: string; phone: string; wa: string; address: string; city: string; maps: string; fb: string; ig: string; days: string }
  hours: { label: string; value: string }[]
  hero: { eyebrow: string; title: string; highlight: string; text: string; image: string }
  marquee: string[]
  about: { title: string; text: string; image: string; stats: { value: string; label: string }[] }
  favorites: { product: string; tag: string; text: string; image: string }[]
  us: { title: string; text: string; features: { icon: string; title: string; text: string }[] }
  gallery: string[]
  cta: { title: string; text: string }
  footer: { text: string }
  store: { online: boolean; closedMessage: string; pickupNote: string }
}

export const DEFAULT_CONTENT: SiteContent = {
  biz: {
    name: "Pa'dentro Buffet y Cantina",
    tagline: 'Comer · Beber · Celebrar Puebla',
    phone: '236 112 2856',
    wa: '522361122856',
    address: 'Av. 2 Oriente 811',
    city: 'Centro Histórico, Puebla, Pue.',
    maps: 'https://www.google.com/maps/search/?api=1&query=Av+2+Ote+811+Centro+Historico+Puebla',
    fb: 'https://www.facebook.com/PadentroBuffetyCantina',
    ig: 'https://www.instagram.com/padentrobufetycantina/',
    days: 'Martes a domingo',
  },
  hours: [
    { label: 'Martes a domingo', value: '' },
    { label: 'Cocina', value: '1:00 pm – 8:00 pm' },
    { label: 'Barra', value: '1:00 pm – 9:00 pm' },
  ],
  hero: {
    eyebrow: 'Buffet y cantina poblana',
    title: 'Sabores de Puebla,',
    highlight: "pa'dentro.",
    text: 'Mesa Poblana, antojitos, café, coctelería y mezcal en pleno Centro Histórico. Ven a comer, beber y celebrar.',
    image: 'hero.jpg',
  },
  marquee: ['Mesa Poblana', 'Antojería', 'Mezcal artesanal', 'Café de especialidad', 'Coctelería de la casa', 'Centro Histórico'],
  about: {
    title: 'El sabor que siempre quieres volver a probar',
    text: "En Pa'dentro reunimos la cocina poblana, la cantina y el buen mezcal en un solo lugar. Beneficio de la casa: disfruta Mesa Poblana sin costo al acumular $350 o más por persona en bebidas y/o postres.",
    image: 'casa.jpg',
    stats: [
      { value: '{productos}', label: 'productos en carta' },
      { value: '$350', label: 'activan Mesa Poblana' },
      { value: '6 días', label: 'abiertos a la semana' },
    ],
  },
  favorites: [
    { product: 'Mole poblano con guajolote', tag: 'Mesa Poblana', text: 'Nuestro mole poblano con guajolote o pollo, 200 g.', image: 'fav-mole.jpg' },
    { product: 'Chile en nogada', tag: 'De temporada', text: 'Platillo de temporada, una pieza. No participa en el beneficio Mesa Poblana.', image: 'fav-nogada.jpg' },
    { product: 'Carajillo, el rey', tag: 'Café', text: 'Licor 43 con expresso: el carajillo clásico de la casa.', image: 'fav-carajillo.jpg' },
  ],
  us: {
    title: 'Tradición poblana servida con cariño',
    text: "Pa'dentro nació para que Puebla se disfrute completa: comer, beber y celebrar bajo el mismo techo, con recetas de la región y el mejor ambiente de cantina.",
    features: [
      { icon: '🌽', title: 'Cocina poblana', text: 'Antojitos, caldos y platillos fuertes de la tradición de Puebla.' },
      { icon: '🥃', title: 'Cantina y mezcal', text: 'Coctelería de la casa y una amplia selección de mezcales artesanales.' },
      { icon: '🎉', title: 'Salones privados', text: 'Contamos con salones para reuniones privadas. Cotiza tu evento.' },
    ],
  },
  gallery: ['galeria-1.jpg', 'galeria-2.jpg', 'galeria-3.jpg', 'galeria-4.jpg', 'galeria-5.jpg'],
  cta: {
    title: 'Tu próximo antojo está a unos cuantos clics',
    text: 'Explora la carta, elige tus favoritos y paga en línea para recoger, o envíanos tu pedido por WhatsApp.',
  },
  footer: { text: 'Buffet y cantina poblana en el Centro Histórico de Puebla.' },
  store: {
    online: true,
    closedMessage: 'Por ahora no estamos recibiendo pagos en línea. Puedes enviarnos tu pedido por WhatsApp.',
    pickupNote: 'Te avisamos por WhatsApp cuando tu pedido esté listo para recoger.',
  },
}

/** Mezcla lo guardado sobre los valores por defecto, sin perder campos nuevos. */
export function mergeContent(saved: unknown): SiteContent {
  const s = (saved && typeof saved === 'object' ? saved : {}) as Partial<Record<keyof SiteContent, unknown>>
  const out = structuredClone(DEFAULT_CONTENT) as unknown as Record<string, unknown>
  for (const k of Object.keys(DEFAULT_CONTENT) as (keyof SiteContent)[]) {
    const def = DEFAULT_CONTENT[k] as unknown
    const val = s[k]
    if (val == null) continue
    if (Array.isArray(def)) { if (Array.isArray(val)) out[k] = val }
    else if (typeof def === 'object') out[k] = { ...(def as object), ...(typeof val === 'object' ? val as object : {}) }
  }
  return out as unknown as SiteContent
}
