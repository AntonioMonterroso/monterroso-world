/** Puntos suaves: se calculan de lo que ya haces. Nunca restan por lo que no hiciste. */
export const POINTS = { priority: 10, habit: 5, routine: 15, promise: 8, delivery: 6, checkin: 5, focusPerMin: 1, focusDayCap: 120 } as const

export type XpData = {
  tasks: { done: boolean; priority_date: string | null }[]
  habitLogs: { day: string }[]
  runs: { day: string; completed: boolean }[]
  promises: { done: boolean; done_on: string | null }[]
  deliveries: { sent_at: string | null }[]
  checkins: { day: string; energy: number | null }[]
  focus: { started_at: string; actual_min: number }[]
}
export type DayXp = { total: number; parts: { label: string; n: number; pts: number }[] }

const dayOf = (iso: string) => (iso.length > 10 ? new Date(iso).toLocaleDateString('en-CA') : iso)

/** Puntos por día. El enfoque tiene tope diario para no premiar el exceso. */
export function xpByDay(d: XpData): Map<string, DayXp> {
  const days = new Map<string, Map<string, number>>()
  const add = (day: string | null | undefined, label: string, n = 1) => { if (!day) return; const m = days.get(day) ?? new Map(); m.set(label, (m.get(label) ?? 0) + n); days.set(day, m) }
  for (const t of d.tasks) if (t.done) add(t.priority_date, 'Prioridades')
  for (const h of d.habitLogs) add(h.day, 'Hábitos')
  for (const r of d.runs) if (r.completed) add(r.day, 'Rutinas')
  for (const p of d.promises) if (p.done) add(p.done_on, 'Promesas cumplidas')
  for (const x of d.deliveries) if (x.sent_at) add(dayOf(x.sent_at), 'Envíos')
  for (const c of d.checkins) if (c.energy != null) add(c.day, 'Registro del día')
  for (const f of d.focus) add(dayOf(f.started_at), 'Minutos de enfoque', Math.max(0, Math.round(f.actual_min)))
  const per: Record<string, number> = { Prioridades: POINTS.priority, Hábitos: POINTS.habit, Rutinas: POINTS.routine, 'Promesas cumplidas': POINTS.promise, Envíos: POINTS.delivery, 'Registro del día': POINTS.checkin, 'Minutos de enfoque': POINTS.focusPerMin }
  const out = new Map<string, DayXp>()
  for (const [day, m] of days) {
    const parts = [...m.entries()].map(([label, n]) => { const cap = label === 'Minutos de enfoque' ? Math.min(n, POINTS.focusDayCap) : n; return { label, n, pts: cap * per[label] } })
    out.set(day, { total: parts.reduce((s, p) => s + p.pts, 0), parts })
  }
  return out
}

export const totalXp = (by: Map<string, DayXp>) => [...by.values()].reduce((s, d) => s + d.total, 0)

/** Nivel n empieza en 50·(n−1)². Nivel 1: 0, nivel 2: 50, nivel 3: 200, nivel 4: 450… */
export function levelOf(xp: number): { level: number; into: number; need: number; pct: number } {
  const level = Math.floor(Math.sqrt(Math.max(0, xp) / 50)) + 1
  const floor = 50 * (level - 1) ** 2, ceil = 50 * level ** 2
  return { level, into: xp - floor, need: ceil - floor, pct: Math.round(((xp - floor) / (ceil - floor)) * 100) }
}

export const weekXp = (by: Map<string, DayXp>, days: string[]) => days.reduce((s, d) => s + (by.get(d)?.total ?? 0), 0)

/** Puntos disponibles para canjear: lo ganado menos lo ya canjeado. */
export const balance = (earned: number, claims: { cost: number }[]) => earned - claims.reduce((s, c) => s + c.cost, 0)
export const canClaim = (bal: number, cost: number) => bal >= cost
export const pointsToGo = (bal: number, cost: number) => Math.max(0, cost - bal)
