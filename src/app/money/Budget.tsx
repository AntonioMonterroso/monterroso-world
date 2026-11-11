import { Loader2, Plus, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { quincenaOf, quincenaStatus } from '../../lib/quincena'
import { getSettings, patchSettings } from '../../lib/settings'
import { localISO } from '../../lib/time'
import Sheet from '../../components/Sheet'
import { Group, PageHeader, Row, Segmented } from '../../components/ui'
import { budgetStatus, type Budget as B, type Tx } from '../../lib/finance'
import { useTaxonomy } from '../../lib/taxonomy'
import { CategoryField } from './fields'
import { currentMonth, money, monthLabel } from '../../lib/projects'
import { useTable } from '../../lib/table'
import { Empty, ErrorBar, defaultCurrency, toNum } from './shared'

const color = { ok: 'var(--pos)', warn: 'var(--personal)', over: 'var(--aviso)' }

export default function Budget() {
  const tax = useTaxonomy()
  const budgets = useTable<B>('fin_budgets', { col: 'category', asc: true })
  const txs = useTable<Tx>('fin_transactions', { col: 'tx_date', asc: false })
  const month = currentMonth()
  const status = useMemo(() => budgetStatus(budgets.rows, txs.rows, month), [budgets.rows, txs.rows, month])
  const [open, setOpen] = useState(false)
  const [cat, setCat] = useState('Comida')
  const [limit, setLimit] = useState('')
  const [cur] = useState(defaultCurrency())
  const [err, setErr] = useState('')
  // Por quincena: para cuando te pagan dos veces al mes. Se guarda en tus ajustes.
  const [view, setView] = useState<'mes' | 'quincena'>('mes')
  useEffect(() => { void getSettings().then((s) => { if ((s as { budgetView?: string }).budgetView === 'quincena') setView('quincena') }) }, [])
  const changeView = (v: 'mes' | 'quincena') => { setView(v); void patchSettings({ budgetView: v } as never) }
  const q = quincenaOf(localISO())
  const qStatus = useMemo(() => quincenaStatus(budgets.rows, txs.rows, q), [budgets.rows, txs.rows, q.from]) // eslint-disable-line react-hooks/exhaustive-deps

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
      {budgets.rows.length > 0 && <div className="mt-4"><Segmented label="Ver" value={view} onChange={changeView} options={[{ id: 'mes', label: 'Mes completo' }, { id: 'quincena', label: 'Por quincena' }]} /></div>}
      {budgets.loading ? <div className="grid h-48 place-items-center"><Loader2 className="animate-spin" aria-label="Cargando" /></div> : status.length === 0 ? (
        <Empty title="Sin límites todavía" text="Ponle un tope mensual a una categoría y te aviso cuando vas por el 80%." action="Poner el primero" onAction={() => setOpen(true)} />
      ) : view === 'quincena' ? (
        <Group title={q.label} footer="El límite de cada categoría se parte a la mitad para cada quincena.">
          {qStatus.map((x, i) => (
            <Row key={budgets.rows[i].id} tone={color[x.state]} title={x.category} value={`${money(x.spent)} / ${money(x.limit)}`} valueTone={x.state === 'ok' ? 'soft' : x.state === 'over' ? 'neg' : undefined}
              sub={x.state === 'over' ? `Te pasaste ${money(x.spent - x.limit)} esta quincena` : `Quedan ${money(x.limit - x.spent)} esta quincena`}>
              <div className="meter mx-4 mb-3 -mt-1" style={{ ['--meter' as string]: color[x.state] }} role="img" aria-label={`${x.pct}% del límite de la quincena`}><i style={{ width: `${Math.min(100, x.pct)}%` }} /></div>
            </Row>
          ))}
        </Group>
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
          <div className="grid gap-3">
            <label className="grid gap-2 text-sm">Límite al mes<input className="field" inputMode="decimal" value={limit} onChange={(e) => setLimit(e.target.value)} placeholder="0.00" /></label>
          </div>
          {err && <p role="alert" className="text-sm" style={{ color: 'var(--aviso-texto)' }}>{err}</p>}
          <button className="btn btn-primary w-fit">Guardar</button>
        </form>
      </Sheet>
    </div>
  )
}
