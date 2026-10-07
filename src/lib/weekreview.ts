import type { DayXp } from './xp'

export type WeekReview = {
  points: number
  prevPoints: number
  activeDays: number
  best: { day: string; total: number } | null
  top: { label: string; n: number }[]
  focusMin: number
  avgEnergy: number | null
  message: string
}

const sum = (by: Map<string, DayXp>, days: string[]) => days.reduce((s, d) => s + (by.get(d)?.total ?? 0), 0)

/** Resumen de una semana en tono amable: reconoce lo hecho, nunca regaña por lo que faltó. */
export function weekReview(by: Map<string, DayXp>, days: string[], prevDays: string[], energies: Record<string, number | null>): WeekReview {
  const points = sum(by, days)
  const prevPoints = sum(by, prevDays)
  const active = days.filter((d) => (by.get(d)?.total ?? 0) > 0)
  const best = active.length ? active.map((d) => ({ day: d, total: by.get(d)!.total })).sort((a, b) => b.total - a.total)[0] : null
  const parts = new Map<string, number>()
  for (const d of days) for (const p of by.get(d)?.parts ?? []) parts.set(p.label, (parts.get(p.label) ?? 0) + p.n)
  const focusMin = parts.get('Minutos de enfoque') ?? 0
  const top = [...parts.entries()].filter(([l]) => l !== 'Minutos de enfoque').map(([label, n]) => ({ label, n })).sort((a, b) => b.n - a.n).slice(0, 3)
  const es = days.map((d) => energies[d]).filter((e): e is number => typeof e === 'number')
  const avgEnergy = es.length ? Math.round((es.reduce((a, b) => a + b, 0) / es.length) * 10) / 10 : null

  let message: string
  if (points === 0) message = 'Fue una semana quieta, y está bien. Esta semana puedes empezar con una sola cosa pequeña.'
  else if (prevPoints > 0 && points >= prevPoints * 1.2) message = 'Subiste el ritmo respecto a la semana pasada. Qué bueno verte avanzar.'
  else if (prevPoints > 0 && points < prevPoints * 0.6) message = 'Fue una semana más tranquila que la anterior. Todo cuenta; nadie rinde igual siempre.'
  else if (active.length >= 5) message = 'Estuviste presente casi todos los días. Eso es constancia de la buena.'
  else message = 'Tuviste días activos y días de pausa, y así se ve una semana real.'
  return { points, prevPoints, activeDays: active.length, best, top, focusMin, avgEnergy, message }
}
