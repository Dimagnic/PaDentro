import { useEffect, useState, type FormEvent } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../supabase'
import { DEFAULT_CONTENT } from '../content'
import SiteEditor from './SiteEditor'
import Pos from './Pos'
import Calendar from './Calendar'
import { Board, History, OrderDrawer } from './Orders'
import { MenuEditor, PromosEditor } from './Catalog'
import { OrdersProvider, counts, useOrders } from './shared'
import './admin.css'

const sb = supabase!
const BIZ = DEFAULT_CONTENT.biz


/* ------------------------------------------------------------------ */
export default function Admin() {
  const [session, setSession] = useState<Session | null | undefined>(undefined)
  const [ok, setOk] = useState<boolean | null>(null)

  useEffect(() => {
    if (!supabase) return
    sb.auth.getSession().then(({ data }) => setSession(data.session))
    const { data } = sb.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => data.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    setOk(null)
    if (session) sb.rpc('is_admin').then(({ data }) => setOk(!!data))
  }, [session])

  if (!supabase) return <Shell><div className="ad-box"><h2>Falta configurar Supabase</h2><p>Define <code>VITE_SUPABASE_URL</code> y <code>VITE_SUPABASE_ANON_KEY</code> (ver <code>.env.example</code>).</p></div></Shell>
  if (session === undefined) return <Shell><p className="ad-muted">Cargando…</p></Shell>
  if (!session) return <Shell><Login /></Shell>
  if (ok === null) return <Shell><p className="ad-muted">Verificando permisos…</p></Shell>
  if (!ok) return (
    <Shell><div className="ad-box"><h2>Sin permiso</h2>
      <p>La cuenta <b>{session.user.email}</b> no está registrada como administrador.</p>
      <button className="ad-btn" onClick={() => sb.auth.signOut()}>Cerrar sesión</button></div></Shell>
  )
  return <Panel email={session.user.email ?? ''} />
}

/** Regresa a la pantalla anterior del sitio; si se entró directo a /admin, va a la página principal. */
const goBack = () => {
  if (document.referrer && new URL(document.referrer).origin === location.origin && history.length > 1) history.back()
  else location.href = '/'
}
const BackIcon = () => <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="ad">
      <header className="ad-top">
        <button className="ad-back" onClick={goBack}><BackIcon />Volver</button>
        <a href="/"><img src="/logo.png" alt={BIZ.name} /></a><b>Panel de administración</b>
      </header>
      <main className="ad-main">{children}</main>
    </div>
  )
}

function Login() {
  const [email, setEmail] = useState('')
  const [pass, setPass] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const submit = async (e: FormEvent) => {
    e.preventDefault(); setBusy(true); setErr('')
    const { error } = await sb.auth.signInWithPassword({ email, password: pass })
    if (error) setErr('Correo o contraseña incorrectos.')
    setBusy(false)
  }
  return (
    <form className="ad-box ad-login" onSubmit={submit}>
      <h2>Iniciar sesión</h2>
      <label>Correo<input type="email" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="username" /></label>
      <label>Contraseña<input type="password" value={pass} onChange={e => setPass(e.target.value)} required autoComplete="current-password" /></label>
      {err && <p className="ad-err">{err}</p>}
      <button className="ad-btn gold" disabled={busy}>{busy ? 'Entrando…' : 'Entrar'}</button>
    </form>
  )
}

type Tab = 'caja' | 'tablero' | 'registro' | 'calendario' | 'carta' | 'promos' | 'sitio'
const TABS: [Tab, string, string][] = [
  ['caja', 'Caja', 'M3 7h18v12H3zM7 7V4h10v3M7 13h4'],
  ['tablero', 'Pedidos en curso', 'M4 4h6v16H4zM14 4h6v10h-6z'],
  ['registro', 'Registro', 'M5 4h14v16H5zM8 9h8M8 13h8M8 17h5'],
  ['calendario', 'Calendario', 'M4 5h16v16H4zM4 10h16M8 3v4M16 3v4'],
  ['carta', 'Carta', 'M6 3h12v18H6zM9 8h6M9 12h6M9 16h4'],
  ['promos', 'Promociones', 'M4 12l8-8h8v8l-8 8zM15 9h.01'],
  ['sitio', 'Sitio web', 'M3 5h18v14H3zM3 9h18'],
]

function Nav({ tab, setTab, email }: { tab: Tab; setTab: (t: Tab) => void; email: string }) {
  const { orders } = useOrders()
  const nuevos = orders.filter(o => counts(o) && o.status === 'nuevo').length
  return (
    <aside className="ad-side">
      <button className="ad-back side" onClick={goBack}><BackIcon />Volver al sitio</button>
      <a href="/" className="ad-logo"><img src="/logo.png" alt={BIZ.name} /></a>
      <nav>
        {TABS.map(([t, label, d]) => (
          <button key={t} className={tab === t ? 'on' : ''} onClick={() => { setTab(t); history.replaceState(null, '', '/admin#' + t) }}>
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>
            {label}{t === 'tablero' && nuevos > 0 && <i>{nuevos}</i>}
          </button>
        ))}
      </nav>
      <div className="ad-user"><span>{email}</span><a href="/" target="_blank" rel="noopener">Ver sitio</a><button onClick={() => sb.auth.signOut()}>Salir</button></div>
    </aside>
  )
}

function Panel({ email }: { email: string }) {
  const [tab, setTab] = useState<Tab>(() => (TABS.find(t => '#' + t[0] === location.hash)?.[0] ?? 'tablero'))
  return (
    <OrdersProvider>
      <div className="ad ad-app">
        <Nav tab={tab} setTab={setTab} email={email} />
        <main className={'ad-main' + (tab === 'caja' ? ' wide' : '')}>
          {tab === 'caja' && <Pos />}
          {tab === 'tablero' && <Board />}
          {tab === 'registro' && <History />}
          {tab === 'calendario' && <Calendar />}
          {tab === 'carta' && <MenuEditor />}
          {tab === 'promos' && <PromosEditor />}
          {tab === 'sitio' && <SiteEditor />}
        </main>
        <OrderDrawer />
      </div>
    </OrdersProvider>
  )
}
