import { ChevronLeft, ChevronRight, Loader2, Plus } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AREAS, budgetStatus, incomeByArea, lastMonths, loanTotals, monthTotals, spendByCategory, type Budget, type Loan, type LoanPayment, type Sub, type Tx } from '../../lib/finance'
import { currentMonth, money, monthLabel, shiftMonth, useProjects } from '../../lib/projects'
import { dayNum } from '../../lib/recur'
import { useTable } from '../../lib/table'
import { localISO } from '../../lib/time'
import { ErrorBar } from './shared'

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
            <rect x={x - bw - 1} y={H - hi} width={bw} height={Math.max(hi, 1)} rx="3" fill="#8fd1a4" opacity={d.income ? 1 : 0.25} />
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
  const today = localISO()

  // Cobros ya recibidos en Trabajo cuentan como ingreso (freelance web) sin registrarlos dos veces
  const extra = useMemo(() => work.payments.filter((p) => p.paid_at).map((p) => ({ currency: work.projects.find((x) => x.id === p.project_id)?.currency ?? 'USD', amount: Number(p.amount), date: p.paid_at! })), [work.payments, work.projects])

  const totals = useMemo(() => monthTotals(txs.rows, month, extra), [txs.rows, month, extra])
  const currencies = Object.keys(totals)
  const cur = currencies.includes(pick) ? pick : currencies[0] ?? 'USD'
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
      <div className="flex items-end justify-between gap-3">
        <div><p className="eyebrow">Dinero</p><h1 className="mt-2 font-display text-4xl">Resumen</h1></div>
        <Link to="/app/dinero/movimientos" className="btn btn-primary"><Plus size={18} aria-hidden /> Movimiento</Link>
      </div>

      <div className="mt-6 flex items-center gap-2">
        <button className="grid size-11 place-items-center rounded-full border" style={{ borderColor: 'var(--line)' }} onClick={() => setMonth(shiftMonth(month, -1))} aria-label="Mes anterior"><ChevronLeft size={18} aria-hidden /></button>
        <h2 className="min-w-40 text-center font-display text-2xl first-letter:uppercase">{monthLabel(month)}</h2>
        <button className="grid size-11 place-items-center rounded-full border" style={{ borderColor: 'var(--line)' }} onClick={() => setMonth(shiftMonth(month, 1))} aria-label="Mes siguiente"><ChevronRight size={18} aria-hidden /></button>
      </div>

      <ErrorBar msg={txs.error || work.error || budgets.error || subs.error || loans.error} />

      {loading ? <div className="grid h-48 place-items-center"><Loader2 className="animate-spin" aria-label="Cargando" /></div> : (
        <div className="mt-6 grid gap-8">
          {currencies.length > 1 && (
            <div className="flex gap-2" role="group" aria-label="Moneda">{currencies.map((c) => <button key={c} aria-pressed={cur === c} onClick={() => setPick(c)} className="min-h-11 rounded-full border px-4 text-sm" style={{ borderColor: cur === c ? 'var(--accent)' : 'var(--line)', background: cur === c ? 'var(--accent)' : 'transparent', color: cur === c ? 'var(--bg)' : 'var(--ink-soft)' }}>{c}</button>)}</div>
          )}

          {empty ? (
            <div className="rounded-2xl border px-6 py-10 text-center" style={{ borderColor: 'var(--line-soft)', background: 'var(--surface)' }}>
              <p className="font-display text-2xl">Sin movimientos este mes</p>
              <p className="mx-auto mt-2 max-w-sm text-sm" style={{ color: 'var(--ink-soft)' }}>Registra un ingreso o un gasto y aquí verás el balance, las áreas y la tendencia.</p>
            </div>
          ) : (
            <dl className="grid grid-cols-3 gap-3 rounded-2xl border p-4" style={{ borderColor: 'var(--line-soft)', background: 'var(--surface)' }}>
              <div><dt className="text-xs" style={{ color: 'var(--ink-faint)' }}>Ingresos</dt><dd className="mt-1 font-semibold" style={{ color: '#8fd1a4' }}>{money(t.income, cur)}</dd></div>
              <div><dt className="text-xs" style={{ color: 'var(--ink-faint)' }}>Gastos</dt><dd className="mt-1 font-semibold" style={{ color: 'var(--personal)' }}>{money(t.expense, cur)}</dd></div>
              <div><dt className="text-xs" style={{ color: 'var(--ink-faint)' }}>Balance</dt><dd className="mt-1 font-semibold" style={{ color: t.balance >= 0 ? 'var(--ink)' : '#e8a393' }}>{money(t.balance, cur)}</dd></div>
            </dl>
          )}

          {!empty && (
            <section aria-labelledby="tend">
              <h2 id="tend" className="font-display text-2xl">Últimos 6 meses</h2>
              <div className="mt-3"><Chart data={series} currency={cur} /></div>
              <p className="mt-1 flex gap-4 text-xs" style={{ color: 'var(--ink-faint)' }}><span><span style={{ color: '#8fd1a4' }}>●</span> Ingresos</span><span><span style={{ color: 'var(--personal)' }}>●</span> Gastos</span></p>
            </section>
          )}

          {!empty && Object.values(byArea).some(Boolean) && (
            <section aria-labelledby="areas">
              <h2 id="areas" className="font-display text-2xl">Ingresos por área</h2>
              <ul className="mt-3 grid gap-3">
                {AREAS.map((a) => (
                  <li key={a.id}>
                    <div className="flex justify-between text-sm"><span style={{ color: a.color }}>{a.label}</span><span>{money(byArea[a.id], cur)}</span></div>
                    <div className="mt-1 h-2 overflow-hidden rounded-full" style={{ background: 'var(--surface-2)' }}><div className="h-full rounded-full" style={{ width: `${(byArea[a.id] / areaMax) * 100}%`, background: a.color, transition: 'width 400ms var(--ease-out)' }} /></div>
                  </li>
                ))}
              </ul>
              {extra.some((e) => e.date.startsWith(month)) && <p className="mt-2 text-xs" style={{ color: 'var(--ink-faint)' }}>Incluye los cobros de tus trabajos web.</p>}
            </section>
          )}

          {cats.length > 0 && (
            <section aria-labelledby="gastos">
              <h2 id="gastos" className="font-display text-2xl">En qué gastas</h2>
              <ul className="mt-3 grid gap-2">{cats.map((c) => <li key={c.category} className="flex justify-between rounded-xl px-4 py-3 text-sm" style={{ background: 'var(--surface)' }}><span>{c.category}</span><span className="font-semibold">{money(c.total, cur)}</span></li>)}</ul>
            </section>
          )}

          {alerts.length > 0 && (
            <section aria-labelledby="pres">
              <h2 id="pres" className="font-display text-2xl">Presupuesto</h2>
              <ul className="mt-3 grid gap-2">{alerts.map((a) => <li key={a.budget.id} className="rounded-xl px-4 py-3 text-sm" style={{ background: 'color-mix(in oklab, ' + (a.state === 'over' ? '#e8a393' : 'var(--personal)') + ' 14%, transparent)' }}>{a.budget.category}: {a.pct}% del límite ({money(a.spent, a.budget.currency)} de {money(a.budget.limit_amount, a.budget.currency)})</li>)}</ul>
            </section>
          )}

          {due.length > 0 && (
            <section aria-labelledby="vence">
              <div className="flex items-center justify-between"><h2 id="vence" className="font-display text-2xl">Por vencer</h2><Link to="/app/dinero/suscripciones" className="inline-flex min-h-11 items-center text-sm underline" style={{ color: 'var(--ink-soft)' }}>Ver todo</Link></div>
              <ul className="mt-3 grid gap-2">{due.map((s) => { const n = dayNum(s.next_due) - dayNum(today); return <li key={s.id} className="flex justify-between rounded-xl px-4 py-3 text-sm" style={{ background: 'var(--surface)' }}><span>{s.name} <span style={{ color: 'var(--ink-faint)' }}>· {n < 0 ? `venció hace ${-n} d` : n === 0 ? 'hoy' : `en ${n} d`}</span></span><span className="font-semibold">{money(s.amount, s.currency)}</span></li> })}</ul>
            </section>
          )}

          {Object.keys(lt).length > 0 && Object.values(lt).some((v) => v.owedToMe || v.iOwe) && (
            <section aria-labelledby="prest">
              <div className="flex items-center justify-between"><h2 id="prest" className="font-display text-2xl">Préstamos</h2><Link to="/app/dinero/prestamos" className="inline-flex min-h-11 items-center text-sm underline" style={{ color: 'var(--ink-soft)' }}>Ver todo</Link></div>
              <ul className="mt-3 grid gap-2">{Object.entries(lt).map(([c, v]) => <li key={c} className="flex justify-between rounded-xl px-4 py-3 text-sm" style={{ background: 'var(--surface)' }}><span>Me deben <strong style={{ color: '#8fd1a4' }}>{money(v.owedToMe, c)}</strong></span><span>Debo <strong style={{ color: 'var(--personal)' }}>{money(v.iOwe, c)}</strong></span></li>)}</ul>
            </section>
          )}
        </div>
      )}
    </div>
  )
}
