import { useMemo } from 'react'
import type { Checkin } from './rhythm'
import { useTable } from './table'
import { balance, levelOf, totalXp, xpByDay, type XpData } from './xp'

export type Reward = { id: string; name: string; cost: number; active: boolean }
export type Claim = { id: string; reward_id: string | null; name: string; cost: number; day: string }

/** Puntos, nivel y recompensas, calculados con lo que ya registras. */
export function useProgress() {
  const tasks = useTable<XpData['tasks'][number] & { id: string }>('tasks', { col: 'created_at', asc: false })
  const habitLogs = useTable<{ id: string; day: string }>('habit_logs', { col: 'day', asc: false })
  const runs = useTable<{ id: string; day: string; completed: boolean }>('routine_runs', { col: 'day', asc: false })
  const promises = useTable<{ id: string; done: boolean; done_on: string | null }>('promises', { col: 'created_at', asc: false })
  const deliveries = useTable<{ id: string; sent_at: string | null }>('deliveries', { col: 'created_at', asc: false })
  const checkins = useTable<Checkin>('day_checkins', { col: 'day', asc: false })
  const focus = useTable<{ id: string; started_at: string; actual_min: number }>('focus_sessions', { col: 'started_at', asc: false })
  const rewards = useTable<Reward>('rewards', { col: 'cost', asc: true })
  const claims = useTable<Claim>('reward_claims', { col: 'created_at', asc: false })

  const loading = [tasks, habitLogs, runs, promises, deliveries, checkins, focus, rewards, claims].some((t) => t.loading)
  const byDay = useMemo(() => xpByDay({ tasks: tasks.rows, habitLogs: habitLogs.rows, runs: runs.rows, promises: promises.rows, deliveries: deliveries.rows, checkins: checkins.rows, focus: focus.rows }), [tasks.rows, habitLogs.rows, runs.rows, promises.rows, deliveries.rows, checkins.rows, focus.rows])
  const earned = useMemo(() => totalXp(byDay), [byDay])
  const bal = useMemo(() => balance(earned, claims.rows), [earned, claims.rows])
  const level = useMemo(() => levelOf(earned), [earned])
  return { loading, byDay, earned, bal, level, rewards, claims }
}
