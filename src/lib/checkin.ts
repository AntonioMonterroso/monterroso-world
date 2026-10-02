import { useMemo } from 'react'
import type { Checkin } from './rhythm'
import { dayNum, isoFromNum } from './recur'
import { useTable } from './table'
import { localISO } from './time'

/** Registro del día (energía, ánimo, lo mejor y lo que queda para mañana). */
export function useCheckins() {
  const db = useTable<Checkin>('day_checkins', { col: 'day', asc: false })
  const today = localISO()
  const yesterday = isoFromNum(dayNum(today) - 1)
  const row = useMemo(() => db.rows.find((r) => r.day === today) ?? null, [db.rows, today])
  const prev = useMemo(() => db.rows.find((r) => r.day === yesterday) ?? null, [db.rows, yesterday])

  const save = async (patch: Partial<Omit<Checkin, 'id' | 'day'>>) => {
    if (row) await db.update(row.id, patch)
    else await db.add({ day: today, energy: null, mood: null, win: null, tomorrow: null, ...patch })
  }
  return { today: row, yesterday: prev, save, loading: db.loading, error: db.error, clearError: db.clearError }
}
