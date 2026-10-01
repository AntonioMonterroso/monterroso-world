import { Loader2, Plus, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import Sheet from '../../components/Sheet'
import { AREAS, EXPENSE_CATEGORIES, INCOME_CATEGORIES, areaMeta, type Area, type Kind, type Tx } from '../../lib/finance'
import { currentMonth, money, monthLabel, shiftMonth } from '../../lib/projects'
import { useTable } from '../../lib/table'
import { localISO } from '../../lib/time'
import { CurrencySelect, Empty, ErrorBar, chip, defaultCurrency, rememberCurrency, toNum } from './shared'

type Draft = { id?: string; kind: Kind; amount: string; currency: string; category: string; area: Area; date: string; note: string }
const blank = (kind: Kind = 'expense'): Draft => ({ kind, amount: '', currency: defaultCurrency(), category: kind === 'income' ? 'Proyecto web' : 'Comida', area: kind === 'income' ? 'web' : 'personal', date: localISO(), note: '' })

function Form({ d, setD, onSave, onDelete, err }: { d: Draft; setD: (d: Draft) => void; onSave: () => void; onDelete?: () => void; err: string }) {
  const [confirm, setConfirm] = useState(false)
  const cats = d.kind === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES
  return (
    <form className="grid gap-4" onSubmit={(e) => { e.preventDefault(); onSave() }}>
      <div className="inline-flex w-fit rounded-full p-1" style={{ background: 'var(--bg)' }} role="group" aria-label="Tipo">
        {(['expense', 'income'] as const).map((k) => <button key={k} type="button" aria-pressed={d.kind === k} onClick={() => setD({ ...d, kind: k, category: k === 'income' ? 'Proyecto web' : 'Comida' })} className="min-h-11 rounded-full px-4 text-sm font-semibold" style={{ background: d.kind === k ? (k === 'income' ? '#8fd1a4' : 'var(--personal)') : 'transparent', color: d.kind === k ? 'var(--bg)' : 'var(--ink-soft)' }}>{k === 'income' ? 'Ingreso' : 'Gasto'}</button>)}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <label className="grid gap-2 text-sm">Monto<input className="field" inputMode="decimal" value={d.amount} onChange={(e) => setD({ ...d, amount: e.target.value })} placeholder="0.00" autoFocus /></label>
        <CurrencySelect value={d.currency} onChange={(v) => setD({ ...d, currency: v })} />
      </div>
      <label className="grid gap-2 text-sm">Categoría
        <input className="field" list="cats" value={d.category} onChange={(e) => setD({ ...d, category: e.target.value })} maxLength={60} />
        <datalist id="cats">{cats.map((c) => <option key={c} value={c} />)}</datalist>
      </label>
      <fieldset>
        <legend className="mb-2 text-sm">Área</legend>
        <div className="flex flex-wrap gap-2">{AREAS.map((a) => <button key={a.id} type="button" aria-pressed={d.area === a.id} onClick={() => setD({ ...d, area: a.id })} className="min-h-11 rounded-full border px-4 text-sm" style={chip(d.area === a.id, a.color)}>{a.label}</button>)}</div>
      </fieldset>
      <label className="grid gap-2 text-sm">Fecha<input type="date" className="field" value={d.date} onChange={(e) => setD({ ...d, date: e.target.value })} /></label>
      <label className="grid gap-2 text-sm">Nota<input className="field" value={d.note} onChange={(e) => setD({ ...d, note: e.target.value })} maxLength={300} /></label>
      {err && <p role="alert" className="text-sm" style={{ color: '#e8a393' }}>{err}</p>}
      <div className="flex items-center gap-3">
        <button className="btn btn-primary">Guardar</button>
        {onDelete && <button type="button" className="btn btn-ghost ml-auto" style={{ color: confirm ? '#e8a393' : undefined }} onClick={() => (confirm ? onDelete() : setConfirm(true))}><Trash2 size={16} aria-hidden /> {confirm ? '¿Seguro?' : 'Eliminar'}</button>}
      </div>
    </form>
  )
}

export default function Transactions() {
  const db = useTable<Tx>('fin_transactions', { col: 'tx_date', asc: false })
  const [month, setMonth] = useState(currentMonth())
  const [kind, setKind] = useState<Kind | 'all'>('all')
  const [area, setArea] = useState<Area | 'all'>('all')
  const [draft, setDraft] = useState<Draft | null>(null)
  const [err, setErr] = useState('')

  useEffect(() => { if (!draft) setErr('') }, [draft])

  const list = useMemo(() => db.rows.filter((t) => t.tx_date.startsWith(month) && (kind === 'all' || t.kind === kind) && (area === 'all' || t.area === area)), [db.rows, month, kind, area])
  const groups = useMemo(() => { const m = new Map<string, Tx[]>(); for (const t of list) m.set(t.tx_date, [...(m.get(t.tx_date) ?? []), t]); return [...m.entries()] }, [list])

  const save = async () => {
    if (!draft) return
    const amount = toNum(draft.amount)
    if (!(amount > 0)) return setErr('Escribe un monto mayor a cero.')
    if (!draft.category.trim()) return setErr('Elige una categoría.')
    const v = { kind: draft.kind, amount, currency: draft.currency, category: draft.category.trim(), area: draft.area, tx_date: draft.date, note: draft.note.trim() || null }
    rememberCurrency(draft.currency)
    if (draft.id) await db.update(draft.id, v); else await db.add(v)
    setDraft(null)
  }

  return (
    <div>
      <div className="flex items-end justify-between gap-3">
        <div><p className="eyebrow">Dinero</p><h1 className="mt-2 font-display text-4xl">Movimientos</h1></div>
        <button className="btn btn-primary" onClick={() => setDraft(blank())}><Plus size={18} aria-hidden /> Movimiento</button>
      </div>

      <div className="mt-6 flex items-center gap-2">
        <button className="grid size-11 place-items-center rounded-full border" style={{ borderColor: 'var(--line)' }} onClick={() => setMonth(shiftMonth(month, -1))} aria-label="Mes anterior">‹</button>
        <h2 className="min-w-40 text-center font-display text-2xl first-letter:uppercase">{monthLabel(month)}</h2>
        <button className="grid size-11 place-items-center rounded-full border" style={{ borderColor: 'var(--line)' }} onClick={() => setMonth(shiftMonth(month, 1))} aria-label="Mes siguiente">›</button>
      </div>
      <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Filtros">
        {([['all', 'Todo'], ['income', 'Ingresos'], ['expense', 'Gastos']] as const).map(([v, l]) => <button key={v} aria-pressed={kind === v} onClick={() => setKind(v)} className="min-h-11 rounded-full border px-4 text-sm" style={chip(kind === v)}>{l}</button>)}
        <span className="w-px self-stretch" style={{ background: 'var(--line)' }} aria-hidden />
        {([{ id: 'all', label: 'Todas las áreas', color: 'var(--accent)' }, ...AREAS] as { id: Area | 'all'; label: string; color: string }[]).map((a) => <button key={a.id} aria-pressed={area === a.id} onClick={() => setArea(a.id)} className="min-h-11 rounded-full border px-4 text-sm" style={chip(area === a.id, a.color)}>{a.label}</button>)}
      </div>

      <ErrorBar msg={db.error} onClose={db.clearError} />

      {db.loading ? <div className="grid h-48 place-items-center"><Loader2 className="animate-spin" aria-label="Cargando" /></div> : groups.length === 0 ? (
        <Empty title="Sin movimientos" text="Registra lo que entra y lo que sale. Los cobros de tus trabajos ya se cuentan solos en el Resumen." action="Registrar uno" onAction={() => setDraft(blank())} />
      ) : (
        <div className="mt-6 grid gap-6">
          {groups.map(([date, items]) => (
            <section key={date} aria-label={date}>
              <h3 className="mb-2 text-sm font-semibold" style={{ color: 'var(--ink-soft)' }}>{new Date(date + 'T12:00:00').toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long' })}</h3>
              <ul className="grid gap-2">
                {items.map((t) => (
                  <li key={t.id}>
                    <button onClick={() => setDraft({ id: t.id, kind: t.kind, amount: String(t.amount), currency: t.currency, category: t.category, area: t.area, date: t.tx_date, note: t.note ?? '' })} className="flex min-h-14 w-full items-center justify-between gap-3 rounded-xl border px-4 py-2 text-left" style={{ background: 'var(--surface)', borderColor: 'var(--line-soft)' }}>
                      <span className="min-w-0"><span className="block truncate font-semibold">{t.category}</span><span className="block truncate text-xs" style={{ color: areaMeta(t.area).color }}>{areaMeta(t.area).label}{t.note && <span style={{ color: 'var(--ink-faint)' }}> · {t.note}</span>}</span></span>
                      <span className="shrink-0 font-semibold" style={{ color: t.kind === 'income' ? '#8fd1a4' : 'var(--ink)' }}>{t.kind === 'income' ? '+' : '−'}{money(Number(t.amount), t.currency)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      <Sheet open={Boolean(draft)} title={draft?.id ? 'Editar movimiento' : 'Nuevo movimiento'} onClose={() => setDraft(null)}>
        {draft && <Form d={draft} setD={setDraft} onSave={save} err={err} onDelete={draft.id ? async () => { await db.remove(draft.id!); setDraft(null) } : undefined} />}
      </Sheet>
    </div>
  )
}
