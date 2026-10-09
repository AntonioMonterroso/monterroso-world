import { Loader2, Plus, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import Sheet from '../../components/Sheet'
import { type Area, type Kind, type Tx } from '../../lib/finance'
import type { Account } from '../../lib/accounts'
import { useTaxonomy } from '../../lib/taxonomy'
import { AreaField, CategoryField } from './fields'
import { currentMonth, money } from '../../lib/projects'
import { useTable } from '../../lib/table'
import { localISO } from '../../lib/time'
import { Group, MonthStepper, PageHeader, Row, Segmented, Stat } from '../../components/ui'
import { Empty, ErrorBar, defaultCurrency, rememberCurrency, toNum } from './shared'

type Draft = { id?: string; account: string; kind: Kind; amount: string; currency: string; category: string; area: Area; date: string; note: string }
const lastAcct = () => { try { return localStorage.getItem('mw_acct') ?? '' } catch { return '' } }
const blank = (kind: Kind = 'expense'): Draft => ({ account: lastAcct(), kind, amount: '', currency: defaultCurrency(), category: kind === 'income' ? 'Proyecto web' : 'Comida', area: kind === 'income' ? 'web' : 'personal', date: localISO(), note: '' })

function Form({ d, setD, onSave, onDelete, err, tax, accounts }: { d: Draft; setD: (d: Draft) => void; onSave: () => void; onDelete?: () => void; err: string; tax: ReturnType<typeof useTaxonomy>; accounts: Account[] }) {
  const [confirm, setConfirm] = useState(false)
  return (
    <form className="grid gap-4" onSubmit={(e) => { e.preventDefault(); onSave() }}>
      <div className="inline-flex w-fit rounded-full p-1" style={{ background: 'var(--bg)' }} role="group" aria-label="Tipo">
        {(['expense', 'income'] as const).map((k) => <button key={k} type="button" aria-pressed={d.kind === k} onClick={() => setD({ ...d, kind: k, category: tax.cats(k)[0]?.name ?? '' })} className="min-h-11 rounded-full px-4 text-sm font-semibold" style={{ background: d.kind === k ? (k === 'income' ? 'var(--pos)' : 'var(--personal)') : 'transparent', color: d.kind === k ? 'var(--bg)' : 'var(--ink-soft)' }}>{k === 'income' ? 'Ingreso' : 'Gasto'}</button>)}
      </div>
      <div className="grid gap-3">
        <label className="grid gap-2 text-sm">Monto<input className="field" inputMode="decimal" value={d.amount} onChange={(e) => setD({ ...d, amount: e.target.value })} placeholder="0.00" autoFocus /></label>
      </div>
      {accounts.length > 0 && (
        <fieldset>
          <legend className="mb-2 text-sm">{d.kind === 'income' ? 'Entra a' : 'Sale de'}</legend>
          <div className="flex flex-wrap gap-2">
            {accounts.map((a) => <button key={a.id} type="button" aria-pressed={d.account === a.id} onClick={() => setD({ ...d, account: a.id })} className="min-h-11 rounded-full px-4 text-sm" style={{ background: d.account === a.id ? `color-mix(in oklab, ${a.color} 22%, transparent)` : 'var(--surface-2)', color: d.account === a.id ? a.color : 'var(--ink-soft)', boxShadow: d.account === a.id ? `inset 0 0 0 1.5px ${a.color}` : 'none' }}>{a.name}</button>)}
            <button type="button" aria-pressed={!d.account} onClick={() => setD({ ...d, account: '' })} className="min-h-11 rounded-full px-4 text-sm" style={{ background: !d.account ? 'var(--surface-3)' : 'var(--surface-2)', color: 'var(--ink-faint)' }}>Sin cuenta</button>
          </div>
        </fieldset>
      )}
      <CategoryField kind={d.kind} value={d.category} onChange={(v) => setD({ ...d, category: v })} tax={tax} />
      <AreaField value={d.area} onChange={(v) => setD({ ...d, area: v })} tax={tax} />
      <label className="grid gap-2 text-sm">Fecha<input type="date" className="field" value={d.date} onChange={(e) => setD({ ...d, date: e.target.value })} /></label>
      <label className="grid gap-2 text-sm">Nota<input className="field" value={d.note} onChange={(e) => setD({ ...d, note: e.target.value })} maxLength={300} /></label>
      {err && <p role="alert" className="text-sm" style={{ color: 'var(--neg)' }}>{err}</p>}
      <div className="flex items-center gap-3">
        <button className="btn btn-primary">Guardar</button>
        {onDelete && <button type="button" className="btn btn-ghost ml-auto" style={{ color: confirm ? 'var(--neg)' : undefined }} onClick={() => (confirm ? onDelete() : setConfirm(true))}><Trash2 size={16} aria-hidden /> {confirm ? '¿Seguro?' : 'Eliminar'}</button>}
      </div>
    </form>
  )
}

export default function Transactions() {
  const tax = useTaxonomy()
  const accountsDb = useTable<Account>('fin_accounts', { col: 'position', asc: true })
  const accounts = useMemo(() => accountsDb.rows.filter((a) => !a.archived), [accountsDb.rows])
  const [acct, setAcct] = useState('all')
  const db = useTable<Tx>('fin_transactions', { col: 'tx_date', asc: false })
  const [month, setMonth] = useState(currentMonth())
  const [kind, setKind] = useState<Kind | 'all'>('all')
  const [area, setArea] = useState<Area | 'all'>('all')
  const [draft, setDraft] = useState<Draft | null>(null)
  const [err, setErr] = useState('')

  useEffect(() => { if (!draft) setErr('') }, [draft])

  const list = useMemo(() => db.rows.filter((t) => t.tx_date.startsWith(month) && (kind === 'all' || t.kind === kind) && (area === 'all' || t.area === area) && (acct === 'all' || (acct === 'none' ? !t.account_id : t.account_id === acct))), [db.rows, month, kind, area, acct])
  const groups = useMemo(() => { const m = new Map<string, Tx[]>(); for (const t of list) m.set(t.tx_date, [...(m.get(t.tx_date) ?? []), t]); return [...m.entries()] }, [list])

  const save = async () => {
    if (!draft) return
    const amount = toNum(draft.amount)
    if (!(amount > 0)) return setErr('Escribe un monto mayor a cero.')
    if (!draft.category.trim()) return setErr('Elige una categoría.')
    await tax.ensureCategory(draft.kind, draft.category)
    const v = { kind: draft.kind, amount, currency: draft.currency, category: draft.category.trim(), area: draft.area, tx_date: draft.date, note: draft.note.trim() || null, account_id: draft.account || null }
    rememberCurrency(draft.currency)
    try { if (draft.account) localStorage.setItem('mw_acct', draft.account) } catch { /* sin almacenamiento */ }
    if (draft.id) await db.update(draft.id, v); else await db.add(v)
    setDraft(null)
  }

  const totals = useMemo(() => {
    const cur = list[0]?.currency ?? defaultCurrency()
    const same = list.filter((t) => t.currency === cur)
    const inc = same.filter((t) => t.kind === 'income').reduce((a, t) => a + Number(t.amount), 0)
    const out = same.filter((t) => t.kind === 'expense').reduce((a, t) => a + Number(t.amount), 0)
    return { cur, inc, out, mixed: same.length !== list.length }
  }, [list])

  return (
    <div>
      <PageHeader eyebrow="Dinero" title="Movimientos" action={<button className="btn btn-primary" onClick={() => setDraft(blank())}><Plus size={18} aria-hidden /> Nuevo</button>} />
      <MonthStepper month={month} onChange={setMonth} />
      <div className="flex flex-wrap items-center gap-3">
        <Segmented label="Tipo" value={kind} onChange={setKind} options={[{ id: 'all', label: 'Todo' }, { id: 'income', label: 'Ingresos' }, { id: 'expense', label: 'Gastos' }]} />
        <Segmented label="Área" value={area} onChange={setArea} options={[{ id: 'all', label: 'Todas' }, ...tax.areas.map((a) => ({ id: a.key, label: a.name.replace('Freelance web', 'Web') }))]} />
      </div>

      {accounts.length > 0 && <div className="mt-3"><Segmented label="Cuenta" value={acct} onChange={setAcct} options={[{ id: 'all', label: 'Todas las cuentas' }, ...accounts.map((a) => ({ id: a.id, label: a.name })), { id: 'none', label: 'Sin cuenta' }]} /></div>}
      <ErrorBar msg={db.error} onClose={db.clearError} />

      {db.loading ? <div className="grid h-48 place-items-center"><Loader2 className="animate-spin" aria-label="Cargando" /></div> : groups.length === 0 ? (
        <Empty title="Sin movimientos" text="Registra lo que entra y lo que sale. Los cobros de tus trabajos ya se cuentan solos en el Resumen." action="Registrar uno" onAction={() => setDraft(blank())} />
      ) : (
        <>
          <div className="stats mt-6">
            <Stat label="Entró" value={money(totals.inc, totals.cur)} tone="pos" />
            <Stat label="Salió" value={money(totals.out, totals.cur)} />
            <Stat label="Quedó" value={money(totals.inc - totals.out, totals.cur)} tone={totals.inc - totals.out < 0 ? 'neg' : undefined} note={totals.mixed ? 'Solo cuenta ' + totals.cur : undefined} />
          </div>
          {groups.map(([date, items]) => (
            <Group key={date} title={new Date(date + 'T12:00:00').toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long' })}>
              {items.map((t) => (
                <Row key={t.id} tone={tax.areaMeta(t.area).color} title={t.category} sub={<>{accounts.find((a) => a.id === t.account_id)?.name ? `${accounts.find((a) => a.id === t.account_id)!.name} · ` : ''}{tax.areaMeta(t.area).name}{t.note ? ` · ${t.note}` : ''}</>}
                  value={`${t.kind === 'income' ? '+' : '−'}${money(Number(t.amount), t.currency)}`} valueTone={t.kind === 'income' ? 'pos' : undefined}
                  onClick={() => setDraft({ id: t.id, account: t.account_id ?? '', kind: t.kind, amount: String(t.amount), currency: t.currency, category: t.category, area: t.area, date: t.tx_date, note: t.note ?? '' })} />
              ))}
            </Group>
          ))}
        </>
      )}

      <Sheet open={Boolean(draft)} title={draft?.id ? 'Editar movimiento' : 'Nuevo movimiento'} onClose={() => setDraft(null)}>
        {draft && <Form d={draft} setD={setDraft} tax={tax} accounts={accounts} onSave={save} err={err} onDelete={draft.id ? async () => { await db.remove(draft.id!); setDraft(null) } : undefined} />}
      </Sheet>
    </div>
  )
}
