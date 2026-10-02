import { BellRing, CalendarCheck, Loader2, Send } from 'lucide-react'
import { useMemo, useState } from 'react'
import { describeLog, followUpDue, isOpen, type Delivery } from '../../lib/deliveries'
import { useEvents } from '../../lib/events'
import { dayNum, isoFromNum } from '../../lib/recur'
import { supabase } from '../../lib/supabase'
import { useTable } from '../../lib/table'
import { fmtMin, localISO } from '../../lib/time'
import { Group, PageHeader, Row, Segmented } from '../../components/ui'
import { Empty, ErrorBar } from '../money/shared'

type Log = { id: string; event_id: string; occ_date: string; kind: string; sent_at: string; nag_count: number }
type Ev = { id: string; title: string }
type BLog = { id: string; block_id: string; occ_date: string; kind: string; sent_at: string }
type Item = { id: string; title: string; kind: string; sent_at: string; nag_count: number }

/** Centro de avisos: qué requiere tu acción y qué se te ha enviado. */
export default function Notices() {
  const today = localISO()
  const ev = useEvents()
  const deliveries = useTable<Delivery>('deliveries', { col: 'created_at', asc: false })
  const log = useTable<Log>('notification_log', { col: 'sent_at', asc: false })
  const events = useTable<Ev>('events', { col: 'created_at', asc: false })
  const blockLog = useTable<BLog>('block_notification_log', { col: 'sent_at', asc: false })
  const blocks = useTable<Ev>('schedule_blocks', { col: 'created_at', asc: false })
  const [tab, setTab] = useState<'pending' | 'history'>('pending')
  const [err, setErr] = useState('')

  // Recordatorios de los últimos 7 días y de hoy que aún no confirmas
  const overdue = useMemo(() => {
    const now = new Date().getHours() * 60 + new Date().getMinutes()
    return ev.between(isoFromNum(dayNum(today) - 7), today).filter((o) => o.event.type === 'reminder' && !o.state.done && (o.date < today || o.event.start_min <= now))
      .sort((a, b) => (a.date + String(a.event.start_min).padStart(4, '0')).localeCompare(b.date + String(b.event.start_min).padStart(4, '0')))
  }, [ev, today])
  const toSend = deliveries.rows.filter((d) => d.status === 'to_send')
  const follow = deliveries.rows.filter((d) => followUpDue(d, today))
  const waitingNoDate = deliveries.rows.filter((d) => isOpen(d) && d.status !== 'to_send' && !followUpDue(d, today)).length
  const pendingCount = overdue.length + toSend.length + follow.length

  const grouped = useMemo(() => {
    const items: Item[] = [
      ...log.rows.map((l) => ({ id: l.id, title: events.rows.find((e) => e.id === l.event_id)?.title ?? 'Recordatorio borrado', kind: l.kind, sent_at: l.sent_at, nag_count: l.nag_count })),
      ...blockLog.rows.map((l) => ({ id: l.id, title: blocks.rows.find((b) => b.id === l.block_id)?.title ?? 'Bloque borrado', kind: l.kind, sent_at: l.sent_at, nag_count: 1 })),
    ].sort((a, b) => b.sent_at.localeCompare(a.sent_at))
    const m = new Map<string, Item[]>()
    for (const l of items) { const k = l.sent_at.slice(0, 10); m.set(k, [...(m.get(k) ?? []), l]) }
    return [...m.entries()]
  }, [log.rows, blockLog.rows, events.rows, blocks.rows])

  const clear = async () => {
    const nil = '00000000-0000-0000-0000-000000000000'
    const [a, b] = await Promise.all([supabase.from('notification_log').delete().neq('id', nil), supabase.from('block_notification_log').delete().neq('id', nil)])
    if (a.error || b.error) setErr('No pude limpiar el historial.'); else await Promise.all([log.reload(), blockLog.reload()])
  }
  const dayLabel = (iso: string) => iso === today ? 'Hoy' : iso === isoFromNum(dayNum(today) - 1) ? 'Ayer' : new Date(iso + 'T12:00:00').toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long' })
  const loading = ev.loading || deliveries.loading || log.loading || blockLog.loading

  return (
    <div>
      <PageHeader eyebrow="Hoy" title="Centro de avisos" />
      <ErrorBar msg={err || ev.error || deliveries.error || log.error} onClose={() => setErr('')} />
      <Segmented label="Vista" value={tab} onChange={setTab} options={[{ id: 'pending', label: pendingCount > 0 ? `Requiere acción · ${pendingCount}` : 'Requiere acción' }, { id: 'history', label: 'Historial' }]} />

      {loading ? <div className="grid h-40 place-items-center"><Loader2 className="animate-spin" aria-label="Cargando" /></div> : tab === 'pending' ? (
        pendingCount === 0 ? <Empty title="Todo al día" text={waitingNoDate > 0 ? `No hay nada urgente. Tienes ${waitingNoDate} ${waitingNoDate === 1 ? 'envío esperando' : 'envíos esperando'} respuesta.` : 'No tienes recordatorios sin confirmar ni envíos por dar seguimiento.'} /> : (
          <>
            {follow.length > 0 && <Group title="Dar seguimiento">{follow.map((d) => <Row key={d.id} icon={<Send size={16} aria-hidden />} tone="var(--accent)" title={d.title} sub={d.recipient ? `Para ${d.recipient} · sin respuesta` : 'Sin respuesta'} to="/app/envios" />)}</Group>}
            {toSend.length > 0 && <Group title="Por enviar">{toSend.map((d) => <Row key={d.id} icon={<Send size={16} aria-hidden />} title={d.title} sub={d.recipient ? `Para ${d.recipient}` : undefined} to="/app/envios" />)}</Group>}
            {overdue.length > 0 && <Group title="Recordatorios sin confirmar">{overdue.map((o) => <Row key={o.event.id + o.date} icon={<CalendarCheck size={16} aria-hidden />} tone="var(--brass)" title={o.event.title} sub={`${o.date === today ? 'Hoy' : dayLabel(o.date)} · ${fmtMin(o.event.start_min)}`} to={`/app/planear/agenda?e=${o.event.id}`} />)}</Group>}
          </>
        )
      ) : (
        grouped.length === 0 ? <Empty title="Aún no se ha enviado ningún aviso" text="Aquí verás cada notificación que te llegó: a qué hora, de qué recordatorio y si tuve que insistir." /> : (
          <>
            {grouped.map(([day, items]) => (
              <Group key={day} title={<span className="first-letter:uppercase">{dayLabel(day)}</span>}>
                {items.map((l) => { const d = describeLog(l.kind); return (
                  <Row key={l.id} icon={<BellRing size={16} aria-hidden />} tone={d.tone === 'alert' ? 'var(--sky)' : 'var(--accent)'} title={l.title} sub={`${d.text}${l.kind === 'nag' && l.nag_count > 1 ? ` (${l.nag_count} veces)` : ''}`} value={new Date(l.sent_at).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })} valueTone="soft" />
                ) })}
              </Group>
            ))}
            <button className="btn btn-ghost mt-6" onClick={clear}>Limpiar historial</button>
          </>
        )
      )}
    </div>
  )
}
