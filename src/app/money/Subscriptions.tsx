import { Loader2, Plus, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import Sheet from '../../components/Sheet'
import { Group, PageHeader, Row } from '../../components/ui'
import { AREAS, EXPENSE_CATEGORIES, addPeriod, areaMeta, monthlyCost, type Area, type Period, type Sub, type Tx } from '../../lib/finance'
import { money } from '../../lib/projects'
import { dayNum } from '../../lib/recur'
import { useTable } from '../../lib/table'
import { localISO } from '../../lib/time'
import { CurrencySelect, Empty, ErrorBar, chip, defaultCurrency, toNum } from './shared'

type Draft = { id?: string; name: string; amount: string; currency: string; period: Period; next_due: string; category: string; area: Area; url: string }
const blank = (): Draft => ({ name: '', amount: '', currency: defaultCurrency(), period: 'monthly', next_due: localISO(), category: 'Software y servicios', area: 'personal', url: '' })
const PERIODS: [Period, string][] = [['weekly', 'Semanal'], ['monthly', 'Mensual'], ['yearly', 'Anual']]

export default function Subscriptions() {
  const db = useTable<Sub>('subscriptions', { col: 'next_due', asc: true })
  const txs = useTable<Tx>('fin_transactions', { col: 'tx_date', asc: false })
  const [d, setD] = useState<Draft | null>(null)
  const [err, setErr] = useState('')
  const [confirm, setConfirm] = useState(false)
  const today = localISO()

  const active = useMemo(() => db.rows.filter((s) => s.active), [db.rows])
  const totals = useMemo(() => { const t: Record<string, number> = {}; for (const s of active) t[s.currency] = (t[s.currency] ?? 0) + monthlyCost(s); return t }, [active])

  const save = async () => {
    if (!d) return
    const n = toNum(d.amount)
    if (!d.name.trim() || !(n >= 0)) return setErr('Ponle nombre y un monto válido.')
    const v = { name: d.name.trim(), amount: n, currency: d.currency, period: d.period, next_due: d.next_due, category: d.category.trim() || 'Software y servicios', area: d.area, url: d.url.trim() || null, notes: null, active: true }
    if (d.id) await db.update(d.id, v); else await db.add(v)
    setD(null); setErr('')
  }

  // Marcar pagada: registra el gasto y pasa a la siguiente fecha
  const paid = async (s: Sub) => {
    await txs.add({ kind: 'expense', amount: s.amount, currency: s.currency, category: s.category, area: s.area, tx_date: today, note: s.name })
    await db.update(s.id, { next_due: addPeriod(s.next_due, s.period) })
  }

  const days = (iso: string) => dayNum(iso) - dayNum(today)

  return (
    <div>
      <PageHeader eyebrow="Dinero" title="Suscripciones" action={<button className="btn btn-primary" onClick={() => setD(blank())}><Plus size={18} aria-hidden /> Suscripción</button>} />
      <ErrorBar msg={db.error || txs.error} onClose={db.clearError} />
      {db.loading ? <div className="grid h-48 place-items-center"><Loader2 className="animate-spin" aria-label="Cargando" /></div> : active.length === 0 ? (
        <Empty title="Sin suscripciones" text="Dominios, hosting, apps, plataformas de música. Anótalas y no se te pasa ningún cobro." action="Agregar una" onAction={() => setD(blank())} />
      ) : (
        <Group title="Próximos cobros" footer={Object.keys(totals).length > 0 ? <>Gastas al mes: {Object.entries(totals).map(([c, v]) => money(v, c)).join(' · ')}</> : undefined}>
          {active.map((s) => {
            const n = days(s.next_due)
            const soon = n <= 7
            return (
              <Row key={s.id} tone={soon ? 'var(--personal)' : 'var(--ink-faint)'} title={s.name}
                sub={<span style={{ color: soon ? 'var(--personal)' : undefined }}>{n < 0 ? `Venció hace ${-n} d` : n === 0 ? 'Vence hoy' : n === 1 ? 'Vence mañana' : `Vence en ${n} d`}<span style={{ color: 'var(--ink-faint)' }}> · {areaMeta(s.area).label}</span></span>}
                value={money(s.amount, s.currency)} chevron={false}
                onClick={() => setD({ id: s.id, name: s.name, amount: String(s.amount), currency: s.currency, period: s.period, next_due: s.next_due, category: s.category, area: s.area, url: s.url ?? '' })}
                trailing={<button className="btn btn-tint" onClick={() => paid(s)}>Pagada</button>} />
            )
          })}
        </Group>
      )}
      <Sheet open={Boolean(d)} title={d?.id ? 'Editar suscripción' : 'Nueva suscripción'} onClose={() => setD(null)}>
        {d && (
          <form className="grid gap-4" onSubmit={(e) => { e.preventDefault(); save() }}>
            <label className="grid gap-2 text-sm">Nombre<input className="field" value={d.name} onChange={(e) => setD({ ...d, name: e.target.value })} maxLength={200} placeholder="Dominio, hosting, Spotify…" /></label>
            <div className="grid grid-cols-2 gap-3">
              <label className="grid gap-2 text-sm">Monto<input className="field" inputMode="decimal" value={d.amount} onChange={(e) => setD({ ...d, amount: e.target.value })} /></label>
              <CurrencySelect value={d.currency} onChange={(v) => setD({ ...d, currency: v })} />
            </div>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Frecuencia">{PERIODS.map(([v, l]) => <button key={v} type="button" aria-pressed={d.period === v} onClick={() => setD({ ...d, period: v })} className="min-h-11 rounded-full border px-4 text-sm" style={chip(d.period === v)}>{l}</button>)}</div>
            <label className="grid gap-2 text-sm">Próximo cobro<input type="date" className="field" value={d.next_due} onChange={(e) => setD({ ...d, next_due: e.target.value })} /></label>
            <label className="grid gap-2 text-sm">Categoría<input className="field" list="scats" value={d.category} onChange={(e) => setD({ ...d, category: e.target.value })} maxLength={60} /><datalist id="scats">{EXPENSE_CATEGORIES.map((c) => <option key={c} value={c} />)}</datalist></label>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Área">{AREAS.map((a) => <button key={a.id} type="button" aria-pressed={d.area === a.id} onClick={() => setD({ ...d, area: a.id })} className="min-h-11 rounded-full border px-4 text-sm" style={chip(d.area === a.id, a.color)}>{a.label}</button>)}</div>
            <label className="grid gap-2 text-sm">Enlace (opcional)<input className="field" inputMode="url" value={d.url} onChange={(e) => setD({ ...d, url: e.target.value })} maxLength={500} placeholder="https://" /></label>
            {err && <p role="alert" className="text-sm" style={{ color: '#e8a393' }}>{err}</p>}
            <div className="flex items-center gap-3">
              <button className="btn btn-primary">Guardar</button>
              {d.id && <button type="button" className="btn btn-ghost ml-auto" style={{ color: confirm ? '#e8a393' : undefined }} onClick={async () => { if (confirm) { await db.remove(d.id!); setD(null); setConfirm(false) } else setConfirm(true) }}><Trash2 size={16} aria-hidden /> {confirm ? '¿Seguro?' : 'Eliminar'}</button>}
            </div>
          </form>
        )}
      </Sheet>
    </div>
  )
}
