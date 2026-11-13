import { DEFAULT_CONTENT } from './content'

/** Número de WhatsApp vigente. Se actualiza cuando llega el contenido del CMS. */
let WA = DEFAULT_CONTENT.biz.wa
export const setWhatsApp = (n: string) => { if (n.replace(/\D/g, '').length >= 10) WA = n.replace(/\D/g, '') }

export const waLink = (text = 'Hola, quiero reservar en Pa\'dentro') =>
  `https://wa.me/${WA}?text=${encodeURIComponent(text)}`

/** Asistente virtual ClienteAI: el mismo token va en index.html (widget) y en el QR del footer. */
export const ASSISTANT = { token: 'hizeqwzfrrc3duf0', label: "Pa'dentro Buffet y Cantina" }
export const chatUrl = `https://clienteai.site/chat/${ASSISTANT.token}`
