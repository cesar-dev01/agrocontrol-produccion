'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '../lib/supabase'
import styles from './recovery.module.css'

function RecoveryShell({ children }) {
  return <main className="auth-page">
    <section className="auth-visual">
      <div className="brand"><span className="brand-mark" aria-hidden="true">✦</span><span>Agro<span>Control</span></span></div>
      <div className="auth-copy"><p className="eyebrow">TU INFORMACIÓN ESTÁ A SALVO</p><h1>Recupera el acceso<br /><em>a tus cultivos.</em></h1><p>Vuelve a gestionar tus campañas, inversiones y cosechas desde un solo lugar.</p></div>
      <div className="auth-stat"><span aria-hidden="true">↗</span><div><b>Más claridad</b><small>en cada campaña</small></div></div>
    </section>
    <section className="auth-form-wrap"><div className="auth-form"><div className="auth-mobile-logo"><div className="brand"><span className="brand-mark" aria-hidden="true">✦</span><span>Agro<span>Control</span></span></div></div>{children}</div></section>
  </main>
}

export function RequestReset() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  const submit = async event => {
    event.preventDefault()
    setError('')
    if (!supabase) return setError('La recuperación de contraseña requiere conectar Supabase.')
    setLoading(true)
    try {
      const redirectTo = new URL('/restablecer-contrasena', window.location.origin).toString()
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo })
      if (resetError) throw resetError
      setSent(true)
    } catch (resetError) {
      setError(resetError?.message || 'No pudimos enviar el correo. Inténtalo de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  return <RecoveryShell>
    <p className="eyebrow">RECUPERA TU CUENTA</p>
    <h2>¿Olvidaste tu contraseña?</h2>
    {sent ? <>
      <p className="muted">Si existe una cuenta con ese correo, recibirás un enlace para crear una contraseña nueva. Revisa también la carpeta de spam.</p>
      <p className={styles.notice} role="status">Revisa tu correo electrónico.</p>
    </> : <form onSubmit={submit}>
      <p className="muted">Escribe el correo con el que te registraste y te enviaremos un enlace de recuperación.</p>
      <label>Correo electrónico<input type="email" autoComplete="email" required value={email} onChange={event => setEmail(event.target.value)} placeholder="correo@empresa.com" /></label>
      {error && <p className={styles.error} role="alert">{error}</p>}
      <button className={`primary full ${styles.submit}`} type="submit" disabled={loading}>{loading ? 'Enviando...' : 'Enviar enlace de recuperación'}</button>
    </form>}
    <Link href="/dashboard" className={styles.back}>← Volver a iniciar sesión</Link>
  </RecoveryShell>
}

export function ResetPassword() {
  const [status, setStatus] = useState('checking')
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    if (!supabase) {
      setStatus('unavailable')
      return
    }
    let active = true
    const params = new URLSearchParams(window.location.search)
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''))
    if (params.has('error') || hash.has('error')) {
      setStatus('invalid')
      return
    }
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return
      if (event === 'PASSWORD_RECOVERY' && session) setStatus('ready')
    })
    supabase.auth.getSession().then(({ data, error: sessionError }) => {
      if (!active) return
      setStatus(!sessionError && data.session ? 'ready' : 'invalid')
      if (data.session && window.location.hash) window.history.replaceState({}, '', window.location.pathname)
    }).catch(() => { if (active) setStatus('invalid') })
    return () => { active = false; subscription.unsubscribe() }
  }, [])

  const submit = async event => {
    event.preventDefault()
    setError('')
    if (password.length < 8) return setError('La contraseña debe tener al menos 8 caracteres.')
    if (password !== confirmation) return setError('Las contraseñas no coinciden.')
    setLoading(true)
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password })
      if (updateError) throw updateError
      const { error: signOutError } = await supabase.auth.signOut({ scope: 'local' })
      if (signOutError) setNotice('La contraseña se actualizó, pero la sesión actual sigue abierta. Puedes cerrarla desde la aplicación.')
      setStatus('complete')
      setPassword('')
      setConfirmation('')
    } catch (updateError) {
      setError(updateError?.message || 'No pudimos actualizar la contraseña. Solicita un nuevo enlace e inténtalo otra vez.')
    } finally {
      setLoading(false)
    }
  }

  return <RecoveryShell>
    <p className="eyebrow">SEGURIDAD DE TU CUENTA</p>
    <h2>Crear nueva contraseña</h2>
    {status === 'checking' && <p className="muted" role="status">Verificando el enlace de recuperación...</p>}
    {status === 'unavailable' && <p className={styles.error} role="alert">La recuperación de contraseña requiere conectar Supabase.</p>}
    {status === 'invalid' && <><p className="muted">Este enlace no es válido o ya venció. Solicita uno nuevo para continuar.</p><Link className={styles.actionLink} href="/recuperar-contrasena">Solicitar otro enlace</Link></>}
    {status === 'complete' && <><p className="muted">Tu contraseña se actualizó correctamente. Ya puedes iniciar sesión con la nueva contraseña.</p>{notice && <p className={styles.notice} role="status">{notice}</p>}<Link className={styles.actionLink} href="/dashboard">Ir a iniciar sesión</Link></>}
    {status === 'ready' && <form onSubmit={submit}>
      <p className="muted">Elige una contraseña segura de al menos 8 caracteres.</p>
      <label>Nueva contraseña<input type="password" autoComplete="new-password" minLength={8} required value={password} onChange={event => setPassword(event.target.value)} /></label>
      <label>Confirmar contraseña<input type="password" autoComplete="new-password" minLength={8} required value={confirmation} onChange={event => setConfirmation(event.target.value)} /></label>
      {error && <p className={styles.error} role="alert">{error}</p>}
      <button className={`primary full ${styles.submit}`} type="submit" disabled={loading}>{loading ? 'Actualizando...' : 'Guardar nueva contraseña'}</button>
    </form>}
    <Link href="/dashboard" className={styles.back}>← Volver a iniciar sesión</Link>
  </RecoveryShell>
}
