import { useEffect, useMemo, useState } from 'react'
import Sheet from './Sheet'
import { AccountPick, lastAccount, rememberAccount } from '../app/money/AccountPick'
import { toNum } from '../app/money/shared'
import type { Account } from '../lib/accounts'
import type { Goal } from '../lib/finance'
import { currentMonth, monthLabel, money, type NewPayment, type Payment, type Project } from '../lib/projects'
import { NO_RULE, applyRule, loadRule, ruleActive, ruleAmount, type Rule } from '../lib/savingsRule'
import { useTable } from '../lib/table'
import { localISO } from '../lib/time'

type What = 'monthly' | 'setup' | 'other'
const cap = (t: string) => t.charAt(0).toUpperCase() + t.slice(1)

/** Registrar un pago desde Trabajo: cualquier pago que te hicieron un cliente (de hoy o de antes). Queda en Dinero como ingreso, sube la cuenta y aparta el ahorro. */
export default function RegistrarPago({ open, projects, payments, addPayment, onClose, onDone }: {
  open: boolean
  projects: Project[]
  payments: Payment[]
  addPayment: (v: NewPayment) => Promise<Payment | null> | void
  onClose: () => void
  onDone?: (msg: string) => void
}) {
  const accountsDb = useTable<Account>('fin_accounts', { col: 'position', asc: true })
  const goals = useTable<Goal>('savings_goals', { col: 'created_at', asc: true })
  const accounts = accountsDb.rows.filter((a) => !a.archived)
  const [rule, setRule] = useState<Rule>(NO_RULE)
  const [pid, setPid] = useState('')
  const [what, setWhat] = useState<What>('other')
  const [period, setPeriod] = useState(currentMonth())
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(localISO())
  const [acct, setAcct] = useState('')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  useEffect(() => { void loadRule().then(setRule) }, [])

  const p = projects.find((x) => x.id === pid)
  const fee = Number(p?.monthly_fee ?? 0), setup = Number(p?.setup_fee ?? 0)
  const kinds = useMemo(() => [
    ...(fee > 0 ? [{ id: 'monthly' as const, label: 'Mensualidad' }] : []),
    ...(setup > 0 ? [{ id: 'setup' as const, label: 'Instalación' }] : []),
    { id: 'other' as const, label: 'Otro pago' },
  ], [fee, setup])

  // Al abrir: el trabajo más reciente, lo que más suele ser y la cuenta de siempre
  useEffect(() => {
    if (!open) return
    const first = projects.find((x) => x.status !== 'closed') ?? projects[0]
    setErr(''); setNote(''); setDate(localISO()); setPeriod(currentMonth())
    if (first) { setPid(first.id); pick(first, Number(first.monthly_fee ?? 0) > 0 ? 'monthly' : 'other') }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])
  const pick = (proj: Project, w: What) => {
    setWhat(w)
    setAmount(w === 'monthly' ? String(proj.monthly_fee ?? '') : w === 'setup' ? String(proj.setup_fee ?? '') : '')
    const a = proj.account_id ?? lastAccount()
    setAcct(a && accounts.some((x) => x.id === a) ? a : '')
  }

  const save = async () => {
    if (!p) return setErr('Elige el trabajo.')
    const n = toNum(amount)
    if (!(n > 0)) return setErr('Escribe cuánto te pagaron.')
    if (what === 'monthly' && payments.some((x) => x.project_id === p.id && x.kind === 'monthly' && x.period === period)) return setErr(`${cap(monthLabel(period))} ya está registrado para este trabajo.`)
    setBusy(true); setErr('')
    rememberAccount(acct)
    const pay = await addPayment({ project_id: p.id, amount: n, due_date: null, paid_at: date, method: null, note: note.trim() || null, kind: what, period: what === 'monthly' ? period : null, account_id: acct || null })
    if (!pay) { setBusy(false); return setErr('No se pudo guardar el pago. Intenta otra vez.') }
    let extra = ''
    const goalId = ruleActive(rule) && goals.rows.some((g) => g.id === rule.goalId) ? (rule.goalId as string) : ''
    if (goalId && rule.auto) {
      const got = await applyRule({ goalId, amount: ruleAmount(n, rule.pct), accountId: pay.account_id ?? null, title: p.title, paymentId: pay.id, date })
      void goals.reload()
      extra = got ? ` Apartaste ${money(got)} (${rule.pct}%) para tu ahorro.` : ' No pude apartar para tu ahorro; hazlo desde Ahorro.'
    } else if (goalId) extra = ` Te toca apartar ${money(ruleAmount(n, rule.pct))} (${rule.pct}%) en Ahorro.`
    setBusy(false)
    onDone?.(`Pago registrado: ${money(n)} de ${p.title}. Ya está en Dinero.${extra}`)
    onClose()
  }

  return (
    <Sheet open={open} title="Registrar un pago" onClose={onClose}>
      <form className="grid gap-4" onSubmit={(e) => { e.preventDefault(); void save() }}>
        {projects.length > 1 && (
          <fieldset><legend className="mb-2 text-sm">¿De qué trabajo?</legend>
            <div className="flex flex-wrap gap-2">{projects.map((x) => <button key={x.id} type="button" aria-pressed={pid === x.id} onClick={() => { setPid(x.id); pick(x, Number(x.monthly_fee ?? 0) > 0 ? 'monthly' : 'other') }} className="min-h-11 rounded-full px-4 text-sm" style={{ background: pid === x.id ? 'var(--marca)' : 'var(--surface-2)', color: pid === x.id ? 'var(--sobre-marca)' : 'var(--ink)' }}>{x.title}</button>)}</div>
          </fieldset>
        )}
        {p && (
          <fieldset><legend className="mb-2 text-sm">¿Qué te pagaron?</legend>
            <div className="flex flex-wrap gap-2">{kinds.map((k) => <button key={k.id} type="button" aria-pressed={what === k.id} onClick={() => pick(p, k.id)} className="min-h-11 rounded-full px-4 text-sm" style={{ background: what === k.id ? 'var(--marca)' : 'var(--surface-2)', color: what === k.id ? 'var(--sobre-marca)' : 'var(--ink)' }}>{k.label}</button>)}</div>
          </fieldset>
        )}
        {what === 'monthly' && <label className="grid gap-2 text-sm">¿De qué mes?<input className="field" type="month" value={period} onChange={(e) => setPeriod(e.target.value)} /></label>}
        <label className="grid gap-2 text-sm">Monto<input className="field" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" /></label>
        <label className="grid gap-2 text-sm">Fecha en que te pagaron<input className="field" type="date" value={date} max={localISO()} onChange={(e) => setDate(e.target.value)} /></label>
        <AccountPick accounts={accounts} value={acct} onChange={setAcct} label="¿A qué cuenta cayó?" />
        <label className="grid gap-2 text-sm">Nota (opcional)<input className="field" value={note} maxLength={200} onChange={(e) => setNote(e.target.value)} placeholder="Anticipo, transferencia, efectivo…" /></label>
        {err && <p role="alert" className="text-sm" style={{ color: 'var(--aviso-texto)' }}>{err}</p>}
        <button className="btn btn-primary" disabled={busy || !p}>{busy ? 'Guardando…' : 'Registrar pago'}</button>
      </form>
    </Sheet>
  )
}
