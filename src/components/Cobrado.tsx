import { useEffect, useMemo, useState } from 'react'
import Sheet from './Sheet'
import { AccountPick, lastAccount, rememberAccount } from '../app/money/AccountPick'
import { toNum } from '../app/money/shared'
import type { Account } from '../lib/accounts'
import type { Goal } from '../lib/finance'
import type { ClientRow } from '../lib/incoming'
import { allocate, cleanBuckets, PRESETS, type Bucket } from '../lib/plan'
import { currentMonth, monthLabel, money, type NewPayment, type Payment } from '../lib/projects'
import { NO_RULE, applyRule, loadRule, ruleActive, ruleAmount, type Rule } from '../lib/savingsRule'
import { getSettings } from '../lib/settings'
import { useTable } from '../lib/table'
import { localISO } from '../lib/time'

const cap = (t: string) => t.charAt(0).toUpperCase() + t.slice(1)
type Draft = { what: string; amount: string; acct: string }

/** El botón «Cobrado»: la misma hoja en Hoy, en Lo que entra y en la ficha del cliente. Monto y cuenta ya vienen llenos; un toque confirma. */
export default function Cobrado({ row, month = currentMonth(), addPayment, onClose, onDone }: {
  row: ClientRow | null
  month?: string
  addPayment: (v: NewPayment) => Promise<Payment | null> | void
  onClose: () => void
  onDone?: (msg: string) => void
}) {
  const accountsDb = useTable<Account>('fin_accounts', { col: 'position', asc: true })
  const goals = useTable<Goal>('savings_goals', { col: 'created_at', asc: true })
  const accounts = accountsDb.rows.filter((a) => !a.archived)
  const [rule, setRule] = useState<Rule>(NO_RULE)
  const [plan, setPlan] = useState<Bucket[]>(PRESETS[0].buckets)
  const [d, setD] = useState<Draft | null>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  useEffect(() => { void loadRule().then(setRule); void getSettings().then((x) => { const b = cleanBuckets((x as { moneyPlan?: unknown }).moneyPlan); if (b) setPlan(b) }) }, [])

  // Al abrir: lo más atrasado primero, con el monto y la cuenta del acuerdo
  useEffect(() => {
    if (!row) { setD(null); return }
    setErr('')
    const first = row.lateMonths[0] ?? (row.state !== 'paid' ? month : '')
    const what = first ? `m:${first}` : row.setupDue ? 'setup' : `m:${month}`
    const acct = row.project.account_id ?? lastAccount()
    setD({ what, amount: String(what === 'setup' ? row.setupDue : row.fee), acct: acct && accounts.some((a) => a.id === acct) ? acct : '' })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [row, accountsDb.loading])

  const options = useMemo(() => row ? [...row.lateMonths.map((m) => ({ id: `m:${m}`, label: cap(monthLabel(m)) })), ...(row.state !== 'paid' ? [{ id: `m:${month}`, label: cap(monthLabel(month)) }] : []), ...(row.setupDue ? [{ id: 'setup', label: 'Instalación' }] : [])] : [], [row, month])

  const save = async () => {
    if (!row || !d) return
    const n = toNum(d.amount)
    if (!(n > 0)) return setErr('Escribe cuánto te pagaron.')
    setBusy(true); setErr('')
    const p = row.project
    const setup = d.what === 'setup'
    const period = setup ? null : d.what.slice(2)
    rememberAccount(d.acct)
    const pay = await addPayment({ project_id: p.id, amount: n, due_date: null, paid_at: localISO(), method: null, note: null, kind: setup ? 'setup' : 'monthly', period, account_id: d.acct || null })
    if (!pay) { setBusy(false); return setErr('No se pudo guardar el cobro. Intenta otra vez.') }
    let extra = ''
    const goalId = ruleActive(rule) && goals.rows.some((g) => g.id === rule.goalId) ? (rule.goalId as string) : ''
    if (goalId && rule.auto) {
      const got = await applyRule({ goalId, amount: ruleAmount(n, rule.pct), accountId: pay.account_id ?? null, title: p.title, paymentId: pay.id, date: localISO() })
      void goals.reload()
      extra = got ? ` Apartaste ${money(got)} (${rule.pct}%) para «${goals.rows.find((g) => g.id === goalId)?.title}».` : ' No pude apartar para tu ahorro; hazlo desde Ahorro.'
    } else if (goalId) extra = ` Te toca apartar ${money(ruleAmount(n, rule.pct))} (${rule.pct}%) en Ahorro.`
    setBusy(false)
    onDone?.(`Registrado: ${money(n)} de ${p.title}${setup ? ' (instalación)' : ` (${monthLabel(period as string)})`}.${extra}`)
    onClose()
  }

  return (
    <Sheet open={Boolean(row)} title={row ? `Cobrar a ${row.project.title}` : ''} onClose={onClose}>
      {row && d && (
        <form className="grid gap-4" onSubmit={(e) => { e.preventDefault(); void save() }}>
          {options.length > 1 && (
            <fieldset><legend className="mb-2 text-sm">¿Qué te pagaron?</legend>
              <div className="flex flex-wrap gap-2">{options.map((o) => <button key={o.id} type="button" aria-pressed={d.what === o.id} onClick={() => setD({ ...d, what: o.id, amount: String(o.id === 'setup' ? row.setupDue : row.fee) })} className="min-h-11 rounded-full px-4 text-sm" style={{ background: d.what === o.id ? 'var(--marca)' : 'var(--surface-2)', color: d.what === o.id ? 'var(--sobre-marca)' : 'var(--ink)' }}>{o.label}</button>)}</div>
            </fieldset>
          )}
          <label className="grid gap-2 text-sm">Monto<input className="field" inputMode="decimal" value={d.amount} onChange={(e) => setD({ ...d, amount: e.target.value })} /></label>
          <AccountPick accounts={accounts} value={d.acct} onChange={(id) => setD((c) => (c ? { ...c, acct: id } : c))} label="¿A qué cuenta cayó?" />
          {toNum(d.amount) > 0 && (
            <div className="rounded-xl p-3 text-sm" style={{ background: 'var(--surface-2)' }}>
              <p className="mb-1 font-semibold">Así se reparte según tu plan</p>
              <ul className="grid gap-1">{allocate(toNum(d.amount), plan).map((r) => <li key={r.id} className="flex justify-between"><span>{plan.find((b) => b.id === r.id)?.name} · {r.pct}%</span><span style={{ fontVariantNumeric: 'tabular-nums' }}>{money(r.amount)}</span></li>)}</ul>
              <p className="mt-2 text-xs" style={{ color: 'var(--ink-faint)' }}>Es una guía. Lo único que se mueve solo es el ahorro, si tienes la regla activa. Ajusta los porcentajes en Dinero › Plan y ahorro.</p>
            </div>
          )}
          {ruleActive(rule) && <p className="text-sm" style={{ color: 'var(--ink-soft)' }}>{rule.auto ? `Se apartará el ${rule.pct}% para tu ahorro.` : `Después te recuerdo apartar el ${rule.pct}%.`}</p>}
          {err && <p role="alert" className="text-sm" style={{ color: 'var(--aviso-texto)' }}>{err}</p>}
          <button className="btn btn-primary" disabled={busy}>{busy ? 'Guardando…' : 'Confirmar cobro'}</button>
        </form>
      )}
    </Sheet>
  )
}
