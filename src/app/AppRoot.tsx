import { Loader2 } from 'lucide-react'
import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from '../lib/auth'
import { clearPin, hasPin } from '../lib/pin'
import { supabase } from '../lib/supabase'
import Login from './Login'
import { PinSetup, PinUnlock } from './PinGate'
import PlanLayout from './plan/PlanLayout'
import MusicLayout from './music/MusicLayout'
import PulpitLayout from './pulpit/PulpitLayout'
import FitLayout from './fit/FitLayout'
import DiscoverLayout from './discover/DiscoverLayout'
import MindLayout from './mind/MindLayout'
import MoneyLayout from './money/MoneyLayout'
import WorkLayout from './work/WorkLayout'
import { bootAppearance } from '../lib/appearance'
import { localISO } from '../lib/time'
import SectionLayout from '../components/SectionLayout'
import Shell from './Shell'
import KitchenLayout from './kitchen/KitchenLayout'
import Today from './Today'

// Cada pantalla se descarga solo cuando la abres: la app abre más rápido, sobre todo en el teléfono.
const Agenda = lazy(() => import('./plan/Agenda'))
const Calendar = lazy(() => import('./plan/Calendar'))
const Deliveries = lazy(() => import('./send/Deliveries'))
const Notices = lazy(() => import('./send/Notices'))
const Schedule = lazy(() => import('./plan/Schedule'))
const Settings = lazy(() => import('./Settings'))
const Ideas = lazy(() => import('./music/Ideas'))
const Practice = lazy(() => import('./music/Practice'))
const Setlists = lazy(() => import('./music/Setlists'))
const SongPage = lazy(() => import('./music/SongPage'))
const Songs = lazy(() => import('./music/Songs'))
const Stage = lazy(() => import('./music/Stage'))
const FaithNotes = lazy(() => import('./pulpit/FaithNotes'))
const Presenter = lazy(() => import('./pulpit/Presenter'))
const Sermons = lazy(() => import('./pulpit/Sermons'))
const SermonPage = lazy(() => import('./pulpit/SermonPage'))
const Body = lazy(() => import('./fit/Body'))
const History = lazy(() => import('./fit/History'))
const Partners = lazy(() => import('./fit/Partners'))
const RoutinePage = lazy(() => import('./fit/RoutinePage'))
const Routines = lazy(() => import('./fit/Routines'))
const Session = lazy(() => import('./fit/Session'))
const Inspiration = lazy(() => import('./discover/Inspiration'))
const Learn = lazy(() => import('./discover/Learn'))
const Links = lazy(() => import('./discover/Links'))
const Places = lazy(() => import('./discover/Places'))
const MealPlan = lazy(() => import('./kitchen/MealPlan'))
const Portfolio = lazy(() => import('./discover/Portfolio'))
const Shopping = lazy(() => import('./discover/Shopping'))
const VideoPage = lazy(() => import('./discover/VideoPage'))
const Focus = lazy(() => import('./mind/Focus'))
const Habits = lazy(() => import('./mind/Habits'))
const RoutineEditor = lazy(() => import('./mind/RoutineEditor'))
const RoutineRun = lazy(() => import('./mind/RoutineRun'))
const DailyRoutines = lazy(() => import('./mind/Routines'))
const Budget = lazy(() => import('./money/Budget'))
const Goals = lazy(() => import('./money/Goals'))
const Loans = lazy(() => import('./money/Loans'))
const Accounts = lazy(() => import('./money/Accounts'))
const Categories = lazy(() => import('./money/Categories'))
const Exit = lazy(() => import('./mind/Exit'))
const Leisure = lazy(() => import('./mind/Leisure'))
const Loose = lazy(() => import('./mind/Loose'))
const Renewals = lazy(() => import('./mind/Renewals'))
const Rules = lazy(() => import('./mind/Rules'))
const Wins = lazy(() => import('./mind/Wins'))
const PricesEditor = lazy(() => import('./work/PricesEditor'))
const Quotes = lazy(() => import('./work/Quotes'))
const QuoteSheet = lazy(() => import('./work/QuoteSheet'))
const Incoming = lazy(() => import('./money/Incoming'))
const Areas = lazy(() => import('./Areas'))
const ReceiptSheet = lazy(() => import('./work/ReceiptSheet'))
const AppearancePage = lazy(() => import('./Appearance'))
const AgendaDia = lazy(() => import('./plan/AgendaDia'))
const Clients = lazy(() => import('./work/Clients'))
const ClientPage = lazy(() => import('./work/ClientPage'))
const Share = lazy(() => import('./Share'))
const Overview = lazy(() => import('./money/Overview'))
const Subscriptions = lazy(() => import('./money/Subscriptions'))
const Transactions = lazy(() => import('./money/Transactions'))
const Vault = lazy(() => import('./vault/Vault'))
const Projects = lazy(() => import('./work/Projects'))
const Pantry = lazy(() => import('./kitchen/Pantry'))
const RecipePage = lazy(() => import('./kitchen/RecipePage'))
const Recipes = lazy(() => import('./kitchen/Recipes'))

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
  useEffect(() => { void bootAppearance(localISO()) }, [])

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
    <Suspense fallback={<div className="grid min-h-dvh place-items-center" aria-busy><Loader2 className="animate-spin" aria-label="Cargando" /></div>}>
    <Routes>
      <Route path="trabajo/propuestas/:id/documento" element={<QuoteSheet />} />
      <Route path="trabajo/recibo/:id" element={<ReceiptSheet />} />
      <Route element={<Shell onLock={lock} onSignOut={signOutAll} />}>
        <Route index element={<Today />} />
        <Route path="ajustes" element={<Settings onLock={lock} onResetPin={resetPin} />} />
        <Route path="ajustes/apariencia" element={<AppearancePage />} />
        <Route path="avisos" element={<Notices />} />
        <Route path="mente/rutinas/:id/hacer" element={<RoutineRun />} />
        <Route path="ejercicio/entrenar/:id" element={<Session />} />
        <Route path="dinero" element={<MoneyLayout />}>
          <Route index element={<Overview />} />
          <Route path="cuentas" element={<Accounts />} />
          <Route path="categorias" element={<Categories />} />
          <Route path="movimientos" element={<Transactions />} />
          <Route path="presupuesto" element={<Budget />} />
          <Route path="metas" element={<Goals />} />
          <Route path="suscripciones" element={<Subscriptions />} />
          <Route path="prestamos" element={<Loans />} />
          <Route path="reparto" element={<Navigate to="/app/dinero/metas#reparto" replace />} />
          <Route path="entra" element={<Incoming />} />
        </Route>
        <Route path="pulpito/predica/:id/presentar" element={<Presenter />} />
        <Route path="musica/cancion/:id/escenario" element={<Stage />} />
        <Route path="areas" element={<Areas />} />
        <Route path="mas" element={<Navigate to="/app/areas" replace />} />
        <Route path="pendientes" element={<Notices />} />
        <Route element={<SectionLayout />}>
          <Route path="planear" element={<PlanLayout />}>
            <Route index element={<AgendaHome />} />
            <Route path="dia" element={<AgendaDia />} />
            <Route path="semana" element={<Schedule />} />
            <Route path="agenda" element={<Agenda />} />
            <Route path="calendario" element={<Calendar />} />
          </Route>
          <Route path="trabajo" element={<WorkLayout />}>
            <Route index element={<Clients />} />
            <Route path="mes" element={<Projects />} />
            <Route path="cliente/:key" element={<ClientPage />} />
            <Route path="propuestas" element={<Quotes />} />
            <Route path="precios" element={<PricesEditor />} />
          </Route>
          <Route path="envios" element={<Deliveries />} />
          <Route path="descubrir" element={<DiscoverLayout />}>
            <Route index element={<Navigate to="/app/descubrir/aprender" replace />} />
            <Route path="aprender" element={<Learn />} />
            <Route path="video/:id" element={<VideoPage />} />
            <Route path="links" element={<Links />} />
            <Route path="portafolio" element={<Portfolio />} />
            <Route path="inspiracion" element={<Inspiration />} />
            <Route path="lugares" element={<Moved to="/app/lugares" />} />
            <Route path="compras" element={<Moved to="/app/compras" />} />
          </Route>
          <Route path="boveda" element={<Vault />} />
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
          <Route path="ejercicio" element={<FitLayout />}>
            <Route index element={<Routines />} />
            <Route path="rutina/:id" element={<RoutinePage />} />
            <Route path="historial" element={<History />} />
            <Route path="cuerpo" element={<Body />} />
            <Route path="companeros" element={<Partners />} />
          </Route>
          <Route path="pulpito" element={<PulpitLayout />}>
            <Route index element={<Sermons />} />
            <Route path="predica/:id" element={<SermonPage />} />
            <Route path="notas" element={<FaithNotes />} />
          </Route>
          <Route path="musica" element={<MusicLayout />}>
            <Route index element={<Songs />} />
            <Route path="cancion/:id" element={<SongPage />} />
            <Route path="setlists" element={<Setlists />} />
            <Route path="practica" element={<Practice />} />
            <Route path="ideas" element={<Ideas />} />
          </Route>
          <Route path="cocina" element={<KitchenLayout />}>
            <Route index element={<Recipes />} />
            <Route path="despensa" element={<Pantry />} />
            <Route path="semana" element={<MealPlan />} />
            <Route path="receta/:id" element={<RecipePage />} />
          </Route>
          <Route path="lugares" element={<Places />} />
          <Route path="compras" element={<Shopping />} />
          <Route path="compartir" element={<Share />} />
        </Route>
        <Route path=":center" element={<Navigate to="/app" replace />} />
      </Route>
    </Routes>
    </Suspense>
  )
}

/** Agenda abre en Día en el celular y en Semana en la computadora. */
function AgendaHome() {
  const { search } = useLocation()
  const wide = typeof window !== 'undefined' && window.matchMedia('(min-width: 768px)').matches
  return <Navigate to={`/app/planear/${wide ? 'semana' : 'dia'}${search}`} replace />
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
