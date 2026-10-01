import { ArrowLeft, Eye, EyeOff, Loader2 } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import Globe from '../components/Globe'
import { configured, supabase } from '../lib/supabase'

export default function Login() {
  const [email, setEmail] = useState(() => localStorage.getItem('mw_email') ?? '')
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    setBusy(false)
    if (error) return setError('Correo o contraseña incorrectos.')
    localStorage.setItem('mw_email', email.trim())
  }

  return (
    <main className="grid min-h-dvh place-items-center px-5">
      <div className="w-full max-w-sm">
        <Link to="/" className="mb-8 inline-flex min-h-11 items-center gap-2 text-sm" style={{ color: 'var(--ink-soft)' }}>
          <ArrowLeft size={16} aria-hidden /> Volver
        </Link>
        <div className="flex items-center gap-3">
          <Globe size={36} />
          <h1 className="font-display text-3xl">Monterroso World</h1>
        </div>
        <p className="mt-3" style={{ color: 'var(--ink-soft)' }}>Entra a tu centro de mando.</p>

        {!configured && <p className="mt-4 text-sm" style={{ color: '#e8a393' }}>Falta la configuración de Supabase.</p>}

        <form onSubmit={submit} className="mt-6 grid gap-4">
          <label className="grid gap-2 text-sm" htmlFor="email">
            Correo
            <input id="email" type="email" required autoComplete="username" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} className="field" />
          </label>
          <label className="grid gap-2 text-sm" htmlFor="password">
            Contraseña
            <span className="relative block">
              <input id="password" type={show ? 'text' : 'password'} required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} className="field pr-12" />
              <button type="button" onClick={() => setShow((v) => !v)} className="absolute top-0 right-0 grid size-12 place-items-center" aria-label={show ? 'Ocultar contraseña' : 'Mostrar contraseña'} style={{ color: 'var(--ink-soft)' }}>
                {show ? <EyeOff size={18} aria-hidden /> : <Eye size={18} aria-hidden />}
              </button>
            </span>
          </label>
          <button className="btn btn-primary justify-center" disabled={busy || !configured}>
            {busy && <Loader2 size={18} className="animate-spin" aria-hidden />} Entrar
          </button>
        </form>
        {error && <p role="alert" className="mt-4 text-sm" style={{ color: '#e8a393' }}>{error}</p>}
      </div>
    </main>
  )
}
