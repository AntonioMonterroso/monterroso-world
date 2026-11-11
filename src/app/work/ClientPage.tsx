import { ChevronLeft, ExternalLink, KeyRound, Loader2, MessageCircle, Plus } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import Cobrado from '../../components/Cobrado'
import RegistrarPago from '../../components/RegistrarPago'
import NewWork from './NewWork'
import { Group, PageHeader, Row } from '../../components/ui'
import type { Account } from '../../lib/accounts'
import { clientKey, clientName } from '../../lib/clients'
import type { Delivery } from '../../lib/deliveries'
import { monthlyClients, type ClientRow } from '../../lib/incoming'
import { currentMonth, monthLabel, money, statusMeta, useProjects, workKindLabel, type WorkTx } from '../../lib/projects'
import { useTable } from '../../lib/table'
import { reminderText, useClientExtra, waNumber } from '../../lib/clientNotes'
import { localISO } from '../../lib/time'
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
  const [paying, setPaying] = useState(false)
  const [creating, setCreating] = useState(false)
  const [sp, setSp] = useSearchParams()
  const k = decodeURIComponent(key)
  const extra = useClientExtra(k)
  const [phoneDraft, setPhoneDraft] = useState<string | null>(null)
  const [note, setNote] = useState('')
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
  useEffect(() => { const id = sp.get('abrir'); if (id && db.projects.some((x) => x.id === id)) { setEditing(id); setSp({}, { replace: true }) } }, [sp, db.projects, setSp])
  const remind = (r: ClientRow) => {
    const when = r.lateMonths[0] ?? month
    const concept = r.setupDue && !r.fee ? 'la instalación' : `la mensualidad de ${monthLabel(when)}`
    return `https://wa.me/${waNumber(extra.phone)}?text=${encodeURIComponent(reminderText({ name, concept, amount: money(r.setupDue && !r.fee ? r.setupDue : r.fee) }))}`
  }

  if (db.loading) return <div className="grid h-48 place-items-center"><Loader2 className="animate-spin" aria-label="Cargando" /></div>
  if (!mine.length) return (
    <div><Link to="/app/trabajo" className="mb-3 inline-flex min-h-11 items-center gap-1 text-sm" style={{ color: 'var(--ink-soft)' }}><ChevronLeft size={16} aria-hidden /> Clientes</Link><p className="mt-4">No encontré a este cliente. Quizá le cambiaste el nombre.</p></div>
  )

  return (
    <div>
      <Link to="/app/trabajo" className="mb-3 inline-flex min-h-11 items-center gap-1 text-sm" style={{ color: 'var(--ink-soft)' }}><ChevronLeft size={16} aria-hidden /> Clientes</Link>
      <PageHeader eyebrow="Cliente" title={name} action={<span className="flex flex-wrap gap-2">{extra.phone && <a className="btn btn-sec" href={`https://wa.me/${waNumber(extra.phone)}`} target="_blank" rel="noreferrer"><MessageCircle size={16} aria-hidden /> WhatsApp</a>}<button className="btn btn-primary" onClick={() => { setMsg(''); setPaying(true) }}><Plus size={16} aria-hidden /> Registrar pago</button></span>} />
      {msg && <p role="status" className="mb-4 rounded-xl px-4 py-3 text-sm" style={{ background: 'var(--personal-suave)', color: 'var(--personal-texto)' }}>{msg}</p>}

      <Group title={`Este mes · ${cap(monthLabel(month))}`}>
        {rows.length === 0 ? <Row title="Sin cobro este mes" sub="Pon una mensualidad en el acuerdo de cobro de su trabajo." chevron={false} /> : rows.map((r) => (
          <Row key={r.project.id} tone={r.owed > 0 ? 'var(--aviso)' : 'var(--pos)'} title={r.project.title} chevron={false}
            sub={r.owed > 0 ? `${r.state === 'late' || r.lateMonths.length ? 'Atrasado' : 'Por cobrar'} · debe ${money(r.owed)}` : 'Pagado este mes'} value={money(r.fee)}
            trailing={r.owed > 0 ? <span className="flex items-center gap-1">{extra.phone && <a className="btn btn-sec btn-chico" href={remind(r)} target="_blank" rel="noreferrer" aria-label="Recordar el pago por WhatsApp"><MessageCircle size={15} aria-hidden /> Recordar</a>}<button className="btn btn-primary !min-h-11 !px-4" onClick={() => { setMsg(''); setRow(r) }}>Cobrado</button></span> : undefined} />
        ))}
      </Group>

      <Group title="Trabajos" aside={<button className="btn btn-sec btn-chico" onClick={() => setCreating(true)}><Plus size={15} aria-hidden /> Agregar trabajo</button>} footer="Abre uno para cambiar su estado, entrega, monto, sitio, checklist, notas y su acuerdo de cobro.">
        {mine.map((p) => (
          <Row key={p.id} tone={statusMeta(p.status).color} title={p.title} onClick={() => setEditing(p.id)}
            sub={[statusMeta(p.status).label, p.due_date && `entrega ${p.due_date}`, Number(p.monthly_fee ?? 0) > 0 && `${money(Number(p.monthly_fee))} al mes · día ${p.billing_day ?? '—'}`, Number(p.setup_fee ?? 0) > 0 && `instalación ${money(Number(p.setup_fee))}`].filter(Boolean).join(' · ')}
            value={p.amount > 0 ? money(p.amount) : undefined} />
        ))}
        {mine.some((p) => p.site_url) && mine.filter((p) => p.site_url).map((p) => <Row key={`s-${p.id}`} icon={<ExternalLink size={16} aria-hidden />} title="Ver sitio" sub={p.site_url ?? ''} chevron={false} onClick={() => window.open(p.site_url!, '_blank', 'noopener')} />)}
      </Group>

      <Group title="Pagos recibidos" aside={<button className="btn btn-sec btn-chico" onClick={() => { setMsg(''); setPaying(true) }}><Plus size={15} aria-hidden /> Registrar pago</button>} footer="Cada pago queda también en Dinero › Movimientos. Toca uno para corregirlo o borrarlo desde su trabajo.">
        {history.length === 0 ? <Row title="Aún no hay pagos" sub="Toca Registrar para anotar uno" chevron={false} /> : history.slice(0, 12).map((h) => {
          const w = { project_id: h.project_id, title: mine.find((p) => p.id === h.project_id)?.title ?? '', kind: h.kind ?? 'other', period: h.period ?? null } as WorkTx['work']
          return <Row key={h.id} onClick={() => setEditing(h.project_id)} tone="var(--pos)" title={workKindLabel(w)} sub={`${new Date((h.paid_at as string) + 'T12:00:00').toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' })}${acct(h.account_id) ? ` · ${acct(h.account_id)}` : ''}`} value={money(h.amount)} trailing={<Link to={`/app/trabajo/recibo/${h.id}`} className="btn btn-sec btn-chico">Recibo</Link>} />
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

      <Group title="Contacto" footer="El número es solo para ti: no aparece en ninguna página pública.">
        {phoneDraft === null ? <Row title={extra.phone || 'Agregar WhatsApp'} sub={extra.phone ? 'Toca para cambiarlo' : 'Para escribirle con un toque'} onClick={() => setPhoneDraft(extra.phone)} /> : (
          <li className="row"><form className="row-hit" onSubmit={(e) => { e.preventDefault(); extra.setPhone(phoneDraft); setPhoneDraft(null) }}>
            <input className="row-input" inputMode="tel" value={phoneDraft} onChange={(e) => setPhoneDraft(e.target.value)} placeholder="3764 5139" aria-label="WhatsApp del cliente" autoFocus />
            <button className="btn btn-sec btn-chico">Guardar</button></form></li>
        )}
      </Group>

      <Group title="Bitácora" footer="Notas con fecha de lo que hiciste o acordaste con este cliente.">
        <li className="row"><form className="row-hit" onSubmit={(e) => { e.preventDefault(); if (note.trim()) { extra.addLog(note, localISO()); setNote('') } }}>
          <input className="row-input" value={note} maxLength={300} onChange={(e) => setNote(e.target.value)} placeholder="Qué hiciste hoy…" aria-label="Nueva nota de bitácora" />
          {note.trim() && <button className="btn btn-sec btn-chico">Anotar</button>}</form></li>
        {extra.log.map((l) => <Row key={l.id} title={<span className="whitespace-normal break-words">{l.text}</span>} sub={new Date(l.date + 'T12:00:00').toLocaleDateString('es', { day: 'numeric', month: 'long', year: 'numeric' })} chevron={false} trailing={<button className="min-h-11 px-3 text-sm underline" style={{ color: 'var(--ink-soft)' }} onClick={() => extra.removeLog(l.id)}>Quitar</button>} />)}
      </Group>

      <Group title="Accesos" footer="Las contraseñas viven en la Bóveda; aquí nunca se muestran.">
        <Row to="/app/boveda" icon={<KeyRound size={16} aria-hidden />} title="Abrir la Bóveda" sub="Busca los accesos de este cliente" />
      </Group>

      <NewWork open={creating} month={month} client={name} add={(v) => db.add(v) as Promise<never>} onClose={() => setCreating(false)} onCreated={(p) => { setCreating(false); setEditing(p.id) }} />
      <RegistrarPago open={paying} projects={mine} payments={db.payments} addPayment={db.addPayment} onClose={() => setPaying(false)} onDone={setMsg} />
      <Cobrado row={row} addPayment={db.addPayment} onClose={() => setRow(null)} onDone={setMsg} />
      <ProjectEditor project={editingProject} payments={db.payments} onClose={() => setEditing(null)}
        onSave={async (id, patch) => { await saveProject(db, id, patch); setEditing(null) }}
        onDelete={(id) => { removeProject(db, id); setEditing(null); if (mine.length <= 1) nav('/app/trabajo') }}
        onAddPayment={db.addPayment} onUpdatePayment={db.updatePayment} onRemovePayment={db.removePayment} />
    </div>
  )
}
