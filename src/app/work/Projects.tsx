import { ChevronLeft, ChevronRight, Loader2, Plus } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { STATUSES, currentMonth, money, monthLabel, receivedOf, shiftMonth, statusMeta, summarize, useProjects, type Payment, type Project, type Status } from '../../lib/projects'
import { dayNum } from '../../lib/recur'
import { localISO } from '../../lib/time'
import ProjectEditor from './ProjectEditor'

function ProjectCard({ p, payments, onOpen, onAdvance }: { p: Project; payments: Payment[]; onOpen: () => void; onAdvance: () => void }) {
  const got = receivedOf(p, payments)
  const pct = p.amount > 0 ? Math.min(100, Math.round((got / p.amount) * 100)) : 0
  const s = statusMeta(p.status)
  const done = p.checklist.filter((c) => c.done).length
  const late = p.due_date && p.status !== 'closed' && p.status !== 'delivered' ? dayNum(localISO()) - dayNum(p.due_date) : 0
  const next = STATUSES[STATUSES.findIndex((x) => x.id === p.status) + 1]
  return (
    <li className="rounded-xl border" style={{ background: 'var(--surface)', borderColor: 'var(--line-soft)' }}>
      <button onClick={onOpen} className="block w-full px-4 pt-3 pb-2 text-left">
        <span className="flex items-start justify-between gap-3">
          <span className="min-w-0">
            <span className="block truncate font-semibold">{p.title}</span>
            <span className="block truncate text-sm" style={{ color: 'var(--ink-soft)' }}>{[p.client, p.due_date && `entrega ${p.due_date}`].filter(Boolean).join(' · ') || 'Sin cliente'}</span>
          </span>
          {p.amount > 0 && <span className="shrink-0 text-right text-sm font-semibold">{money(p.amount, p.currency)}</span>}
        </span>
        {late > 0 && <span className="mt-2 inline-block rounded-full px-2 py-0.5 text-xs" style={{ background: 'color-mix(in oklab, #e8a393 18%, transparent)', color: '#e8a393' }}>Pasó la fecha hace {late} {late === 1 ? 'día' : 'días'}</span>}
        {p.amount > 0 && (
          <span className="mt-3 block">
            <span className="block h-1.5 overflow-hidden rounded-full" style={{ background: 'var(--surface-2)' }} role="img" aria-label={`Cobrado ${pct}%`}>
              <span className="block h-full rounded-full" style={{ width: `${pct}%`, background: '#8fd1a4', transition: 'width 400ms var(--ease-out)' }} />
            </span>
            <span className="mt-1 flex justify-between text-xs" style={{ color: 'var(--ink-faint)' }}>
              <span>Cobrado {money(got, p.currency)}</span>
              <span>Falta {money(Math.max(0, p.amount - got), p.currency)}</span>
            </span>
          </span>
        )}
      </button>
      <div className="flex items-center justify-between px-4 pb-2 text-xs" style={{ color: 'var(--ink-faint)' }}>
        <span>{p.checklist.length > 0 ? `Pendientes ${done}/${p.checklist.length}` : ''}</span>
        {next && <button onClick={onAdvance} className="inline-flex min-h-11 items-center gap-1 underline" style={{ color: s.color }}>Pasar a {next.label.toLowerCase()} <ChevronRight size={14} aria-hidden /></button>}
      </div>
    </li>
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
    const p = await db.add({ title: 'Nuevo trabajo', client: null, status: 'active', month, due_date: null, amount: 0, currency: 'USD', site_url: null, notes: null, checklist: [] })
    if (p) setEditing(p.id)
  }
  const advance = (p: Project) => {
    const next = STATUSES[STATUSES.findIndex((x) => x.id === p.status) + 1]
    if (next) db.update(p.id, { status: next.id })
  }

  return (
    <div>
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="eyebrow">Trabajo</p>
          <h1 className="mt-2 font-display text-4xl">Trabajos</h1>
        </div>
        <button className="btn btn-primary" onClick={create}><Plus size={18} aria-hidden /> Trabajo</button>
      </div>

      <div className="mt-6 flex items-center gap-2">
        <button className="grid size-11 place-items-center rounded-full border" style={{ borderColor: 'var(--line)' }} onClick={() => setMonth(shiftMonth(month, -1))} aria-label="Mes anterior"><ChevronLeft size={18} aria-hidden /></button>
        <h2 className="min-w-40 text-center font-display text-2xl first-letter:uppercase">{monthLabel(month)}</h2>
        <button className="grid size-11 place-items-center rounded-full border" style={{ borderColor: 'var(--line)' }} onClick={() => setMonth(shiftMonth(month, 1))} aria-label="Mes siguiente"><ChevronRight size={18} aria-hidden /></button>
        {month !== currentMonth() && <button className="min-h-11 px-3 text-sm underline" onClick={() => setMonth(currentMonth())}>Este mes</button>}
      </div>

      {Object.keys(totals).length > 0 && (
        <div className="mt-5 grid gap-3">
          {Object.entries(totals).map(([cur, t]) => (
            <dl key={cur} className="grid grid-cols-3 gap-3 rounded-2xl border p-4" style={{ borderColor: 'var(--line-soft)', background: 'var(--surface)' }}>
              <div><dt className="text-xs" style={{ color: 'var(--ink-faint)' }}>Valor del mes</dt><dd className="mt-1 font-semibold">{money(t.billed, cur)}</dd></div>
              <div><dt className="text-xs" style={{ color: 'var(--ink-faint)' }}>Cobrado</dt><dd className="mt-1 font-semibold" style={{ color: '#8fd1a4' }}>{money(t.received, cur)}</dd></div>
              <div><dt className="text-xs" style={{ color: 'var(--ink-faint)' }}>Por cobrar</dt><dd className="mt-1 font-semibold" style={{ color: 'var(--personal)' }}>{money(t.pending, cur)}</dd></div>
            </dl>
          ))}
        </div>
      )}

      {db.error && <p role="alert" className="mt-3 flex items-center justify-between rounded-xl px-3 py-2 text-sm" style={{ background: 'color-mix(in oklab, #e8a393 15%, transparent)', color: '#e8a393' }}>{db.error} <button className="underline" onClick={db.clearError}>Cerrar</button></p>}

      <div role="group" aria-label="Etapa" className="mt-6 flex gap-2 overflow-x-auto pb-1">
        {([{ id: 'all', label: 'Todos' }, ...STATUSES] as { id: Status | 'all'; label: string }[]).map((s) => {
          const n = s.id === 'all' ? inMonth.length : inMonth.filter((p) => p.status === s.id).length
          return <button key={s.id} aria-pressed={filter === s.id} onClick={() => setFilter(s.id)} className="min-h-11 shrink-0 rounded-full border px-4 text-sm" style={{ borderColor: filter === s.id ? 'var(--accent)' : 'var(--line)', background: filter === s.id ? 'var(--accent)' : 'transparent', color: filter === s.id ? 'var(--bg)' : 'var(--ink-soft)' }}>{s.label} {n > 0 && <span style={{ opacity: 0.7 }}>{n}</span>}</button>
        })}
      </div>

      {db.loading ? (
        <div className="grid h-48 place-items-center"><Loader2 className="animate-spin" aria-label="Cargando" /></div>
      ) : shown.length === 0 ? (
        <div className="mt-8 rounded-2xl border px-6 py-10 text-center" style={{ borderColor: 'var(--line-soft)', background: 'var(--surface)' }}>
          <p className="font-display text-2xl">{inMonth.length ? 'Nada en esta etapa' : 'Sin trabajos este mes'}</p>
          <p className="mx-auto mt-2 max-w-sm text-sm" style={{ color: 'var(--ink-soft)' }}>Agrega un trabajo con su monto y fecha de entrega, y registra cada cobro cuando llegue.</p>
          {!inMonth.length && <button className="btn btn-primary mt-5" onClick={create}>Agregar trabajo</button>}
        </div>
      ) : (
        <div className="mt-6 grid gap-7">
          {STATUSES.filter((s) => shown.some((p) => p.status === s.id)).map((s) => (
            <section key={s.id} aria-label={s.label}>
              <h3 className="mb-3 text-sm font-semibold" style={{ color: s.color }}>{s.label}</h3>
              <ul className="grid gap-2">
                {shown.filter((p) => p.status === s.id).map((p) => <ProjectCard key={p.id} p={p} payments={db.payments} onOpen={() => setEditing(p.id)} onAdvance={() => advance(p)} />)}
              </ul>
            </section>
          ))}
        </div>
      )}

      {carry.length > 0 && (
        <section className="mt-10" aria-label="Meses anteriores">
          <button className="min-h-11 text-sm underline" style={{ color: 'var(--ink-soft)' }} onClick={() => setShowCarry((v) => !v)} aria-expanded={showCarry}>
            {carry.length} {carry.length === 1 ? 'trabajo abierto' : 'trabajos abiertos'} de meses anteriores
          </button>
          {showCarry && <ul className="mt-3 grid gap-2">{carry.map((p) => <ProjectCard key={p.id} p={p} payments={db.payments} onOpen={() => setEditing(p.id)} onAdvance={() => advance(p)} />)}</ul>}
        </section>
      )}

      <ProjectEditor project={editingProject} payments={db.payments} onClose={() => setEditing(null)}
        onSave={async (id, patch) => { await db.update(id, patch); setEditing(null) }}
        onDelete={(id) => { db.remove(id); setEditing(null) }}
        onAddPayment={db.addPayment} onUpdatePayment={db.updatePayment} onRemovePayment={db.removePayment} />
    </div>
  )
}
