import { Loader2, Plus, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import Sheet from '../../components/Sheet'
import { Group, PageHeader, Row } from '../../components/ui'
import { addPeriod, monthlyCost, type Area, type Period, type Sub, type Tx } from '../../lib/finance'
import type { Account } from '../../lib/accounts'
import { useTaxonomy } from '../../lib/taxonomy'
import { AreaField, CategoryField } from './fields'
import { money } from '../../lib/projects'
import { dayNum } from '../../lib/recur'
import { useTable } from '../../lib/table'
import { localISO } from '../../lib/time'
import { Empty, ErrorBar, chip, defaultCurrency, toNum } from './shared'

type Draft = { id?: string; account: string; name: string; amount: string; currency: string; period: Period; next_due: string; category: string; area: Area; url: string }
const blank = (): Draft => ({ account: '', name: '', amount: '', currency: defaultCurrency(), period: 'monthly', next_due: localISO(), category: 'Software y servicios', area: 'personal', url: '' })
const PERIODS: [Period, string][] = [['weekly', 'Semanal'], ['monthly', 'Mensual'], ['yearly', 'Anual']]

export default function Subscriptions() {
  const tax = useTaxonomy()
  const db = useTable<Sub>('subscriptions', { col: 'next_due', asc: true })
  const txs = useTable<Tx>('fin_transactions', { col: 'tx_date', asc: false })
  const [d, setD] = useState<Draft | null>(null)
  const [err, setErr] = useState('')
  const [msg, setMsg] = useState('')
  const [paying, setPaying] = useState<Sub | null>(null)
  const accountsDb = useTable<Account>('fin_accounts', { col: 'position', asc: true })
  const accounts = useMemo(() => accountsDb.rows.filter((a) => !a.archived), [accountsDb.rows])
  const [confirm, setConfirm] = useState(false)
  const today = localISO()

  const active = useMemo(() => db.rows.filter((s) => s.active), [db.rows])
  const totals = useMemo(() => { const t: Record<string, number> = {}; for (const s of active) t[s.currency] = (t[s.currency] ?? 0) + monthlyCost(s); return t }, [active])

  const save = async () => {
    if (!d) return
    const n = toNum(d.amount)
    if (!d.name.trim() || !(n >= 0)) return setErr('Ponle nombre y un monto válido.')
    const v = { name: d.name.trim(), amount: n, currency: d.currency, period: d.period, next_due: d.next_due, category: d.category.trim() || 'Software y servicios', area: d.area, url: d.url.trim() || null, notes: null, active: true, account_id: d.account || null }
    if (d.id) await db.update(d.id, v); else await db.add(v)
    setD(null); setErr('')
  }

  // Marcar pagada: registra el gasto y pasa a la siguiente fecha
  const payWith = async (s: Sub, account: string | null) => {
    await txs.add({ kind: 'expense', amount: s.amount, currency: s.currency, category: s.category, area: s.area, tx_date: today, note: s.name, account_id: account })
    await db.update(s.id, { next_due: addPeriod(s.next_due, s.period), ...(account && !s.account_id ? { account_id: account } : {}) })
    const a = accounts.find((x) => x.id === account)
    setMsg(`Pagada${a ? ` con ${a.name}` : ''}. Próximo cobro: ${addPeriod(s.next_due, s.period)}.`); setTimeout(() => setMsg(''), 4500)
  }
  // Con cuenta asignada paga directo; si no, pregunta con cuál (si ya tienes cuentas)
  const paid = (s: Sub) => { if (s.account_id || accounts.length === 0) void payWith(s, s.account_id ?? null); else setPaying(s) }

  const days = (iso: string) => dayNum(iso) - dayNum(today)

  return (
    <div>
      <PageHeader eyebrow="Dinero" title="Suscripciones" action={<button className="btn btn-primary" onClick={() => setD(blank())}><Plus size={18} aria-hidden /> Suscripción</button>} />
      <ErrorBar msg={db.error || txs.error} onClose={db.clearError} />
      {msg && <p role="status" className="mb-3 text-sm" style={{ color: 'var(--pos)' }}>{msg}</p>}
      {db.loading ? <div className="grid h-48 place-items-center"><Loader2 className="animate-spin" aria-label="Cargando" /></div> : active.length === 0 ? (
        <Empty title="Sin suscripciones" text="Dominios, hosting, apps, plataformas de música. Anótalas y no se te pasa ningún cobro." action="Agregar una" onAction={() => setD(blank())} />
      ) : (
        <Group title="Próximos cobros" footer={Object.keys(totals).length > 0 ? <>Gastas al mes: {Object.entries(totals).map(([c, v]) => money(v, c)).join(' · ')}</> : undefined}>
          {active.map((s) => {
            const n = days(s.next_due)
            const soon = n <= 7
            return (
              <Row key={s.id} tone={soon ? 'var(--personal)' : 'var(--ink-faint)'} title={s.name}
                sub={<span style={{ color: soon ? 'var(--personal)' : undefined }}>{n < 0 ? `Venció hace ${-n} d` : n === 0 ? 'Vence hoy' : n === 1 ? 'Vence mañana' : `Vence en ${n} d`}<span style={{ color: 'var(--ink-faint)' }}> · {accounts.find((a) => a.id === s.account_id)?.name ?? tax.areaMeta(s.area).name}</span></span>}
                value={money(s.amount, s.currency)} chevron={false}
                onClick={() => setD({ id: s.id, account: s.account_id ?? '', name: s.name, amount: String(s.amount), currency: s.currency, period: s.period, next_due: s.next_due, category: s.category, area: s.area, url: s.url ?? '' })}
                trailing={<button className="btn btn-tint" onClick={() => paid(s)}>Pagada</button>} />
            )
          })}
        </Group>
      )}
      <Sheet open={Boolean(d)} title={d?.id ? 'Editar suscripción' : 'Nueva suscripción'} onClose={() => setD(null)}>
        {d && (
          <form className="grid gap-4" onSubmit={(e) => { e.preventDefault(); save() }}>
            <label className="grid gap-2 text-sm">Nombre<input className="field" value={d.name} onChange={(e) => setD({ ...d, name: e.target.value })} maxLength={200} placeholder="Dominio, hosting, Spotify…" /></label>
            <div className="grid gap-3">
              <label className="grid gap-2 text-sm">Monto<input className="field" inputMode="decimal" value={d.amount} onChange={(e) => setD({ ...d, amount: e.target.value })} /></label>
            </div>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Frecuencia">{PERIODS.map(([v, l]) => <button key={v} type="button" aria-pressed={d.period === v} onClick={() => setD({ ...d, period: v })} className="min-h-11 rounded-full border px-4 text-sm" style={chip(d.period === v)}>{l}</button>)}</div>
            <label className="grid gap-2 text-sm">Próximo cobro<input type="date" className="field" value={d.next_due} onChange={(e) => setD({ ...d, next_due: e.target.value })} /></label>
            <CategoryField kind="expense" value={d.category} onChange={(v) => setD({ ...d, category: v })} tax={tax} />
            <AreaField value={d.area} onChange={(v) => setD({ ...d, area: v })} tax={tax} />
            {accounts.length > 0 && (
              <fieldset><legend className="mb-2 text-sm">Se paga con</legend>
                <div className="flex flex-wrap gap-2">
                  {accounts.map((a) => <button key={a.id} type="button" aria-pressed={d.account === a.id} onClick={() => setD({ ...d, account: a.id })} className="min-h-11 rounded-full px-4 text-sm" style={{ background: d.account === a.id ? `color-mix(in oklab, ${a.color} 22%, transparent)` : 'var(--surface-2)', color: d.account === a.id ? a.color : 'var(--ink-soft)', boxShadow: d.account === a.id ? `inset 0 0 0 1.5px ${a.color}` : 'none' }}>{a.name}</button>)}
                  <button type="button" aria-pressed={!d.account} onClick={() => setD({ ...d, account: '' })} className="min-h-11 rounded-full px-4 text-sm" style={{ background: !d.account ? 'var(--surface-3)' : 'var(--surface-2)', color: 'var(--ink-faint)' }}>Preguntarme</button>
                </div>
              </fieldset>
            )}
            <label className="grid gap-2 text-sm">Enlace (opcional)<input className="field" inputMode="url" value={d.url} onChange={(e) => setD({ ...d, url: e.target.value })} maxLength={500} placeholder="https://" /></label>
            {err && <p role="alert" className="text-sm" style={{ color: 'var(--neg)' }}>{err}</p>}
            <div className="flex items-center gap-3">
              <button className="btn btn-primary">Guardar</button>
              {d.id && <button type="button" className="btn btn-ghost ml-auto" style={{ color: confirm ? 'var(--neg)' : undefined }} onClick={async () => { if (confirm) { await db.remove(d.id!); setD(null); setConfirm(false) } else setConfirm(true) }}><Trash2 size={16} aria-hidden /> {confirm ? '¿Seguro?' : 'Eliminar'}</button>}
            </div>
          </form>
        )}
      </Sheet>
      <Sheet open={Boolean(paying)} title={paying ? `Pagar ${paying.name}` : ''} onClose={() => setPaying(null)}>
        {paying && (
          <div className="grid gap-3">
            <p className="text-sm" style={{ color: 'var(--ink-soft)' }}>{money(paying.amount, paying.currency)} saldrán de la cuenta que elijas. La próxima vez se usará la misma.</p>
            <div className="grid gap-2">
              {accounts.map((a) => <button key={a.id} className="pick" onClick={() => { const s = paying; setPaying(null); void payWith(s, a.id) }}>{a.name}{a.bank ? ` · ${a.bank}` : ''}</button>)}
              <button className="pick" style={{ color: 'var(--ink-faint)' }} onClick={() => { const s = paying; setPaying(null); void payWith(s, null) }}>Sin cuenta</button>
            </div>
          </div>
        )}
      </Sheet>
    </div>
  )
}
