import { ChevronDown, Feather, HeartHandshake, Moon, Plus, Sparkles, Trash2, Wind, Zap } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Chk } from '../components/ui'
import Sheet from '../components/Sheet'
import DayRitual from '../components/DayRitual'
import OverwhelmSheet from '../components/OverwhelmSheet'
import { ResumeHint } from '../components/Resume'
import { useProgress } from '../lib/progress'
import { dueRules, type Rule } from '../lib/ifthen'
import { daysUntil, stateOf, type Renewal } from '../lib/renewals'
import { lentToChase, promiseState, sortPromises, type Promise_, type Stuff } from '../lib/loose'
import { useCheckins } from '../lib/checkin'
import { ENERGY, isSoftDay } from '../lib/rhythm'
import { exitKindFor, type ExitList } from '../lib/exitlist'
import type { SuggestInput } from '../lib/suggest'
import { ahora, readSnoozed, snooze, type Item } from '../lib/ahora'
import { freeGaps, peakHour, planDay } from '../lib/dayplan'
import { duePlans, type Plan } from '../lib/savings'
import type { Goal } from '../lib/finance'
import { currentMonth, money, useProjects } from '../lib/projects'
import { monthlyClients } from '../lib/incoming'
import { rankRecipes, type PantryItem, type Recipe } from '../lib/kitchen'
import { useFreeToSpend } from '../lib/useFree'
import { supabase } from '../lib/supabase'
import { useAttention } from '../lib/attention'
import { blockApplies, useBlocks, useInbox, usePriorities } from '../lib/data'
import { weekDone, type Habit, type HabitLog } from '../lib/habits'
import { currentKind, isScheduled, progressOf, type Routine, type Run, type Step } from '../lib/routines'
import { useTable } from '../lib/table'
import { useEvents } from '../lib/events'
import { fmtMin, localISO, nowMin } from '../lib/time'

const greet = (h: number) => (h < 12 ? 'Buenos días' : h < 19 ? 'Buenas tardes' : 'Buenas noches')
const softKey = (d: string) => `mw_soft_${d}`
const readSoft = (d: string) => { try { return localStorage.getItem(softKey(d)) === '1' } catch { return false } }
const E_LABEL: Record<number, string> = Object.fromEntries(ENERGY.map((e) => [e.n, e.label]))

export default function Today() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 30_000); return () => clearInterval(t) }, [])
  const m = nowMin(now)

  const { blocks } = useBlocks()
  const todays = useMemo(() => blocks.filter((b) => blockApplies(b, localISO(now))), [blocks, now])
  const current = todays.find((b) => m >= b.start_min && m < b.end_min)
  const next = todays.find((b) => b.start_min > m)

  const evs = useEvents()
  const todayISO = localISO(now)
  const agenda = useMemo(() => evs.between(todayISO, todayISO), [evs, todayISO])

  const habits = useTable<Habit>('habits', { col: 'position', asc: true })
  const hlogs = useTable<HabitLog>('habit_logs', { col: 'day', asc: false })
  const activeHabits = habits.rows.filter((h) => !h.archived)
  const toggleHabit = async (h: Habit) => {
    const ex = hlogs.rows.find((l) => l.habit_id === h.id && l.day === todayISO)
    if (ex) await hlogs.remove(ex.id); else await hlogs.add({ habit_id: h.id, day: todayISO })
  }

  const routinesDb = useTable<Routine>('routines', { col: 'position', asc: true })
  const routineSteps = useTable<Step>('routine_steps', { col: 'position', asc: true })
  const routineRuns = useTable<Run>('routine_runs', { col: 'day', asc: false })
  const kindNow = currentKind(now.getHours())
  const routineNow = kindNow ? routinesDb.rows.find((x) => x.kind === kindNow && isScheduled(x, now.getDay())) : undefined
  const routineStepsNow = routineNow ? routineSteps.rows.filter((x) => x.routine_id === routineNow.id) : []
  const routineRunNow = routineNow ? routineRuns.rows.find((x) => x.routine_id === routineNow.id && x.day === todayISO) : undefined
  const routineProgress = progressOf(routineRunNow, routineStepsNow)

  const pr = usePriorities()
  const inbox = useInbox()
  const [draft, setDraft] = useState('')

  const prog = useProgress()
  const rulesDb = useTable<Rule>('if_then', { col: 'created_at', asc: true })
  const renewalsDb = useTable<Renewal>('renewals', { col: 'next_due', asc: true })
  const stuffDb = useTable<Stuff>('stuff', { col: 'created_at', asc: false })
  const promisesDb = useTable<Promise_>('promises', { col: 'created_at', asc: false })
  const openPromises = useMemo(() => sortPromises(promisesDb.rows.filter((p) => !p.done), todayISO), [promisesDb.rows, todayISO])
  const chase = useMemo(() => lentToChase(stuffDb.rows, todayISO), [stuffDb.rows, todayISO])
  const exitLists = useTable<ExitList>('exit_lists', { col: 'position', asc: true })
  const dueNow = useMemo(() => dueRules(rulesDb.rows, { nowMin: m, hour: now.getHours(), today: todayISO, blocks: blocks.filter((b) => blockApplies(b, todayISO)).map((b) => ({ kind: b.kind, title: b.title, start_min: b.start_min, end_min: b.end_min })) }), [rulesDb.rows, m, now, todayISO, blocks])

  // Lo próximo a lo que hay que salir (evento de hoy o bloque), para avisar de la lista de salida
  const departure = useMemo(() => {
    const cands: { kind: string | null; start: number }[] = [
      ...agenda.filter((o) => !o.state.done && o.event.start_min > m - 5).map((o) => ({ kind: exitKindFor(o.event.kind), start: o.event.start_min })),
      ...(next ? [{ kind: exitKindFor(next.kind), start: next.start_min }] : []),
    ].filter((c) => c.kind).sort((a, b) => a.start - b.start)
    const c = cands[0]
    const list = c ? exitLists.rows.find((l) => l.kind === c.kind) : undefined
    return c && list ? { id: list.id, name: list.name, mins: c.start - m } : null
  }, [agenda, next, m, exitLists.rows])

  // Qué conviene hacer ahora (reglas en lib/suggest.ts)
  const attention = useAttention(now)
  const checkins = useCheckins()
  const soft = isSoftDay(checkins.today)
  const [overwhelm, setOverwhelm] = useState(false)
  const [dump, setDump] = useState(false)
  const suggestInput = useMemo((): SuggestInput => ({
    nowMin: m,
    current: current ? { title: current.title, endMin: current.end_min } : null,
    next: next ? { title: next.title, startMin: next.start_min } : null,
    priorities: { open: pr.tasks.filter((t) => !t.done).length, total: pr.tasks.length },
    // Los recordatorios que nacen de una promesa o un préstamo ya salen con su propio texto: no se repiten
    overdue: attention.overdue.filter((o) => !promisesDb.rows.some((p) => p.event_id === o.id) && !stuffDb.rows.some((i) => i.event_id === o.id) && !renewalsDb.rows.some((r) => r.event_id === o.id)),
    followUps: attention.followUps.map((d) => ({ id: d.id, title: d.title, recipient: d.recipient })),
    toSend: attention.toSend.map((d) => ({ id: d.id, title: d.title, recipient: d.recipient })),
    habitsPending: activeHabits.filter((h) => !hlogs.rows.some((l) => l.habit_id === h.id && l.day === todayISO)).map((h) => ({ id: h.id, name: h.name })),
    routine: routineNow && routineStepsNow.length > 0 && !routineRunNow?.completed ? { id: routineNow.id, name: routineNow.name, started: routineProgress.done > 0 } : null,
    inbox: inbox.items.length,
    lowEnergy: soft,
    exitList: departure,
    promises: openPromises.filter((p) => ['overdue', 'today'].includes(promiseState(p, todayISO))).map((p) => ({ id: p.id, text: p.text, person: p.person, overdue: promiseState(p, todayISO) === 'overdue' })),
    chase: chase.map((c) => ({ id: c.id, name: c.name, person: c.person })),
    renewals: renewalsDb.rows.filter((r) => stateOf(r, todayISO) !== 'later').map((r) => ({ id: r.id, name: r.name, days: daysUntil(r, todayISO) })),
  }), [renewalsDb.rows, promisesDb.rows, stuffDb.rows, openPromises, chase, departure, soft, m, current, next, pr.tasks, attention, activeHabits, hlogs.rows, todayISO, routineNow, routineStepsNow.length, routineRunNow, routineProgress.done, inbox.items.length])
  const savingsPlans = useTable<Plan>('savings_plans', { col: 'planned_for', asc: true })
  const savingsGoals = useTable<Goal>('savings_goals', { col: 'created_at', asc: true })
  const dueSavings = useMemo(() => duePlans(savingsPlans.rows, todayISO), [savingsPlans.rows, todayISO])
  const focusRows = useTable<{ id: string; actual_min: number; started_at: string }>('focus_sessions', { col: 'started_at', asc: false })
  const dayPlan = useMemo(() => {
    const open = pr.tasks.filter((t) => !t.done).map((t) => t.title)
    if (open.length === 0) return []
    const busy = [
      ...todays.map((b) => ({ start: b.start_min, end: b.end_min })),
      ...agenda.filter((o) => !o.state.done).map((o) => ({ start: o.event.start_min, end: (o.event as { end_min?: number | null }).end_min ?? o.event.start_min + 30 })),
    ]
    return planDay({ priorities: open, gaps: freeGaps(busy, Math.max(m, 7 * 60)), energy: checkins.today?.energy ?? null, peak: peakHour(focusRows.rows) })
  }, [pr.tasks, todays, agenda, m, checkins.today?.energy, focusRows.rows])
  const error = pr.error || inbox.error || evs.error || habits.error || routinesDb.error


  const nav = useNavigate()
  const work = useProjects()
  const recipes = useTable<Recipe>('recipes', { col: 'title', asc: true })
  const pantry = useTable<PantryItem>('pantry_items', { col: 'name', asc: true })
  const free = useFreeToSpend()
  const [manualSoft, setManualSoft] = useState(() => readSoft(localISO()))
  const [energyOpen, setEnergyOpen] = useState(false)
  const [snoozed, setSnoozed] = useState(() => readSnoozed())
  const [moreOpen, setMoreOpen] = useState(false)
  const softOn = soft || manualSoft
  const toggleSoft = () => { const v = !manualSoft; setManualSoft(v); try { localStorage.setItem(softKey(todayISO), v ? '1' : '0') } catch { /* sin almacenamiento */ } }

  // Cobros que ya tocan (día de cobro llegó) o van atrasados, y recetas que se pueden hacer ya
  const collect = useMemo(() => monthlyClients(work.projects, work.payments, currentMonth(now), now)
    .filter((r) => r.state !== 'paid' && (r.state === 'late' || r.lateMonths.length > 0 || r.project.billing_day === now.getDate()))
    .map((r) => ({ id: r.project.id, title: r.project.title, late: r.state === 'late' || r.lateMonths.length > 0 })), [work.projects, work.payments, now])
  const cookReady = useMemo(() => rankRecipes(recipes.rows, pantry.rows).filter((x) => x.miss.length === 0).length, [recipes.rows, pantry.rows])
  const savingsRows = useMemo(() => dueSavings.map((p) => ({ id: p.id, amount: money(p.amount), goal: savingsGoals.rows.find((g) => g.id === p.goal_id)?.title ?? 'tu ahorro' })), [dueSavings, savingsGoals.rows])

  const items = useMemo(() => ahora(suggestInput, { collect, savings: savingsRows, cookReady }, { soft: softOn, snoozed }), [suggestInput, collect, savingsRows, cookReady, softOn, snoozed])
  const top = items[0]
  const rest = items.slice(1)

  // Momento del día: arranque antes del primer bloque, cierre después del último
  const firstStart = todays.length ? Math.min(...todays.map((b) => b.start_min)) : 8 * 60
  const lastEnd = todays.length ? Math.max(...todays.map((b) => b.end_min)) : 19 * 60
  const mode: 'arranque' | 'dia' | 'cierre' = now.getHours() >= 4 && m < firstStart ? 'arranque' : m >= lastEnd ? 'cierre' : 'dia'

  const doneP = pr.tasks.filter((t) => t.done).length
  const doneH = activeHabits.filter((h) => hlogs.rows.some((l) => l.habit_id === h.id && l.day === todayISO)).length
  const gained = prog.byDay.get(todayISO)?.total ?? 0
  const shownTasks = softOn ? pr.tasks.filter((t) => !t.done).slice(0, 1).concat(pr.tasks.filter((t) => t.done)) : pr.tasks
  const shownHabits = softOn ? activeHabits.slice(0, 2) : activeHabits

  // Lo que sigue: los próximos 2 bloques o eventos de hoy
  const upcoming = useMemo(() => {
    const rows = [
      ...todays.filter((b) => b.start_min > m).map((b) => ({ key: `b-${b.id}`, start: b.start_min, title: b.title, kind: 'bloque' as const, evId: null as string | null, date: todayISO })),
      ...agenda.filter((o) => !o.state.done && o.event.start_min > m - 5).map((o) => ({ key: `e-${o.event.id}`, start: o.event.start_min, title: o.event.title, kind: 'evento' as const, evId: o.event.id as string | null, date: o.date })),
    ].sort((a, b) => a.start - b.start).slice(0, 2)
    return rows
  }, [todays, agenda, m, todayISO])

  const runInline = async (it: Item) => {
    if (it.inline === 'event-done' && it.ref) await evs.setState(it.ref, todayISO, { done: true })
    else if (it.inline === 'promise-done' && it.ref) await promisesDb.update(it.ref, { done: true, done_on: todayISO } as never)
    else if (it.inline === 'anotar') window.dispatchEvent(new CustomEvent('mw-anotar'))
    else if (it.inline === 'pick') { document.getElementById('mis3')?.scrollIntoView({ behavior: 'smooth', block: 'center' }); setTimeout(() => document.getElementById('prio-in')?.focus(), 350) }
  }
  const later = (it: Item) => setSnoozed(snooze(it.id))
  const carryOver = async () => {
    const t = new Date(now); t.setDate(t.getDate() + 1)
    await supabase.from('tasks').update({ priority_date: localISO(t) }).eq('priority_date', todayISO).eq('done', false)
    void pr.reload()
  }

  const Action = ({ it, big = false }: { it: Item; big?: boolean }) => it.inline
    ? <button className={`btn btn-primary ${big ? '' : '!min-h-10 !px-4'}`} onClick={() => void runInline(it)}>{it.act}</button>
    : <Link to={it.to} className={`btn btn-primary ${big ? '' : '!min-h-10 !px-4'}`}>{it.act}</Link>

  const [undo, setUndo] = useState<{ label: string; restore: () => void } | null>(null)
  useEffect(() => { if (!undo) return; const t = setTimeout(() => setUndo(null), 6000); return () => clearTimeout(t) }, [undo])
  const addPriority = (e: React.FormEvent) => {
    e.preventDefault()
    if (!draft.trim() || pr.tasks.length >= 3) return
    pr.add(draft.trim()); setDraft('')
  }
  const status = pr.tasks.length ? `${doneP} de ${pr.tasks.length} hechas` : 'Aún no eliges tus 3'

  return (
    <div className="hoy grid gap-5">
      {/* 1. Cabecera */}
      <header className="grid gap-3">
        <div className="min-w-0">
          <p className="eyebrow">{now.toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
          <h1 className="mt-1 font-display text-4xl">{greet(now.getHours())}</h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--ink-soft)' }}>{status}{activeHabits.length ? ` · ${doneH} de ${activeHabits.length} hábitos` : ''}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" className="chip-btn" aria-pressed={softOn} onClick={toggleSoft}><Feather size={16} aria-hidden /> Día suave</button>
          <button type="button" className="chip-btn" onClick={() => setOverwhelm(true)}><HeartHandshake size={16} aria-hidden /> Me abruma</button>
          <button type="button" className="chip-btn" aria-expanded={energyOpen} onClick={() => setEnergyOpen((v) => !v)}><Zap size={16} aria-hidden /> Energía{checkins.today?.energy ? `: ${E_LABEL[checkins.today.energy]}` : ''}</button>
        </div>
        {energyOpen && (
          <div className="flex flex-wrap gap-2" role="group" aria-label="Energía de hoy">
            {ENERGY.map((e) => <button key={e.n} type="button" className="chip-btn" aria-pressed={checkins.today?.energy === e.n} onClick={() => { void checkins.save({ energy: e.n }); setEnergyOpen(false) }}>{e.label}</button>)}
          </div>
        )}
      </header>

      {error && <p role="alert" className="rounded-xl px-3 py-2 text-sm" style={{ background: 'var(--aviso-suave)', color: 'var(--aviso-texto)' }}>{error}</p>}

      {/* 2. Ahora */}
      {mode !== 'dia' ? (
        <section aria-label={mode === 'arranque' ? 'Arranque del día' : 'Cierre del día'} className="grid gap-3">
          <DayRitual ck={checkins} hour={mode === 'arranque' ? 8 : 20} prioritiesDone={doneP} habitsDone={doneH} onAddPriority={(t) => pr.add(t)} />
          {mode === 'arranque' && routineNow && routineStepsNow.length > 0 && !routineRunNow?.completed && (
            <Link to={`/app/mente/rutinas/${routineNow.id}/hacer`} className="btn btn-primary w-fit"><Sparkles size={16} aria-hidden /> Empezar {routineNow.name}</Link>
          )}
          {mode === 'cierre' && (
            <div className="flex flex-wrap gap-2">
              {pr.tasks.some((t) => !t.done) && <button className="btn btn-ghost" onClick={() => void carryOver()}>Pasar lo pendiente a mañana</button>}
              {routineNow && routineStepsNow.length > 0 && !routineRunNow?.completed && <Link to={`/app/mente/rutinas/${routineNow.id}/hacer`} className="btn btn-primary"><Moon size={16} aria-hidden /> Empezar {routineNow.name}</Link>}
            </div>
          )}
        </section>
      ) : (
        <section aria-labelledby="ahora-t" className="ahora">
          <p id="ahora-t" className="etq">Ahora te conviene</p>
          {top ? (
            <>
              <h2 className="mt-2 font-display text-3xl leading-tight">{top.title}</h2>
              <p className="mt-2 text-sm" style={{ color: 'var(--ink-soft)' }}>{top.reason}</p>
              <div className="mt-4 flex flex-wrap items-center gap-2"><Action it={top} big /><button className="btn btn-ghost" onClick={() => later(top)}>Más tarde</button></div>
              {rest.length > 0 && (
                <div className="mt-4 border-t pt-3" style={{ borderColor: 'var(--borde)' }}>
                  <button type="button" className="flex min-h-11 w-full items-center justify-between text-sm font-semibold" aria-expanded={moreOpen} onClick={() => setMoreOpen((v) => !v)}>{rest.length} {rest.length === 1 ? 'más' : 'más'} <ChevronDown size={16} aria-hidden style={{ transform: moreOpen ? 'rotate(180deg)' : undefined, transition: 'transform .2s' }} /></button>
                  {moreOpen && <ul className="mt-1 grid gap-2">{rest.map((it) => <li key={it.id} className="flex items-center gap-3 rounded-2xl p-3" style={{ background: 'var(--surface-2)' }}><div className="min-w-0 flex-1"><p className="t font-semibold">{it.title}</p><p className="text-xs" style={{ color: 'var(--ink-soft)' }}>{it.reason}</p></div><Action it={it} /></li>)}</ul>}
                </div>
              )}
            </>
          ) : (
            <>
              <h2 className="mt-2 font-display text-3xl leading-tight">{pr.tasks.find((t) => !t.done)?.title ?? 'Nada urgente'}</h2>
              <p className="mt-2 text-sm" style={{ color: 'var(--ink-soft)' }}>{pr.tasks.find((t) => !t.done) ? 'Es tu primera prioridad sin marcar.' : 'Buen momento para enfocarte.'}</p>
              <div className="mt-4"><Link to="/app/mente/enfoque" className="btn btn-primary">Enfocarme</Link></div>
            </>
          )}
        </section>
      )}

      <ResumeHint />

      {/* 3. Mis 3 de hoy */}
      <section id="mis3" aria-labelledby="mis3-t" className="bloque">
        <div className="bloque-head"><h3 id="mis3-t">{softOn ? 'Tu cosa de hoy' : 'Mis 3 de hoy'}</h3><span>{doneP}/{pr.tasks.length || (softOn ? 1 : 3)}</span></div>
        <ul>
          {shownTasks.map((t) => {
            const plan = dayPlan.find((p) => p.title === t.title)
            return (
              <li key={t.id} className="fila-hoy">
                <button type="button" className="flex min-h-12 flex-1 items-center gap-3 text-left" onClick={() => pr.toggle(t.id)} aria-pressed={t.done} aria-label={`${t.title}: ${t.done ? 'hecha' : 'pendiente'}`}>
                  <Chk on={t.done} tone="var(--personal)" /><span className="min-w-0"><span className={`block ${t.done ? 'line-through opacity-60' : ''}`}>{t.title}</span>{plan && !t.done && <span className="block text-xs" style={{ color: 'var(--ink-soft)' }}>Buen rato: {fmtMin(plan.start)} · {plan.min} min</span>}</span>
                </button>
                <button className="grid size-11 place-items-center rounded-full" aria-label={`Borrar prioridad: ${t.title}`} onClick={() => { pr.remove(t.id); setUndo({ label: 'Prioridad borrada', restore: () => pr.add(t.title) }) }}><Trash2 size={15} aria-hidden /></button>
              </li>
            )
          })}
          {pr.tasks.length < (softOn ? 1 : 3) && (
            <li className="fila-hoy">
              <form onSubmit={addPriority} className="flex w-full items-center gap-2">
                <label className="sr-only" htmlFor="prio-in">Nueva prioridad</label>
                <Plus size={16} aria-hidden />
                <input id="prio-in" value={draft} onChange={(e) => setDraft(e.target.value)} maxLength={500} placeholder={pr.tasks.length ? 'Otra prioridad' : '¿Qué es lo más importante hoy?'} className="row-input" />
                {draft.trim() && <button className="btn btn-sec !min-h-10">Agregar</button>}
              </form>
            </li>
          )}
        </ul>
      </section>

      {/* 4. Lo que sigue */}
      {mode === 'dia' && upcoming.length > 0 && (
        <section aria-labelledby="sigue-t" className="bloque">
          <div className="bloque-head"><h3 id="sigue-t">Lo que sigue</h3><Link to="/app/planear/agenda" className="underline">Agenda</Link></div>
          <ul>
            {upcoming.map((u) => (
              <li key={u.key} className="fila-hoy">
                <span className="w-14 shrink-0 text-sm font-semibold" style={{ fontVariantNumeric: 'tabular-nums' }}>{fmtMin(u.start)}</span>
                <span className="min-w-0 flex-1"><span className="block truncate">{u.title}</span>
                  {departure && Math.abs(departure.mins - (u.start - m)) <= 1 && <Link to="/app/mente/salida" className="text-xs underline" style={{ color: 'var(--ink-soft)' }}>Revisar lista: {departure.name}</Link>}
                </span>
                {u.evId && <button className="btn btn-sec btn-chico" onClick={() => void evs.setState(u.evId!, u.date, { done: true })}>Hecho</button>}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* 5. Hábitos de hoy */}
      {shownHabits.length > 0 && (
        <section aria-labelledby="hab-t" className="bloque">
          <div className="bloque-head"><h3 id="hab-t">Hábitos de hoy</h3><Link to="/app/mente" className="underline">Ver todo</Link></div>
          <div className="habitos" role="group" aria-label="Hábitos de hoy">
            {shownHabits.map((h) => {
              const done = hlogs.rows.some((l) => l.habit_id === h.id && l.day === todayISO)
              return (
                <button key={h.id} type="button" className="habito" aria-pressed={done} onClick={() => void toggleHabit(h)} title={`${weekDone(h.id, hlogs.rows, todayISO)}/${h.target_per_week} esta semana`}>
                  <Chk on={done} tone="var(--personal)" /><span>{h.name}</span>
                </button>
              )
            })}
          </div>
          {!softOn && dueNow.map(({ rule, why }) => (
            <button key={rule.id} type="button" className="fila-hoy w-full text-left" onClick={() => void rulesDb.update(rule.id, { last_done: todayISO })}><Chk on={false} tone="var(--personal)" /><span className="min-w-0"><span className="block">{rule.action}</span><span className="block text-xs" style={{ color: 'var(--ink-soft)' }}>{why}</span></span></button>
          ))}
        </section>
      )}

      {/* 6. Pie */}
      <footer className="pie">
        {mode === 'dia' && !softOn && free.hasAccounts && !free.loading && (
          <Link to="/app/dinero" className="pie-dato"><span className="etq">Libre para gastar</span><span className="cifra" style={{ color: free.free < 0 ? 'var(--aviso-texto)' : undefined }}>{money(free.free)}</span></Link>
        )}
        {!softOn && (
          <Link to="/app/mente/logros" className="pie-dato"><span className="etq">Puntos de hoy</span><span className="cifra">{gained > 0 ? `+${gained}` : '0'}</span></Link>
        )}
      </footer>

      {undo && (
        <div role="status" className="fixed left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-full py-1 pr-2 pl-5 text-sm" style={{ bottom: 'calc(6.5rem + env(safe-area-inset-bottom))', background: 'var(--tinta)', color: 'var(--fondo)' }}>
          {undo.label}
          <button className="min-h-11 rounded-full px-3 font-semibold underline" onClick={() => { undo.restore(); setUndo(null) }}>Deshacer</button>
        </div>
      )}

      {/* Me abruma: una sola cosa y tres salidas */}
      <Sheet open={overwhelm} title="Me abruma" onClose={() => setOverwhelm(false)}>
        <div className="grid gap-4">
          <p className="text-sm" style={{ color: 'var(--ink-soft)' }}>Lo demás puede esperar. Por ahora, una sola cosa:</p>
          <div className="rounded-3xl p-4" style={{ background: 'var(--marca-suave)' }}>
            <p className="font-display text-2xl leading-tight">{top?.title ?? pr.tasks.find((t) => !t.done)?.title ?? 'Respirar un momento'}</p>
            {top && <p className="mt-1 text-sm" style={{ color: 'var(--ink-soft)' }}>{top.reason}</p>}
          </div>
          <div className="grid gap-2">
            {top && (top.inline ? <button className="btn btn-primary" onClick={() => { setOverwhelm(false); void runInline(top) }}>Hacer esto</button> : <button className="btn btn-primary" onClick={() => { setOverwhelm(false); nav(top.to) }}>Hacer esto</button>)}
            <button className="btn btn-sec" onClick={() => { setOverwhelm(false); nav('/app/mente/enfoque?min=15&auto=1' + (top ? `&tarea=${encodeURIComponent(top.title)}` : '')) }}>Enfocarme 15 min</button>
            <button className="btn btn-sec" onClick={() => { setOverwhelm(false); nav('/app/mente/ocio') }}>Tomar un descanso</button>
            <button className="min-h-11 text-sm underline" style={{ color: 'var(--ink-soft)' }} onClick={() => { setOverwhelm(false); setDump(true) }}><Wind size={14} aria-hidden className="mr-1 inline" />Prefiero soltar todo lo que tengo en la cabeza</button>
          </div>
        </div>
      </Sheet>
      <OverwhelmSheet open={dump} onClose={() => setDump(false)} priorities={pr.tasks.filter((t) => !t.done).map((t) => t.title)} dump={async (lines) => { for (const l of lines) await inbox.add(l) }} />
    </div>
  )
}
