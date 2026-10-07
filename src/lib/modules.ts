import { Briefcase, CalendarDays, Compass, Dumbbell, HeartPulse, KeyRound, MapPin, Music, Share2, ShoppingBag, Sun, Wallet, BookOpen, type LucideIcon } from 'lucide-react'

export type Mod = { name: string; to?: string }
export type Center = { id: string; label: string; icon: LucideIcon; blurb: string; modules: Mod[]; tone: 'dev' | 'music' | 'personal' }
const m = (name: string, to?: string): Mod => ({ name, to })

export const centers: Center[] = [
  { id: 'hoy', label: 'Hoy', icon: Sun, tone: 'dev', blurb: 'Lo que toca ahora y lo siguiente.', modules: [m('Centro de avisos', '/app/avisos'), m('Bloque actual'), m('Prioridades'), m('Captura rápida'), m('Arranque y cierre del día', '/app')] },
  { id: 'planear', label: 'Planear', icon: CalendarDays, tone: 'dev', blurb: 'Horario, agenda y recordatorios.', modules: [m('Horario interactivo', '/app/planear'), m('Calendario mensual', '/app/planear/calendario'), m('Eventos repetitivos', '/app/planear/agenda'), m('Agenda y citas', '/app/planear/agenda'), m('Recordatorios con checklist', '/app/planear/agenda'), m('Checklist de salida', '/app/mente/salida'), m('Vistas semana, mes y año')] },
  { id: 'trabajo', label: 'Trabajo', icon: Briefcase, tone: 'dev', blurb: 'Clientes, proyectos y cobros.', modules: [m('Trabajos por mes', '/app/trabajo'), m('Clientes y sitios'), m('Propuestas y contratos'), m('Envíos y seguimiento', '/app/envios'), m('Logbook de bugs'), m('Snippets')] },
  { id: 'musica', label: 'Música', icon: Music, tone: 'music', blurb: 'Canciones, setlists y práctica.', modules: [m('Biblioteca de canciones', '/app/musica'), m('Setlists', '/app/musica/setlists'), m('Compartir canciones', '/app/musica'), m('Práctica y racha', '/app/musica/practica'), m('Notas de voz', '/app/musica/ideas'), m('Metrónomo y afinador', '/app/musica')] },
  { id: 'pulpito', label: 'Púlpito', icon: BookOpen, tone: 'personal', blurb: 'Prédicas, versículos y presentación en vivo.', modules: [m('Mis prédicas', '/app/pulpito'), m('Notas y versículos', '/app/pulpito/notas'), m('Presentación en vivo', '/app/pulpito')] },
  { id: 'mente', label: 'Mente y cuerpo', icon: HeartPulse, tone: 'personal', blurb: 'Enfoque, hábitos y ejercicio.', modules: [m('Rutinas de mañana y noche', '/app/mente/rutinas'), m('Antes de salir (checklist)', '/app/mente/salida'), m('Zona Ocio y ruleta', '/app/mente/ocio'), m('Dónde dejé las cosas', '/app/mente/cosas'), m('Promesas y préstamos', '/app/mente/cosas'), m('Vencimientos (dominio, seguro…)', '/app/mente/vencimientos'), m('Modo enfoque', '/app/mente/enfoque'), m('Estacionamiento de distracciones', '/app/mente/enfoque'), m('Hábitos', '/app/mente'), m('Ejercicio y compañeros', '/app/ejercicio'), m('Ánimo y energía')] },
  { id: 'ejercicio', label: 'Ejercicio', icon: Dumbbell, tone: 'personal', blurb: 'Rutinas, entrenamientos, progreso y compañeros.', modules: [m('Rutinas', '/app/ejercicio'), m('Historial y progreso', '/app/ejercicio/historial'), m('Cuerpo, agua y sueño', '/app/ejercicio/cuerpo'), m('Compañeros', '/app/ejercicio/companeros')] },
  { id: 'dinero', label: 'Dinero', icon: Wallet, tone: 'dev', blurb: 'Ingresos, cobros, deudas y metas.', modules: [m('Cuentas, efectivo y bancos', '/app/dinero/cuentas'), m('Ingresos y gastos', '/app/dinero/movimientos'), m('Por cobrar', '/app/trabajo'), m('Préstamos', '/app/dinero/prestamos'), m('Suscripciones', '/app/dinero/suscripciones'), m('Metas de ahorro', '/app/dinero/metas'), m('Áreas y categorías', '/app/dinero/categorias')] },
  { id: 'boveda', label: 'Bóveda', icon: KeyRound, tone: 'personal', blurb: 'Contraseñas y accesos cifrados.', modules: [m('Contraseñas', '/app/boveda'), m('Correos y cuentas', '/app/boveda'), m('Accesos de clientes', '/app/boveda')] },
  { id: 'descubrir', label: 'Descubrir', icon: Compass, tone: 'music', blurb: 'Aprender, inspirarte y guardar lo que te sirve.', modules: [m('Aprender (YouTube)', '/app/descubrir/aprender'), m('Links', '/app/descubrir/links'), m('Portafolio', '/app/descubrir/portafolio'), m('Inspiración', '/app/descubrir/inspiracion')] },
  { id: 'lugares', label: 'Lugares', icon: MapPin, tone: 'music', blurb: 'Sitios que quieres conocer, viajes y salidas.', modules: [m('Por visitar', '/app/lugares'), m('Viajes y salidas', '/app/lugares')] },
  { id: 'compras', label: 'Por comprar', icon: ShoppingBag, tone: 'dev', blurb: 'Instrumentos, equipo y lo que necesitas.', modules: [m('Lista de compras', '/app/compras')] },
  { id: 'compartir', label: 'Compartir', icon: Share2, tone: 'music', blurb: 'Tarjetas y enlaces públicos.', modules: [m('Tarjetas digitales', '/app/compartir'), m('Canciones públicas', '/app/compartir'), m('Compañeros de ejercicio', '/app/compartir'), m('Pantalla de la iglesia', '/app/compartir')] },
]

export const centerById = (id: string) => centers.find((c) => c.id === id)

/** Cómo se agrupan los centros en la barra lateral y en «Más», por intención y no por orden alfabético. */
export const centerGroups: { label?: string; ids: string[] }[] = [
  { ids: ['hoy'] },
  { label: 'Organizar', ids: ['planear', 'trabajo', 'dinero'] },
  { label: 'Crear', ids: ['musica', 'pulpito', 'descubrir'] },
  { label: 'Salir y comprar', ids: ['lugares', 'compras'] },
  { label: 'Cuidarme', ids: ['mente', 'ejercicio'] },
  { label: 'Privado', ids: ['boveda', 'compartir'] },
]
