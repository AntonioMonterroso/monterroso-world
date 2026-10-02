import { Delete, Fingerprint } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import Globe from '../components/Globe'
import { checkPin, clearPin, lockedFor, pinLength, setPin } from '../lib/pin'

function Dots({ n, filled, shake }: { n: number; filled: number; shake: boolean }) {
  return (
    <div className={`flex justify-center gap-4 ${shake ? 'pin-shake' : ''}`} aria-hidden>
      {Array.from({ length: n }).map((_, i) => (
        <span key={i} className="size-3.5 rounded-full border transition-colors" style={{ borderColor: 'var(--accent)', background: i < filled ? 'var(--accent)' : 'transparent' }} />
      ))}
    </div>
  )
}

function Keypad({ onDigit, onDelete }: { onDigit: (d: string) => void; onDelete: () => void }) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (/^\d$/.test(e.key)) onDigit(e.key)
      else if (e.key === 'Backspace') onDelete()
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onDigit, onDelete])

  return (
    <div className="mx-auto mt-10 grid w-full max-w-[260px] grid-cols-3 gap-3">
      {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
        <button key={d} type="button" className="pin-key" onClick={() => onDigit(d)} aria-label={d}>{d}</button>
      ))}
      <span />
      <button type="button" className="pin-key" onClick={() => onDigit('0')} aria-label="0">0</button>
      <button type="button" className="pin-key" onClick={onDelete} aria-label="Borrar"><Delete size={20} aria-hidden /></button>
    </div>
  )
}

/** Crear PIN: elegir largo, escribirlo y confirmarlo. */
export function PinSetup({ onDone }: { onDone: () => void }) {
  const [len, setLen] = useState<4 | 6>(4)
  const [first, setFirst] = useState('')
  const [value, setValue] = useState('')
  const [shake, setShake] = useState(false)
  const [msg, setMsg] = useState('')

  const digit = useCallback((d: string) => setValue((v) => (v.length < len ? v + d : v)), [len])
  const del = useCallback(() => setValue((v) => v.slice(0, -1)), [])

  useEffect(() => {
    if (value.length !== len) return
    if (!first) {
      setFirst(value)
      setValue('')
      return
    }
    if (value === first) {
      setPin(value).then(onDone)
    } else {
      setShake(true)
      setMsg('No coinciden. Empieza de nuevo.')
      setTimeout(() => { setShake(false); setValue(''); setFirst('') }, 450)
    }
  }, [value, len, first, onDone])

  return (
    <main className="safe-top grid min-h-dvh place-items-center px-5 py-10">
      <div className="w-full max-w-sm text-center">
        <Globe size={40} />
        <h1 className="mt-4 font-display text-3xl">{first ? 'Confírmalo' : 'Crea tu PIN'}</h1>
        <p className="mx-auto mt-2 max-w-xs text-sm" style={{ color: 'var(--ink-soft)' }}>
          Sirve para abrir la app rápido en este dispositivo. Si lo olvidas, vuelves a entrar con tu contraseña y creas uno nuevo.
        </p>
        {!first && (
          <div className="mt-5 inline-flex rounded-full p-1" style={{ background: 'var(--bg)' }} role="group" aria-label="Largo del PIN">
            {([4, 6] as const).map((n) => (
              <button key={n} type="button" onClick={() => { setLen(n); setValue('') }} aria-pressed={len === n} className="min-h-11 rounded-full px-4 text-sm font-semibold" style={{ background: len === n ? 'var(--accent)' : 'transparent', color: len === n ? 'var(--bg)' : 'var(--ink-soft)' }}>
                {n} dígitos
              </button>
            ))}
          </div>
        )}
        <div className="mt-8"><Dots n={len} filled={value.length} shake={shake} /></div>
        <p role="alert" className="mt-3 h-5 text-sm" style={{ color: 'var(--neg)' }}>{msg}</p>
        <Keypad onDigit={digit} onDelete={del} />
      </div>
    </main>
  )
}

/** Desbloquear con PIN. `onForgot` sale a verificar por correo y restablecer. */
export function PinUnlock({ onUnlock, onForgot }: { onUnlock: () => void; onForgot: () => void }) {
  const len = pinLength()
  const [value, setValue] = useState('')
  const [shake, setShake] = useState(false)
  const [wait, setWait] = useState(lockedFor())
  const [msg, setMsg] = useState('')

  useEffect(() => {
    if (wait <= 0) return
    const t = setInterval(() => setWait(lockedFor()), 1000)
    return () => clearInterval(t)
  }, [wait])

  const digit = useCallback((d: string) => { if (wait <= 0) setValue((v) => (v.length < len ? v + d : v)) }, [len, wait])
  const del = useCallback(() => setValue((v) => v.slice(0, -1)), [])

  useEffect(() => {
    if (value.length !== len) return
    checkPin(value).then((ok) => {
      if (ok) return onUnlock()
      setShake(true)
      const w = lockedFor()
      setWait(w)
      setMsg(w > 0 ? '' : 'PIN incorrecto')
      setTimeout(() => { setShake(false); setValue('') }, 450)
    })
  }, [value, len, onUnlock])

  return (
    <main className="safe-top grid min-h-dvh place-items-center px-5 py-10">
      <div className="w-full max-w-sm text-center">
        <Globe size={40} />
        <h1 className="mt-4 font-display text-3xl">Monterroso World</h1>
        <p className="mt-2 text-sm" style={{ color: 'var(--ink-soft)' }}>Escribe tu PIN</p>
        <div className="mt-8"><Dots n={len} filled={value.length} shake={shake} /></div>
        <p role="alert" className="mt-3 h-5 text-sm" style={{ color: 'var(--neg)' }}>
          {wait > 0 ? `Demasiados intentos. Espera ${wait} s.` : msg}
        </p>
        <Keypad onDigit={digit} onDelete={del} />
        <button type="button" onClick={onForgot} className="mt-8 inline-flex min-h-11 items-center gap-2 text-sm underline" style={{ color: 'var(--ink-soft)' }}>
          <Fingerprint size={16} aria-hidden /> Olvidé mi PIN
        </button>
      </div>
    </main>
  )
}

export { clearPin }
