import type { Account, GoalMove } from '../../lib/accounts'
import { AccountPick, lastAccount, rememberAccount } from './AccountPick'
import { localISO } from '../../lib/time'
import { Loader2, Pencil, Plus, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import Sheet from '../../components/Sheet'
import { PageHeader } from '../../components/ui'
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
  const accountsDb = useTable<Account>('fin_accounts', { col: 'position', asc: true })
  const moves = useTable<GoalMove & { id: string; goal_id: string; tx_date: string }>('fin_goal_moves', { col: 'tx_date', asc: false })
  const accounts = accountsDb.rows.filter((a) => !a.archived)
  const [acct, setAcct] = useState(lastAccount())
  const [note, setNote] = useState('')
  const [edit, setEdit] = useState<{ id: string; title: string; target: string; due: string } | null>(null)
  const [editErr, setEditErr] = useState('')
  const [sp, setSp] = useSearchParams()

  const startEdit = (g: Goal) => { setEditErr(''); setEdit({ id: g.id, title: g.title, target: String(g.target), due: g.due_date ?? '' }) }
  // Viene de Hoy: «Cambiar fecha»
  useEffect(() => {
    const id = sp.get('editar')
    if (!id || db.loading) return
    const g = db.rows.find((x) => x.id === id)
    if (g) startEdit(g)
    setSp({}, { replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sp, db.loading, db.rows, setSp])

  const saveEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!edit) return
    const t = toNum(edit.target)
    if (!edit.title.trim() || !(t > 0)) return setEditErr('Ponle nombre y una meta mayor a cero.')
    await db.update(edit.id, { title: edit.title.trim(), target: t, due_date: edit.due || null })
    setEdit(null)
  }

  const create = async (e: React.FormEvent) => {
    e.preventDefault()
    const t = toNum(target)
    if (!title.trim() || !(t > 0)) return setErr('Ponle nombre y una meta mayor a cero.')
    await db.add({ title: title.trim(), target: t, saved: 0, currency: cur, due_date: due || null })
    setOpen(false); setTitle(''); setTarget(''); setDue(''); setErr('')
  }
  const contribute = async (g: Goal, sign: 1 | -1) => {
    const n = toNum(add[g.id] ?? '')
    if (!(n > 0)) return
    const real = sign === -1 ? Math.min(n, g.saved) : n   // no se retira más de lo ahorrado
    if (!(real > 0)) return
    await db.update(g.id, { saved: Math.max(0, Math.round((g.saved + sign * real) * 100) / 100) })
    const a = accounts.find((x) => x.id === acct)
    if (a) {
      await moves.add({ goal_id: g.id, account_id: a.id, amount: sign * real, tx_date: localISO() })
      rememberAccount(a.id)
      setNote(sign === 1 ? `${money(real)} salieron de ${a.name} y quedaron apartados para “${g.title}”.` : `${money(real)} regresaron a ${a.name}.`)
      setTimeout(() => setNote(''), 4500)
    }
    setAdd({ ...add, [g.id]: '' })
  }

  return (
    <div>
      <PageHeader eyebrow="Dinero" title="Metas de ahorro" action={<button className="btn btn-primary" onClick={() => setOpen(true)}><Plus size={18} aria-hidden /> Meta</button>} />
      <ErrorBar msg={db.error} onClose={db.clearError} />
      {accounts.length > 0 && db.rows.length > 0 && <div className="mt-4"><AccountPick accounts={accounts} value={acct} onChange={setAcct} label="Aportar desde / retirar a" none="Sin cuenta" /></div>}
      {note && <p role="status" className="mt-3 text-sm" style={{ color: 'var(--pos)' }}>{note}</p>}
      {db.loading ? <div className="grid h-48 place-items-center"><Loader2 className="animate-spin" aria-label="Cargando" /></div> : db.rows.length === 0 ? (
        <Empty title="¿Para qué estás ahorrando?" text="Un instrumento, una laptop, un viaje. Pon el monto y ve sumando aportes." action="Crear una meta" onAction={() => setOpen(true)} />
      ) : (
        <ul className="group-list mt-6">
          {db.rows.map((g) => {
            const pct = Math.min(100, Math.round((g.saved / g.target) * 100))
            return (
              <li key={g.id} className="row p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0"><p className="truncate font-semibold">{g.title}</p><button className="inline-flex min-h-9 items-center gap-1 text-xs underline" style={{ color: g.due_date && g.due_date < new Date().toISOString().slice(0, 10) && pct < 100 ? 'var(--neg)' : 'var(--ink-faint)' }} onClick={() => startEdit(g)}>{g.due_date ? `Para el ${g.due_date}` : 'Sin fecha límite'} · {g.due_date ? 'cambiar' : 'poner fecha'}</button></div>
                  <p className="shrink-0 text-right text-sm"><span className="font-semibold" style={{ color: pct >= 100 ? 'var(--pos)' : 'var(--ink)' }}>{money(g.saved, g.currency)}</span><span style={{ color: 'var(--ink-faint)' }}> / {money(g.target, g.currency)}</span></p>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full" style={{ background: 'var(--surface-2)' }} role="img" aria-label={`${pct}% ahorrado`}><div className="h-full rounded-full" style={{ width: `${pct}%`, background: pct >= 100 ? 'var(--pos)' : 'var(--music)', transition: 'width 400ms var(--ease-out)' }} /></div>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <input className="field !w-28" inputMode="decimal" placeholder="Monto" aria-label={`Monto para ${g.title}`} value={add[g.id] ?? ''} onChange={(e) => setAdd({ ...add, [g.id]: e.target.value })} />
                  <button className="btn btn-primary" onClick={() => contribute(g, 1)}>Aportar</button>
                  <button className="btn btn-ghost" onClick={() => contribute(g, -1)}>Retirar</button>
                  <button className="btn btn-ghost ml-auto" onClick={() => startEdit(g)} aria-label={`Editar ${g.title}`}><Pencil size={16} aria-hidden /></button>
                  <button className="btn btn-ghost" style={{ color: confirm === g.id ? 'var(--neg)' : undefined }} onClick={() => (confirm === g.id ? db.remove(g.id) : setConfirm(g.id))} aria-label={`Eliminar ${g.title}`}><Trash2 size={16} aria-hidden />{confirm === g.id && ' ¿Seguro?'}</button>
                </div>
              </li>
            )
          })}
        </ul>
      )}
      <Sheet open={Boolean(edit)} title="Editar meta" onClose={() => setEdit(null)}>
        {edit && (
          <form className="grid gap-4" onSubmit={saveEdit}>
            <label className="grid gap-2 text-sm">Nombre<input className="field" value={edit.title} onChange={(e) => setEdit({ ...edit, title: e.target.value })} maxLength={200} /></label>
            <label className="grid gap-2 text-sm">Meta<input className="field" inputMode="decimal" value={edit.target} onChange={(e) => setEdit({ ...edit, target: e.target.value })} /></label>
            <label className="grid gap-2 text-sm">Fecha límite
              <div className="flex gap-2">
                <input type="date" className="field" value={edit.due} onChange={(e) => setEdit({ ...edit, due: e.target.value })} />
                {edit.due && <button type="button" className="btn btn-ghost shrink-0" onClick={() => setEdit({ ...edit, due: '' })}>Quitar</button>}
              </div>
            </label>
            {editErr && <p role="alert" className="text-sm" style={{ color: 'var(--neg)' }}>{editErr}</p>}
            <button className="btn btn-primary w-fit">Guardar</button>
          </form>
        )}
      </Sheet>
      <Sheet open={open} title="Nueva meta" onClose={() => setOpen(false)}>
        <form className="grid gap-4" onSubmit={create}>
          <label className="grid gap-2 text-sm">¿Qué quieres lograr?<input className="field" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} placeholder="Pedal de guitarra" /></label>
          <div className="grid grid-cols-2 gap-3">
            <label className="grid gap-2 text-sm">Meta<input className="field" inputMode="decimal" value={target} onChange={(e) => setTarget(e.target.value)} placeholder="0.00" /></label>
            <CurrencySelect value={cur} onChange={setCur} />
          </div>
          <label className="grid gap-2 text-sm">Fecha límite (opcional)<input type="date" className="field" value={due} onChange={(e) => setDue(e.target.value)} /></label>
          {err && <p role="alert" className="text-sm" style={{ color: 'var(--neg)' }}>{err}</p>}
          <button className="btn btn-primary w-fit">Crear</button>
        </form>
      </Sheet>
    </div>
  )
}
