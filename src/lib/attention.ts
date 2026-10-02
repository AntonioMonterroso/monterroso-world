import { useMemo } from 'react'
import { followUpDue, type Delivery } from './deliveries'
import { useEvents } from './events'
import { useTable } from './table'
import { localISO, nowMin } from './time'

export type Overdue = { id: string; title: string; minsLate: number }

/** Lo que pide tu atención ahora: recordatorios de hoy que ya pasaron sin confirmar y envíos por seguir. */
export function useAttention(now: Date) {
  const ev = useEvents()
  const deliveries = useTable<Delivery>('deliveries', { col: 'created_at', asc: false })
  const today = localISO(now)
  const m = nowMin(now)

  return useMemo(() => {
    const overdue: Overdue[] = ev.between(today, today)
      .filter((o) => o.event.type === 'reminder' && !o.state.done && o.event.start_min <= m)
      .map((o) => ({ id: o.event.id, title: o.event.title, minsLate: m - o.event.start_min }))
    const followUps = deliveries.rows.filter((d) => followUpDue(d, today))
    const toSend = deliveries.rows.filter((d) => d.status === 'to_send')
    return { overdue, followUps, toSend, count: overdue.length + followUps.length + toSend.length, loading: ev.loading || deliveries.loading }
  }, [ev, deliveries.rows, deliveries.loading, today, m])
}
