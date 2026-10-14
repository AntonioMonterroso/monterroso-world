import { CalendarClock, Loader2, Pencil, Plus, ShieldAlert, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import Sheet from '../../components/Sheet'
import { Group, MonthStepper, PageHeader, Row, Segmented, Stat } from '../../components/ui'
import type { Account } from '../../lib/accounts'
import { lastMonths, type Goal, type Tx } from '../../lib/finance'
import { currentMonth, money } from '../../lib/projects'
import { syncReminder } from '../../lib/remind'
import { REASONS, duePlans, emergencyTarget, paceOf, pendingPlans, reasonLabel, summarize, withdrawalImpact, type Move, type Plan, type ReasonKind } from '../../lib/savings'
import { useTable } from '../../lib/table'
import { localISO } from '../../lib/time'
import { AccountPick, lastAccount, rememberAccount } from './AccountPick'
import { Empty, ErrorBar, defaultCurrency, toNum } from './shared'

type Tab = 'goals' | 'history' | 'plans'
type W = { goal: Goal; amount: string; kind: ReasonKind | ''; note: string; acct: string; plan?: Plan }
type P = { goal: string; amount: string; date: string; reason: string; acct: string }
const cap = (t: string) => t.charAt(0).toUpperCase() + t.slice(1)

/** Ahorro: tus metas, de dónde viene y a dónde va cada quetzal. Sacarlo es posible, pero pide un motivo y tu confirmación. */
export default function Goals() {
  const db = useTable<Goal>('savings_goals', { col: 'created_at', asc: true })
  const moves = useTable<Move>('fin_goal_moves', { col: 'tx_date', asc: false })
  const plans = useTable<Plan>('savings_plans', { col: 'planned_for', asc: true })
  const txs = useTable<Tx>('fin_transactions', { col: 'tx_date', asc: false })
  const accountsDb = useTable<Account>('fin_accounts', { col: 'position', asc: true })
  const accounts = accountsDb.rows.filter((a) => !a.archived)
  const today = localISO()
  const [month, setMonth] = useState(currentMonth())
  const [tab, setTab] = useState<Tab>('goals')
  const [add, setAdd] = useState<Record<string, string>>({})
  const [acct, setAcct] = useState(lastAccount())
  const [note, setNote] = useState('')
  const [err, setErr] = useState('')
  const [confirm, setConfirm] = useState<string | null>(null)
  // nueva meta / editar
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [target, setTarget] = useState('')
  const [due, setDue] = useState('')
  const [edit, setEdit] = useState<{ id: string; title: string; target: string; due: string } | null>(null)
  // retiro con confirmación y retiro planeado
  const [w, setW] = useState<W | null>(null)
  const [wErr, setWErr] = useState('')
  const [p, setP] = useState<P | null>(null)
  const [pErr, setPErr] = useState('')
  const [sp, setSp] = useSearchParams()

  const goalName = (id: string) => db.rows.find((g) => g.id === id)?.title ?? 'Meta eliminada'
  const accName = (id?: string | null) => accounts.find((a) => a.id === id)?.name ?? accountsDb.rows.find((a) => a.id === id)?.name
  const summary = useMemo(() => summarize(db.rows, moves.rows, month), [db.rows, moves.rows, month])
  const pending = useMemo(() => pendingPlans(plans.rows), [plans.rows])
  const due_ = useMemo(() => duePlans(plans.rows, today), [plans.rows, today])
  const avgExpense = useMemo(() => { const s = lastMonths(txs.rows, currentMonth(), 3, 'GTQ').filter((x) => x.expense > 0); return s.length ? s.reduce((a, x) => a + x.expense, 0) / s.length : 0 }, [txs.rows])
  const emergency = emergencyTarget(avgExpense)

  // Viene de Hoy: editar una meta o confirmar un retiro planeado
  useEffect(() => {
    if (db.loading || plans.loading) return
    const id = sp.get('editar'), plan = sp.get('plan')
    if (id) { const g = db.rows.find((x) => x.id === id); if (g) setEdit({ id: g.id, title: g.title, target: String(g.target), due: g.due_date ?? '' }) }
    if (plan) { setTab('plans'); const pl = plans.rows.find((x) => x.id === plan); const g = pl && db.rows.find((x) => x.id === pl.goal_id); if (pl && g) openWithdraw(g, pl) }
    if (id || plan) setSp({}, { replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sp, db.loading, plans.loading])

  const create = async (e: React.FormEvent) => {
    e.preventDefault()
    const t = toNum(target)
    if (!title.trim() || !(t > 0)) return setErr('Ponle nombre y una meta mayor a cero.')
    await db.add({ title: title.trim(), target: t, saved: 0, currency: defaultCurrency(), due_date: due || null })
    setOpen(false); setTitle(''); setTarget(''); setDue(''); setErr('')
  }
  const saveEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!edit) return
    const t = toNum(edit.target)
    if (!edit.title.trim() || !(t > 0)) return setErr('Ponle nombre y una meta mayor a cero.')
    await db.update(edit.id, { title: edit.title.trim(), target: t, due_date: edit.due || null })
    setEdit(null); setErr('')
  }

  const flash = (m: string) => { setNote(m); setTimeout(() => setNote(''), 5000) }

  const deposit = async (g: Goal) => {
    const n = toNum(add[g.id] ?? '')
    if (!(n > 0)) return
    await db.update(g.id, { saved: Math.round((Number(g.saved) + n) * 100) / 100 })
    const row = await moves.add({ goal_id: g.id, account_id: acct || null, amount: n, tx_date: today, reason: null, reason_kind: null, plan_id: null } as never)
    if (!row) return setErr('No se pudo registrar el aporte.')
    rememberAccount(acct)
    flash(`${money(n)} apartados para “${g.title}”${accName(acct) ? ` desde ${accName(acct)}` : ''}.`)
    setAdd({ ...add, [g.id]: '' })
  }

  const openWithdraw = (g: Goal, plan?: Plan) => { setWErr(''); setW({ goal: g, amount: plan ? String(plan.amount) : '', kind: plan ? 'planned' : '', note: plan?.reason ?? '', acct: plan?.account_id ?? lastAccount(), plan }) }
  const impact = w ? withdrawalImpact(w.goal, toNum(w.amount) || 0) : null
  const confirmWithdraw = async () => {
    if (!w) return
    const n = toNum(w.amount)
    if (!(n > 0)) return setWErr('Escribe cuánto necesitas sacar.')
    if (n > Number(w.goal.saved)) return setWErr(`Esa meta solo tiene ${money(Number(w.goal.saved))} ahorrados.`)
    if (!w.kind) return setWErr('Elige por qué necesitas este dinero.')
    if (w.kind === 'other' && !w.note.trim()) return setWErr('Cuéntame el motivo, para que después te acuerdes.')
    await db.update(w.goal.id, { saved: Math.max(0, Math.round((Number(w.goal.saved) - n) * 100) / 100) })
    const row = await moves.add({ goal_id: w.goal.id, account_id: w.acct || null, amount: -n, tx_date: today, reason: w.note.trim() || null, reason_kind: w.kind, plan_id: w.plan?.id ?? null } as never)
    if (!row) return setWErr('No se pudo registrar el retiro. Tu ahorro no cambió en el historial; revisa tu conexión.')
    if (w.plan) { await syncReminder(w.plan.event_id ?? null, null); await plans.update(w.plan.id, { status: 'done', event_id: null }) }
    rememberAccount(w.acct)
    flash(`Retiraste ${money(n)} de “${w.goal.title}”${accName(w.acct) ? ` hacia ${accName(w.acct)}` : ''}. Quedó anotado el motivo.`)
    setW(null); setWErr('')
  }

  const openPlan = (g?: Goal) => { setPErr(''); setP({ goal: g?.id ?? db.rows[0]?.id ?? '', amount: '', date: today, reason: '', acct: lastAccount() }) }
  const savePlan = async () => {
    if (!p) return
    const n = toNum(p.amount), g = db.rows.find((x) => x.id === p.goal)
    if (!g) return setPErr('Elige la meta.')
    if (!(n > 0)) return setPErr('Escribe el monto que planeas sacar.')
    if (n > Number(g.saved)) return setPErr(`Esa meta solo tiene ${money(Number(g.saved))} ahorrados ahora. Planéalo cuando lo tengas.`)
    if (!p.reason.trim()) return setPErr('¿Para qué es? Anótalo.')
    if (p.date < today) return setPErr('La fecha no puede ser del pasado.')
    const event_id = await syncReminder(null, { title: `Retiro planeado de tu ahorro: ${g.title}`, action: `${money(n)} · ${p.reason.trim()}. Confirma solo si de verdad lo necesitas.`, date: p.date, minute: 9 * 60 })
    const row = await plans.add({ goal_id: g.id, account_id: p.acct || null, amount: n, planned_for: p.date, reason: p.reason.trim(), status: 'pending', event_id } as never)
    if (!row) return setPErr('No se pudo guardar el plan.')
    rememberAccount(p.acct)
    setP(null); setTab('plans')
  }
  const cancelPlan = async (pl: Plan) => { await syncReminder(pl.event_id ?? null, null); await plans.update(pl.id, { status: 'cancelled', event_id: null }) }
  const postpone = async (pl: Plan) => {
    const d = new Date(pl.planned_for + 'T12:00:00'); d.setDate(d.getDate() + 7)
    const next = localISO(d < new Date() ? new Date(Date.now() + 7 * 86_400_000) : d)
    const g = db.rows.find((x) => x.id === pl.goal_id)
    const event_id = await syncReminder(pl.event_id ?? null, { title: `Retiro planeado de tu ahorro: ${g?.title ?? ''}`, action: `${money(pl.amount)} · ${pl.reason}. Confirma solo si de verdad lo necesitas.`, date: next, minute: 9 * 60 })
    await plans.update(pl.id, { planned_for: next, event_id })
  }

  const history = useMemo(() => {
    const list = moves.rows.filter((m) => m.tx_date.startsWith(month))
    const by = new Map<string, Move[]>()
    for (const m of list) by.set(m.tx_date, [...(by.get(m.tx_date) ?? []), m])
    return [...by.entries()]
  }, [moves.rows, month])

  const loading = db.loading || moves.loading

  return (
    <div>
      <PageHeader eyebrow="Dinero" title="Ahorro" sub="Este dinero no se toca. Si algún día sale, queda dicho cuánto, cuándo y por qué." action={<button className="btn btn-primary" onClick={() => { setErr(''); setOpen(true) }}><Plus size={18} aria-hidden /> Meta</button>} />
      <ErrorBar msg={db.error || moves.error || plans.error || err} onClose={() => { db.clearError(); setErr('') }} />
      {note && <p role="status" className="mb-3 text-sm" style={{ color: 'var(--pos)' }}>{note}</p>}

      {due_.length > 0 && (
        <button type="button" className="mb-4 flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left" style={{ background: 'color-mix(in oklab, var(--accent) 12%, var(--surface))', boxShadow: 'inset 0 0 0 1px color-mix(in oklab, var(--accent) 30%, transparent)' }} onClick={() => setTab('plans')}>
          <CalendarClock size={20} aria-hidden style={{ color: 'var(--accent)' }} />
          <span className="text-sm"><strong>{due_.length === 1 ? 'Hoy tenías un retiro planeado' : `Tienes ${due_.length} retiros planeados que ya tocan`}.</strong> Nada se saca solo: tú decides si lo confirmas.</span>
        </button>
      )}

      <MonthStepper month={month} onChange={setMonth} />
      <div className="stats">
        <Stat label="Ahorrado" value={money(summary.saved)} tone="pos" note={summary.target > 0 ? `${summary.pct}% de ${money(summary.target)}` : undefined} />
        <Stat label="Aportado" value={money(summary.deposited)} note="este mes" />
        <Stat label="Retirado" value={money(summary.withdrawn)} tone={summary.withdrawn > 0 ? 'neg' : undefined} note={summary.withdrawals > 0 ? `${summary.withdrawals} ${summary.withdrawals === 1 ? 'vez' : 'veces'}` : 'sin tocar'} />
      </div>

      <div className="mt-5"><Segmented label="Sección" value={tab} onChange={setTab} options={[{ id: 'goals', label: 'Metas' }, { id: 'history', label: 'Historial' }, { id: 'plans', label: pending.length ? `Retiros planeados ${pending.length}` : 'Retiros planeados' }]} /></div>

      {loading ? <div className="grid h-48 place-items-center"><Loader2 className="animate-spin" aria-label="Cargando" /></div> : tab === 'goals' ? (
        db.rows.length === 0 ? (
          <Empty title="¿Para qué estás ahorrando?" text="Un instrumento, una laptop, un viaje, un fondo de emergencia. Pon el monto y ve sumando aportes." action="Crear una meta" onAction={() => setOpen(true)} />
        ) : (
          <>
            {accounts.length > 0 && <div className="mt-4"><AccountPick accounts={accounts} value={acct} onChange={setAcct} label="Aportar desde / retirar hacia" none="Sin cuenta" /></div>}
            <ul className="group-list mt-4">
              {db.rows.map((g) => {
                const pct = g.target > 0 ? Math.min(100, Math.round((g.saved / g.target) * 100)) : 0
                const pace = paceOf(g, moves.rows.filter((m) => m.goal_id === g.id), today)
                const mine = moves.rows.filter((m) => m.goal_id === g.id)
                const lastOut = mine.find((m) => Number(m.amount) < 0)
                return (
                  <li key={g.id} className="row p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-semibold">{g.title}</p>
                        <button className="inline-flex min-h-9 items-center gap-1 text-xs underline" style={{ color: g.due_date && g.due_date < today && pct < 100 ? 'var(--neg)' : 'var(--ink-faint)' }} onClick={() => setEdit({ id: g.id, title: g.title, target: String(g.target), due: g.due_date ?? '' })}>{g.due_date ? `Para el ${g.due_date}` : 'Sin fecha · poner una'}</button>
                      </div>
                      <p className="shrink-0 text-right text-sm"><span className="font-semibold" style={{ color: pct >= 100 ? 'var(--pos)' : 'var(--ink)' }}>{money(g.saved, g.currency)}</span><span style={{ color: 'var(--ink-faint)' }}> / {money(g.target, g.currency)}</span></p>
                    </div>
                    <div className="meter mt-3" style={{ ['--meter' as string]: pct >= 100 ? 'var(--pos)' : 'var(--accent)' }} role="img" aria-label={`${pct}% ahorrado`}><i style={{ width: `${pct}%` }} /></div>
                    <p className="mt-2 text-xs" style={{ color: pace.onTrack === false ? 'var(--neg)' : 'var(--ink-faint)' }}>
                      {pct >= 100 ? '¡Meta lograda!' : pace.perMonth > 0 ? `Vas a ${money(pace.perMonth)} al mes${pace.eta ? ` · llegarías hacia ${new Date(pace.eta + 'T12:00:00').toLocaleDateString('es', { month: 'long', year: 'numeric' })}` : ''}${pace.onTrack === false ? ' · después de tu fecha' : pace.onTrack ? ' · a tiempo' : ''}` : 'Sin aportes recientes: con un poco cada mes se llega.'}
                    </p>
                    {lastOut && <p className="mt-1 text-xs" style={{ color: 'var(--ink-faint)' }}>Último retiro: {money(-Number(lastOut.amount))} el {lastOut.tx_date}{lastOut.reason_kind ? ` · ${reasonLabel(lastOut.reason_kind)}` : ''}</p>}
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <input className="field !w-28" inputMode="decimal" placeholder="Monto" aria-label={`Monto para ${g.title}`} value={add[g.id] ?? ''} onChange={(e) => setAdd({ ...add, [g.id]: e.target.value })} />
                      <button className="btn btn-primary" onClick={() => deposit(g)}>Aportar</button>
                      <button className="btn btn-ghost ml-auto" onClick={() => setEdit({ id: g.id, title: g.title, target: String(g.target), due: g.due_date ?? '' })} aria-label={`Editar ${g.title}`}><Pencil size={16} aria-hidden /></button>
                      <button className="btn btn-ghost" style={{ color: confirm === g.id ? 'var(--neg)' : undefined }} onClick={() => (confirm === g.id ? db.remove(g.id) : setConfirm(g.id))} aria-label={`Eliminar ${g.title}`}><Trash2 size={16} aria-hidden />{confirm === g.id ? ' ¿Seguro? Se borra su historial' : ''}</button>
                    </div>
                    {Number(g.saved) > 0 && (
                      <div className="mt-1 flex flex-wrap gap-4">
                        <button className="min-h-11 text-xs underline" style={{ color: 'var(--ink-faint)' }} onClick={() => openWithdraw(g)}>Necesito sacar dinero…</button>
                        <button className="min-h-11 text-xs underline" style={{ color: 'var(--ink-faint)' }} onClick={() => openPlan(g)}>Planear un retiro</button>
                      </div>
                    )}
                  </li>
                )
              })}
            </ul>
          </>
        )
      ) : tab === 'history' ? (
        history.length === 0 ? <Empty title="Sin movimientos de ahorro este mes" text="Cada aporte y cada retiro quedan aquí, con su fecha, su cuenta y el motivo." /> : (
          history.map(([date, items]) => (
            <Group key={date} title={cap(new Date(date + 'T12:00:00').toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long' }))}>
              {items.map((m) => {
                const out = Number(m.amount) < 0
                return <Row key={m.id} chevron={false} tone={out ? 'var(--neg)' : 'var(--pos)'} title={goalName(m.goal_id)}
                  sub={<>{out ? <strong style={{ color: 'var(--neg)' }}>Retiro</strong> : 'Aporte'}{out && m.reason_kind ? ` · ${reasonLabel(m.reason_kind)}` : ''}{m.plan_id ? ' · planeado' : ''}{accName(m.account_id) ? ` · ${out ? 'hacia' : 'desde'} ${accName(m.account_id)}` : ''}{m.reason ? ` · “${m.reason}”` : ''}</>}
                  value={`${out ? '−' : '+'}${money(Math.abs(Number(m.amount)))}`} valueTone={out ? undefined : 'pos'} />
              })}
            </Group>
          ))
        )
      ) : (
        <>
          <div className="mt-4 flex items-start gap-3 rounded-2xl p-4 text-sm" style={{ background: 'var(--surface)', color: 'var(--ink-soft)' }}>
            <ShieldAlert size={18} aria-hidden className="mt-0.5 shrink-0" style={{ color: 'var(--accent)' }} />
            <p>Solo planea un retiro si de verdad lo vas a necesitar. Llegado el día te aviso, pero <strong style={{ color: 'var(--ink)' }}>nunca se saca solo</strong>: tienes que confirmarlo.</p>
          </div>
          {pending.length === 0 ? <Empty title="Sin retiros planeados" text="Tu ahorro está quieto, que es lo ideal." action={db.rows.some((g) => Number(g.saved) > 0) ? 'Planear un retiro' : undefined} onAction={() => openPlan()} /> : (
            <Group title="Pendientes" aside={<button className="underline" onClick={() => openPlan()}>Planear otro</button>}>
              {pending.map((pl) => {
                const isDue = pl.planned_for <= today
                const g = db.rows.find((x) => x.id === pl.goal_id)
                return (
                  <Row key={pl.id} chevron={false} tone={isDue ? 'var(--accent)' : 'var(--ink-faint)'} title={`${money(pl.amount)} de ${goalName(pl.goal_id)}`}
                    sub={<>{isDue ? <strong style={{ color: 'var(--accent)' }}>Ya toca · </strong> : ''}{pl.planned_for} · “{pl.reason}”</>}>
                    <div className="flex flex-wrap gap-2 px-4 pb-3 pl-[3.75rem]">
                      {g && <button className="btn btn-tint min-h-11" onClick={() => openWithdraw(g, pl)}>{isDue ? 'Revisar y confirmar' : 'Confirmar ahora'}</button>}
                      <button className="btn btn-ghost min-h-11" onClick={() => void postpone(pl)}>Posponer 1 semana</button>
                      <button className="btn btn-ghost min-h-11" onClick={() => void cancelPlan(pl)}>Ya no lo necesito</button>
                    </div>
                  </Row>
                )
              })}
            </Group>
          )}
        </>
      )}

      {/* Retirar: motivo obligatorio y confirmación */}
      <Sheet open={Boolean(w)} title="Sacar de tu ahorro" onClose={() => setW(null)}>
        {w && impact && (
          <div className="grid gap-4">
            <p className="rounded-xl px-4 py-3 text-sm" style={{ background: 'color-mix(in oklab, var(--neg) 10%, var(--surface-2))', color: 'var(--ink-soft)' }}>
              Esto es tu ahorro de <strong style={{ color: 'var(--ink)' }}>{w.goal.title}</strong>: tienes <strong style={{ color: 'var(--ink)' }}>{money(Number(w.goal.saved))}</strong>. Antes de sacarlo, piénsalo un momento.
            </p>
            <label className="grid gap-2 text-sm">¿Cuánto necesitas sacar?<input className="field" inputMode="decimal" value={w.amount} onChange={(e) => setW({ ...w, amount: e.target.value })} placeholder="0.00" autoFocus /></label>
            <fieldset>
              <legend className="mb-2 text-sm">¿Por qué lo necesitas?</legend>
              <div className="flex flex-wrap gap-2">{REASONS.map((r) => <button key={r.id} type="button" aria-pressed={w.kind === r.id} onClick={() => setW({ ...w, kind: r.id })} className="min-h-11 rounded-full px-4 text-sm" style={{ background: w.kind === r.id ? 'color-mix(in oklab, var(--accent) 20%, transparent)' : 'var(--surface-2)', color: w.kind === r.id ? 'var(--accent)' : 'var(--ink-soft)', boxShadow: w.kind === r.id ? 'inset 0 0 0 1.5px var(--accent)' : 'none' }}>{r.label}</button>)}</div>
              {w.kind && <p className="mt-2 text-xs" style={{ color: 'var(--ink-faint)' }}>{REASONS.find((r) => r.id === w.kind)?.hint}</p>}
            </fieldset>
            <label className="grid gap-2 text-sm">{w.kind === 'other' ? 'Cuéntame el motivo' : 'Nota (opcional)'}<input className="field" value={w.note} maxLength={300} onChange={(e) => setW({ ...w, note: e.target.value })} placeholder="Para qué lo vas a usar" /></label>
            <AccountPick accounts={accounts} value={w.acct} onChange={(v) => setW({ ...w, acct: v })} label="El dinero vuelve a" none="Sin cuenta" />

            {(toNum(w.amount) || 0) > 0 && (
              <div className="rounded-xl px-4 py-3 text-sm" style={{ background: 'var(--surface-2)' }}>
                {impact.tooMuch ? <p style={{ color: 'var(--neg)' }}>Esa meta solo tiene {money(Number(w.goal.saved))}.</p> : (
                  <>
                    <p>La meta quedaría en <strong>{money(impact.newSaved)}</strong> ({impact.newPct}%){impact.lostPct > 0 ? `: retrocede ${impact.lostPct} puntos` : ''}.</p>
                    {impact.big && <p className="mt-1" style={{ color: 'var(--neg)' }}>Es más de la mitad de lo que tienes ahorrado.</p>}
                  </>
                )}
              </div>
            )}
            {wErr && <p role="alert" className="text-sm" style={{ color: 'var(--neg)' }}>{wErr}</p>}
            <div className="flex flex-wrap items-center gap-3">
              <button type="button" className="btn btn-primary" onClick={() => setW(null)}>Mejor no</button>
              <button type="button" className="btn btn-ghost" style={{ color: 'var(--neg)' }} onClick={() => void confirmWithdraw()}>Sí, sacar {money(toNum(w.amount) || 0)}</button>
            </div>
          </div>
        )}
      </Sheet>

      {/* Planear un retiro */}
      <Sheet open={Boolean(p)} title="Planear un retiro" onClose={() => setP(null)}>
        {p && (
          <div className="grid gap-4">
            <p className="text-sm" style={{ color: 'var(--ink-soft)' }}>Útil para algo que ya sabes que vendrá. El día que llegue te aviso, y entonces decides: <strong style={{ color: 'var(--ink)' }}>nada se saca sin tu confirmación</strong>.</p>
            <fieldset>
              <legend className="mb-2 text-sm">De qué meta</legend>
              <div className="flex flex-wrap gap-2">{db.rows.filter((g) => Number(g.saved) > 0).map((g) => <button key={g.id} type="button" aria-pressed={p.goal === g.id} onClick={() => setP({ ...p, goal: g.id })} className="min-h-11 rounded-full px-4 text-sm" style={{ background: p.goal === g.id ? 'color-mix(in oklab, var(--accent) 20%, transparent)' : 'var(--surface-2)', color: p.goal === g.id ? 'var(--accent)' : 'var(--ink-soft)' }}>{g.title}</button>)}</div>
            </fieldset>
            <div className="grid grid-cols-2 gap-3">
              <label className="grid gap-2 text-sm">Monto<input className="field" inputMode="decimal" value={p.amount} onChange={(e) => setP({ ...p, amount: e.target.value })} placeholder="0.00" /></label>
              <label className="grid gap-2 text-sm">Para el día<input type="date" className="field" min={today} value={p.date} onChange={(e) => setP({ ...p, date: e.target.value })} /></label>
            </div>
            <label className="grid gap-2 text-sm">¿Para qué es?<input className="field" value={p.reason} maxLength={300} onChange={(e) => setP({ ...p, reason: e.target.value })} placeholder="Pagar la inscripción, comprar el pedal…" /></label>
            <AccountPick accounts={accounts} value={p.acct} onChange={(v) => setP({ ...p, acct: v })} label="Volvería a" none="Sin cuenta" />
            {pErr && <p role="alert" className="text-sm" style={{ color: 'var(--neg)' }}>{pErr}</p>}
            <button type="button" className="btn btn-primary w-fit" onClick={() => void savePlan()}>Guardar el plan</button>
          </div>
        )}
      </Sheet>

      <Sheet open={Boolean(edit)} title="Editar meta" onClose={() => setEdit(null)}>
        {edit && (
          <form className="grid gap-4" onSubmit={saveEdit}>
            <label className="grid gap-2 text-sm">Nombre<input className="field" value={edit.title} onChange={(e) => setEdit({ ...edit, title: e.target.value })} maxLength={200} /></label>
            <label className="grid gap-2 text-sm">Meta<input className="field" inputMode="decimal" value={edit.target} onChange={(e) => setEdit({ ...edit, target: e.target.value })} /></label>
            <label className="grid gap-2 text-sm">Fecha límite
              <div className="flex gap-2">
                <input type="date" className="field" value={edit.due} onChange={(e) => setEdit({ ...edit, due: e.target.value })} />
                {edit.due && <button type="button" className="btn btn-ghost shrink-0" onClick={() => setEdit({ ...edit, due: '' })}>Quitar</button>}
              </div>
            </label>
            {err && <p role="alert" className="text-sm" style={{ color: 'var(--neg)' }}>{err}</p>}
            <button className="btn btn-primary w-fit">Guardar</button>
          </form>
        )}
      </Sheet>

      <Sheet open={open} title="Nueva meta" onClose={() => setOpen(false)}>
        <form className="grid gap-4" onSubmit={create}>
          {emergency > 0 && !db.rows.some((g) => /emergencia/i.test(g.title)) && (
            <button type="button" className="rounded-xl px-4 py-3 text-left text-sm" style={{ background: 'var(--surface-2)' }} onClick={() => { setTitle('Fondo de emergencia'); setTarget(String(emergency)) }}>
              <strong>Fondo de emergencia</strong> · {money(emergency)}<br /><span style={{ color: 'var(--ink-faint)' }}>Tres meses de lo que sueles gastar. Toca para usarlo.</span>
            </button>
          )}
          <label className="grid gap-2 text-sm">¿Qué quieres lograr?<input className="field" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} placeholder="Pedal de guitarra" /></label>
          <div className="grid gap-3">
            <label className="grid gap-2 text-sm">Meta<input className="field" inputMode="decimal" value={target} onChange={(e) => setTarget(e.target.value)} placeholder="0.00" /></label>
          </div>
          <label className="grid gap-2 text-sm">Fecha límite (opcional)<input type="date" className="field" value={due} onChange={(e) => setDue(e.target.value)} /></label>
          {err && <p role="alert" className="text-sm" style={{ color: 'var(--neg)' }}>{err}</p>}
          <button className="btn btn-primary w-fit">Crear</button>
        </form>
      </Sheet>
    </div>
  )
}
