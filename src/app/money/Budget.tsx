import { Loader2, Plus, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import Sheet from '../../components/Sheet'
import { Group, PageHeader, Row } from '../../components/ui'
import { budgetStatus, type Budget as B, type Tx } from '../../lib/finance'
import { useTaxonomy } from '../../lib/taxonomy'
import { CategoryField } from './fields'
import { currentMonth, money, monthLabel } from '../../lib/projects'
import { useTable } from '../../lib/table'
import { CurrencySelect, Empty, ErrorBar, defaultCurrency, toNum } from './shared'

const color = { ok: 'var(--pos)', warn: 'var(--personal)', over: 'var(--neg)' }

export default function Budget() {
  const tax = useTaxonomy()
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
    await tax.ensureCategory('expense', cat)
    await budgets.add({ category: cat.trim(), limit_amount: n, currency: cur })
    setOpen(false); setLimit(''); setErr('')
  }

  return (
    <div>
      <PageHeader eyebrow="Dinero" title="Presupuesto" sub={<span className="first-letter:uppercase">{monthLabel(month)}</span>} action={<button className="btn btn-primary" onClick={() => setOpen(true)}><Plus size={18} aria-hidden /> Límite</button>} />
      <ErrorBar msg={budgets.error || txs.error} />
      {budgets.loading ? <div className="grid h-48 place-items-center"><Loader2 className="animate-spin" aria-label="Cargando" /></div> : status.length === 0 ? (
        <Empty title="Sin límites todavía" text="Ponle un tope mensual a una categoría y te aviso cuando vas por el 80%." action="Poner el primero" onAction={() => setOpen(true)} />
      ) : (
        <Group title="Este mes">
          {status.map(({ budget: b, spent, pct, state }) => (
            <Row key={b.id} tone={color[state]} title={b.category} value={`${money(spent, b.currency)} / ${money(b.limit_amount, b.currency)}`} valueTone={state === 'ok' ? 'soft' : state === 'over' ? 'neg' : undefined}
              sub={state === 'over' ? `Te pasaste ${money(spent - b.limit_amount, b.currency)}` : `Quedan ${money(b.limit_amount - spent, b.currency)}`}>
              <div className="meter mx-4 mb-3 -mt-1" style={{ ['--meter' as string]: color[state] }} role="img" aria-label={`${pct}% del límite`}><i style={{ width: `${Math.min(100, pct)}%` }} /></div>
              <button className="absolute top-1 right-1 grid size-11 place-items-center opacity-0 focus-visible:opacity-100 [li:hover_&]:opacity-100" style={{ color: 'var(--ink-faint)' }} onClick={() => budgets.remove(b.id)} aria-label={`Quitar límite de ${b.category}`}><Trash2 size={14} aria-hidden /></button>
            </Row>
          ))}
        </Group>
      )}
      <Sheet open={open} title="Nuevo límite mensual" onClose={() => setOpen(false)}>
        <form className="grid gap-4" onSubmit={add}>
          <CategoryField kind="expense" value={cat} onChange={setCat} tax={tax} />
          <div className="grid grid-cols-2 gap-3">
            <label className="grid gap-2 text-sm">Límite al mes<input className="field" inputMode="decimal" value={limit} onChange={(e) => setLimit(e.target.value)} placeholder="0.00" /></label>
            <CurrencySelect value={cur} onChange={setCur} />
          </div>
          {err && <p role="alert" className="text-sm" style={{ color: 'var(--neg)' }}>{err}</p>}
          <button className="btn btn-primary w-fit">Guardar</button>
        </form>
      </Sheet>
    </div>
  )
}
