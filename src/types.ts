export interface Item { name: string; price: string }
export interface Block { title: string; sub: string; items: Item[] }
export interface Category { tab: string; note: string; blocks: Block[] }
export interface Line { key: string; name: string; variant?: string; price: number; qty: number }
