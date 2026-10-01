import { dayNum, isoFromNum, weekdayOf } from './recur'

export type Moment = 'morning' | 'afternoon' | 'evening' | 'any'
export type Habit = { id: string; name: string; target_per_week: number; moment: Moment; position: number; archived: boolean }
export type HabitLog = { id: string; habit_id: string; day: string }

export const MOMENTS: { id: Moment; label: string }[] = [
  { id: 'any', label: 'Cualquier hora' },
  { id: 'morning', label: 'Mañana' },
  { id: 'afternoon', label: 'Tarde' },
  { id: 'evening', label: 'Noche' },
]

export const SUGGESTIONS: { name: string; target: number; moment: Moment }[] = [
  { name: 'Ejercicio', target: 4, moment: 'morning' },
  { name: 'Leer la Biblia', target: 7, moment: 'morning' },
  { name: 'Practicar música 15 min', target: 5, moment: 'evening' },
  { name: 'Estudiar algo nuevo', target: 5, moment: 'afternoon' },
  { name: 'Vitaminas o medicina', target: 7, moment: 'morning' },
  { name: 'Dormir antes de las 11', target: 5, moment: 'evening' },
  { name: 'Estirar 5 minutos', target: 7, moment: 'any' },
]

/** Lunes (ISO) de la semana de `iso`. */
export const weekStart = (iso: string) => { const n = dayNum(iso); return isoFromNum(n - ((weekdayOf(n) + 6) % 7)) }

const doneDays = (habitId: string, logs: HabitLog[]) => new Set(logs.filter((l) => l.habit_id === habitId).map((l) => dayNum(l.day)))

/** Veces que se hizo en la semana en curso. */
export function weekDone(habitId: string, logs: HabitLog[], today: string): number {
  const start = dayNum(weekStart(today))
  const end = start + 6
  let n = 0
  for (const d of doneDays(habitId, logs)) if (d >= start && d <= end) n++
  return n
}

/** Racha amable: días seguidos si es diario; semanas cumplidas si no. La semana o el día en curso no rompen la racha. */
export function streak(habit: Pick<Habit, 'id' | 'target_per_week'>, logs: HabitLog[], today: string): { count: number; unit: 'días' | 'semanas' } {
  const days = doneDays(habit.id, logs)
  if (habit.target_per_week >= 7) {
    let n = dayNum(today)
    if (!days.has(n)) n -= 1
    let c = 0
    while (days.has(n)) { c++; n-- }
    return { count: c, unit: 'días' }
  }
  let ws = dayNum(weekStart(today))
  const inWeek = (w: number) => { let k = 0; for (const d of days) if (d >= w && d <= w + 6) k++; return k }
  let c = 0
  if (inWeek(ws) >= habit.target_per_week) c++
  ws -= 7
  while (inWeek(ws) >= habit.target_per_week) { c++; ws -= 7 }
  return { count: c, unit: 'semanas' }
}
