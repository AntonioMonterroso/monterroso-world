import { Loader2 } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from '../lib/auth'
import { clearPin, hasPin } from '../lib/pin'
import { supabase } from '../lib/supabase'
import CenterPage from './CenterPage'
import Login from './Login'
import More from './More'
import { PinSetup, PinUnlock } from './PinGate'
import Agenda from './plan/Agenda'
import Calendar from './plan/Calendar'
import Deliveries from './send/Deliveries'
import Notices from './send/Notices'
import PlanLayout from './plan/PlanLayout'
import Schedule from './plan/Schedule'
import Settings from './Settings'
import Ideas from './music/Ideas'
import MusicLayout from './music/MusicLayout'
import Practice from './music/Practice'
import Setlists from './music/Setlists'
import SongPage from './music/SongPage'
import Songs from './music/Songs'
import Stage from './music/Stage'
import FaithNotes from './pulpit/FaithNotes'
import Presenter from './pulpit/Presenter'
import PulpitLayout from './pulpit/PulpitLayout'
import Sermons from './pulpit/Sermons'
import SermonPage from './pulpit/SermonPage'
import Body from './fit/Body'
import FitLayout from './fit/FitLayout'
import History from './fit/History'
import Partners from './fit/Partners'
import RoutinePage from './fit/RoutinePage'
import Routines from './fit/Routines'
import Session from './fit/Session'
import DiscoverLayout from './discover/DiscoverLayout'
import Hub from './discover/Hub'
import Inspiration from './discover/Inspiration'
import Learn from './discover/Learn'
import Links from './discover/Links'
import Places from './discover/Places'
import Portfolio from './discover/Portfolio'
import Shopping from './discover/Shopping'
import VideoPage from './discover/VideoPage'
import Focus from './mind/Focus'
import Habits from './mind/Habits'
import MindLayout from './mind/MindLayout'
import RoutineEditor from './mind/RoutineEditor'
import RoutineRun from './mind/RoutineRun'
import DailyRoutines from './mind/Routines'
import Budget from './money/Budget'
import Goals from './money/Goals'
import Loans from './money/Loans'
import MoneyLayout from './money/MoneyLayout'
import Accounts from './money/Accounts'
import Categories from './money/Categories'
import Exit from './mind/Exit'
import Leisure from './mind/Leisure'
import Loose from './mind/Loose'
import Renewals from './mind/Renewals'
import Rules from './mind/Rules'
import Wins from './mind/Wins'
import Share from './Share'
import Overview from './money/Overview'
import Subscriptions from './money/Subscriptions'
import Transactions from './money/Transactions'
import Vault from './vault/Vault'
import Projects from './work/Projects'
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
        <Route path="planear" element={<PlanLayout />}>
          <Route index element={<Schedule />} />
          <Route path="agenda" element={<Agenda />} />
          <Route path="calendario" element={<Calendar />} />
        </Route>
        <Route path="trabajo" element={<Projects />} />
        <Route path="envios" element={<Deliveries />} />
        <Route path="avisos" element={<Notices />} />
        <Route path="descubrir" element={<DiscoverLayout />}>
          <Route index element={<Hub />} />
          <Route path="aprender" element={<Learn />} />
          <Route path="video/:id" element={<VideoPage />} />
          <Route path="links" element={<Links />} />
          <Route path="portafolio" element={<Portfolio />} />
          <Route path="inspiracion" element={<Inspiration />} />
          <Route path="lugares" element={<Moved to="/app/lugares" />} />
          <Route path="compras" element={<Moved to="/app/compras" />} />
        </Route>
        <Route path="boveda" element={<Vault />} />
        <Route path="mente/rutinas/:id/hacer" element={<RoutineRun />} />
        <Route path="mente" element={<MindLayout />}>
          <Route index element={<Habits />} />
          <Route path="enfoque" element={<Focus />} />
          <Route path="rutinas" element={<DailyRoutines />} />
          <Route path="ocio" element={<Leisure />} />
          <Route path="cosas" element={<Loose />} />
          <Route path="vencimientos" element={<Renewals />} />
          <Route path="reglas" element={<Rules />} />
          <Route path="logros" element={<Wins />} />
          <Route path="salida" element={<Exit />} />
          <Route path="rutinas/:id" element={<RoutineEditor />} />
        </Route>
        <Route path="ejercicio/entrenar/:id" element={<Session />} />
        <Route path="ejercicio" element={<FitLayout />}>
          <Route index element={<Routines />} />
          <Route path="rutina/:id" element={<RoutinePage />} />
          <Route path="historial" element={<History />} />
          <Route path="cuerpo" element={<Body />} />
          <Route path="companeros" element={<Partners />} />
        </Route>
        <Route path="dinero" element={<MoneyLayout />}>
          <Route index element={<Overview />} />
          <Route path="cuentas" element={<Accounts />} />
          <Route path="categorias" element={<Categories />} />
          <Route path="movimientos" element={<Transactions />} />
          <Route path="presupuesto" element={<Budget />} />
          <Route path="metas" element={<Goals />} />
          <Route path="suscripciones" element={<Subscriptions />} />
          <Route path="prestamos" element={<Loans />} />
        </Route>
        <Route path="pulpito/predica/:id/presentar" element={<Presenter />} />
        <Route path="pulpito" element={<PulpitLayout />}>
          <Route index element={<Sermons />} />
          <Route path="predica/:id" element={<SermonPage />} />
          <Route path="notas" element={<FaithNotes />} />
        </Route>
        <Route path="musica/cancion/:id/escenario" element={<Stage />} />
        <Route path="musica" element={<MusicLayout />}>
          <Route index element={<Songs />} />
          <Route path="cancion/:id" element={<SongPage />} />
          <Route path="setlists" element={<Setlists />} />
          <Route path="practica" element={<Practice />} />
          <Route path="ideas" element={<Ideas />} />
        </Route>
        <Route path="lugares" element={<Places />} />
        <Route path="compras" element={<Shopping />} />
        <Route path="compartir" element={<Share />} />
        <Route path=":center" element={<CenterPage />} />
      </Route>
    </Routes>
  )
}

/** Lugares y Por comprar ahora son secciones propias; los enlaces viejos siguen funcionando. */
function Moved({ to }: { to: string }) {
  const { search } = useLocation()
  return <Navigate to={`${to}${search}`} replace />
}

export default function AppRoot() {
  return (
    <AuthProvider>
      <Gate />
    </AuthProvider>
  )
}
