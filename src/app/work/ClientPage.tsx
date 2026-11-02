import { ChevronLeft, ExternalLink, KeyRound, Loader2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import Cobrado from '../../components/Cobrado'
import { Group, PageHeader, Row } from '../../components/ui'
import type { Account } from '../../lib/accounts'
import { clientKey, clientName } from '../../lib/clients'
import type { Delivery } from '../../lib/deliveries'
import { monthlyClients, type ClientRow } from '../../lib/incoming'
import { currentMonth, monthLabel, money, statusMeta, useProjects, workKindLabel, type WorkTx } from '../../lib/projects'
import { useTable } from '../../lib/table'
import ProjectEditor from './ProjectEditor'
import { removeProject, saveProject } from './saveProject'

type Quote = { id: string; title: string; client_name: string; status: string }
const QSTATE: Record<string, string> = { draft: 'Borrador', sent: 'Enviada', accepted: 'Aceptada', rejected: 'Rechazada' }
const cap = (t: string) => t.charAt(0).toUpperCase() + t.slice(1)

/** Ficha del cliente: todo lo de una persona en una pantalla. El acuerdo se edita aquí; los pagos se leen de Dinero. */
export default function ClientPage() {
  const { key = '' } = useParams()
  const nav = useNavigate()
  const db = useProjects()
  const quotes = useTable<Quote>('quotes', { col: 'created_at', asc: false })
  const deliveries = useTable<Delivery>('deliveries', { col: 'created_at', asc: false })
  const accounts = useTable<Account>('fin_accounts', { col: 'position', asc: true })
  const [editing, setEditing] = useState<string | null>(null)
  const [row, setRow] = useState<ClientRow | null>(null)
  const [msg, setMsg] = useState('')
  const k = decodeURIComponent(key)
  const mine = useMemo(() => db.projects.filter((p) => clientKey(clientName(p)) === k), [db.projects, k])
  const name = mine[0] ? clientName(mine[0]) : ''
  const month = currentMonth()
  const rows = useMemo(() => monthlyClients(mine, db.payments, month), [mine, db.payments, month])
  const ids = new Set(mine.map((p) => p.id))
  const history = db.payments.filter((p) => p.paid_at && ids.has(p.project_id)).sort((a, b) => (b.paid_at ?? '').localeCompare(a.paid_at ?? ''))
  const myQuotes = quotes.rows.filter((q) => clientKey(q.client_name ?? '') === k)
  const myDeliv = deliveries.rows.filter((d) => d.recipient && clientKey(d.recipient) === k)
  const acct = (id?: string | null) => accounts.rows.find((a) => a.id === id)?.name
  const editingProject = db.projects.find((x) => x.id === editing) ?? null

  if (db.loading) return <div className="grid h-48 place-items-center"><Loader2 className="animate-spin" aria-label="Cargando" /></div>
  if (!mine.length) return (
    <div><Link to="/app/trabajo" className="mb-3 inline-flex min-h-11 items-center gap-1 text-sm" style={{ color: 'var(--ink-soft)' }}><ChevronLeft size={16} aria-hidden /> Clientes</Link><p className="mt-4">No encontré a este cliente. Quizá le cambiaste el nombre.</p></div>
  )

  return (
    <div>
      <Link to="/app/trabajo" className="mb-3 inline-flex min-h-11 items-center gap-1 text-sm" style={{ color: 'var(--ink-soft)' }}><ChevronLeft size={16} aria-hidden /> Clientes</Link>
      <PageHeader eyebrow="Cliente" title={name} />
      {msg && <p role="status" className="mb-4 rounded-xl px-4 py-3 text-sm" style={{ background: 'var(--personal-suave)', color: 'var(--personal-texto)' }}>{msg}</p>}

      <Group title={`Este mes · ${cap(monthLabel(month))}`}>
        {rows.length === 0 ? <Row title="Sin cobro este mes" sub="Pon una mensualidad en el acuerdo de cobro de su trabajo." chevron={false} /> : rows.map((r) => (
          <Row key={r.project.id} tone={r.owed > 0 ? 'var(--aviso)' : 'var(--pos)'} title={r.project.title} chevron={false}
            sub={r.owed > 0 ? `${r.state === 'late' || r.lateMonths.length ? 'Atrasado' : 'Por cobrar'} · debe ${money(r.owed)}` : 'Pagado este mes'} value={money(r.fee)}
            trailing={r.owed > 0 ? <button className="btn btn-primary !min-h-11 !px-4" onClick={() => { setMsg(''); setRow(r) }}>Cobrado</button> : undefined} />
        ))}
      </Group>

      <Group title="Trabajos" aside={<span>{mine.length}</span>} footer="Abre uno para cambiar su estado, entrega, monto, sitio, checklist, notas y su acuerdo de cobro.">
        {mine.map((p) => (
          <Row key={p.id} tone={statusMeta(p.status).color} title={p.title} onClick={() => setEditing(p.id)}
            sub={[statusMeta(p.status).label, p.due_date && `entrega ${p.due_date}`, Number(p.monthly_fee ?? 0) > 0 && `${money(Number(p.monthly_fee))} al mes · día ${p.billing_day ?? '—'}`, Number(p.setup_fee ?? 0) > 0 && `instalación ${money(Number(p.setup_fee))}`].filter(Boolean).join(' · ')}
            value={p.amount > 0 ? money(p.amount) : undefined} />
        ))}
        {mine.some((p) => p.site_url) && mine.filter((p) => p.site_url).map((p) => <Row key={`s-${p.id}`} icon={<ExternalLink size={16} aria-hidden />} title="Ver sitio" sub={p.site_url ?? ''} chevron={false} onClick={() => window.open(p.site_url!, '_blank', 'noopener')} />)}
      </Group>

      <Group title="Historial de pagos" footer="Se lee de Dinero; para cambiar un pago, ábrelo en Movimientos.">
        {history.length === 0 ? <Row title="Aún no hay pagos" chevron={false} /> : history.slice(0, 12).map((h) => {
          const w = { project_id: h.project_id, title: mine.find((p) => p.id === h.project_id)?.title ?? '', kind: h.kind ?? 'other', period: h.period ?? null } as WorkTx['work']
          return <Row key={h.id} to="/app/dinero/movimientos" tone="var(--pos)" title={workKindLabel(w)} sub={`${new Date((h.paid_at as string) + 'T12:00:00').toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' })}${acct(h.account_id) ? ` · ${acct(h.account_id)}` : ''}`} value={money(h.amount)} />
        })}
      </Group>

      <Group title="Propuestas y envíos">
        {myQuotes.length === 0 && myDeliv.length === 0 ? <Row title="Nada todavía" sub="Las propuestas y envíos con su nombre aparecen aquí." chevron={false} /> : (
          <>
            {myQuotes.map((q) => <Row key={q.id} to="/app/trabajo/propuestas" tone="var(--web)" title={q.title} sub={`Propuesta · ${QSTATE[q.status] ?? q.status}`} />)}
            {myDeliv.map((d) => <Row key={d.id} to="/app/envios" title={d.title} sub="Envío" />)}
          </>
        )}
      </Group>

      <Group title="Accesos" footer="Las contraseñas viven en la Bóveda; aquí nunca se muestran.">
        <Row to="/app/boveda" icon={<KeyRound size={16} aria-hidden />} title="Abrir la Bóveda" sub="Busca los accesos de este cliente" />
      </Group>

      <Cobrado row={row} addPayment={db.addPayment} onClose={() => setRow(null)} onDone={setMsg} />
      <ProjectEditor project={editingProject} payments={db.payments} onClose={() => setEditing(null)}
        onSave={async (id, patch) => { await saveProject(db, id, patch); setEditing(null) }}
        onDelete={(id) => { removeProject(db, id); setEditing(null); if (mine.length <= 1) nav('/app/trabajo') }}
        onAddPayment={db.addPayment} onUpdatePayment={db.updatePayment} onRemovePayment={db.removePayment} />
    </div>
  )
}
