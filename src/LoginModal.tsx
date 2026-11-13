import { useEffect, useState, type FormEvent } from 'react'
import { createPortal } from 'react-dom'
import { supabase } from './supabase'

/** Modal de acceso al panel. Si ya hay sesión de administrador, entra directo. */
export default function LoginModal({ onClose }: { onClose: () => void }) {
  const [email, setEmail] = useState('')
  const [pass, setPass] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    supabase?.auth.getSession().then(async ({ data }) => {
      if (!data.session) return
      const { data: ok } = await supabase!.rpc('is_admin')
      if (ok) location.href = '/admin'
    })
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    addEventListener('keydown', esc)
    return () => removeEventListener('keydown', esc)
  }, [onClose])

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!supabase) return setErr('El acceso no está configurado.')
    setBusy(true); setErr('')
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: pass })
    if (error) { setBusy(false); return setErr('Correo o contraseña incorrectos.') }
    const { data: ok } = await supabase.rpc('is_admin')
    if (!ok) { await supabase.auth.signOut(); setBusy(false); return setErr('Esta cuenta no tiene permiso de administrador.') }
    location.href = '/admin'
  }

  // Portal al <body>: el menú superior usa backdrop-filter y atraparía un modal fijo.
  return createPortal(
    <div className="modal-bg" onClick={onClose}>
      <form className="modal" onClick={e => e.stopPropagation()} onSubmit={submit} aria-label="Acceso administrador">
        <button type="button" className="x" onClick={onClose} aria-label="Cerrar">✕</button>
        <img src="/logo.png" alt="" className="modal-logo" />
        <h3>Acceso administrador</h3>
        <label>Correo<input type="email" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="username" autoFocus /></label>
        <label>Contraseña<input type="password" value={pass} onChange={e => setPass(e.target.value)} required autoComplete="current-password" /></label>
        {err && <p className="modal-err">{err}</p>}
        <button className="btn gold" disabled={busy}>{busy ? 'Entrando…' : 'Entrar'}</button>
      </form>
    </div>,
    document.body,
  )
}
