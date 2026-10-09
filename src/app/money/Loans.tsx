import type { Account } from '../../lib/accounts'
import { BellPlus, Loader2, Plus, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import Sheet from '../../components/Sheet'
import { AccountPick, lastAccount, rememberAccount } from './AccountPick'
import { Group, PageHeader, Row, Stat } from '../../components/ui'
import { loanBalance, loanPaid, loanTotals, type Loan, type LoanPayment } from '../../lib/finance'
import { money } from '../../lib/projects'
import { supabase } from '../../lib/supabase'
import { useTable } from '../../lib/table'
import { localISO } from '../../lib/time'
import { Empty, ErrorBar, chip, defaultCurrency, toNum } from './shared'

type Draft = { id?: string; account: string; direction: 'lent' | 'borrowed'; person: string; amount: string; currency: string; loan_date: string; due_date: string; note: string }
const blank = (): Draft => ({ account: lastAccount(), direction: 'lent', person: '', amount: '', currency: defaultCurrency(), loan_date: localISO(), due_date: '', note: '' })

export default function Loans() {
  const loans = useTable<Loan>('loans', { col: 'loan_date', asc: false })
  const pays = useTable<LoanPayment>('loan_payments', { col: 'paid_on', asc: true })
  const accountsDb = useTable<Account>('fin_accounts', { col: 'position', asc: true })
  const accounts = accountsDb.rows.filter((a) => !a.archived)
  const [payAcct, setPayAcct] = useState(lastAccount())
  const [d, setD] = useState<Draft | null>(null)
  const [err, setErr] = useState('')
  const [payAmt, setPayAmt] = useState('')
  const [msg, setMsg] = useState('')
  const [confirm, setConfirm] = useState(false)

  const totals = useMemo(() => loanTotals(loans.rows, pays.rows), [loans.rows, pays.rows])
  const open = d?.id ? loans.rows.find((l) => l.id === d.id) : undefined
  const sorted = useMemo(() => [...loans.rows].sort((a, b) => Number(loanBalance(a, pays.rows) === 0) - Number(loanBalance(b, pays.rows) === 0)), [loans.rows, pays.rows])

  const save = async () => {
    if (!d) return
    const n = toNum(d.amount)
    if (!d.person.trim() || !(n > 0)) return setErr('Escribe la persona y un monto mayor a cero.')
    const v = { direction: d.direction, person: d.person.trim(), amount: n, currency: d.currency, loan_date: d.loan_date, due_date: d.due_date || null, note: d.note.trim() || null, account_id: d.account || null }
    rememberAccount(d.account)
    if (d.id) await loans.update(d.id, v)
    else if (!(await loans.add(v))) return setErr('No se pudo guardar el préstamo. Revisa tu conexión y vuelve a intentar.')
    setD(null); setErr('')
  }

  const addPayment = async () => {
    const n = toNum(payAmt)
    if (!open || !(n > 0)) return setErr('Escribe el monto del pago.')
    setErr('')
    rememberAccount(payAcct)
    if (!(await pays.add({ loan_id: open.id, amount: n, paid_on: localISO(), note: null, account_id: payAcct || null }))) return setErr('No se pudo guardar el pago.')
    setPayAmt('')
  }

  // Crea un recordatorio con alertas (usa los avisos push) para cobrar o pagar en la fecha límite
  const remind = async (l: Loan) => {
    if (!l.due_date) return setErr('Primero ponle una fecha límite.')
    const lent = l.direction === 'lent'
    const { error } = await supabase.from('events').insert({
      type: 'reminder', title: lent ? `Cobrar a ${l.person}` : `Pagar a ${l.person}`, action: `${money(loanBalance(l, pays.rows), l.currency)} pendientes`,
      kind: 'other', start_date: l.due_date, start_min: 9 * 60, repeat: 'none', alerts: [1440, 60], persistent: false, checklist: [],
    })
    setErr(''); setMsg(error ? 'No pude crear el recordatorio.' : 'Listo: te avisaré un día antes y una hora antes.')
  }

  return (
    <div>
      <PageHeader eyebrow="Dinero" title="Préstamos" action={<button className="btn btn-primary" onClick={() => setD(blank())}><Plus size={18} aria-hidden /> Préstamo</button>} />
      <ErrorBar msg={loans.error || pays.error} onClose={loans.clearError} />

      {Object.entries(totals).map(([c, t]) => (
        <div key={c} className="stats mb-2">
          <Stat label="Me deben" value={money(t.owedToMe, c)} tone="pos" />
          <Stat label="Debo" value={money(t.iOwe, c)} />
        </div>
      ))}

      {loans.loading ? <div className="grid h-48 place-items-center"><Loader2 className="animate-spin" aria-label="Cargando" /></div> : loans.rows.length === 0 ? (
        <Empty title="Sin préstamos" text="Anota lo que prestaste o te prestaron, registra cada pago y mira cuánto falta." action="Registrar uno" onAction={() => setD(blank())} />
      ) : (
        <Group title="Todos">
          {sorted.map((l) => {
            const bal = loanBalance(l, pays.rows)
            const done = bal === 0
            return (
              <Row key={l.id} tone={l.direction === 'lent' ? 'var(--pos)' : 'var(--personal)'} title={l.person} muted={done}
                sub={<>{l.direction === 'lent' ? 'Me debe' : 'Le debo'} · de {money(l.amount, l.currency)}{l.due_date ? ` · hasta ${l.due_date}` : ''}</>}
                value={done ? 'Saldado' : money(bal, l.currency)} valueTone={done ? 'soft' : l.direction === 'lent' ? 'pos' : undefined}
                onClick={() => { setD({ id: l.id, account: l.account_id ?? '', direction: l.direction, person: l.person, amount: String(l.amount), currency: l.currency, loan_date: l.loan_date, due_date: l.due_date ?? '', note: l.note ?? '' }); setMsg(''); setErr('') }} />
            )
          })}
        </Group>
      )}

      <Sheet open={Boolean(d)} title={d?.id ? 'Préstamo' : 'Nuevo préstamo'} onClose={() => setD(null)}>
        {d && (
          <div className="grid gap-5">
            <form className="grid gap-4" onSubmit={(e) => { e.preventDefault(); save() }}>
              <div className="flex gap-2" role="group" aria-label="Tipo">
                {([['lent', 'Yo presté'], ['borrowed', 'Me prestaron']] as const).map(([v, l]) => <button key={v} type="button" aria-pressed={d.direction === v} onClick={() => setD({ ...d, direction: v })} className="min-h-11 rounded-full border px-4 text-sm" style={chip(d.direction === v)}>{l}</button>)}
              </div>
              <label className="grid gap-2 text-sm">Persona<input className="field" value={d.person} onChange={(e) => setD({ ...d, person: e.target.value })} maxLength={200} /></label>
              <div className="grid grid-cols-2 gap-3">
                <label className="col-span-2 grid gap-2 text-sm">Monto<input className="field" inputMode="decimal" value={d.amount} onChange={(e) => setD({ ...d, amount: e.target.value })} /></label>
                <label className="grid gap-2 text-sm">Fecha<input type="date" className="field" value={d.loan_date} onChange={(e) => setD({ ...d, loan_date: e.target.value })} /></label>
                <label className="grid gap-2 text-sm">Pagar antes de<input type="date" className="field" value={d.due_date} onChange={(e) => setD({ ...d, due_date: e.target.value })} /></label>
              </div>
              <AccountPick accounts={accounts} value={d.account} onChange={(v) => setD({ ...d, account: v })} label={d.direction === 'lent' ? 'De dónde salió el dinero' : 'A dónde entró el dinero'} />
              <label className="grid gap-2 text-sm">Nota<input className="field" value={d.note} onChange={(e) => setD({ ...d, note: e.target.value })} maxLength={500} /></label>
              <div className="flex items-center gap-3">
                <button className="btn btn-primary">Guardar</button>
                {open && <button type="button" className="btn btn-ghost" onClick={() => remind(open)}><BellPlus size={16} aria-hidden /> Recordarme</button>}
                {open && <button type="button" className="btn btn-ghost ml-auto" style={{ color: confirm ? 'var(--neg)' : undefined }} onClick={async () => { if (confirm) { await loans.remove(open.id); setD(null); setConfirm(false) } else setConfirm(true) }}><Trash2 size={16} aria-hidden /> {confirm ? '¿Seguro?' : 'Eliminar'}</button>}
              </div>
            </form>

            {open && (
              <section aria-labelledby="pagos" className="rounded-2xl border p-4" style={{ borderColor: 'var(--line)', background: 'var(--bg)' }}>
                <h3 id="pagos" className="font-display text-xl">Pagos</h3>
                <p className="mt-1 text-sm" style={{ color: 'var(--ink-soft)' }}>Pagado {money(loanPaid(open, pays.rows), open.currency)} · Falta {money(loanBalance(open, pays.rows), open.currency)}</p>
                <ul className="mt-3 grid gap-2">
                  {pays.rows.filter((p) => p.loan_id === open.id).map((p) => (
                    <li key={p.id} className="flex items-center gap-2 rounded-xl px-3" style={{ background: 'var(--surface)' }}>
                      <span className="flex-1 py-2 text-sm"><span className="font-semibold">{money(p.amount, open.currency)}</span> <span style={{ color: 'var(--ink-faint)' }}>{p.paid_on}</span></span>
                      <button className="grid size-11 place-items-center" onClick={() => pays.remove(p.id)} aria-label="Eliminar pago"><Trash2 size={14} aria-hidden /></button>
                    </li>
                  ))}
                </ul>
                <div className="mt-3"><AccountPick accounts={accounts} value={payAcct} onChange={setPayAcct} label={open.direction === 'lent' ? 'Entra a' : 'Sale de'} /></div>
                <div className="mt-3 flex gap-2">
                  <input className="field" inputMode="decimal" placeholder="Monto del pago" aria-label="Monto del pago" value={payAmt} onChange={(e) => setPayAmt(e.target.value)} />
                  <button className="btn btn-ghost shrink-0" onClick={addPayment}>Agregar</button>
                </div>
              </section>
            )}
            {msg && <p role="status" className="text-sm" style={{ color: 'var(--sky)' }}>{msg}</p>}
            {err && <p role="alert" className="text-sm" style={{ color: 'var(--neg)' }}>{err}</p>}
          </div>
        )}
      </Sheet>
    </div>
  )
}
