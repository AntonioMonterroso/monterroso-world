export type Repeat = 'none' | 'daily' | 'weekly' | 'monthly'

export type Recurrence = {
  start_date: string // YYYY-MM-DD
  repeat: Repeat
  interval_n: number
  weekdays: number[] // 0=domingo … 6=sábado
  until: string | null
  exceptions: string[]
}

/** Número de día desde 1970-01-01 (UTC) para una fecha ISO, sin efectos de horario de verano. */
export const dayNum = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number)
  return Math.round(Date.UTC(y, m - 1, d) / 86_400_000)
}
export const isoFromNum = (n: number) => new Date(n * 86_400_000).toISOString().slice(0, 10)
export const weekdayOf = (n: number) => (((n + 4) % 7) + 7) % 7 // 1970-01-01 fue jueves
const weekIdx = (n: number) => Math.floor((n - 4) / 7) // 1970-01-05 fue lunes

const ym = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number)
  return { y, m, d }
}
const daysInMonth = (y: number, m: number) => new Date(Date.UTC(y, m, 0)).getUTCDate()

export function occursOn(r: Recurrence, iso: string): boolean {
  if (iso < r.start_date) return false
  if (r.until && iso > r.until) return false
  if (r.exceptions.includes(iso)) return false
  const n = dayNum(iso)
  const s = dayNum(r.start_date)
  const step = Math.max(1, r.interval_n)

  switch (r.repeat) {
    case 'none':
      return iso === r.start_date
    case 'daily':
      return (n - s) % step === 0
    case 'weekly': {
      const days = r.weekdays.length ? r.weekdays : [weekdayOf(s)]
      return days.includes(weekdayOf(n)) && (weekIdx(n) - weekIdx(s)) % step === 0
    }
    case 'monthly': {
      const a = ym(r.start_date)
      const b = ym(iso)
      const months = (b.y - a.y) * 12 + (b.m - a.m)
      if (months < 0 || months % step !== 0) return false
      // Si el mes no tiene ese día (p. ej. 31), cae en el último día
      return b.d === Math.min(a.d, daysInMonth(b.y, b.m))
    }
  }
}

/** Fechas (ISO) en que ocurre, entre `from` y `to` incluidos. */
export function occurrences(r: Recurrence, from: string, to: string): string[] {
  const out: string[] = []
  for (let n = dayNum(from); n <= dayNum(to); n++) {
    const iso = isoFromNum(n)
    if (occursOn(r, iso)) out.push(iso)
  }
  return out
}
