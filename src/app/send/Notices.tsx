import { BellRing, CalendarCheck, Loader2, Send } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { describeLog, followUpDue, isOpen, type Delivery } from '../../lib/deliveries'
import { useEvents } from '../../lib/events'
import { dayNum, isoFromNum } from '../../lib/recur'
import { supabase } from '../../lib/supabase'
import { useTable } from '../../lib/table'
import { fmtMin, localISO } from '../../lib/time'
import { Empty, ErrorBar, chip } from '../money/shared'

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
      <p className="eyebrow">Hoy</p><h1 className="mt-2 font-display text-4xl">Centro de avisos</h1>
      <ErrorBar msg={err || ev.error || deliveries.error || log.error} onClose={() => setErr('')} />
      <div className="mt-6 flex gap-2" role="tablist">
        <button role="tab" aria-selected={tab === 'pending'} onClick={() => setTab('pending')} className="min-h-11 rounded-full border px-4 text-sm" style={chip(tab === 'pending')}>Requiere acción{pendingCount > 0 && ` · ${pendingCount}`}</button>
        <button role="tab" aria-selected={tab === 'history'} onClick={() => setTab('history')} className="min-h-11 rounded-full border px-4 text-sm" style={chip(tab === 'history')}>Historial</button>
      </div>

      {loading ? <div className="grid h-40 place-items-center"><Loader2 className="animate-spin" aria-label="Cargando" /></div> : tab === 'pending' ? (
        pendingCount === 0 ? <Empty title="Todo al día" text={waitingNoDate > 0 ? `No hay nada urgente. Tienes ${waitingNoDate} ${waitingNoDate === 1 ? 'envío esperando' : 'envíos esperando'} respuesta.` : 'No tienes recordatorios sin confirmar ni envíos por dar seguimiento.'} /> : (
          <div className="mt-6 grid gap-8">
            {follow.length > 0 && <section><h2 className="font-display text-2xl">Dar seguimiento</h2><ul className="mt-3 grid gap-2">{follow.map((d) => <li key={d.id}><Link to="/app/envios" className="flex items-center gap-3 rounded-xl border px-4 py-3" style={{ background: 'var(--surface)', borderColor: 'var(--accent)' }}><Send size={16} aria-hidden style={{ color: 'var(--accent)' }} /><span className="min-w-0 flex-1"><span className="block truncate font-semibold">{d.title}</span><span className="block truncate text-sm" style={{ color: 'var(--ink-soft)' }}>{d.recipient ? `Para ${d.recipient} · ` : ''}sin respuesta</span></span></Link></li>)}</ul></section>}
            {toSend.length > 0 && <section><h2 className="font-display text-2xl">Por enviar</h2><ul className="mt-3 grid gap-2">{toSend.map((d) => <li key={d.id}><Link to="/app/envios" className="flex items-center gap-3 rounded-xl border px-4 py-3" style={{ background: 'var(--surface)', borderColor: 'var(--line-soft)' }}><Send size={16} aria-hidden style={{ color: 'var(--ink-faint)' }} /><span className="min-w-0 flex-1"><span className="block truncate font-semibold">{d.title}</span>{d.recipient && <span className="block truncate text-sm" style={{ color: 'var(--ink-soft)' }}>Para {d.recipient}</span>}</span></Link></li>)}</ul></section>}
            {overdue.length > 0 && <section><h2 className="font-display text-2xl">Recordatorios sin confirmar</h2><ul className="mt-3 grid gap-2">{overdue.map((o) => <li key={o.event.id + o.date}><Link to={`/app/planear/agenda?e=${o.event.id}`} className="flex items-center gap-3 rounded-xl border px-4 py-3" style={{ background: 'var(--surface)', borderColor: 'var(--line-soft)' }}><CalendarCheck size={16} aria-hidden style={{ color: 'var(--brass)' }} /><span className="min-w-0 flex-1"><span className="block truncate font-semibold">{o.event.title}</span><span className="block text-sm" style={{ color: 'var(--ink-soft)' }}>{o.date === today ? 'Hoy' : dayLabel(o.date)} · {fmtMin(o.event.start_min)}</span></span></Link></li>)}</ul></section>}
          </div>
        )
      ) : (
        grouped.length === 0 ? <Empty title="Aún no se ha enviado ningún aviso" text="Aquí verás cada notificación que te llegó: a qué hora, de qué recordatorio y si tuve que insistir." /> : (
          <div className="mt-6">
            <div className="grid gap-6">{grouped.map(([day, items]) => (
              <section key={day}><h2 className="text-sm font-semibold first-letter:uppercase" style={{ color: 'var(--ink-soft)' }}>{dayLabel(day)}</h2>
                <ul className="mt-2 grid gap-2">{items.map((l) => { const d = describeLog(l.kind); return (
                  <li key={l.id} className="flex items-center gap-3 rounded-xl border px-4 py-3" style={{ background: 'var(--surface)', borderColor: 'var(--line-soft)' }}>
                    <BellRing size={16} aria-hidden style={{ color: d.tone === 'alert' ? 'var(--sky)' : 'var(--accent)' }} />
                    <span className="min-w-0 flex-1"><span className="block truncate font-semibold">{l.title}</span><span className="block text-sm" style={{ color: 'var(--ink-soft)' }}>{d.text}{l.kind === 'nag' && l.nag_count > 1 ? ` (${l.nag_count} veces)` : ''}</span></span>
                    <span className="shrink-0 text-sm" style={{ color: 'var(--ink-faint)' }}>{new Date(l.sent_at).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}</span>
                  </li>) })}</ul>
              </section>))}</div>
            <button className="btn btn-ghost mt-6" onClick={clear}>Limpiar historial</button>
          </div>
        )
      )}
    </div>
  )
}
