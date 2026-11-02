import { Users, Activity, BookOpen, Briefcase, Calendar, CalendarClock, CalendarDays, ChefHat, Clock, DoorOpen, Dumbbell, FileText, Globe2, Handshake, Home, KeyRound, Lightbulb, ListChecks, ListMusic, MapPin, Music, Palette, Send, ShoppingBag, StickyNote, Sunrise, Sun, Trophy, Wallet, Zap, Bookmark, Link2, type LucideIcon } from 'lucide-react'

/** Las seis secciones del sistema (más Privado) y lo que vive en cada una. Las direcciones de siempre se conservan. */
export type Area = 'web' | 'musica' | 'personal'
export type Sub = { to: string; label: string; match?: string[]; end?: boolean; /** también cuenta cuando ninguna otra sub coincide */ fallback?: boolean }
export type View = { subs?: Sub[]; to: string; label: string; icon: LucideIcon; /** direcciones que cuentan como esta vista */ match: string[]; end?: boolean; group?: string; hint?: string }
export type Section = { id: 'hoy' | 'agenda' | 'dinero' | 'trabajo' | 'musica' | 'personal' | 'privado'; label: string; to: string; icon: LucideIcon; area: Area | null; blurb: string; views: View[]; /** direcciones de la sección que no tienen pestaña */ also?: string[] }

const A = '/app'
export const sections: Section[] = [
  { id: 'hoy', label: 'Hoy', to: A, icon: Sun, area: null, blurb: '¿Qué hago ahora?', views: [], also: [`${A}/avisos`, `${A}/pendientes`, `${A}/ajustes`, `${A}/areas`] },
  { id: 'agenda', label: 'Agenda', to: `${A}/planear`, icon: CalendarDays, area: null, blurb: 'Horario, eventos y vencimientos', views: [
    { to: `${A}/planear/dia`, label: 'Día', icon: Sun, match: [`${A}/planear/dia`] },
    { to: `${A}/planear/semana`, label: 'Semana', icon: Clock, match: [`${A}/planear/semana`, `${A}/planear`] },
    { to: `${A}/planear/calendario`, label: 'Mes', icon: Calendar, match: [`${A}/planear/calendario`] },
    { to: `${A}/planear/agenda`, label: 'Próximos 30 días', icon: CalendarDays, match: [`${A}/planear/agenda`] },
    { to: `${A}/mente/vencimientos`, label: 'Vencimientos', icon: CalendarClock, match: [`${A}/mente/vencimientos`] },
    { to: `${A}/mente/salida`, label: 'Antes de salir', icon: DoorOpen, match: [`${A}/mente/salida`] },
  ] },
  { id: 'dinero', label: 'Dinero', to: `${A}/dinero`, icon: Wallet, area: null, blurb: 'Lo que entra, lo que sale y tu ahorro', views: [] },
  { id: 'trabajo', label: 'Trabajo', to: `${A}/trabajo`, icon: Briefcase, area: 'web', blurb: 'Clientes, propuestas y cobros', views: [
    { to: `${A}/trabajo`, label: 'Clientes', icon: Users, match: [`${A}/trabajo`], end: true },
    { to: `${A}/trabajo/mes`, label: 'Trabajos', icon: Briefcase, match: [`${A}/trabajo/mes`] },
    { to: `${A}/trabajo/propuestas`, label: 'Propuestas', icon: FileText, match: [`${A}/trabajo/propuestas`] },
    { to: `${A}/envios`, label: 'Envíos', icon: Send, match: [`${A}/envios`] },
    { to: `${A}/trabajo/precios`, label: 'Precios públicos', icon: Globe2, match: [`${A}/trabajo/precios`] },
    { to: `${A}/descubrir/portafolio`, label: 'Portafolio', icon: Palette, match: [`${A}/descubrir/portafolio`] },
  ] },
  { id: 'musica', label: 'Música', to: `${A}/musica`, icon: Music, area: 'musica', blurb: 'Canciones, setlists, práctica y púlpito', views: [
    { to: `${A}/musica`, label: 'Canciones', icon: Music, match: [`${A}/musica`], end: true },
    { to: `${A}/musica/setlists`, label: 'Setlists', icon: ListMusic, match: [`${A}/musica/setlists`] },
    { to: `${A}/musica/practica`, label: 'Práctica', icon: Activity, match: [`${A}/musica/practica`] },
    { to: `${A}/musica/ideas`, label: 'Ideas', icon: Lightbulb, match: [`${A}/musica/ideas`] },
    { to: `${A}/pulpito`, label: 'Púlpito', icon: BookOpen, match: [`${A}/pulpito`], end: false },
    { to: `${A}/pulpito/notas`, label: 'Notas de fe', icon: StickyNote, match: [`${A}/pulpito/notas`] },
  ] },
  { id: 'personal', label: 'Personal', to: `${A}/mente`, icon: Home, area: 'personal', blurb: 'Hábitos, ejercicio, cocina y tus cosas', views: [
    { to: `${A}/mente`, label: 'Hábitos', icon: ListChecks, match: [`${A}/mente`], end: true, group: 'Cada día', hint: 'Lo que quieres repetir' },
    { to: `${A}/mente/rutinas`, label: 'Rutinas', icon: Sunrise, match: [`${A}/mente/rutinas`], group: 'Cada día', hint: 'Mañana y noche, paso a paso' },
    { to: `${A}/mente/reglas`, label: 'Si… entonces…', icon: Zap, match: [`${A}/mente/reglas`], group: 'Cada día', hint: 'Acciones atadas a un momento' },
    { to: `${A}/mente/logros`, label: 'Logros', icon: Trophy, match: [`${A}/mente/logros`], group: 'Cada día', hint: 'Puntos, niveles y premios' },
    { to: `${A}/ejercicio`, label: 'Ejercicio', icon: Dumbbell, match: [`${A}/ejercicio`], group: 'Cuerpo y casa', hint: 'Rutinas, progreso y cuerpo', subs: [{ to: `${A}/ejercicio`, label: 'Rutinas', end: true }, { to: `${A}/ejercicio/historial`, label: 'Historial' }, { to: `${A}/ejercicio/cuerpo`, label: 'Cuerpo' }, { to: `${A}/ejercicio/companeros`, label: 'Compañeros' }] },
    { to: `${A}/cocina`, label: 'Cocina', icon: ChefHat, match: [`${A}/cocina`], group: 'Cuerpo y casa', hint: 'Recetas y despensa', subs: [{ to: `${A}/cocina`, label: 'Qué cocino', fallback: true }, { to: `${A}/cocina/despensa`, label: 'Despensa' }] },
    { to: `${A}/compras`, label: 'Por comprar', icon: ShoppingBag, match: [`${A}/compras`], group: 'Cuerpo y casa', hint: 'Lo que falta' },
    { to: `${A}/mente/cosas`, label: 'Cosas y promesas', icon: Handshake, match: [`${A}/mente/cosas`], group: 'Para no olvidar', hint: 'Dónde dejé qué, a quién le debo' },
    { to: `${A}/lugares`, label: 'Salidas', icon: MapPin, match: [`${A}/lugares`], group: 'Para no olvidar', hint: 'Lugares y viajes' },
  ], also: [`${A}/mente/enfoque`, `${A}/mente/ocio`] },
  { id: 'privado', label: 'Privado', to: `${A}/boveda`, icon: KeyRound, area: null, blurb: 'Bóveda, enlaces públicos y guardado', views: [
    { to: `${A}/boveda`, label: 'Bóveda', icon: KeyRound, match: [`${A}/boveda`] },
    { to: `${A}/compartir`, label: 'Enlaces públicos', icon: Link2, match: [`${A}/compartir`] },
    { to: `${A}/descubrir/aprender`, label: 'Guardado', icon: Bookmark, match: [`${A}/descubrir`] },
  ] },
]

export const sectionById = (id: string) => sections.find((s) => s.id === id)

const starts = (path: string, p: string) => path === p || path.startsWith(p + '/')
/** La vista (pestaña) a la que pertenece una dirección: gana la coincidencia más larga. */
function bestView(path: string): { section: Section; view: View; len: number } | null {
  let best: { section: Section; view: View; len: number } | null = null
  for (const s of sections) for (const v of s.views) for (const m of v.match) if (starts(path, m) && (!best || m.length > best.len)) best = { section: s, view: v, len: m.length }
  return best
}

/** La sección en la que estás según la dirección. */
export function sectionOf(pathname: string): { section: Section; view: View | null } {
  const path = pathname.replace(/\/$/, '') || '/app'
  if (path === '/app') return { section: sections[0], view: null }
  if (starts(path, '/app/dinero')) return { section: sectionById('dinero')!, view: null }
  const b = bestView(path)
  if (b) return { section: b.section, view: b.view }
  for (const s of sections) if (s.also?.some((p) => starts(path, p))) return { section: s, view: null }
  return { section: sections[0], view: null }
}
