import { Loader2, Plus, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import Sheet from '../../components/Sheet'
import { Chk, Group, PageHeader } from '../../components/ui'
import { MOMENTS, SUGGESTIONS, streak, weekDone, weekStart, type Habit, type HabitLog, type Moment } from '../../lib/habits'
import { dayNum, isoFromNum } from '../../lib/recur'
import { useTable } from '../../lib/table'
import { DAYS, localISO } from '../../lib/time'
import { ErrorBar, chip } from '../money/shared'

type Draft = { id?: string; name: string; target: number; moment: Moment }

export default function Habits() {
  const habits = useTable<Habit>('habits', { col: 'position', asc: true })
  const logs = useTable<HabitLog>('habit_logs', { col: 'day', asc: false })
  const today = localISO()
  const [d, setD] = useState<Draft | null>(null)
  const [err, setErr] = useState('')
  const [confirm, setConfirm] = useState(false)

  const active = useMemo(() => habits.rows.filter((h) => !h.archived), [habits.rows])
  const monday = dayNum(weekStart(today))
  const week = useMemo(() => Array.from({ length: 7 }, (_, i) => isoFromNum(monday + i)), [monday])
  const doneToday = active.filter((h) => logs.rows.some((l) => l.habit_id === h.id && l.day === today)).length

  const toggle = async (h: Habit, day: string) => {
    if (day > today) return
    const ex = logs.rows.find((l) => l.habit_id === h.id && l.day === day)
    if (ex) await logs.remove(ex.id); else await logs.add({ habit_id: h.id, day })
  }

  const save = async () => {
    if (!d) return
    if (!d.name.trim()) return setErr('Ponle un nombre.')
    const v = { name: d.name.trim(), target_per_week: d.target, moment: d.moment }
    if (d.id) await habits.update(d.id, v); else await habits.add({ ...v, position: (habits.rows.at(-1)?.position ?? 0) + 1, archived: false })
    setD(null); setErr(''); setConfirm(false)
  }

  if (habits.loading || logs.loading) return <div className="grid h-48 place-items-center"><Loader2 className="animate-spin" aria-label="Cargando" /></div>

  const groups = MOMENTS.map((m) => ({ ...m, items: active.filter((h) => h.moment === m.id) })).filter((g) => g.items.length)

  return (
    <div>
      <PageHeader eyebrow="Mente y cuerpo" title="Hábitos" sub={active.length > 0 ? <>{doneToday} de {active.length} hoy. Un día sin hacerlo no borra lo avanzado.</> : undefined} action={<button className="btn btn-primary" onClick={() => setD({ name: '', target: 7, moment: 'any' })}><Plus size={18} aria-hidden /> Hábito</button>} />
      <ErrorBar msg={habits.error || logs.error} onClose={habits.clearError} />

      {active.length === 0 ? (
        <div className="mt-8 rounded-2xl border px-6 py-8" style={{ borderColor: 'var(--line-soft)', background: 'var(--surface)' }}>
          <p className="font-display text-2xl">Empieza con uno o dos</p>
          <p className="mt-2 max-w-md text-sm" style={{ color: 'var(--ink-soft)' }}>Pocos hábitos, claros y fáciles. Puedes decidir cuántas veces por semana, no tiene que ser todos los días.</p>
          <div className="mt-4 flex flex-wrap gap-2">{SUGGESTIONS.map((s) => <button key={s.name} className="inline-flex min-h-11 items-center gap-1 rounded-full border px-3 text-sm" style={{ borderColor: 'var(--line)' }} onClick={() => habits.add({ name: s.name, target_per_week: s.target, moment: s.moment, position: (habits.rows.at(-1)?.position ?? 0) + 1, archived: false })}><Plus size={14} aria-hidden /> {s.name}</button>)}</div>
        </div>
      ) : (
        groups.map((g, gi) => (
          <Group key={g.id} title={g.label} className={gi === 0 ? '!mt-5' : ''}>
            {g.items.map((h) => {
              const wd = weekDone(h.id, logs.rows, today)
              const st = streak(h, logs.rows, today)
              const doneT = logs.rows.some((l) => l.habit_id === h.id && l.day === today)
              return (
                <li key={h.id} className="row">
                  <div className="flex items-center">
                    <button onClick={() => toggle(h, today)} aria-pressed={doneT} aria-label={`${h.name}: ${doneT ? 'hecho hoy' : 'marcar hecho hoy'}`} className="grid size-14 shrink-0 place-items-center"><Chk on={doneT} tone="var(--pos)" /></button>
                    <button className="row-hit !pl-0" onClick={() => setD({ id: h.id, name: h.name, target: h.target_per_week, moment: h.moment })}>
                      <span className="row-main"><span className="row-title">{h.name}</span><span className="row-sub">{wd} de {h.target_per_week} esta semana{st.count > 0 && ` · ${st.count} ${st.count === 1 ? st.unit.replace('días', 'día').replace('semanas', 'semana') : st.unit}`}</span></span>
                    </button>
                  </div>
                  <div className="flex gap-1 px-4 pb-3 pl-14" role="group" aria-label={`Semana de ${h.name}`}>
                    {week.map((day, i) => {
                      const on = logs.rows.some((l) => l.habit_id === h.id && l.day === day)
                      const future = day > today
                      return <button key={day} disabled={future} onClick={() => toggle(h, day)} aria-pressed={on} aria-label={`${DAYS.find((x) => x.n === (i + 1) % 7)?.long}${on ? ': hecho' : ''}`} className="wk" data-today={day === today} style={{ opacity: future ? 0.35 : 1 }}>{DAYS.find((x) => x.n === (i + 1) % 7)?.short}</button>
                    })}
                  </div>
                </li>
              )
            })}
          </Group>
        ))
      )}

      <Sheet open={Boolean(d)} title={d?.id ? 'Editar hábito' : 'Nuevo hábito'} onClose={() => { setD(null); setConfirm(false) }}>
        {d && (
          <form className="grid gap-4" onSubmit={(e) => { e.preventDefault(); save() }}>
            <label className="grid gap-2 text-sm">Nombre<input className="field" value={d.name} onChange={(e) => setD({ ...d, name: e.target.value })} maxLength={120} placeholder="Estirar 5 minutos" autoFocus /></label>
            <fieldset>
              <legend className="mb-2 text-sm">Cuántas veces por semana</legend>
              <div className="flex gap-2">{[1, 2, 3, 4, 5, 6, 7].map((n) => <button key={n} type="button" aria-pressed={d.target === n} onClick={() => setD({ ...d, target: n })} className="grid size-11 place-items-center rounded-full border text-sm font-semibold" style={chip(d.target === n)}>{n}</button>)}</div>
            </fieldset>
            <fieldset>
              <legend className="mb-2 text-sm">Momento del día</legend>
              <div className="flex flex-wrap gap-2">{MOMENTS.map((m) => <button key={m.id} type="button" aria-pressed={d.moment === m.id} onClick={() => setD({ ...d, moment: m.id })} className="min-h-11 rounded-full border px-4 text-sm" style={chip(d.moment === m.id)}>{m.label}</button>)}</div>
            </fieldset>
            {err && <p role="alert" className="text-sm" style={{ color: '#e8a393' }}>{err}</p>}
            <div className="flex flex-wrap items-center gap-3">
              <button className="btn btn-primary">Guardar</button>
              {d.id && <>
                <button type="button" className="btn btn-ghost" onClick={async () => { await habits.update(d.id!, { archived: true }); setD(null) }}>Archivar</button>
                <button type="button" className="btn btn-ghost ml-auto" style={{ color: confirm ? '#e8a393' : undefined }} onClick={async () => { if (confirm) { await habits.remove(d.id!); setD(null); setConfirm(false) } else setConfirm(true) }}><Trash2 size={16} aria-hidden /> {confirm ? '¿Seguro?' : 'Eliminar'}</button>
              </>}
            </div>
          </form>
        )}
      </Sheet>
    </div>
  )
}
