export const BIZ = {
  name: "Pa'dentro Buffet y Cantina",
  tagline: 'Comer · Beber · Celebrar Puebla',
  phone: '236 112 2856',
  wa: '522361122856',
  address: 'Av. 2 Oriente 811',
  city: 'Centro Histórico, Puebla, Pue.',
  maps: 'https://www.google.com/maps/search/?api=1&query=Av+2+Ote+811+Centro+Historico+Puebla',
  fb: 'https://www.facebook.com/PadentroBuffetyCantina',
  ig: 'https://www.instagram.com/padentrobufetycantina/',
  hours: [
    ['Martes a domingo', ''],
    ['Cocina', '1:00 pm – 8:00 pm'],
    ['Barra', '1:00 pm – 9:00 pm'],
  ] as [string, string][],
}
export const waLink = (text = 'Hola, quiero reservar en Pa\'dentro') =>
  `https://wa.me/${BIZ.wa}?text=${encodeURIComponent(text)}`

/** Asistente virtual ClienteAI: el mismo token va en index.html (widget) y en el QR del footer. */
export const ASSISTANT = { token: 'hizeqwzfrrc3duf0', label: "Pa'dentro Buffet y Cantina" }
export const chatUrl = `https://clienteai.site/chat/${ASSISTANT.token}`
