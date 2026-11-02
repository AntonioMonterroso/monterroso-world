import { CalendarCheck, Loader2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import Cobrado from '../../components/Cobrado'
import { Group, MonthStepper, PageHeader, Row, Stat } from '../../components/ui'
import { forecast, incomingTotals, monthlyClients, type ClientRow } from '../../lib/incoming'
import { currentMonth, monthLabel, money, useProjects } from '../../lib/projects'
import { Empty, ErrorBar } from './shared'

const STATE = { paid: { tone: 'var(--pos)', text: 'Pagó' }, pending: { tone: 'var(--accent)', text: 'Por cobrar' }, late: { tone: 'var(--aviso)', text: 'Atrasado' } } as const
const cap = (t: string) => t.charAt(0).toUpperCase() + t.slice(1)

/** Lo que entra cada mes: tus clientes con mensualidad, quién ya pagó, quién falta y cuánto vendrá. */
export default function Incoming() {
  const work = useProjects()
  const [month, setMonth] = useState(currentMonth())
  const [row, setRow] = useState<ClientRow | null>(null)
  const [msg, setMsg] = useState('')
  const rows = useMemo(() => monthlyClients(work.projects, work.payments, month), [work.projects, work.payments, month])
  const totals = useMemo(() => incomingTotals(rows), [rows])
  const next = useMemo(() => forecast(work.projects, currentMonth(), 6), [work.projects])
  const peak = Math.max(1, ...next.map((m) => m.fixed))
  const pct = totals.fixed > 0 ? Math.round((totals.collected / totals.fixed) * 100) : 0

  const open = (r: ClientRow) => { setMsg(''); setRow(r) }

  const loading = work.loading

  return (
    <div>
      <PageHeader eyebrow="Dinero" title="Lo que entra" sub="Tus clientes con mensualidad: quién ya pagó, quién falta y cuánto vendrá los próximos meses." />
      <MonthStepper month={month} onChange={setMonth} />
      <ErrorBar msg={work.error} />
      {msg && <p role="status" className="mb-4 rounded-xl px-4 py-3 text-sm" style={{ background: 'color-mix(in oklab, var(--pos) 14%, var(--surface))' }}>{msg}</p>}

      {loading ? <div className="grid h-48 place-items-center"><Loader2 className="animate-spin" aria-label="Cargando" /></div> : rows.length === 0 ? (
        <Empty title="Aún no hay mensualidades este mes" text="En Trabajo, abre un cliente y ponle su mensualidad (monto, día de cobro y desde qué mes). Aquí verás quién ya pagó y cuánto entra cada mes." />
      ) : (
        <>
          <div className="stats">
            <Stat label="Fijo al mes" value={money(totals.fixed)} note={`${totals.clients} ${totals.clients === 1 ? 'cliente' : 'clientes'}`} />
            <Stat label="Ya cobrado" value={money(totals.collected)} tone="pos" note={`${totals.paidClients} de ${totals.clients} pagaron`} />
            <Stat label="Falta" value={money(totals.pending)} tone={totals.late > 0 ? 'neg' : undefined} note={totals.late > 0 ? `y ${money(totals.late)} de meses anteriores` : 'Todo al día'} />
          </div>
          <div className="meter mt-4" style={{ ['--meter' as string]: 'var(--pos)' }} role="img" aria-label={`${pct}% del mes cobrado`}><i style={{ width: `${pct}%` }} /></div>

          <Group title="Clientes del mes" footer="Toca «Cobrado» cuando te paguen: se anota el ingreso, sube tu cuenta y se aparta tu ahorro si lo tienes activado.">
            {rows.map((r) => {
              const s = STATE[r.state]
              const late = r.lateMonths.length
              return (
                <Row key={r.project.id} tone={s.tone} title={r.project.title}
                  sub={<>{[r.project.client, r.project.billing_day ? `cobra el ${r.project.billing_day}` : null].filter(Boolean).join(' · ')}{(r.project.client || r.project.billing_day) && ' · '}<span style={{ color: s.tone }}>{r.state === 'paid' && r.paidAt ? `Pagó el ${new Date(r.paidAt + 'T12:00:00').toLocaleDateString('es', { day: 'numeric', month: 'short' })}` : s.text}</span>{late > 0 && <span style={{ color: 'var(--aviso-texto)' }}> · debe {late} {late === 1 ? 'mes' : 'meses'} antes</span>}{r.setupDue > 0 && <span style={{ color: 'var(--aviso-texto)' }}> · falta instalación</span>}</>}
                  value={money(r.fee)}
                  trailing={r.owed > 0 ? <button type="button" className="btn btn-primary !min-h-11 !px-4" onClick={() => open(r)}><CalendarCheck size={16} aria-hidden /> Cobrado</button> : undefined}
                  to={r.owed > 0 ? undefined : `/app/trabajo?abrir=${r.project.id}`} />
              )
            })}
          </Group>

          <Group title="Lo que vendrá" footer="Si todos siguen pagando. Una mensualidad que termina se quita sola.">
            {next.map((m) => (
              <Row key={m.month} tone="var(--accent)" title={cap(monthLabel(m.month))} sub={`${m.clients} ${m.clients === 1 ? 'cliente' : 'clientes'}`} value={money(m.fixed)} chevron={false}>
                <div className="meter mx-4 mb-3 -mt-1" style={{ ['--meter' as string]: 'var(--accent)' }}><i style={{ width: `${(m.fixed / peak) * 100}%` }} /></div>
              </Row>
            ))}
          </Group>
          <p className="mt-4 text-sm" style={{ color: 'var(--ink-soft)' }}>¿Un cliente no aparece? Ábrelo en <Link to="/app/trabajo" className="underline" style={{ color: 'var(--accent)' }}>Trabajo</Link> y ponle su mensualidad.</p>
        </>
      )}

      <Cobrado row={row} month={month} addPayment={work.addPayment} onClose={() => setRow(null)} onDone={setMsg} />
    </div>
  )
}
