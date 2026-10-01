import { dayNum, isoFromNum, weekdayOf } from './recur'

export type RoutineKind = 'morning' | 'evening' | 'custom'
export type Routine = { id: string; name: string; kind: RoutineKind; start_min: number | null; days: number[]; position: number; event_id: string | null }
export type Step = { id: string; routine_id: string; position: number; title: string; minutes: number | null; note: string | null }
export type Run = { id: string; routine_id: string; day: string; done_steps: string[]; total_steps: number; completed: boolean; started_at: string; finished_at: string | null }

export const KIND_LABEL: Record<RoutineKind, string> = { morning: 'Mañana', evening: 'Noche', custom: 'Propia' }

export const TEMPLATES: Record<'morning' | 'evening', { name: string; start_min: number; steps: { title: string; minutes: number | null; note?: string }[] }> = {
  morning: {
    name: 'Mi mañana', start_min: 7 * 60,
    steps: [
      { title: 'Tomar agua', minutes: 2 },
      { title: 'Estirar el cuerpo', minutes: 5 },
      { title: 'Arreglarme', minutes: 15 },
      { title: 'Desayunar sin pantalla', minutes: 15 },
      { title: 'Ver mis 3 prioridades', minutes: 3, note: 'Abre Hoy y elige las tres cosas que importan.' },
    ],
  },
  evening: {
    name: 'Mi noche', start_min: 21 * 60,
    steps: [
      { title: 'Recoger lo del día', minutes: 10 },
      { title: 'Preparar lo de mañana', minutes: 5, note: 'Ropa, cargador, instrumento, laptop.' },
      { title: 'Escribir lo que quedó pendiente', minutes: 3 },
      { title: 'Higiene', minutes: 10 },
      { title: 'Leer u orar', minutes: 15 },
      { title: 'Pantallas fuera', minutes: null },
    ],
  },
}

export const totalMinutes = (steps: Pick<Step, 'minutes'>[]) => steps.reduce((a, s) => a + (s.minutes ?? 0), 0)

export const isScheduled = (r: Pick<Routine, 'days'>, weekday: number) => r.days.includes(weekday)

/** Qué rutina corresponde mostrar ahora: la de mañana antes del mediodía y la de noche desde las 6 pm. */
export function currentKind(hour: number): RoutineKind | null {
  if (hour < 12) return 'morning'
  if (hour >= 18) return 'evening'
  return null
}

export const progressOf = (run: Pick<Run, 'done_steps'> | undefined, steps: Pick<Step, 'id'>[]) => {
  const done = run ? steps.filter((s) => run.done_steps.includes(s.id)).length : 0
  return { done, total: steps.length, pct: steps.length ? Math.round((done / steps.length) * 100) : 0 }
}

/**
 * Racha amable: días programados seguidos con la rutina completa.
 * Un día no programado no la rompe, y el día de hoy sin terminar todavía tampoco.
 */
export function routineStreak(routine: Pick<Routine, 'days'>, runs: Pick<Run, 'day' | 'completed'>[], today: string): number {
  const done = new Set(runs.filter((r) => r.completed).map((r) => dayNum(r.day)))
  let n = dayNum(today)
  if (isScheduled(routine, weekdayOf(n)) && !done.has(n)) n -= 1
  let count = 0
  for (let i = 0; i < 400; i++, n--) {
    if (!isScheduled(routine, weekdayOf(n))) continue
    if (done.has(n)) count++
    else break
  }
  return count
}

export const fmtStart = (min: number | null) => (min == null ? '' : `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`)
export const dateOf = (n: number) => isoFromNum(n)
