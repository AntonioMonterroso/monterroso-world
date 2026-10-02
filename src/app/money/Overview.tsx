import { Loader2, Plus } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AREAS, budgetStatus, incomeByArea, lastMonths, loanTotals, monthTotals, spendByCategory, type Budget, type Loan, type LoanPayment, type Sub, type Tx } from '../../lib/finance'
import { currentMonth, money, monthLabel, useProjects } from '../../lib/projects'
import { Group, MonthStepper, PageHeader, Row, Segmented, Stat } from '../../components/ui'
import { dayNum } from '../../lib/recur'
import { useTable } from '../../lib/table'
import { localISO } from '../../lib/time'
import { Empty, ErrorBar } from './shared'

function Chart({ data, currency }: { data: { month: string; income: number; expense: number }[]; currency: string }) {
  const max = Math.max(1, ...data.flatMap((d) => [d.income, d.expense]))
  const W = 300, H = 120, bw = 14
  const step = W / data.length
  return (
    <svg viewBox={`0 0 ${W} ${H + 22}`} className="w-full" role="img" aria-label={`Ingresos y gastos de los últimos ${data.length} meses en ${currency}: ${data.map((d) => `${monthLabel(d.month)}, ingresos ${money(d.income, currency)}, gastos ${money(d.expense, currency)}`).join('; ')}`}>
      {data.map((d, i) => {
        const x = i * step + step / 2
        const hi = (d.income / max) * H, he = (d.expense / max) * H
        return (
          <g key={d.month}>
            <rect x={x - bw - 1} y={H - hi} width={bw} height={Math.max(hi, 1)} rx="3" fill="var(--pos)" opacity={d.income ? 1 : 0.25} />
            <rect x={x + 1} y={H - he} width={bw} height={Math.max(he, 1)} rx="3" fill="var(--personal)" opacity={d.expense ? 1 : 0.25} />
            <text x={x} y={H + 16} textAnchor="middle" fontSize="10" fill="var(--ink-faint)">{new Date(d.month + '-01T12:00:00').toLocaleDateString('es', { month: 'short' })}</text>
          </g>
        )
      })}
    </svg>
  )
}

export default function Overview() {
  const txs = useTable<Tx>('fin_transactions', { col: 'tx_date', asc: false })
  const budgets = useTable<Budget>('fin_budgets', { col: 'category', asc: true })
  const subs = useTable<Sub>('subscriptions', { col: 'next_due', asc: true })
  const loans = useTable<Loan>('loans', { col: 'loan_date', asc: false })
  const pays = useTable<LoanPayment>('loan_payments', { col: 'paid_on', asc: true })
  const work = useProjects()
  const [month, setMonth] = useState(currentMonth())
  const [pick, setPick] = useState('')
  const nav = useNavigate()
  const today = localISO()

  // Cobros ya recibidos en Trabajo cuentan como ingreso (freelance web) sin registrarlos dos veces
  const extra = useMemo(() => work.payments.filter((p) => p.paid_at).map((p) => ({ currency: work.projects.find((x) => x.id === p.project_id)?.currency ?? 'USD', amount: Number(p.amount), date: p.paid_at! })), [work.payments, work.projects])

  const totals = useMemo(() => monthTotals(txs.rows, month, extra), [txs.rows, month, extra])
  const currencies = Object.keys(totals)
  const cur = currencies.includes(pick) ? pick : currencies[0] ?? 'GTQ'
  const t = totals[cur]

  const series = useMemo(() => lastMonths(txs.rows, month, 6, cur, extra), [txs.rows, month, cur, extra])
  const byArea = useMemo(() => incomeByArea(txs.rows, month, cur, extra), [txs.rows, month, cur, extra])
  const cats = useMemo(() => spendByCategory(txs.rows, month, cur).slice(0, 5), [txs.rows, month, cur])
  const alerts = useMemo(() => budgetStatus(budgets.rows, txs.rows, month).filter((b) => b.state !== 'ok'), [budgets.rows, txs.rows, month])
  const due = useMemo(() => subs.rows.filter((s) => s.active && dayNum(s.next_due) - dayNum(today) <= 14).slice(0, 4), [subs.rows, today])
  const lt = useMemo(() => loanTotals(loans.rows, pays.rows), [loans.rows, pays.rows])
  const areaMax = Math.max(1, ...Object.values(byArea))

  const loading = txs.loading || work.loading
  const empty = currencies.length === 0

  return (
    <div>
      <PageHeader eyebrow="Dinero" title="Resumen" action={<Link to="/app/dinero/movimientos" className="btn btn-primary"><Plus size={18} aria-hidden /> Nuevo</Link>} />
      <MonthStepper month={month} onChange={setMonth} />

      <ErrorBar msg={txs.error || work.error || budgets.error || subs.error || loans.error} />

      {loading ? <div className="grid h-48 place-items-center"><Loader2 className="animate-spin" aria-label="Cargando" /></div> : (
        <div>
          {currencies.length > 1 && <Segmented label="Moneda" value={cur} onChange={setPick} options={currencies.map((c) => ({ id: c, label: c }))} />}

          {empty ? <Empty title="Sin movimientos este mes" text="Registra un ingreso o un gasto y aquí verás el balance, las áreas y la tendencia." action="Registrar uno" onAction={() => nav('/app/dinero/movimientos')} /> : (
            <div className="stats mt-5">
              <Stat label="Ingresos" value={money(t.income, cur)} tone="pos" />
              <Stat label="Gastos" value={money(t.expense, cur)} />
              <Stat label="Balance" value={money(t.balance, cur)} tone={t.balance < 0 ? 'neg' : undefined} />
            </div>
          )}

          {!empty && (
            <section className="group-sec" aria-labelledby="tend">
              <div className="group-head"><h3 id="tend">Últimos 6 meses</h3><span><span style={{ color: 'var(--pos)' }}>●</span> Ingresos &nbsp;<span style={{ color: 'var(--personal)' }}>●</span> Gastos</span></div>
              <div className="rounded-[var(--r-card)] p-4" style={{ background: 'var(--surface)', boxShadow: 'inset 0 0 0 1px var(--sep)' }}><Chart data={series} currency={cur} /></div>
            </section>
          )}

          {!empty && Object.values(byArea).some(Boolean) && (
            <Group title="Ingresos por área" footer={extra.some((e) => e.date.startsWith(month)) ? 'Incluye los cobros de tus trabajos web.' : undefined}>
              {AREAS.map((a) => (
                <Row key={a.id} tone={a.color} title={a.label} value={money(byArea[a.id], cur)}>
                  <div className="meter mx-4 mb-3 -mt-1" style={{ ['--meter' as string]: a.color }}><i style={{ width: `${(byArea[a.id] / areaMax) * 100}%` }} /></div>
                </Row>
              ))}
            </Group>
          )}

          {cats.length > 0 && <Group title="En qué gastas">{cats.map((c) => <Row key={c.category} title={c.category} value={money(c.total, cur)} />)}</Group>}

          {alerts.length > 0 && (
            <Group title="Presupuesto">
              {alerts.map((a) => <Row key={a.budget.id} tone={a.state === 'over' ? 'var(--neg)' : 'var(--personal)'} title={a.budget.category} sub={`${a.pct}% del límite`} value={`${money(a.spent, a.budget.currency)} / ${money(a.budget.limit_amount, a.budget.currency)}`} valueTone={a.state === 'over' ? 'neg' : 'soft'} to="/app/dinero/presupuesto" />)}
            </Group>
          )}

          {due.length > 0 && (
            <Group title="Por vencer" aside={<Link to="/app/dinero/suscripciones" className="underline">Ver todo</Link>}>
              {due.map((s) => { const n = dayNum(s.next_due) - dayNum(today); return <Row key={s.id} title={s.name} sub={n < 0 ? `Venció hace ${-n} d` : n === 0 ? 'Hoy' : `En ${n} d`} value={money(s.amount, s.currency)} to="/app/dinero/suscripciones" /> })}
            </Group>
          )}

          {Object.keys(lt).length > 0 && Object.values(lt).some((v) => v.owedToMe || v.iOwe) && (
            <Group title="Préstamos" aside={<Link to="/app/dinero/prestamos" className="underline">Ver todo</Link>}>
              {Object.entries(lt).map(([c, v]) => <Row key={c} title={`Me deben ${money(v.owedToMe, c)}`} sub={`Debo ${money(v.iOwe, c)}`} to="/app/dinero/prestamos" />)}
            </Group>
          )}
        </div>
      )}
    </div>
  )
}
