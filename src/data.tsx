import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import raw from './menu.json'
import type { Category, Promo } from './types'
import { supabase } from './supabase'

const num = (s: string) => Number(s.replace(/,/g, ''))

/** Carta local (respaldo si Supabase no responde). */
export const LOCAL_MENU: Category[] = (raw as { tab: string; note: string; blocks: { title: string; sub: string; items: { name: string; price: string }[] }[] }[])
  .map(c => ({
    tab: c.tab,
    note: c.note,
    blocks: c.blocks.map(b => ({
      id: `${c.tab}|${b.title}`,
      title: b.title,
      sub: b.sub,
      items: b.items.map(i => {
        if (!/\d/.test(i.price)) return { name: i.name, price: null, bottle: null, label: i.price, available: true }
        const [a, bot] = i.price.split('/')
        return { name: i.name, price: num(a), bottle: bot ? num(bot) : null, label: '', available: true }
      }),
    })),
  }))

export const LOCAL_PROMOS: Promo[] = [
  { label: 'Jueves y viernes', title: 'De Bandidas', description: 'Toda la coctelería al 2x1.', cta_text: '', cta_message: '' },
]

async function fetchMenu(): Promise<Category[] | null> {
  if (!supabase) return null
  const { data, error } = await supabase
    .from('menu_categories')
    .select('tab, note, sort, menu_sections(id, title, sub, sort, active, menu_items(id, name, price, bottle_price, label, available, sort))')
    .eq('active', true)
    .order('sort')
  if (error || !data?.length) return null
  type S = { id: number; title: string; sub: string; sort: number; active: boolean; menu_items: { id: number; name: string; price: number | null; bottle_price: number | null; label: string; available: boolean; sort: number }[] }
  const bySort = <T extends { sort: number }>(a: T, b: T) => a.sort - b.sort
  return data.map(c => ({
    tab: c.tab,
    note: c.note,
    blocks: ((c.menu_sections ?? []) as S[]).filter(s => s.active).sort(bySort).map(s => ({
      id: String(s.id),
      title: s.title,
      sub: s.sub,
      items: [...s.menu_items].sort(bySort).map(i => ({
        id: i.id, name: i.name,
        price: i.price == null ? null : Number(i.price),
        bottle: i.bottle_price == null ? null : Number(i.bottle_price),
        label: i.label, available: i.available,
      })),
    })),
  }))
}

async function fetchPromos(): Promise<Promo[] | null> {
  if (!supabase) return null
  const { data, error } = await supabase.from('promos').select('id, label, title, description, cta_text, cta_message').order('sort')
  return error ? null : data
}

interface Data { menu: Category[]; promos: Promo[]; live: boolean }
const D = createContext<Data>({ menu: LOCAL_MENU, promos: LOCAL_PROMOS, live: false })
export const useData = () => useContext(D)

export function DataProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<Data>({ menu: LOCAL_MENU, promos: LOCAL_PROMOS, live: false })
  useEffect(() => {
    Promise.all([fetchMenu(), fetchPromos()]).then(([menu, promos]) =>
      setState(s => ({ menu: menu ?? s.menu, promos: promos ?? s.promos, live: !!menu })))
  }, [])
  return <D.Provider value={state}>{children}</D.Provider>
}

export const countItems = (menu: Category[]) => menu.reduce((a, c) => a + c.blocks.reduce((x, b) => x + b.items.length, 0), 0)
