import { CalendarClock, Loader2, Pencil, Plus, ShieldAlert, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import Sheet from '../../components/Sheet'
import { Group, MonthStepper, PageHeader, Row, Segmented, Stat } from '../../components/ui'
import type { Account } from '../../lib/accounts'
import { lastMonths, type Goal, type Tx } from '../../lib/finance'
import { currentMonth, money } from '../../lib/projects'
import { syncReminder } from '../../lib/remind'
import { REASONS, emergencyTarget, paceOf, pendingPlans, reasonLabel, summarize, withdrawalImpact, type Move, type Plan, type ReasonKind } from '../../lib/savings'
import { useTable } from '../../lib/table'
import { localISO } from '../../lib/time'
import { AccountPick, lastAccount, rememberAccount } from './AccountPick'
import { Empty, ErrorBar, defaultCurrency, toNum } from './shared'

type Tab = 'goals' | 'history'
type W = { goal: Goal; when: 'now' | 'later'; amount: string; kind: ReasonKind | ''; note: string; acct: string; date: string; plan?: Plan }
type D = { goal: Goal; amount: string; acct: string }
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
  const [d, setD] = useState<D | null>(null)
  const [dErr, setDErr] = useState('')
  const [sp, setSp] = useSearchParams()

  const goalName = (id: string) => db.rows.find((g) => g.id === id)?.title ?? 'Meta eliminada'
  const accName = (id?: string | null) => accounts.find((a) => a.id === id)?.name ?? accountsDb.rows.find((a) => a.id === id)?.name
  const summary = useMemo(() => summarize(db.rows, moves.rows, month), [db.rows, moves.rows, month])
  const pending = useMemo(() => pendingPlans(plans.rows), [plans.rows])
  const avgExpense = useMemo(() => { const s = lastMonths(txs.rows, currentMonth(), 3, 'GTQ').filter((x) => x.expense > 0); return s.length ? s.reduce((a, x) => a + x.expense, 0) / s.length : 0 }, [txs.rows])
  const emergency = emergencyTarget(avgExpense)

  // Viene de Hoy: editar una meta o confirmar un retiro planeado
  useEffect(() => {
    if (db.loading || plans.loading) return
    const id = sp.get('editar'), plan = sp.get('plan')
    if (id) { const g = db.rows.find((x) => x.id === id); if (g) setEdit({ id: g.id, title: g.title, target: String(g.target), due: g.due_date ?? '' }) }
    if (plan) { const pl = plans.rows.find((x) => x.id === plan); const g = pl && db.rows.find((x) => x.id === pl.goal_id); if (pl && g) openWithdraw(g, pl) }
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

  const openDeposit = (g: Goal) => { setDErr(''); setD({ goal: g, amount: '', acct: lastAccount() }) }
  const deposit = async () => {
    if (!d) return
    const n = toNum(d.amount)
    if (!(n > 0)) return setDErr('Escribe cuánto vas a apartar.')
    await db.update(d.goal.id, { saved: Math.round((Number(d.goal.saved) + n) * 100) / 100 })
    const row = await moves.add({ goal_id: d.goal.id, account_id: d.acct || null, amount: n, tx_date: today, reason: null, reason_kind: null, plan_id: null } as never)
    if (!row) return setDErr('No se pudo registrar el aporte. Revisa tu conexión.')
    rememberAccount(d.acct)
    flash(`Apartaste ${money(n)} para “${d.goal.title}”${accName(d.acct) ? `. Salieron de ${accName(d.acct)}` : ''}.`)
    setD(null); setDErr('')
  }

  const openWithdraw = (g: Goal, plan?: Plan) => { setWErr(''); setW({ goal: g, when: 'now', amount: plan ? String(plan.amount) : '', kind: plan ? 'planned' : '', note: plan?.reason ?? '', acct: plan?.account_id ?? lastAccount(), date: '', plan }) }
  const impact = w ? withdrawalImpact(w.goal, toNum(w.amount) || 0) : null
  const confirmWithdraw = async () => {
    if (!w) return
    const n = toNum(w.amount)
    if (!(n > 0)) return setWErr('Escribe cuánto necesitas sacar.')
    if (n > Number(w.goal.saved)) return setWErr(`Esa meta solo tiene ${money(Number(w.goal.saved))} ahorrados.`)
    if (w.when === 'later') {
      if (!w.note.trim()) return setWErr('¿Para qué es? Anótalo para acordarte.')
      if (!w.date || w.date < today) return setWErr('Elige una fecha de hoy en adelante.')
      const event_id = await syncReminder(null, { title: `Retiro planeado de tu ahorro: ${w.goal.title}`, action: `${money(n)} · ${w.note.trim()}. Confirma solo si de verdad lo necesitas.`, date: w.date, minute: 9 * 60 })
      const row = await plans.add({ goal_id: w.goal.id, account_id: w.acct || null, amount: n, planned_for: w.date, reason: w.note.trim(), status: 'pending', event_id } as never)
      if (!row) return setWErr('No se pudo guardar el plan. Revisa tu conexión.')
      rememberAccount(w.acct)
      flash(`Listo: el ${w.date} te aviso para que decidas. Nada se saca solo.`)
      setW(null); setWErr('')
      return
    }
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
  const startEdit = (g: Goal) => setEdit({ id: g.id, title: g.title, target: String(g.target), due: g.due_date ?? '' })
  const canSave = db.rows.some((g) => Number(g.saved) > 0)

  return (
    <div>
      <PageHeader eyebrow="Dinero" title="Ahorro" sub="Aparta dinero para lo que quieres lograr. Si algún día lo sacas, queda anotado el motivo." action={<button className="btn btn-primary" onClick={() => { setErr(''); setOpen(true) }}><Plus size={18} aria-hidden /> Meta</button>} />
      <ErrorBar msg={db.error || moves.error || plans.error || err} onClose={() => { db.clearError(); setErr('') }} />
      {note && <p role="status" className="mb-3 text-sm" style={{ color: 'var(--pos)' }}>{note}</p>}

      <MonthStepper month={month} onChange={setMonth} />
      <div className="stats">
        <Stat label="Ahorrado" value={money(summary.saved)} tone="pos" note={summary.target > 0 ? `${summary.pct}% de tus metas` : undefined} />
        <Stat label="Apartaste" value={money(summary.deposited)} note="este mes" />
        <Stat label="Sacaste" value={money(summary.withdrawn)} tone={summary.withdrawn > 0 ? 'neg' : undefined} note={summary.withdrawals > 0 ? `${summary.withdrawals} ${summary.withdrawals === 1 ? 'vez' : 'veces'}` : 'nada, bien'} />
      </div>

      <div className="mt-5"><Segmented label="Sección" value={tab} onChange={setTab} options={[{ id: 'goals', label: 'Mis metas' }, { id: 'history', label: 'Historial' }]} /></div>

      {loading ? <div className="grid h-48 place-items-center"><Loader2 className="animate-spin" aria-label="Cargando" /></div> : tab === 'goals' ? (
        <>
          {pending.length > 0 && (
            <Group className="!mt-5" title="Retiros que planeaste" footer="Nada se saca solo: el día que llegue, tú decides si lo confirmas.">
              {pending.map((pl) => {
                const isDue = pl.planned_for <= today
                const g = db.rows.find((x) => x.id === pl.goal_id)
                return (
                  <Row key={pl.id} chevron={false} tone={isDue ? 'var(--accent)' : 'var(--ink-faint)'} title={`${money(pl.amount)} de ${goalName(pl.goal_id)}`}
                    sub={<>{isDue ? <strong style={{ color: 'var(--accent)' }}>Ya toca · </strong> : <CalendarClock size={12} aria-hidden className="mr-1 inline" />}{pl.planned_for} · “{pl.reason}”</>}>
                    <div className="flex flex-wrap gap-2 px-4 pb-3 pl-[3.75rem]">
                      {g && <button className="btn btn-tint min-h-11" onClick={() => openWithdraw(g, pl)}>{isDue ? 'Revisar y confirmar' : 'Sacarlo ahora'}</button>}
                      <button className="btn btn-ghost min-h-11" onClick={() => void postpone(pl)}>Posponer 1 semana</button>
                      <button className="btn btn-ghost min-h-11" onClick={() => void cancelPlan(pl)}>Ya no lo necesito</button>
                    </div>
                  </Row>
                )
              })}
            </Group>
          )}

          {db.rows.length === 0 ? (
            <Empty title="¿Para qué estás ahorrando?" text="Un instrumento, una laptop, un viaje, un fondo de emergencia. Pon el monto que quieres juntar y ve sumando aportes." action="Crear mi primera meta" onAction={() => setOpen(true)} />
          ) : (
            <ul className="group-list mt-5">
              {db.rows.map((g) => {
                const pct = g.target > 0 ? Math.min(100, Math.round((g.saved / g.target) * 100)) : 0
                const pace = paceOf(g, moves.rows.filter((m) => m.goal_id === g.id), today)
                return (
                  <li key={g.id} className="row p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-base font-semibold">{g.title}</p>
                        <button className="inline-flex min-h-9 items-center gap-1 text-xs underline" style={{ color: g.due_date && g.due_date < today && pct < 100 ? 'var(--neg)' : 'var(--ink-faint)' }} onClick={() => startEdit(g)}>{g.due_date ? `Para el ${g.due_date}` : 'Poner fecha'}</button>
                      </div>
                      <button className="grid size-11 shrink-0 place-items-center rounded-full" style={{ color: 'var(--ink-faint)' }} onClick={() => startEdit(g)} aria-label={`Editar ${g.title}`}><Pencil size={16} aria-hidden /></button>
                    </div>
                    <p className="mt-1 text-sm"><strong style={{ fontSize: '1.25rem', color: pct >= 100 ? 'var(--pos)' : 'var(--ink)' }}>{money(g.saved, g.currency)}</strong> <span style={{ color: 'var(--ink-faint)' }}>de {money(g.target, g.currency)} · {pct}%</span></p>
                    <div className="meter mt-2" style={{ ['--meter' as string]: pct >= 100 ? 'var(--pos)' : 'var(--accent)' }} role="img" aria-label={`${pct}% ahorrado`}><i style={{ width: `${pct}%` }} /></div>
                    <p className="mt-2 text-xs" style={{ color: pace.onTrack === false ? 'var(--neg)' : 'var(--ink-faint)' }}>
                      {pct >= 100 ? '¡Meta lograda!' : pace.perMonth > 0 ? `Llevas ${money(pace.perMonth)} al mes${pace.onTrack === false ? ' · así llegas después de tu fecha' : pace.onTrack ? ' · vas a tiempo' : ''}` : 'Aún sin aportes recientes. Con un poco cada mes se llega.'}
                    </p>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <button className="btn btn-primary" onClick={() => openDeposit(g)}><Plus size={16} aria-hidden /> Apartar dinero</button>
                      {Number(g.saved) > 0 && <button className="min-h-11 px-2 text-sm underline" style={{ color: 'var(--ink-faint)' }} onClick={() => openWithdraw(g)}>Sacar dinero…</button>}
                      <button className="ml-auto grid min-h-11 min-w-11 place-items-center rounded-full" style={{ color: confirm === g.id ? 'var(--neg)' : 'var(--ink-faint)' }} onClick={() => (confirm === g.id ? db.remove(g.id) : setConfirm(g.id))} aria-label={`Eliminar ${g.title}`}>{confirm === g.id ? <span className="px-3 text-xs font-semibold">¿Seguro? Borra su historial</span> : <Trash2 size={16} aria-hidden />}</button>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
          <div className="mt-5 flex items-start gap-3 rounded-2xl p-4 text-sm" style={{ background: 'var(--surface)', color: 'var(--ink-soft)' }}>
            <ShieldAlert size={18} aria-hidden className="mt-0.5 shrink-0" style={{ color: 'var(--accent)' }} />
            <p><strong style={{ color: 'var(--ink)' }}>Cómo funciona:</strong> «Apartar» saca dinero de tu cuenta y lo guarda en la meta. «Sacar» lo devuelve a una cuenta, pero pide un motivo y que lo confirmes. {canSave ? 'Si ya sabes que lo vas a necesitar un día, también puedes planearlo desde «Sacar dinero».' : ''}</p>
          </div>
        </>
      ) : (
        history.length === 0 ? <Empty title="Sin movimientos de ahorro este mes" text="Aquí quedan todos los aportes y retiros, con su fecha, su cuenta y el motivo." /> : (
          history.map(([date, items]) => (
            <Group key={date} title={cap(new Date(date + 'T12:00:00').toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long' }))}>
              {items.map((m) => {
                const out = Number(m.amount) < 0
                return <Row key={m.id} chevron={false} tone={out ? 'var(--neg)' : 'var(--pos)'} title={goalName(m.goal_id)}
                  sub={<>{out ? <strong style={{ color: 'var(--neg)' }}>Sacaste</strong> : 'Apartaste'}{out && m.reason_kind ? ` · ${reasonLabel(m.reason_kind)}` : ''}{m.plan_id ? ' · planeado' : ''}{accName(m.account_id) ? ` · ${out ? 'hacia' : 'desde'} ${accName(m.account_id)}` : ''}{m.reason ? ` · “${m.reason}”` : ''}</>}
                  value={`${out ? '−' : '+'}${money(Math.abs(Number(m.amount)))}`} valueTone={out ? undefined : 'pos'} />
              })}
            </Group>
          ))
        )
      )}

      {/* Apartar dinero */}
      <Sheet open={Boolean(d)} title="Apartar dinero" onClose={() => setD(null)}>
        {d && (
          <div className="grid gap-4">
            <p className="text-sm" style={{ color: 'var(--ink-soft)' }}>Para <strong style={{ color: 'var(--ink)' }}>{d.goal.title}</strong>. Llevas {money(Number(d.goal.saved))} de {money(Number(d.goal.target))}.</p>
            <label className="grid gap-2 text-sm">¿Cuánto vas a apartar?<input className="field" inputMode="decimal" value={d.amount} onChange={(e) => setD({ ...d, amount: e.target.value })} placeholder="0.00" autoFocus /></label>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Montos rápidos">{[50, 100, 200, 500].map((n) => <button key={n} type="button" className="min-h-11 rounded-full px-4 text-sm" style={{ background: 'var(--surface-2)', color: 'var(--ink-soft)' }} onClick={() => setD({ ...d, amount: String(n) })}>Q {n}</button>)}</div>
            <AccountPick accounts={accounts} value={d.acct} onChange={(v) => setD({ ...d, acct: v })} label="¿De qué cuenta sale?" none="No lo sé / sin cuenta" />
            {dErr && <p role="alert" className="text-sm" style={{ color: 'var(--neg)' }}>{dErr}</p>}
            <button type="button" className="btn btn-primary w-fit" onClick={() => void deposit()}>Apartar {money(toNum(d.amount) || 0)}</button>
          </div>
        )}
      </Sheet>

      {/* Sacar: ahora o para una fecha, siempre con motivo y confirmación */}
      <Sheet open={Boolean(w)} title="Sacar de tu ahorro" onClose={() => setW(null)}>
        {w && impact && (
          <div className="grid gap-4">
            <p className="rounded-xl px-4 py-3 text-sm" style={{ background: 'color-mix(in oklab, var(--neg) 10%, var(--surface-2))', color: 'var(--ink-soft)' }}>
              Es tu ahorro de <strong style={{ color: 'var(--ink)' }}>{w.goal.title}</strong>: tienes <strong style={{ color: 'var(--ink)' }}>{money(Number(w.goal.saved))}</strong>. Piénsalo un momento antes de sacarlo.
            </p>
            {!w.plan && <Segmented label="Cuándo" value={w.when} onChange={(v) => setW({ ...w, when: v })} options={[{ id: 'now', label: 'Lo necesito ya' }, { id: 'later', label: 'Lo planeo para un día' }]} />}
            <label className="grid gap-2 text-sm">¿Cuánto?<input className="field" inputMode="decimal" value={w.amount} onChange={(e) => setW({ ...w, amount: e.target.value })} placeholder="0.00" autoFocus /></label>
            {w.when === 'now' ? (
              <fieldset>
                <legend className="mb-2 text-sm">¿Por qué lo necesitas?</legend>
                <div className="flex flex-wrap gap-2">{REASONS.map((r) => <button key={r.id} type="button" aria-pressed={w.kind === r.id} onClick={() => setW({ ...w, kind: r.id })} className="min-h-11 rounded-full px-4 text-sm" style={{ background: w.kind === r.id ? 'color-mix(in oklab, var(--accent) 20%, transparent)' : 'var(--surface-2)', color: w.kind === r.id ? 'var(--accent)' : 'var(--ink-soft)', boxShadow: w.kind === r.id ? 'inset 0 0 0 1.5px var(--accent)' : 'none' }}>{r.label}</button>)}</div>
                {w.kind && <p className="mt-2 text-xs" style={{ color: 'var(--ink-faint)' }}>{REASONS.find((r) => r.id === w.kind)?.hint}</p>}
              </fieldset>
            ) : (
              <label className="grid gap-2 text-sm">¿Para qué día?<input type="date" className="field" min={today} value={w.date} onChange={(e) => setW({ ...w, date: e.target.value })} /></label>
            )}
            <label className="grid gap-2 text-sm">{w.when === 'later' || w.kind === 'other' ? '¿Para qué es?' : 'Nota (opcional)'}<input className="field" value={w.note} maxLength={300} onChange={(e) => setW({ ...w, note: e.target.value })} placeholder="Pagar la inscripción, comprar el pedal…" /></label>
            <AccountPick accounts={accounts} value={w.acct} onChange={(v) => setW({ ...w, acct: v })} label="¿A qué cuenta vuelve?" none="Sin cuenta" />

            {w.when === 'now' && (toNum(w.amount) || 0) > 0 && (
              <div className="rounded-xl px-4 py-3 text-sm" style={{ background: 'var(--surface-2)' }}>
                {impact.tooMuch ? <p style={{ color: 'var(--neg)' }}>Esa meta solo tiene {money(Number(w.goal.saved))}.</p> : (
                  <>
                    <p>La meta quedaría en <strong>{money(impact.newSaved)}</strong> ({impact.newPct}%){impact.lostPct > 0 ? `: retrocede ${impact.lostPct} puntos` : ''}.</p>
                    {impact.big && <p className="mt-1" style={{ color: 'var(--neg)' }}>Es más de la mitad de lo que tienes ahorrado.</p>}
                  </>
                )}
              </div>
            )}
            {w.when === 'later' && <p className="text-xs" style={{ color: 'var(--ink-faint)' }}>Ese día te aviso. El dinero no se mueve hasta que tú lo confirmes.</p>}
            {wErr && <p role="alert" className="text-sm" style={{ color: 'var(--neg)' }}>{wErr}</p>}
            <div className="flex flex-wrap items-center gap-3">
              <button type="button" className="btn btn-primary" onClick={() => setW(null)}>Mejor no</button>
              <button type="button" className="btn btn-ghost" style={{ color: w.when === 'now' ? 'var(--neg)' : undefined }} onClick={() => void confirmWithdraw()}>{w.when === 'now' ? `Sí, sacar ${money(toNum(w.amount) || 0)}` : 'Guardar el plan'}</button>
            </div>
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
          <label className="grid gap-2 text-sm">¿Cuánto necesitas juntar?<input className="field" inputMode="decimal" value={target} onChange={(e) => setTarget(e.target.value)} placeholder="0.00" /></label>
          <label className="grid gap-2 text-sm">Fecha límite (opcional)<input type="date" className="field" value={due} onChange={(e) => setDue(e.target.value)} /></label>
          {err && <p role="alert" className="text-sm" style={{ color: 'var(--neg)' }}>{err}</p>}
          <button className="btn btn-primary w-fit">Crear meta</button>
        </form>
      </Sheet>
    </div>
  )
}
