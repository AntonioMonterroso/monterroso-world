/** Plan del día sugerido: pone tus prioridades en los huecos libres, lo difícil cerca de tu mejor hora y suave si vienes sin batería. */
export type Span = { start: number; end: number }
export type PlanItem = { start: number; min: number; title: string }

/** Huecos libres entre lo ocupado, desde `from` hasta `until`, de al menos `minLen` minutos. */
export function freeGaps(busy: Span[], from: number, until = 21 * 60, minLen = 25): Span[] {
  const sorted = busy.filter((b) => b.end > from && b.start < until).sort((a, b) => a.start - b.start)
  const gaps: Span[] = []
  let cur = Math.ceil(from / 5) * 5
  for (const b of sorted) {
    if (b.start - cur >= minLen) gaps.push({ start: cur, end: b.start })
    cur = Math.max(cur, b.end)
  }
  if (until - cur >= minLen) gaps.push({ start: cur, end: until })
  return gaps
}

/** La hora del día en que más enfoque has acumulado (necesita al menos 5 sesiones; si no, no opina). */
export function peakHour(sessions: { actual_min: number; started_at: string }[]): number | null {
  if (sessions.length < 5) return null
  const by = new Array<number>(24).fill(0)
  for (const s of sessions) by[new Date(s.started_at).getHours()] += s.actual_min
  const best = by.indexOf(Math.max(...by))
  return by[best] > 0 ? best : null
}

export function planDay(i: { priorities: string[]; gaps: Span[]; energy: number | null; peak: number | null }): PlanItem[] {
  const soft = (i.energy ?? 3) <= 2
  const titles = i.priorities.slice(0, soft ? 1 : 3)
  const len = soft ? 15 : 25
  const peakMin = i.peak == null ? null : i.peak * 60
  const slots: { start: number }[] = []
  for (const g of i.gaps) {
    let t = peakMin != null && peakMin > g.start && peakMin + len <= g.end ? peakMin : g.start
    for (; t + len <= g.end; t += len + 10) slots.push({ start: t })
  }
  slots.sort((a, b) => (peakMin != null ? Math.abs(a.start - peakMin) - Math.abs(b.start - peakMin) : a.start - b.start))
  const used: number[] = []
  const out: PlanItem[] = []
  for (const title of titles) {
    const slot = slots.find((s) => used.every((u) => Math.abs(u - s.start) >= len + 5))
    if (!slot) break
    used.push(slot.start)
    out.push({ start: slot.start, min: len, title })
  }
  return out.sort((a, b) => a.start - b.start)
}
