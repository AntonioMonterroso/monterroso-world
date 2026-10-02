import { ChevronRight, Loader2, Plus } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { STATUSES, currentMonth, money, receivedOf, statusMeta, summarize, useProjects, type Payment, type Project, type Status } from '../../lib/projects'
import { dayNum } from '../../lib/recur'
import { localISO } from '../../lib/time'
import ProjectEditor from './ProjectEditor'
import { Group, MonthStepper, PageHeader, Row, Segmented, Stat } from '../../components/ui'
import { Empty } from '../money/shared'

function ProjectCard({ p, payments, onOpen, onAdvance }: { p: Project; payments: Payment[]; onOpen: () => void; onAdvance: () => void }) {
  const got = receivedOf(p, payments)
  const pct = p.amount > 0 ? Math.min(100, Math.round((got / p.amount) * 100)) : 0
  const s = statusMeta(p.status)
  const done = p.checklist.filter((c) => c.done).length
  const late = p.due_date && p.status !== 'closed' && p.status !== 'delivered' ? dayNum(localISO()) - dayNum(p.due_date) : 0
  const next = STATUSES[STATUSES.findIndex((x) => x.id === p.status) + 1]
  const sub = [p.client, p.due_date && `entrega ${p.due_date}`, p.checklist.length > 0 && `${done}/${p.checklist.length} pendientes`].filter(Boolean).join(' · ') || 'Sin cliente'
  return (
    <Row tone={s.color} title={p.title} onClick={onOpen}
      sub={<>{sub}{late > 0 && <span style={{ color: 'var(--neg)' }}> · pasó hace {late} {late === 1 ? 'día' : 'días'}</span>}</>}
      value={p.amount > 0 ? money(p.amount, p.currency) : undefined}>
      {p.amount > 0 && (
        <div className="px-4 pb-3 pl-[3.75rem]">
          <div className="meter" style={{ ['--meter' as string]: 'var(--pos)' }} role="img" aria-label={`Cobrado ${pct}%`}><i style={{ width: `${pct}%` }} /></div>
          <p className="mt-1 flex justify-between text-xs" style={{ color: 'var(--ink-faint)' }}><span>Cobrado {money(got, p.currency)}</span><span>Falta {money(Math.max(0, p.amount - got), p.currency)}</span></p>
        </div>
      )}
      {next && <div className="px-4 pb-2 pl-[3.75rem]"><button onClick={onAdvance} className="inline-flex min-h-9 items-center gap-1 text-xs font-semibold" style={{ color: s.color }}>Pasar a {next.label.toLowerCase()} <ChevronRight size={13} aria-hidden /></button></div>}
    </Row>
  )
}

export default function Projects() {
  const db = useProjects()
  const [month, setMonth] = useState(currentMonth())
  const [filter, setFilter] = useState<Status | 'all'>('all')
  const [editing, setEditing] = useState<string | null>(null)
  const [showCarry, setShowCarry] = useState(false)
  const [sp, setSp] = useSearchParams()

  // Viene del buscador: abre ese trabajo en su mes
  useEffect(() => {
    const id = sp.get('abrir')
    if (!id || db.loading) return
    const p = db.projects.find((x) => x.id === id)
    if (p) { setMonth(p.month); setEditing(id) }
    setSp({}, { replace: true })
  }, [sp, db.loading, db.projects, setSp])

  const inMonth = useMemo(() => db.projects.filter((p) => p.month === month), [db.projects, month])
  const carry = useMemo(() => (month === currentMonth() ? db.projects.filter((p) => p.month < month && p.status !== 'closed') : []), [db.projects, month])
  const shown = inMonth.filter((p) => filter === 'all' || p.status === filter)
  const totals = useMemo(() => summarize(inMonth, db.payments), [inMonth, db.payments])
  const editingProject = db.projects.find((p) => p.id === editing) ?? null

  const create = async () => {
    const p = await db.add({ title: 'Nuevo trabajo', client: null, status: 'active', month, due_date: null, amount: 0, currency: 'GTQ', site_url: null, notes: null, checklist: [] })
    if (p) setEditing(p.id)
  }
  const advance = (p: Project) => {
    const next = STATUSES[STATUSES.findIndex((x) => x.id === p.status) + 1]
    if (next) db.update(p.id, { status: next.id })
  }

  return (
    <div>
      <PageHeader eyebrow="Trabajo" title="Trabajos" action={<button className="btn btn-primary" onClick={create}><Plus size={18} aria-hidden /> Nuevo</button>} />
      <MonthStepper month={month} onChange={setMonth} />

      {Object.entries(totals).map(([cur, t]) => (
        <div key={cur} className="stats mb-5">
          <Stat label="Valor del mes" value={money(t.billed, cur)} />
          <Stat label="Cobrado" value={money(t.received, cur)} tone="pos" />
          <Stat label="Por cobrar" value={money(t.pending, cur)} />
        </div>
      ))}

      {db.error && <p role="alert" className="mb-3 flex items-center justify-between rounded-xl px-3 py-2 text-sm" style={{ background: 'color-mix(in oklab, var(--neg) 15%, transparent)', color: 'var(--neg)' }}>{db.error} <button className="underline" onClick={db.clearError}>Cerrar</button></p>}

      <Segmented label="Etapa" value={filter} onChange={setFilter} options={([{ id: 'all', label: 'Todos' }, ...STATUSES] as { id: Status | 'all'; label: string }[]).map((s) => ({ id: s.id, label: s.id === 'all' ? `Todos ${inMonth.length}` : s.label }))} />

      {db.loading ? (
        <div className="grid h-48 place-items-center"><Loader2 className="animate-spin" aria-label="Cargando" /></div>
      ) : shown.length === 0 ? (
        <Empty title={inMonth.length ? 'Nada en esta etapa' : 'Sin trabajos este mes'} text="Agrega un trabajo con su monto y fecha de entrega, y registra cada cobro cuando llegue." action={inMonth.length ? undefined : 'Agregar trabajo'} onAction={create} />
      ) : (
        STATUSES.filter((s) => shown.some((p) => p.status === s.id)).map((s) => (
          <Group key={s.id} title={s.label} aside={shown.filter((p) => p.status === s.id).length}>
            {shown.filter((p) => p.status === s.id).map((p) => <ProjectCard key={p.id} p={p} payments={db.payments} onOpen={() => setEditing(p.id)} onAdvance={() => advance(p)} />)}
          </Group>
        ))
      )}

      {carry.length > 0 && (
        <>
          <button className="mt-6 min-h-11 text-sm underline" style={{ color: 'var(--ink-soft)' }} onClick={() => setShowCarry((v) => !v)} aria-expanded={showCarry}>
            {carry.length} {carry.length === 1 ? 'trabajo abierto' : 'trabajos abiertos'} de meses anteriores
          </button>
          {showCarry && <Group className="!mt-2">{carry.map((p) => <ProjectCard key={p.id} p={p} payments={db.payments} onOpen={() => setEditing(p.id)} onAdvance={() => advance(p)} />)}</Group>}
        </>
      )}

      <ProjectEditor project={editingProject} payments={db.payments} onClose={() => setEditing(null)}
        onSave={async (id, patch) => { await db.update(id, patch); setEditing(null) }}
        onDelete={(id) => { db.remove(id); setEditing(null) }}
        onAddPayment={db.addPayment} onUpdatePayment={db.updatePayment} onRemovePayment={db.removePayment} />
    </div>
  )
}
