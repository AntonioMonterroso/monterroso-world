import { Minus, Plus } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Group, MonthStepper, PageHeader, Row, Segmented, Stat } from '../../components/ui'
import { lastMonths, monthTotals, monthlyCost, type Sub, type Tx } from '../../lib/finance'
import { PRESETS, allocate, avgIncome, cleanBuckets, pctLeft, progress, shareOf, type Bucket } from '../../lib/plan'
import { currentMonth, monthlyPeriods, money, useProjects, workIncomeRows } from '../../lib/projects'
import { getSettings, patchSettings } from '../../lib/settings'
import { useTable } from '../../lib/table'
import { toNum } from './shared'

type Base = 'month' | 'avg' | 'fixed' | 'custom'
const TONE: Record<Bucket['kind'], string> = { spend: 'var(--personal)', save: 'var(--pos)', give: 'var(--sky)', free: 'var(--accent)' }
const GIVE = /iglesia|diezmo|ofrenda/i

/** Calculadora de reparto: de tu ingreso, cuánto va a gastos, ahorro, ofrendas y gustos, y cómo vas contra eso. */
export default function Calculator() {
  const txs = useTable<Tx>('fin_transactions', { col: 'tx_date', asc: false })
  const subs = useTable<Sub>('subscriptions', { col: 'next_due', asc: true })
  const moves = useTable<{ id: string; amount: number; tx_date: string }>('fin_goal_moves', { col: 'tx_date', asc: false })
  const work = useProjects()
  const [month, setMonth] = useState(currentMonth())
  const [base, setBase] = useState<Base>('month')
  const [custom, setCustom] = useState('')
  const [buckets, setBuckets] = useState<Bucket[]>(PRESETS[0].buckets)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => { getSettings().then((s) => { const b = cleanBuckets((s as { moneyPlan?: unknown }).moneyPlan); if (b) setBuckets(b); setLoaded(true) }) }, [])
  const save = (b: Bucket[]) => { setBuckets(b); if (loaded) void patchSettings({ moneyPlan: b } as never) }

  const extra = useMemo(() => workIncomeRows(work.projects, work.payments).map((x) => ({ currency: x.currency, amount: x.amount, date: x.tx_date })), [work.projects, work.payments])
  const actual = useMemo(() => monthTotals(txs.rows, month, extra).GTQ ?? { income: 0, expense: 0, balance: 0 }, [txs.rows, month, extra])
  const avg = useMemo(() => avgIncome(lastMonths(txs.rows, month, 3, 'GTQ', extra)), [txs.rows, month, extra])
  const fixedIncome = useMemo(() => Math.round(work.projects.filter((p) => monthlyPeriods(p, month).includes(month) && p.status !== 'closed').reduce((s, p) => s + Number(p.monthly_fee ?? 0), 0) * 100) / 100, [work.projects, month])
  const income = base === 'month' ? actual.income : base === 'avg' ? avg : base === 'fixed' ? fixedIncome : Math.max(0, toNum(custom) || 0)

  const rows = useMemo(() => allocate(income, buckets), [income, buckets])
  const amountOf = (id: string) => rows.find((r) => r.id === id)?.amount ?? 0
  const give = useMemo(() => txs.rows.filter((t) => t.kind === 'expense' && t.tx_date.startsWith(month) && GIVE.test(t.category)).reduce((s, t) => s + Number(t.amount), 0), [txs.rows, month])
  const real: Record<Bucket['kind'], number | null> = {
    spend: Math.max(0, actual.expense - give),
    give,
    save: moves.rows.filter((m) => m.tx_date.startsWith(month) && Number(m.amount) > 0).reduce((s, m) => s + Number(m.amount), 0),
    free: null,
  }
  const fixed = useMemo(() => Math.round(subs.rows.filter((s) => s.active).reduce((a, s) => a + monthlyCost(s), 0) * 100) / 100, [subs.rows])
  const left = pctLeft(buckets)
  const step = (id: string, d: number) => save(buckets.map((x) => (x.id === id ? { ...x, pct: Math.min(100, Math.max(0, x.pct + d)) } : x)))
  const saveTarget = buckets.filter((x) => x.kind === 'save').reduce((s, x) => s + amountOf(x.id), 0)
  const saved = real.save ?? 0

  return (
    <div>
      <PageHeader eyebrow="Dinero" title="Reparto" sub="Pon tu ingreso y decide cuánto va a gastos, ahorro y lo demás. Después ves cómo vas contra ese plan." />
      <MonthStepper month={month} onChange={setMonth} />

      <Segmented label="Ingreso base" value={base} onChange={setBase} options={[{ id: 'month', label: 'Lo que entró' }, { id: 'avg', label: 'Promedio 3 meses' }, { id: 'fixed', label: 'Mensualidades' }, { id: 'custom', label: 'Otro monto' }]} />
      {base === 'custom' && <label className="mt-3 grid gap-2 text-sm">¿Cuánto vas a repartir?<input className="field" inputMode="decimal" value={custom} onChange={(e) => setCustom(e.target.value)} placeholder="0.00" autoFocus /></label>}

      <div className="stats mt-5">
        <Stat label="A repartir" value={money(income)} note={base === 'month' ? 'Incluye cobros de Trabajos' : base === 'avg' ? 'Meses con ingreso' : base === 'fixed' ? 'Cuotas fijas activas' : 'Tu monto'} />
        <Stat label="Fijo en suscripciones" value={money(fixed)} note={income > 0 ? `${shareOf(fixed, income)}% del ingreso` : undefined} />
      </div>

      <Group title="Tu plan" aside={left === 0 ? '100%' : <span style={{ color: left < 0 ? 'var(--neg)' : 'var(--accent)' }}>{left > 0 ? `Falta asignar ${left}%` : `Te pasaste ${-left}%`}</span>}>
        {buckets.map((x) => {
          const a = amountOf(x.id)
          const r = real[x.kind]
          const pr = r != null ? progress(a, r) : null
          return (
            <Row key={x.id} tone={TONE[x.kind]} title={x.name} chevron={false}
              sub={r == null ? `${x.pct}% · lo que queda para ti` : <>{x.pct}% · llevas {money(r)} {x.kind === 'save' ? 'apartado' : 'gastado'}</>}
              value={money(a)}
              >
              <div className="flex items-center gap-3 px-4 pb-3 pl-[3.75rem]">
                <button type="button" className="grid size-11 place-items-center rounded-full" style={{ background: 'var(--surface-2)' }} onClick={() => step(x.id, -5)} aria-label={`Bajar ${x.name}`}><Minus size={14} aria-hidden /></button>
                <span className="w-12 text-center text-sm font-semibold" style={{ fontVariantNumeric: 'tabular-nums' }}>{x.pct}%</span>
                <button type="button" className="grid size-11 place-items-center rounded-full" style={{ background: 'var(--surface-2)' }} onClick={() => step(x.id, 5)} aria-label={`Subir ${x.name}`}><Plus size={14} aria-hidden /></button>
                {pr && a > 0 && (
                  <div className="min-w-0 flex-1">
                    <div className="meter" style={{ ['--meter' as string]: pr.over && x.kind !== 'save' ? 'var(--neg)' : TONE[x.kind] }} role="img" aria-label={`${Math.min(pr.pct, 100)}% de lo planeado`}><i style={{ width: `${Math.min(100, pr.pct)}%` }} /></div>
                    <p className="mt-1 truncate text-xs" style={{ color: pr.over && x.kind !== 'save' ? 'var(--neg)' : 'var(--ink-faint)' }}>
                      {x.kind === 'save' ? (pr.over ? '¡Ya apartaste de más!' : `Faltan ${money(pr.left)}`) : pr.over ? `Te pasaste ${money((r ?? 0) - a)}` : `Quedan ${money(pr.left)}`}
                    </p>
                  </div>
                )}
              </div>
            </Row>
          )
        })}
      </Group>

      <Group title="Planes listos" footer="Toca uno para usarlo como punto de partida. Luego ajusta los porcentajes con + y −.">
        {PRESETS.map((p) => <Row key={p.id} tone="var(--accent)" title={p.name} sub={p.note} chevron={false} onClick={() => save(p.buckets)} />)}
      </Group>

      {saveTarget > 0 && saved < saveTarget && (
        <p className="mt-4 rounded-xl px-4 py-3 text-sm" style={{ background: 'var(--surface)', color: 'var(--ink-soft)' }}>
          Para cumplir tu plan te faltan <strong style={{ color: 'var(--ink)' }}>{money(saveTarget - saved)}</strong> por apartar este mes. <Link to="/app/dinero/metas" className="underline" style={{ color: 'var(--accent)' }}>Ir a mis metas</Link>
        </p>
      )}
    </div>
  )
}
