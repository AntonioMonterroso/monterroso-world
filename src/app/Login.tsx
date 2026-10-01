import { ArrowLeft, Loader2 } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import Globe from '../components/Globe'
import { configured, supabase } from '../lib/supabase'

export default function Login() {
  const [email, setEmail] = useState(() => localStorage.getItem('mw_email') ?? '')
  const [code, setCode] = useState('')
  const [step, setStep] = useState<'email' | 'code'>('email')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const send = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    const { error } = await supabase.auth.signInWithOtp({ email: email.trim(), options: { shouldCreateUser: true, emailRedirectTo: `${window.location.origin}${import.meta.env.BASE_URL}app` } })
    setBusy(false)
    if (error) return setError(error.message)
    localStorage.setItem('mw_email', email.trim())
    setStep('code')
  }

  const verify = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    const { error } = await supabase.auth.verifyOtp({ email: email.trim(), token: code.trim(), type: 'email' })
    setBusy(false)
    if (error) setError('El código no es válido o ya venció. Pide uno nuevo.')
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
        <p className="mt-3" style={{ color: 'var(--ink-soft)' }}>
          {step === 'email' ? 'Entra con tu correo. Te enviaré un código, sin contraseñas.' : `Escribe el código que te llegó a ${email}.`}
        </p>

        {!configured && <p className="mt-4 text-sm" style={{ color: '#e8a393' }}>Falta la configuración de Supabase.</p>}

        {step === 'email' ? (
          <form onSubmit={send} className="mt-6 grid gap-4">
            <label className="grid gap-2 text-sm" htmlFor="email">
              Correo
              <input id="email" type="email" required autoComplete="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} className="field" />
            </label>
            <button className="btn btn-primary justify-center" disabled={busy || !configured}>
              {busy && <Loader2 size={18} className="animate-spin" aria-hidden />} Enviar código
            </button>
          </form>
        ) : (
          <form onSubmit={verify} className="mt-6 grid gap-4">
            <label className="grid gap-2 text-sm" htmlFor="code">
              Código
              <input id="code" required autoComplete="one-time-code" inputMode="numeric" pattern="[0-9]*" maxLength={8} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} className="field text-center text-2xl tracking-[0.4em]" />
            </label>
            <button className="btn btn-primary justify-center" disabled={busy || code.length < 6}>
              {busy && <Loader2 size={18} className="animate-spin" aria-hidden />} Entrar
            </button>
            <button type="button" className="btn btn-ghost justify-center" onClick={() => { setStep('email'); setCode(''); setError('') }}>
              Usar otro correo
            </button>
          </form>
        )}
        {error && <p role="alert" className="mt-4 text-sm" style={{ color: '#e8a393' }}>{error}</p>}
      </div>
    </main>
  )
}
