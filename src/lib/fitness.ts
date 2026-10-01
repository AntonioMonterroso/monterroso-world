export type Workout = { id: string; title: string; notes: string | null; days: number[] }
export type WorkoutItem = { id: string; workout_id: string; position: number; name: string; sets: number; reps: string; weight: number | null; rest_sec: number | null; notes: string | null }
export type Partner = { id: string; name: string; notes: string | null }
export type SetEntry = { reps: number; weight: number | null }
export type Entry = { name: string; sets: SetEntry[] }
export type WorkoutLog = { id: string; partner_id: string | null; workout_id: string | null; session_key: string | null; title: string; performed_on: string; duration_min: number | null; entries: Entry[]; notes: string | null }
export type BodyMetric = { id: string; measured_on: string; weight_kg: number; note: string | null }
export type HealthDay = { id: string; day: string; water_glasses: number; sleep_hours: number | null }
export type ShareLink = { id: string; partner_id: string; token_hash: string; workout_ids: string[]; can_log: boolean; expires_at: string | null; pin_salt: string | null; pin_hash: string | null; revoked: boolean; last_used_at: string | null; created_at: string }

export const WATER_GOAL = 8
export const SLEEP_GOAL = 8

const r1 = (n: number) => Math.round(n * 10) / 10

/** Primer número de un rango de repeticiones ("8-10" → 8). */
export const firstNumber = (s: string) => { const m = /\d+/.exec(s); return m ? Number(m[0]) : 10 }

/** Volumen total (repeticiones × peso) de una sesión. */
export const volume = (entries: Entry[]) => Math.round(entries.reduce((a, e) => a + e.sets.reduce((s, x) => s + x.reps * (x.weight ?? 0), 0), 0))

/** Mejor peso por sesión de un ejercicio, en orden cronológico (para ver el progreso). */
export function progress(logs: WorkoutLog[], exercise: string): { date: string; best: number }[] {
  const key = exercise.trim().toLowerCase()
  return logs
    .map((l) => {
      const e = l.entries.find((x) => x.name.trim().toLowerCase() === key)
      const best = e ? Math.max(0, ...e.sets.map((s) => s.weight ?? 0)) : 0
      return { date: l.performed_on, best }
    })
    .filter((p) => p.best > 0)
    .sort((a, b) => a.date.localeCompare(b.date))
}

/** Nombres de ejercicios sin repetir (sin distinguir mayúsculas), con la primera escritura vista. */
export function exerciseNames(logs: WorkoutLog[]): string[] {
  const seen = new Map<string, string>()
  for (const n of logs.flatMap((l) => l.entries.map((e) => e.name.trim())).filter(Boolean)) if (!seen.has(n.toLowerCase())) seen.set(n.toLowerCase(), n)
  return [...seen.values()].sort((a, b) => a.localeCompare(b))
}

/** Sesiones en los últimos `days` días contando desde `today`. */
export function sessionsInLast(logs: { performed_on: string }[], today: string, days: number): number {
  const day = (iso: string) => { const [y, m, d] = iso.split('-').map(Number); return Math.round(Date.UTC(y, m - 1, d) / 86_400_000) }
  const t = day(today)
  return logs.filter((l) => { const n = t - day(l.performed_on); return n >= 0 && n < days }).length
}

/** Cambio de peso entre la primera y la última medición. */
export function weightChange(metrics: BodyMetric[]): number | null {
  if (metrics.length < 2) return null
  const s = [...metrics].sort((a, b) => a.measured_on.localeCompare(b.measured_on))
  return r1(s[s.length - 1].weight_kg - s[0].weight_kg)
}

/** Limpia las entradas antes de guardarlas: tamaños razonables y números válidos. */
export function cleanEntries(raw: unknown): Entry[] {
  if (!Array.isArray(raw)) return []
  return raw.slice(0, 40).map((e): Entry | null => {
    if (!e || typeof e !== 'object') return null
    const name = typeof (e as Entry).name === 'string' ? (e as Entry).name.trim().slice(0, 120) : ''
    const sets = Array.isArray((e as Entry).sets) ? (e as Entry).sets.slice(0, 20).map((s) => ({ reps: Math.min(999, Math.max(0, Math.round(Number(s?.reps) || 0))), weight: s?.weight == null || Number.isNaN(Number(s.weight)) ? null : Math.min(2000, Math.max(0, Number(s.weight))) })) : []
    return name && sets.length ? { name, sets } : null
  }).filter((x): x is Entry => x !== null)
}
