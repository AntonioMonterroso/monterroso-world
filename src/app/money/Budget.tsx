import { Loader2, Plus, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import Sheet from '../../components/Sheet'
import { EXPENSE_CATEGORIES, budgetStatus, type Budget as B, type Tx } from '../../lib/finance'
import { currentMonth, money, monthLabel } from '../../lib/projects'
import { useTable } from '../../lib/table'
import { CurrencySelect, Empty, ErrorBar, defaultCurrency, toNum } from './shared'

const color = { ok: '#8fd1a4', warn: 'var(--personal)', over: '#e8a393' }

export default function Budget() {
  const budgets = useTable<B>('fin_budgets', { col: 'category', asc: true })
  const txs = useTable<Tx>('fin_transactions', { col: 'tx_date', asc: false })
  const month = currentMonth()
  const status = useMemo(() => budgetStatus(budgets.rows, txs.rows, month), [budgets.rows, txs.rows, month])
  const [open, setOpen] = useState(false)
  const [cat, setCat] = useState('Comida')
  const [limit, setLimit] = useState('')
  const [cur, setCur] = useState(defaultCurrency())
  const [err, setErr] = useState('')

  const add = async (e: React.FormEvent) => {
    e.preventDefault()
    const n = toNum(limit)
    if (!cat.trim() || !(n > 0)) return setErr('Elige una categoría y un límite mayor a cero.')
    if (budgets.rows.some((b) => b.category === cat.trim() && b.currency === cur)) return setErr('Ya tienes un presupuesto para esa categoría y moneda.')
    await budgets.add({ category: cat.trim(), limit_amount: n, currency: cur })
    setOpen(false); setLimit(''); setErr('')
  }

  return (
    <div>
      <div className="flex items-end justify-between gap-3">
        <div><p className="eyebrow">Dinero</p><h1 className="mt-2 font-display text-4xl">Presupuesto</h1><p className="mt-1 text-sm first-letter:uppercase" style={{ color: 'var(--ink-soft)' }}>{monthLabel(month)}</p></div>
        <button className="btn btn-primary" onClick={() => setOpen(true)}><Plus size={18} aria-hidden /> Límite</button>
      </div>
      <ErrorBar msg={budgets.error || txs.error} />
      {budgets.loading ? <div className="grid h-48 place-items-center"><Loader2 className="animate-spin" aria-label="Cargando" /></div> : status.length === 0 ? (
        <Empty title="Sin límites todavía" text="Ponle un tope mensual a una categoría y te aviso cuando vas por el 80%." action="Poner el primero" onAction={() => setOpen(true)} />
      ) : (
        <ul className="mt-6 grid gap-3">
          {status.map(({ budget: b, spent, pct, state }) => (
            <li key={b.id} className="rounded-xl border p-4" style={{ background: 'var(--surface)', borderColor: 'var(--line-soft)' }}>
              <div className="flex items-center justify-between gap-3">
                <span className="font-semibold">{b.category}</span>
                <span className="text-sm" style={{ color: color[state] }}>{money(spent, b.currency)} de {money(b.limit_amount, b.currency)}</span>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full" style={{ background: 'var(--surface-2)' }} role="img" aria-label={`${pct}% del límite`}>
                <div className="h-full rounded-full" style={{ width: `${Math.min(100, pct)}%`, background: color[state], transition: 'width 400ms var(--ease-out)' }} />
              </div>
              <div className="mt-2 flex items-center justify-between text-xs" style={{ color: 'var(--ink-faint)' }}>
                <span>{state === 'over' ? `Te pasaste ${money(spent - b.limit_amount, b.currency)}` : `Quedan ${money(b.limit_amount - spent, b.currency)}`}</span>
                <button className="grid size-11 place-items-center" onClick={() => budgets.remove(b.id)} aria-label={`Quitar límite de ${b.category}`}><Trash2 size={14} aria-hidden /></button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <Sheet open={open} title="Nuevo límite mensual" onClose={() => setOpen(false)}>
        <form className="grid gap-4" onSubmit={add}>
          <label className="grid gap-2 text-sm">Categoría<input className="field" list="bcats" value={cat} onChange={(e) => setCat(e.target.value)} maxLength={60} /><datalist id="bcats">{EXPENSE_CATEGORIES.map((c) => <option key={c} value={c} />)}</datalist></label>
          <div className="grid grid-cols-2 gap-3">
            <label className="grid gap-2 text-sm">Límite al mes<input className="field" inputMode="decimal" value={limit} onChange={(e) => setLimit(e.target.value)} placeholder="0.00" /></label>
            <CurrencySelect value={cur} onChange={setCur} />
          </div>
          {err && <p role="alert" className="text-sm" style={{ color: '#e8a393' }}>{err}</p>}
          <button className="btn btn-primary w-fit">Guardar</button>
        </form>
      </Sheet>
    </div>
  )
}
