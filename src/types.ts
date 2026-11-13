/** Producto de la carta. `price` es el precio normal (o por copa); `bottle` el de botella si aplica. */
export interface Item {
  id?: number
  name: string
  price: number | null
  bottle: number | null
  label: string // texto cuando no hay precio, ej. "Próximamente"
  available: boolean
}
export interface Block { id: string; title: string; sub: string; items: Item[] }
export interface Category { tab: string; note: string; blocks: Block[] }
export interface Line { key: string; itemId?: number; name: string; variant?: string; price: number; qty: number }
export interface Promo { id?: number; label: string; title: string; description: string; cta_text: string; cta_message: string }
