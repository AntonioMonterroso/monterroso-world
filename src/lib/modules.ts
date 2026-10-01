import { Briefcase, CalendarDays, Compass, Dumbbell, HeartPulse, KeyRound, Music, Share2, Sun, Wallet, BookOpen, type LucideIcon } from 'lucide-react'

export type Mod = { name: string; to?: string }
export type Center = { id: string; label: string; icon: LucideIcon; blurb: string; modules: Mod[]; tone: 'dev' | 'music' | 'personal' }
const m = (name: string, to?: string): Mod => ({ name, to })

export const centers: Center[] = [
  { id: 'hoy', label: 'Hoy', icon: Sun, tone: 'dev', blurb: 'Lo que toca ahora y lo siguiente.', modules: [m('Bloque actual'), m('Prioridades'), m('Captura rápida'), m('Rituales de inicio y cierre')] },
  { id: 'planear', label: 'Planear', icon: CalendarDays, tone: 'dev', blurb: 'Horario, agenda y recordatorios.', modules: [m('Horario interactivo', '/app/planear'), m('Eventos repetitivos', '/app/planear/agenda'), m('Agenda y citas', '/app/planear/agenda'), m('Recordatorios con checklist', '/app/planear/agenda'), m('Checklist de salida'), m('Vistas semana, mes y año')] },
  { id: 'trabajo', label: 'Trabajo', icon: Briefcase, tone: 'dev', blurb: 'Clientes, proyectos y cobros.', modules: [m('Trabajos por mes', '/app/trabajo'), m('Clientes y sitios'), m('Propuestas y contratos'), m('Envíos y seguimiento'), m('Logbook de bugs'), m('Snippets')] },
  { id: 'musica', label: 'Música', icon: Music, tone: 'music', blurb: 'Canciones, setlists y práctica.', modules: [m('Biblioteca de canciones', '/app/musica'), m('Setlists', '/app/musica/setlists'), m('Práctica y racha', '/app/musica/practica'), m('Notas de voz'), m('Metrónomo y afinador', '/app/musica')] },
  { id: 'pulpito', label: 'Púlpito', icon: BookOpen, tone: 'personal', blurb: 'Prédicas, versículos y presentación en vivo.', modules: [m('Mis prédicas', '/app/pulpito'), m('Notas y versículos', '/app/pulpito/notas'), m('Presentación en vivo', '/app/pulpito')] },
  { id: 'mente', label: 'Mente y cuerpo', icon: HeartPulse, tone: 'personal', blurb: 'Enfoque, hábitos y ejercicio.', modules: [m('Modo enfoque', '/app/mente/enfoque'), m('Estacionamiento de distracciones', '/app/mente/enfoque'), m('Hábitos', '/app/mente'), m('Ejercicio y compañeros', '/app/ejercicio'), m('Ánimo y energía')] },
  { id: 'ejercicio', label: 'Ejercicio', icon: Dumbbell, tone: 'personal', blurb: 'Rutinas, entrenamientos, progreso y compañeros.', modules: [m('Rutinas', '/app/ejercicio'), m('Historial y progreso', '/app/ejercicio/historial'), m('Cuerpo, agua y sueño', '/app/ejercicio/cuerpo'), m('Compañeros', '/app/ejercicio/companeros')] },
  { id: 'dinero', label: 'Dinero', icon: Wallet, tone: 'dev', blurb: 'Ingresos, cobros, deudas y metas.', modules: [m('Ingresos y gastos', '/app/dinero/movimientos'), m('Por cobrar', '/app/trabajo'), m('Préstamos', '/app/dinero/prestamos'), m('Suscripciones', '/app/dinero/suscripciones'), m('Metas de ahorro', '/app/dinero/metas')] },
  { id: 'boveda', label: 'Bóveda', icon: KeyRound, tone: 'personal', blurb: 'Contraseñas y accesos cifrados.', modules: [m('Contraseñas', '/app/boveda'), m('Correos y cuentas', '/app/boveda'), m('Accesos de clientes', '/app/boveda')] },
  { id: 'descubrir', label: 'Descubrir', icon: Compass, tone: 'music', blurb: 'Aprender, inspirarte y guardar lugares.', modules: [m('Aprender (YouTube)', '/app/descubrir'), m('Links', '/app/descubrir/links'), m('Portafolio', '/app/descubrir/portafolio'), m('Inspiración'), m('Lugares y compras')] },
  { id: 'compartir', label: 'Compartir', icon: Share2, tone: 'music', blurb: 'Tarjetas y enlaces públicos.', modules: [m('Tarjetas digitales'), m('Canciones públicas'), m('Panel de compañeros', '/app/ejercicio/companeros')] },
]

export const centerById = (id: string) => centers.find((c) => c.id === id)
