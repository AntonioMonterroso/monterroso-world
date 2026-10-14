import { DoorOpen, Dumbbell, Gamepad2, Handshake, CalendarClock, ListChecks, Sunrise, Target, Trophy, Zap } from 'lucide-react'
import { SegNav, TabOutlet } from '../../components/ui'

const tabs = [
  { to: '/app/mente', label: 'Hábitos', end: true, icon: ListChecks, group: 'Cada día', hint: 'Lo que quieres repetir' },
  { to: '/app/mente/rutinas', label: 'Rutinas', icon: Sunrise, group: 'Cada día', hint: 'Mañana y noche, paso a paso' },
  { to: '/app/mente/enfoque', label: 'Enfoque', icon: Target, group: 'Cada día', hint: 'Una cosa, un tiempo' },
  { to: '/app/mente/logros', label: 'Logros', icon: Trophy, group: 'Cada día', hint: 'Puntos, niveles y premios' },
  { to: '/app/mente/salida', label: 'Antes de salir', icon: DoorOpen, group: 'Para no olvidar', hint: 'Listas por lugar' },
  { to: '/app/mente/cosas', label: 'Cosas y promesas', icon: Handshake, group: 'Para no olvidar', hint: 'Dónde dejé qué, a quién le debo' },
  { to: '/app/mente/vencimientos', label: 'Vencimientos', icon: CalendarClock, group: 'Para no olvidar', hint: 'Dominios, seguros, renovaciones' },
  { to: '/app/mente/reglas', label: 'Si… entonces…', icon: Zap, group: 'Para no olvidar', hint: 'Acciones atadas a un momento' },
  { to: '/app/mente/ocio', label: 'Ocio', icon: Gamepad2, group: 'Cuerpo y descanso', hint: 'Ruleta de descansos' },
  { to: '/app/ejercicio', label: 'Ejercicio', icon: Dumbbell, group: 'Cuerpo y descanso', hint: 'Rutinas y progreso' },
]

export default function MindLayout() {
  return (
    <div>
      <SegNav label="Mente y cuerpo" tabs={tabs} />
      <TabOutlet tabs={tabs} />
    </div>
  )
}
