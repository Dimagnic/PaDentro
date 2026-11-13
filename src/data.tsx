import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import raw from './menu.json'
import type { Category, Promo } from './types'
import { supabase } from './supabase'
import { DEFAULT_CONTENT, mergeContent, type SiteContent } from './content'
import { setWhatsApp } from './config'

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

async function fetchContent(): Promise<SiteContent | null> {
  if (!supabase) return null
  const { data, error } = await supabase.from('site_settings').select('content').eq('id', 1).maybeSingle()
  return error || !data ? null : mergeContent(data.content)
}

interface Data { menu: Category[]; promos: Promo[]; site: SiteContent; live: boolean; ready: boolean }
const INITIAL: Data = { menu: LOCAL_MENU, promos: LOCAL_PROMOS, site: DEFAULT_CONTENT, live: false, ready: !supabase }
const D = createContext<Data>(INITIAL)
export const useData = () => useContext(D)
export const useSite = () => useContext(D).site

/**
 * Carga carta, promociones y contenido, y se suscribe a cambios en tiempo real:
 * al presionar "Guardar" en el panel, las páginas abiertas se actualizan solas.
 */
export function DataProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<Data>(INITIAL)
  const timers = useRef<Record<string, number>>({})

  useEffect(() => {
    const loadMenu = () => fetchMenu().then(menu => menu && setState(s => ({ ...s, menu, live: true })))
    const loadPromos = () => fetchPromos().then(promos => promos && setState(s => ({ ...s, promos })))
    const loadSite = () => fetchContent().then(site => {
      if (site) { setWhatsApp(site.biz.wa); setState(s => ({ ...s, site })) }
    })
    Promise.all([loadMenu(), loadPromos(), loadSite()]).finally(() => setState(s => ({ ...s, ready: true })))
    if (!supabase) return

    // Agrupa ráfagas de cambios (p. ej. al guardar varios productos) en una sola recarga.
    const soon = (key: string, fn: () => void) => {
      clearTimeout(timers.current[key])
      timers.current[key] = window.setTimeout(fn, 300)
    }
    const ch = supabase.channel('sitio-publico')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'site_settings' }, () => soon('site', loadSite))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'promos' }, () => soon('promos', loadPromos))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'menu_items' }, () => soon('menu', loadMenu))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'menu_sections' }, () => soon('menu', loadMenu))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'menu_categories' }, () => soon('menu', loadMenu))
      .subscribe()
    // Respaldo: al volver a la pestaña también se refresca.
    const onFocus = () => { if (document.visibilityState === 'visible') { soon('site', loadSite); soon('menu', loadMenu); soon('promos', loadPromos) } }
    document.addEventListener('visibilitychange', onFocus)
    return () => { supabase!.removeChannel(ch); document.removeEventListener('visibilitychange', onFocus) }
  }, [])

  return <D.Provider value={state}>{children}</D.Provider>
}

export const countItems = (menu: Category[]) => menu.reduce((a, c) => a + c.blocks.reduce((x, b) => x + b.items.length, 0), 0)
