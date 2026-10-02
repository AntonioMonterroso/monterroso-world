/** Ritmo del día: energía, ánimo y los rituales de arranque y cierre. Reglas simples, sin culpa. */
export type Checkin = { id: string; day: string; energy: number | null; mood: number | null; win: string | null; tomorrow: string | null }

export const ENERGY: { n: number; label: string }[] = [
  { n: 1, label: 'Sin batería' }, { n: 2, label: 'Baja' }, { n: 3, label: 'Normal' }, { n: 4, label: 'Buena' }, { n: 5, label: 'A tope' },
]
export const MOOD: { n: number; label: string }[] = [{ n: 1, label: 'Mal' }, { n: 3, label: 'Regular' }, { n: 5, label: 'Bien' }]

/** Con energía 1 o 2 el día se vuelve suave: menos cosas, más amables. */
export const isSoftDay = (c?: Pick<Checkin, 'energy'> | null) => (c?.energy ?? 5) <= 2

export type Ritual = 'start' | 'close' | null
/** Arranque por la mañana, cierre desde las 7 de la noche. */
export const ritualFor = (hour: number): Ritual => (hour >= 5 && hour < 12 ? 'start' : hour >= 19 ? 'close' : null)

export type WinInput = { prioritiesDone: number; habitsDone: number; focusMin: number; deliveriesSent: number; routinesDone: number }

/** Lo que sí hiciste hoy. Nunca queda vacío: llegar al cierre también cuenta. */
export function dayWins(i: WinInput): string[] {
  const out: string[] = []
  const n = (k: number, one: string, many: string) => `${k} ${k === 1 ? one : many}`
  if (i.prioritiesDone > 0) out.push(`${n(i.prioritiesDone, 'prioridad cumplida', 'prioridades cumplidas')}`)
  if (i.focusMin > 0) out.push(`${i.focusMin >= 60 ? `${Math.floor(i.focusMin / 60)} h ${i.focusMin % 60} min` : `${i.focusMin} min`} de enfoque`)
  if (i.habitsDone > 0) out.push(`${n(i.habitsDone, 'hábito hecho', 'hábitos hechos')}`)
  if (i.routinesDone > 0) out.push(`${n(i.routinesDone, 'rutina completada', 'rutinas completadas')}`)
  if (i.deliveriesSent > 0) out.push(`${n(i.deliveriesSent, 'envío mandado', 'envíos mandados')}`)
  if (out.length === 0) out.push('Llegaste hasta aquí, y eso también cuenta.')
  return out
}

/** Mensaje del día según la energía registrada. */
export function energyMessage(energy: number | null): string {
  if (energy === null) return 'Cuéntame cómo vienes y ajusto el día.'
  if (energy <= 2) return 'Día suave: con una sola cosa pequeña ya cumpliste.'
  if (energy === 3) return 'Ritmo normal. Una cosa a la vez.'
  return 'Buen día para lo difícil. Empieza por lo que más pesa.'
}
