import { Loader2, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import Sheet from '../../components/Sheet'
import type { Goal } from '../../lib/finance'
import { money } from '../../lib/projects'
import { useTable } from '../../lib/table'
import { CurrencySelect, Empty, ErrorBar, defaultCurrency, toNum } from './shared'

export default function Goals() {
  const db = useTable<Goal>('savings_goals', { col: 'created_at', asc: true })
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [target, setTarget] = useState('')
  const [cur, setCur] = useState(defaultCurrency())
  const [due, setDue] = useState('')
  const [err, setErr] = useState('')
  const [add, setAdd] = useState<Record<string, string>>({})
  const [confirm, setConfirm] = useState<string | null>(null)

  const create = async (e: React.FormEvent) => {
    e.preventDefault()
    const t = toNum(target)
    if (!title.trim() || !(t > 0)) return setErr('Ponle nombre y una meta mayor a cero.')
    await db.add({ title: title.trim(), target: t, saved: 0, currency: cur, due_date: due || null })
    setOpen(false); setTitle(''); setTarget(''); setDue(''); setErr('')
  }
  const contribute = (g: Goal, sign: 1 | -1) => {
    const n = toNum(add[g.id] ?? '')
    if (!(n > 0)) return
    db.update(g.id, { saved: Math.max(0, Math.round((g.saved + sign * n) * 100) / 100) })
    setAdd({ ...add, [g.id]: '' })
  }

  return (
    <div>
      <div className="flex items-end justify-between gap-3">
        <div><p className="eyebrow">Dinero</p><h1 className="mt-2 font-display text-4xl">Metas de ahorro</h1></div>
        <button className="btn btn-primary" onClick={() => setOpen(true)}><Plus size={18} aria-hidden /> Meta</button>
      </div>
      <ErrorBar msg={db.error} onClose={db.clearError} />
      {db.loading ? <div className="grid h-48 place-items-center"><Loader2 className="animate-spin" aria-label="Cargando" /></div> : db.rows.length === 0 ? (
        <Empty title="¿Para qué estás ahorrando?" text="Un instrumento, una laptop, un viaje. Pon el monto y ve sumando aportes." action="Crear una meta" onAction={() => setOpen(true)} />
      ) : (
        <ul className="mt-6 grid gap-3">
          {db.rows.map((g) => {
            const pct = Math.min(100, Math.round((g.saved / g.target) * 100))
            return (
              <li key={g.id} className="rounded-xl border p-4" style={{ background: 'var(--surface)', borderColor: 'var(--line-soft)' }}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0"><p className="truncate font-semibold">{g.title}</p><p className="text-xs" style={{ color: 'var(--ink-faint)' }}>{g.due_date ? `Para el ${g.due_date}` : 'Sin fecha límite'}</p></div>
                  <p className="shrink-0 text-right text-sm"><span className="font-semibold" style={{ color: pct >= 100 ? '#8fd1a4' : 'var(--ink)' }}>{money(g.saved, g.currency)}</span><span style={{ color: 'var(--ink-faint)' }}> / {money(g.target, g.currency)}</span></p>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full" style={{ background: 'var(--surface-2)' }} role="img" aria-label={`${pct}% ahorrado`}><div className="h-full rounded-full" style={{ width: `${pct}%`, background: pct >= 100 ? '#8fd1a4' : 'var(--music)', transition: 'width 400ms var(--ease-out)' }} /></div>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <input className="field !w-28" inputMode="decimal" placeholder="Monto" aria-label={`Monto para ${g.title}`} value={add[g.id] ?? ''} onChange={(e) => setAdd({ ...add, [g.id]: e.target.value })} />
                  <button className="btn btn-primary" onClick={() => contribute(g, 1)}>Aportar</button>
                  <button className="btn btn-ghost" onClick={() => contribute(g, -1)}>Retirar</button>
                  <button className="btn btn-ghost ml-auto" style={{ color: confirm === g.id ? '#e8a393' : undefined }} onClick={() => (confirm === g.id ? db.remove(g.id) : setConfirm(g.id))} aria-label={`Eliminar ${g.title}`}><Trash2 size={16} aria-hidden />{confirm === g.id && ' ¿Seguro?'}</button>
                </div>
              </li>
            )
          })}
        </ul>
      )}
      <Sheet open={open} title="Nueva meta" onClose={() => setOpen(false)}>
        <form className="grid gap-4" onSubmit={create}>
          <label className="grid gap-2 text-sm">¿Qué quieres lograr?<input className="field" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} placeholder="Pedal de guitarra" /></label>
          <div className="grid grid-cols-2 gap-3">
            <label className="grid gap-2 text-sm">Meta<input className="field" inputMode="decimal" value={target} onChange={(e) => setTarget(e.target.value)} placeholder="0.00" /></label>
            <CurrencySelect value={cur} onChange={setCur} />
          </div>
          <label className="grid gap-2 text-sm">Fecha límite (opcional)<input type="date" className="field" value={due} onChange={(e) => setDue(e.target.value)} /></label>
          {err && <p role="alert" className="text-sm" style={{ color: '#e8a393' }}>{err}</p>}
          <button className="btn btn-primary w-fit">Crear</button>
        </form>
      </Sheet>
    </div>
  )
}
