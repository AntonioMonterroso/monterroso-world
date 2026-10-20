import { CalendarCheck, Loader2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import Sheet from '../../components/Sheet'
import { allocate, cleanBuckets, PRESETS, type Bucket } from '../../lib/plan'
import { getSettings } from '../../lib/settings'
import { Group, MonthStepper, PageHeader, Row, Stat } from '../../components/ui'
import type { Account } from '../../lib/accounts'
import type { Goal } from '../../lib/finance'
import { forecast, incomingTotals, monthlyClients, type ClientRow } from '../../lib/incoming'
import { currentMonth, monthLabel, money, useProjects } from '../../lib/projects'
import { NO_RULE, applyRule, loadRule, ruleActive, ruleAmount, type Rule } from '../../lib/savingsRule'
import { useTable } from '../../lib/table'
import { localISO } from '../../lib/time'
import { AccountPick, lastAccount, rememberAccount } from './AccountPick'
import { Empty, ErrorBar, toNum } from './shared'

type Collect = { row: ClientRow; what: string; amount: string; acct: string }
const STATE = { paid: { tone: 'var(--pos)', text: 'Pagó' }, pending: { tone: 'var(--accent)', text: 'Por cobrar' }, late: { tone: 'var(--neg)', text: 'Atrasado' } } as const
const cap = (t: string) => t.charAt(0).toUpperCase() + t.slice(1)

/** Lo que entra cada mes: tus clientes con mensualidad, quién ya pagó, quién falta y cuánto vendrá. */
export default function Incoming() {
  const work = useProjects()
  const accountsDb = useTable<Account>('fin_accounts', { col: 'position', asc: true })
  const goals = useTable<Goal>('savings_goals', { col: 'created_at', asc: true })
  const accounts = accountsDb.rows.filter((a) => !a.archived)
  const [month, setMonth] = useState(currentMonth())
  const [rule, setRule] = useState<Rule>(NO_RULE)
  const [plan, setPlan] = useState<Bucket[]>(PRESETS[0].buckets)
  const [sheet, setSheet] = useState<Collect | null>(null)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')
  useEffect(() => { void loadRule().then(setRule); void getSettings().then((x) => { const b = cleanBuckets((x as { moneyPlan?: unknown }).moneyPlan); if (b) setPlan(b) }) }, [])

  const rows = useMemo(() => monthlyClients(work.projects, work.payments, month), [work.projects, work.payments, month])
  const totals = useMemo(() => incomingTotals(rows), [rows])
  const next = useMemo(() => forecast(work.projects, currentMonth(), 6), [work.projects])
  const peak = Math.max(1, ...next.map((m) => m.fixed))
  const pct = totals.fixed > 0 ? Math.round((totals.collected / totals.fixed) * 100) : 0

  const open = (row: ClientRow) => {
    const first = row.lateMonths[0] ?? (row.state === 'paid' ? '' : month)
    const acct = row.project.account_id ?? lastAccount()
    setErr(''); setMsg('')
    const what = first ? `m:${first}` : row.state !== 'paid' ? `m:${month}` : row.setupDue ? 'setup' : `m:${month}`
    setSheet({ row, what, amount: String(what === 'setup' ? row.setupDue : row.fee), acct: accounts.some((a) => a.id === acct) ? acct : '' })
  }
  const pick = (c: Collect, what: string) => setSheet({ ...c, what, amount: String(what === 'setup' ? c.row.setupDue : c.row.fee) })

  const save = async () => {
    if (!sheet) return
    const n = toNum(sheet.amount)
    if (!(n > 0)) return setErr('Escribe cuánto te pagaron.')
    setBusy(true); setErr('')
    const p = sheet.row.project
    const setup = sheet.what === 'setup'
    const period = setup ? null : sheet.what.slice(2)
    rememberAccount(sheet.acct)
    const pay = await work.addPayment({ project_id: p.id, amount: n, due_date: null, paid_at: localISO(), method: null, note: null, kind: setup ? 'setup' : 'monthly', period, account_id: sheet.acct || null })
    if (!pay) { setBusy(false); return setErr('No se pudo guardar el cobro. Intenta otra vez.') }
    let extra = ''
    const goalId = ruleActive(rule) && goals.rows.some((g) => g.id === rule.goalId) ? (rule.goalId as string) : ''
    if (goalId && rule.auto) {
      const got = await applyRule({ goalId, amount: ruleAmount(n, rule.pct), accountId: pay.account_id ?? null, title: p.title, paymentId: pay.id, date: localISO() })
      void goals.reload()
      extra = got ? ` Apartaste ${money(got)} (${rule.pct}%) para «${goals.rows.find((g) => g.id === goalId)?.title}».` : ' No pude apartar para tu ahorro; hazlo desde Ahorro.'
    } else if (goalId) extra = ` Te toca apartar ${money(ruleAmount(n, rule.pct))} (${rule.pct}%) en Ahorro.`
    setMsg(`Registrado: ${money(n)} de ${p.title}${setup ? ' (instalación)' : ` (${monthLabel(period as string)})`}.${extra}`)
    setBusy(false); setSheet(null)
  }

  const loading = work.loading || accountsDb.loading
  const options = (c: Collect) => [...c.row.lateMonths.map((m) => ({ id: `m:${m}`, label: cap(monthLabel(m)) })), ...(c.row.state !== 'paid' ? [{ id: `m:${month}`, label: cap(monthLabel(month)) }] : []), ...(c.row.setupDue ? [{ id: 'setup', label: 'Instalación' }] : [])]

  return (
    <div>
      <PageHeader eyebrow="Dinero" title="Lo que entra" sub="Tus clientes con mensualidad: quién ya pagó, quién falta y cuánto vendrá los próximos meses." />
      <MonthStepper month={month} onChange={setMonth} />
      <ErrorBar msg={work.error || accountsDb.error} />
      {msg && <p role="status" className="mb-4 rounded-xl px-4 py-3 text-sm" style={{ background: 'color-mix(in oklab, var(--pos) 14%, var(--surface))' }}>{msg}</p>}

      {loading ? <div className="grid h-48 place-items-center"><Loader2 className="animate-spin" aria-label="Cargando" /></div> : rows.length === 0 ? (
        <Empty title="Aún no hay mensualidades este mes" text="En Trabajo, abre un cliente y ponle su mensualidad (monto, día de cobro y desde qué mes). Aquí verás quién ya pagó y cuánto entra cada mes." />
      ) : (
        <>
          <div className="stats">
            <Stat label="Fijo al mes" value={money(totals.fixed)} note={`${totals.clients} ${totals.clients === 1 ? 'cliente' : 'clientes'}`} />
            <Stat label="Ya cobrado" value={money(totals.collected)} tone="pos" note={`${totals.paidClients} de ${totals.clients} pagaron`} />
            <Stat label="Falta" value={money(totals.pending)} tone={totals.late > 0 ? 'neg' : undefined} note={totals.late > 0 ? `y ${money(totals.late)} de meses anteriores` : 'Todo al día'} />
          </div>
          <div className="meter mt-4" style={{ ['--meter' as string]: 'var(--pos)' }} role="img" aria-label={`${pct}% del mes cobrado`}><i style={{ width: `${pct}%` }} /></div>

          <Group title="Clientes del mes" footer="Toca «Cobrado» cuando te paguen: se anota el ingreso, sube tu cuenta y se aparta tu ahorro si lo tienes activado.">
            {rows.map((r) => {
              const s = STATE[r.state]
              const late = r.lateMonths.length
              return (
                <Row key={r.project.id} tone={s.tone} title={r.project.title}
                  sub={<>{[r.project.client, r.project.billing_day ? `cobra el ${r.project.billing_day}` : null].filter(Boolean).join(' · ')}{(r.project.client || r.project.billing_day) && ' · '}<span style={{ color: s.tone }}>{r.state === 'paid' && r.paidAt ? `Pagó el ${new Date(r.paidAt + 'T12:00:00').toLocaleDateString('es', { day: 'numeric', month: 'short' })}` : s.text}</span>{late > 0 && <span style={{ color: 'var(--neg)' }}> · debe {late} {late === 1 ? 'mes' : 'meses'} antes</span>}{r.setupDue > 0 && <span style={{ color: 'var(--neg)' }}> · falta instalación</span>}</>}
                  value={money(r.fee)}
                  trailing={r.owed > 0 ? <button type="button" className="btn btn-primary !min-h-11 !px-4" onClick={() => open(r)}><CalendarCheck size={16} aria-hidden /> Cobrado</button> : undefined}
                  to={r.owed > 0 ? undefined : `/app/trabajo?abrir=${r.project.id}`} />
              )
            })}
          </Group>

          <Group title="Lo que vendrá" footer="Si todos siguen pagando. Una mensualidad que termina se quita sola.">
            {next.map((m) => (
              <Row key={m.month} tone="var(--accent)" title={cap(monthLabel(m.month))} sub={`${m.clients} ${m.clients === 1 ? 'cliente' : 'clientes'}`} value={money(m.fixed)} chevron={false}>
                <div className="meter mx-4 mb-3 -mt-1" style={{ ['--meter' as string]: 'var(--accent)' }}><i style={{ width: `${(m.fixed / peak) * 100}%` }} /></div>
              </Row>
            ))}
          </Group>
          <p className="mt-4 text-sm" style={{ color: 'var(--ink-soft)' }}>¿Un cliente no aparece? Ábrelo en <Link to="/app/trabajo" className="underline" style={{ color: 'var(--accent)' }}>Trabajo</Link> y ponle su mensualidad.</p>
        </>
      )}

      <Sheet open={Boolean(sheet)} title={sheet ? `Cobrar a ${sheet.row.project.title}` : ''} onClose={() => setSheet(null)}>
        {sheet && (
          <form className="grid gap-4" onSubmit={(e) => { e.preventDefault(); void save() }}>
            {options(sheet).length > 1 && (
              <fieldset><legend className="mb-2 text-sm">¿Qué te pagaron?</legend>
                <div className="flex flex-wrap gap-2">{options(sheet).map((o) => <button key={o.id} type="button" aria-pressed={sheet.what === o.id} onClick={() => pick(sheet, o.id)} className="min-h-11 rounded-full px-4 text-sm" style={{ background: sheet.what === o.id ? 'color-mix(in oklab, var(--accent) 22%, var(--surface-2))' : 'var(--surface-2)' }}>{o.label}</button>)}</div>
              </fieldset>
            )}
            <label className="grid gap-2 text-sm">Monto<input className="field" inputMode="decimal" value={sheet.amount} onChange={(e) => setSheet({ ...sheet, amount: e.target.value })} /></label>
            <AccountPick accounts={accounts} value={sheet.acct} onChange={(id) => setSheet((c) => (c ? { ...c, acct: id } : c))} label="¿A qué cuenta cayó?" />
            {toNum(sheet.amount) > 0 && (
              <div className="rounded-xl p-3 text-sm" style={{ background: 'var(--surface-2)' }}>
                <p className="mb-1 font-semibold">Así se reparte según tu plan</p>
                <ul className="grid gap-1">{allocate(toNum(sheet.amount), plan).map((r) => <li key={r.id} className="flex justify-between"><span>{plan.find((b) => b.id === r.id)?.name} · {r.pct}%</span><span style={{ fontVariantNumeric: 'tabular-nums' }}>{money(r.amount)}</span></li>)}</ul>
                <p className="mt-2 text-xs" style={{ color: 'var(--ink-faint)' }}>Es una guía. Lo único que se mueve solo es el ahorro, si tienes la regla activa. Ajusta los porcentajes en Mi plan → Reparto.</p>
              </div>
            )}
            {ruleActive(rule) && <p className="text-sm" style={{ color: 'var(--ink-soft)' }}>{rule.auto ? `Se apartará el ${rule.pct}% para tu ahorro.` : `Después te recuerdo apartar el ${rule.pct}%.`}</p>}
            {err && <p role="alert" className="text-sm" style={{ color: 'var(--neg)' }}>{err}</p>}
            <button className="btn btn-primary" disabled={busy}>{busy ? 'Guardando…' : 'Registrar cobro'}</button>
          </form>
        )}
      </Sheet>
    </div>
  )
}
