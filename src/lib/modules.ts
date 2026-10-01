import { Briefcase, CalendarDays, Compass, HeartPulse, KeyRound, Music, Share2, Sun, Wallet, BookOpen, type LucideIcon } from 'lucide-react'

export type Center = { id: string; label: string; icon: LucideIcon; blurb: string; modules: string[]; tone: 'dev' | 'music' | 'personal' }

export const centers: Center[] = [
  { id: 'hoy', label: 'Hoy', icon: Sun, tone: 'dev', blurb: 'Lo que toca ahora y lo siguiente.', modules: ['Bloque actual', 'Prioridades', 'Captura rápida', 'Rituales de inicio y cierre'] },
  { id: 'planear', label: 'Planear', icon: CalendarDays, tone: 'dev', blurb: 'Horario, agenda y recordatorios.', modules: ['Horario interactivo', 'Eventos repetitivos', 'Agenda y citas', 'Recordatorios con checklist', 'Checklist de salida', 'Vistas semana, mes y año'] },
  { id: 'trabajo', label: 'Trabajo', icon: Briefcase, tone: 'dev', blurb: 'Clientes, proyectos y cobros.', modules: ['Trabajos por mes', 'Clientes y sitios', 'Propuestas y contratos', 'Envíos y seguimiento', 'Logbook de bugs', 'Snippets'] },
  { id: 'musica', label: 'Música', icon: Music, tone: 'music', blurb: 'Canciones, setlists y práctica.', modules: ['Biblioteca de canciones', 'Setlists', 'Práctica y racha', 'Notas de voz', 'Metrónomo y afinador'] },
  { id: 'pulpito', label: 'Púlpito', icon: BookOpen, tone: 'personal', blurb: 'Prédicas, versículos y presentación en vivo.', modules: ['Mis prédicas', 'Notas y versículos', 'Presentación en vivo'] },
  { id: 'mente', label: 'Mente y cuerpo', icon: HeartPulse, tone: 'personal', blurb: 'Enfoque, hábitos y ejercicio.', modules: ['Modo enfoque', 'Estacionamiento de distracciones', 'Hábitos', 'Ejercicio y compañeros', 'Ánimo y energía'] },
  { id: 'dinero', label: 'Dinero', icon: Wallet, tone: 'dev', blurb: 'Ingresos, cobros, deudas y metas.', modules: ['Ingresos y gastos', 'Por cobrar', 'Préstamos', 'Suscripciones', 'Metas de ahorro'] },
  { id: 'boveda', label: 'Bóveda', icon: KeyRound, tone: 'personal', blurb: 'Contraseñas y accesos cifrados.', modules: ['Contraseñas', 'Correos y cuentas', 'Accesos de clientes'] },
  { id: 'descubrir', label: 'Descubrir', icon: Compass, tone: 'music', blurb: 'Aprender, inspirarte y guardar lugares.', modules: ['Aprender (YouTube)', 'Links', 'Inspiración', 'Lugares y compras'] },
  { id: 'compartir', label: 'Compartir', icon: Share2, tone: 'music', blurb: 'Tarjetas y enlaces públicos.', modules: ['Tarjetas digitales', 'Canciones públicas', 'Panel de compañeros'] },
]

export const centerById = (id: string) => centers.find((c) => c.id === id)
