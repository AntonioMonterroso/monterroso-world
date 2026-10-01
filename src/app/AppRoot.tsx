import { Loader2 } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Route, Routes } from 'react-router-dom'
import { AuthProvider, useAuth } from '../lib/auth'
import { clearPin, hasPin } from '../lib/pin'
import { supabase } from '../lib/supabase'
import CenterPage from './CenterPage'
import Login from './Login'
import More from './More'
import { PinSetup, PinUnlock } from './PinGate'
import Schedule from './schedule/Schedule'
import Settings from './Settings'
import Shell from './Shell'
import Today from './Today'

const AWAY_LOCK_MS = 60_000
const IDLE_LOCK_MS = 10 * 60_000

function Gate() {
  const auth = useAuth()
  const { loading, signOut } = auth
  // Solo desarrollo: permite ver el shell sin código por correo (se elimina en producción)
  const session = auth.session ?? (import.meta.env.DEV && localStorage.getItem('mw_dev') ? ({ user: { email: 'dev@local' } } as unknown as NonNullable<typeof auth.session>) : null)
  const [pin, setPinState] = useState(hasPin())
  const [locked, setLocked] = useState(hasPin())
  const hiddenAt = useRef(0)

  const lock = useCallback(() => { if (hasPin()) setLocked(true) }, [])

  // Bloqueo al volver tras un rato fuera y por inactividad
  useEffect(() => {
    if (!session) return
    let idle = setTimeout(lock, IDLE_LOCK_MS)
    const reset = () => { clearTimeout(idle); idle = setTimeout(lock, IDLE_LOCK_MS) }
    const vis = () => {
      if (document.hidden) hiddenAt.current = Date.now()
      else if (hiddenAt.current && Date.now() - hiddenAt.current > AWAY_LOCK_MS) lock()
    }
    const evs: (keyof WindowEventMap)[] = ['pointerdown', 'keydown', 'scroll']
    evs.forEach((e) => window.addEventListener(e, reset, { passive: true }))
    document.addEventListener('visibilitychange', vis)
    return () => { clearTimeout(idle); evs.forEach((e) => window.removeEventListener(e, reset)); document.removeEventListener('visibilitychange', vis) }
  }, [session, lock])

  if (loading) return <div className="grid min-h-dvh place-items-center" aria-busy><Loader2 className="animate-spin" aria-label="Cargando" /></div>
  if (!session) return <Login />
  if (!pin) return <PinSetup onDone={() => { setPinState(true); setLocked(false) }} />
  if (locked) {
    return (
      <PinUnlock
        onUnlock={() => setLocked(false)}
        onForgot={async () => { clearPin(); setPinState(false); await signOut() }}
      />
    )
  }

  const resetPin = () => { clearPin(); setPinState(false) }
  const signOutAll = async () => { await supabase.auth.signOut() }

  return (
    <Routes>
      <Route element={<Shell onLock={lock} onSignOut={signOutAll} />}>
        <Route index element={<Today />} />
        <Route path="mas" element={<More />} />
        <Route path="ajustes" element={<Settings onLock={lock} onResetPin={resetPin} />} />
        <Route path="planear" element={<Schedule />} />
        <Route path=":center" element={<CenterPage />} />
      </Route>
    </Routes>
  )
}

export default function AppRoot() {
  return (
    <AuthProvider>
      <Gate />
    </AuthProvider>
  )
}
