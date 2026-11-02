import { useCallback, useEffect, useState } from 'react'
import { getSettings, patchSettings } from './settings'

/** Los hábitos «mínimos»: los únicos que cuentan en Día suave. Se guardan en tus ajustes (sin tabla nueva). */
export const cleanMin = (raw: unknown): string[] => (Array.isArray(raw) ? raw.filter((x): x is string => typeof x === 'string').slice(0, 20) : [])

export function useMinHabits() {
  const [ids, setIds] = useState<string[]>([])
  const [loaded, setLoaded] = useState(false)
  useEffect(() => { void getSettings().then((s) => { setIds(cleanMin((s as { minHabits?: unknown }).minHabits)); setLoaded(true) }) }, [])
  const toggle = useCallback((id: string) => {
    setIds((cur) => { const next = cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]; void patchSettings({ minHabits: next } as never); return next })
  }, [])
  return { ids, loaded, toggle }
}
