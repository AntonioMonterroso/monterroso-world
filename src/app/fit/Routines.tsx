import { Loader2, Play, Plus } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useTable } from '../../lib/table'
import { DAYS } from '../../lib/time'
import type { Workout, WorkoutItem } from '../../lib/fitness'
import { Empty, ErrorBar } from '../money/shared'
import { PageHeader } from '../../components/ui'

export default function Routines() {
  const db = useTable<Workout>('workouts', { col: 'created_at', asc: true })
  const items = useTable<WorkoutItem>('workout_items', { col: 'position', asc: true })
  const nav = useNavigate()

  const create = async () => {
    const w = await db.add({ title: 'Nueva rutina', notes: null, days: [] })
    if (w) nav(`/app/ejercicio/rutina/${w.id}`)
  }

  return (
    <div>
      <PageHeader eyebrow="Ejercicio" title="Rutinas" action={<button className="btn btn-primary" onClick={create}><Plus size={18} aria-hidden /> Rutina</button>} />
      <ErrorBar msg={db.error || items.error} onClose={db.clearError} />
      {db.loading ? <div className="grid h-48 place-items-center"><Loader2 className="animate-spin" aria-label="Cargando" /></div> : db.rows.length === 0 ? (
        <Empty title="Arma tu primera rutina" text="Ejercicios con series, repeticiones y peso. Luego la usas para entrenar y ver tu progreso." action="Crear rutina" onAction={create} />
      ) : (
        <ul className="mt-6 grid gap-2">
          {db.rows.map((w) => {
            const n = items.rows.filter((i) => i.workout_id === w.id).length
            return (
              <li key={w.id} className="flex items-center gap-2 rounded-xl border pr-2" style={{ background: 'var(--surface)', borderColor: 'var(--line-soft)' }}>
                <Link to={`/app/ejercicio/rutina/${w.id}`} className="min-w-0 flex-1 px-4 py-3">
                  <span className="block truncate font-semibold">{w.title}</span>
                  <span className="block truncate text-xs" style={{ color: 'var(--ink-faint)' }}>{n} {n === 1 ? 'ejercicio' : 'ejercicios'}{w.days.length > 0 && ` · ${DAYS.filter((d) => w.days.includes(d.n)).map((d) => d.short).join(' ')}`}</span>
                </Link>
                <Link to={`/app/ejercicio/entrenar/${w.id}`} className="btn btn-primary shrink-0"><Play size={16} aria-hidden /> Entrenar</Link>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
