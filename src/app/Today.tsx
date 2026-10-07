import { HeartHandshake, Plus, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Chk, Group, Row } from '../components/ui'
import GoalSpotlight from '../components/GoalSpotlight'
import OutingSpotlight from '../components/OutingSpotlight'
import ShoppingSpotlight from '../components/ShoppingSpotlight'
import DayRitual from '../components/DayRitual'
import { ResumeHint } from '../components/Resume'
import { daysUntil, stateOf, type Renewal } from '../lib/renewals'
import { lentToChase, promiseState, sortPromises, dueLabel, type Promise_, type Stuff } from '../lib/loose'
import OverwhelmSheet from '../components/OverwhelmSheet'
import { useCheckins } from '../lib/checkin'
import { isSoftDay } from '../lib/rhythm'
import { exitKindFor, type ExitList } from '../lib/exitlist'
import { suggest } from '../lib/suggest'
import { useAttention } from '../lib/attention'
import Avatar, { propForHour, type Prop } from '../components/Avatar'
import { blockApplies, kindMeta, useBlocks, useInbox, usePriorities } from '../lib/data'
import { weekDone, type Habit, type HabitLog } from '../lib/habits'
import { currentKind, isScheduled, progressOf, type Routine, type Run, type Step } from '../lib/routines'
import { useTable } from '../lib/table'
import { useEvents } from '../lib/events'
import { localISO } from '../lib/time'
import { OccurrenceCard } from './plan/Agenda'
import EventEditor, { type EditorTarget } from './plan/EventEditor'
import { fmtMin, nowMin } from '../lib/time'

const greet = (h: number) => (h < 12 ? 'Buenos días' : h < 19 ? 'Buenas tardes' : 'Buenas noches')
const propFor = (kind: string | undefined, hour: number): Prop => {
  if (kind === 'code' || kind === 'work') return 'laptop'
  if (kind === 'rehearsal') return 'guitar'
  if (kind === 'rest') return 'rest'
  return kind ? 'wave' : propForHour(hour)
}
const dur = (m: number) => (m >= 60 ? `${Math.floor(m / 60)} h ${m % 60 ? `${m % 60} min` : ''}`.trim() : `${m} min`)

export default function Today() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 30_000); return () => clearInterval(t) }, [])
  const m = nowMin(now)

  const { blocks } = useBlocks()
  const todays = useMemo(() => blocks.filter((b) => blockApplies(b, localISO(now))), [blocks, now])
  const current = todays.find((b) => m >= b.start_min && m < b.end_min)
  const next = todays.find((b) => b.start_min > m)

  const evs = useEvents()
  const [evTarget, setEvTarget] = useState<EditorTarget | null>(null)
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
  const [cap, setCap] = useState('')

  const renewalsDb = useTable<Renewal>('renewals', { col: 'next_due', asc: true })
  const stuffDb = useTable<Stuff>('stuff', { col: 'created_at', asc: false })
  const promisesDb = useTable<Promise_>('promises', { col: 'created_at', asc: false })
  const openPromises = useMemo(() => sortPromises(promisesDb.rows.filter((p) => !p.done), todayISO), [promisesDb.rows, todayISO])
  const chase = useMemo(() => lentToChase(stuffDb.rows, todayISO), [stuffDb.rows, todayISO])
  const exitLists = useTable<ExitList>('exit_lists', { col: 'position', asc: true })
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
  const suggestions = useMemo(() => suggest({
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
  const error = pr.error || inbox.error || evs.error || habits.error || routinesDb.error

  const [undo, setUndo] = useState<{ label: string; restore: () => void } | null>(null)
  useEffect(() => { if (!undo) return; const t = setTimeout(() => setUndo(null), 6000); return () => clearTimeout(t) }, [undo])

  const addPriority = (e: React.FormEvent) => {
    e.preventDefault()
    if (!draft.trim() || pr.tasks.length >= 3) return
    pr.add(draft.trim()); setDraft('')
  }
  const capture = (e: React.FormEvent) => {
    e.preventDefault()
    if (!cap.trim()) return
    inbox.add(cap.trim()); setCap('')
  }

  return (
    <div className="grid gap-8">
      <section className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="eyebrow">{now.toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
          <h1 className="mt-2 font-display text-4xl">{greet(now.getHours())}</h1>
          <p className="mt-3 text-lg" style={{ color: 'var(--ink-soft)' }}>
            {current ? (
              <>Ahora: <strong style={{ color: kindMeta[current.kind].color }}>{current.title}</strong> · quedan {dur(current.end_min - m)}</>
            ) : next ? (
              <>Sigue: <strong style={{ color: 'var(--ink)' }}>{next.title}</strong> a las {fmtMin(next.start_min)}</>
            ) : (
              'No hay más bloques hoy. Es tu tiempo.'
            )}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-x-4">
            <Link to="/app/mente/enfoque" className="btn btn-primary">Enfocarme</Link>
            <button className="btn btn-ghost" onClick={() => setOverwhelm(true)}><HeartHandshake size={16} aria-hidden /> Estoy abrumado</button>
            <Link to="/app/planear" className="inline-flex min-h-11 items-center text-sm underline" style={{ color: 'var(--ink-soft)' }}>Ver mi horario</Link>
          </div>
        </div>
        <div className="w-28 shrink-0 sm:w-36"><Avatar prop={propFor(current?.kind, now.getHours())} size={150} /></div>
      </section>

      {error && <p role="alert" className="rounded-xl px-3 py-2 text-sm" style={{ background: 'color-mix(in oklab, var(--neg) 15%, transparent)', color: 'var(--neg)' }}>{error}</p>}

      <DayRitual ck={checkins} hour={now.getHours()} prioritiesDone={pr.tasks.filter((t) => t.done).length} habitsDone={activeHabits.filter((h) => hlogs.rows.some((l) => l.habit_id === h.id && l.day === todayISO)).length} onAddPriority={(t) => { if (pr.tasks.length < 3) pr.add(t) }} />

      <Group className="!mt-0" title="Ahora te conviene" aside={suggestions[0]?.id === 'free' ? undefined : `${suggestions.length}`}>
        {suggestions.map((x) => <Row key={x.id} to={x.to} tone={x.tone === 'urgent' ? 'var(--neg)' : x.tone === 'now' ? 'var(--accent)' : x.tone === 'soon' ? 'var(--sky)' : 'var(--ink-faint)'} title={x.title} sub={x.reason} />)}
      </Group>

      <GoalSpotlight today={todayISO} evening={now.getHours() >= 19} />

      <OutingSpotlight />

      <ShoppingSpotlight />

      {(openPromises.length > 0 || chase.length > 0) && (
        <Group className="!mt-0" title="Con la gente" aside={<Link to="/app/mente/cosas" className="underline">Ver todo</Link>}>
          {openPromises.slice(0, 3).map((p) => <Row key={p.id} to="/app/mente/cosas" chevron={false} tone={promiseState(p, todayISO) === 'overdue' ? 'var(--neg)' : promiseState(p, todayISO) === 'today' ? 'var(--accent)' : 'var(--ink-faint)'} title={p.text} sub={`${p.person ? `${p.person} · ` : ''}${dueLabel(p.due_date, todayISO)}`} />)}
          {chase.slice(0, 2).map((c) => <Row key={c.id} to="/app/mente/cosas" chevron={false} tone="var(--clay)" title={`Pedir de vuelta: ${c.name}`} sub={`Con ${c.person ?? 'alguien'}`} />)}
        </Group>
      )}

      <ResumeHint />

      {agenda.length > 0 && (
        <section aria-labelledby="agenda">
          <div className="group-head"><h3 id="agenda">Tu agenda de hoy</h3><span><Link to="/app/planear/agenda" className="underline">Ver todo</Link></span></div>
          <ul className="group-list">
            {agenda.map((o) => (
              <OccurrenceCard key={o.event.id + o.date} o={o}
                onEdit={() => setEvTarget({ event: o.event, date: o.date })}
                onToggleDone={() => evs.setState(o.event.id, o.date, { done: !o.state.done })}
                onToggleCheck={(id) => evs.setState(o.event.id, o.date, { checked: o.state.checked.includes(id) ? o.state.checked.filter((x) => x !== id) : [...o.state.checked, id] })} />
            ))}
          </ul>
        </section>
      )}

      {activeHabits.length > 0 && (
        <Group className="!mt-0" title="Hábitos de hoy" aside={<Link to="/app/mente" className="underline">Ver todo</Link>}>
          {activeHabits.map((h) => {
            const done = hlogs.rows.some((l) => l.habit_id === h.id && l.day === todayISO)
            return <Row key={h.id} icon={<Chk on={done} tone="var(--pos)" />} title={h.name} muted={done} value={`${weekDone(h.id, hlogs.rows, todayISO)}/${h.target_per_week} sem.`} valueTone="soft" chevron={false} onClick={() => toggleHabit(h)} />
          })}
        </Group>
      )}

      <Group className="!mt-0" title="Tres prioridades" aside={`${pr.tasks.filter((t) => t.done).length}/${pr.tasks.length || 3}`}>
        {pr.tasks.map((t) => (
          <Row key={t.id} icon={<Chk on={t.done} />} title={t.title} muted={t.done} chevron={false} onClick={() => pr.toggle(t.id)}
            trailing={<button className="grid size-11 place-items-center rounded-full" aria-label={`Borrar prioridad: ${t.title}`} onClick={() => { pr.remove(t.id); setUndo({ label: 'Prioridad borrada', restore: () => pr.add(t.title) }) }}><Trash2 size={15} aria-hidden style={{ color: 'var(--ink-faint)' }} /></button>} />
        ))}
        {pr.tasks.length < 3 && (
          <li className="row">
            <form onSubmit={addPriority} className="row-hit">
              <label className="sr-only" htmlFor="prio-in">Nueva prioridad</label>
              <span className="row-ico" aria-hidden><Plus size={16} /></span>
              <input id="prio-in" value={draft} onChange={(e) => setDraft(e.target.value)} maxLength={500} placeholder={pr.tasks.length ? 'Otra prioridad' : '¿Qué es lo más importante hoy?'} className="row-input" />
              {draft.trim() && <button className="btn btn-tint !min-h-9">Agregar</button>}
            </form>
          </li>
        )}
      </Group>

      <Group className="!mt-0" title="Captura rápida" footer="Anota lo que se te ocurra. Después decides dónde va.">
        <li className="row">
          <form onSubmit={capture} className="row-hit">
            <label className="sr-only" htmlFor="cap-in">Captura rápida</label>
            <span className="row-ico" aria-hidden><Plus size={16} /></span>
            <input id="cap-in" value={cap} onChange={(e) => setCap(e.target.value)} maxLength={2000} placeholder="Una idea, un link, una tarea…" className="row-input" />
            {cap.trim() && <button className="btn btn-tint !min-h-9">Guardar</button>}
          </form>
        </li>
        {inbox.items.map((x) => (
          <Row key={x.id} title={<span className="whitespace-normal break-words">{x.text}</span>} chevron={false}
            trailing={<button className="grid size-11 place-items-center rounded-full" aria-label={`Borrar captura: ${x.text}`} onClick={() => { inbox.remove(x.id); setUndo({ label: 'Captura borrada', restore: () => inbox.add(x.text) }) }}><Trash2 size={15} aria-hidden style={{ color: 'var(--ink-faint)' }} /></button>} />
        ))}
      </Group>
      {undo && (
        <div role="status" className="fixed left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-full py-1 pr-2 pl-5 text-sm" style={{ bottom: 'calc(5.5rem + env(safe-area-inset-bottom))', background: 'var(--surface-2)', border: '1px solid var(--line)' }}>
          {undo.label}
          <button className="min-h-11 rounded-full px-3 font-semibold underline" style={{ color: 'var(--accent)' }} onClick={() => { undo.restore(); setUndo(null) }}>Deshacer</button>
        </div>
      )}
      <OverwhelmSheet open={overwhelm} onClose={() => setOverwhelm(false)} priorities={pr.tasks.filter((t) => !t.done).map((t) => t.title)} dump={async (lines) => { for (const l of lines) await inbox.add(l) }} />
      <EventEditor target={evTarget} onClose={() => setEvTarget(null)}
        onSave={async (id, v) => { if (id) await evs.update(id, v); else await evs.add(v); setEvTarget(null) }}
        onDelete={(id) => { evs.remove(id); setEvTarget(null) }}
        onSkip={(e, d) => { evs.skip(e, d); setEvTarget(null) }} />
    </div>
  )
}
