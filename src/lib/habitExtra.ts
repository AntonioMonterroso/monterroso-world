import { useCallback, useEffect, useState } from 'react'
import { getSettings, patchSettings } from './settings'

/** Extras de un hábito, guardados en tus ajustes (sin tabla nueva):
 *  `perDay` = contador (8 vasos de agua: se marca hecho al llegar a 8), `monthGoal` = días que quieres en el mes. */
export type HabitExtra = { perDay?: number; monthGoal?: number; tally?: Record<string, number> }
export type HabitExtras = Record<string, HabitExtra>

export function cleanExtras(raw: unknown, today: string): HabitExtras {
  if (!raw || typeof raw !== 'object') return {}
  const out: HabitExtras = {}
  const cutoff = (() => { const d = new Date(`${today}T12:00:00`); d.setDate(d.getDate() - 40); return d.toISOString().slice(0, 10) })()
  for (const [id, v] of Object.entries(raw as Record<string, unknown>)) {
    if (!v || typeof v !== 'object') continue
    const x = v as Record<string, unknown>
    const e: HabitExtra = {}
    if (typeof x.perDay === 'number' && x.perDay >= 2 && x.perDay <= 50) e.perDay = Math.round(x.perDay)
    if (typeof x.monthGoal === 'number' && x.monthGoal >= 1 && x.monthGoal <= 31) e.monthGoal = Math.round(x.monthGoal)
    if (x.tally && typeof x.tally === 'object') {
      const t: Record<string, number> = {}
      for (const [d, n] of Object.entries(x.tally as Record<string, unknown>)) if (/^\d{4}-\d{2}-\d{2}$/.test(d) && d >= cutoff && typeof n === 'number' && n > 0) t[d] = Math.min(99, Math.round(n))
      if (Object.keys(t).length) e.tally = t
    }
    if (Object.keys(e).length) out[id] = e
  }
  return out
}

/** Nuevo conteo del día y si con eso el hábito queda hecho. */
export function step(extra: HabitExtra | undefined, day: string, delta: number): { count: number; done: boolean } {
  const per = extra?.perDay ?? 1
  const count = Math.max(0, Math.min(99, (extra?.tally?.[day] ?? 0) + delta))
  return { count, done: count >= per }
}

export function useHabitExtras(today: string) {
  const [all, setAll] = useState<HabitExtras>({})
  useEffect(() => { void getSettings().then((s) => setAll(cleanExtras((s as { habitExtra?: unknown }).habitExtra, today))) }, [today])
  const save = useCallback((next: HabitExtras) => { setAll(next); void patchSettings({ habitExtra: next } as never) }, [])
  const set = useCallback((id: string, patch: Partial<HabitExtra>) => {
    setAll((cur) => { const e = { ...(cur[id] ?? {}), ...patch }; if (!e.perDay) delete e.perDay; if (!e.monthGoal) delete e.monthGoal; const next = { ...cur, [id]: e }; void patchSettings({ habitExtra: next } as never); return next })
  }, [])
  const setCount = useCallback((id: string, day: string, n: number) => {
    setAll((cur) => { const e = cur[id] ?? {}; const tally = { ...(e.tally ?? {}), [day]: n }; if (!n) delete tally[day]; const next = { ...cur, [id]: { ...e, tally } }; void patchSettings({ habitExtra: next } as never); return next })
  }, [])
  return { all, save, set, setCount }
}
