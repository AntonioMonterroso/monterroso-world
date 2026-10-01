import { Loader2, Plus } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useTable } from '../../lib/table'
import type { Phase, Sermon, Slide } from '../../lib/pulpit'

const STATUS = { draft: { label: 'Borrador', color: 'var(--personal)' }, ready: { label: 'Lista', color: 'var(--music)' }, delivered: { label: 'Predicada', color: '#8fd1a4' } }

export default function Sermons() {
  const db = useTable<Sermon>('sermons', { col: 'created_at', asc: false })
  const phases = useTable<Phase>('sermon_phases', { col: 'position', asc: true })
  const slides = useTable<Slide>('sermon_slides', { col: 'position', asc: true })
  const nav = useNavigate()

  const create = async () => {
    const s = await db.add({ title: 'Nueva prédica', scripture: null, preach_date: null, status: 'draft', notes: null, live_token: undefined as never })
    if (s) nav(`/app/pulpito/predica/${s.id}`)
  }

  return (
    <div>
      <div className="flex items-end justify-between gap-3">
        <div><p className="eyebrow">Púlpito</p><h1 className="mt-2 font-display text-4xl">Prédicas</h1></div>
        <button className="btn btn-primary" onClick={create}><Plus size={18} aria-hidden /> Prédica</button>
      </div>

      {db.error && <p role="alert" className="mt-3 rounded-xl px-3 py-2 text-sm" style={{ background: 'color-mix(in oklab, #e8a393 15%, transparent)', color: '#e8a393' }}>{db.error}</p>}

      {db.loading ? <div className="grid h-48 place-items-center"><Loader2 className="animate-spin" aria-label="Cargando" /></div> : db.rows.length === 0 ? (
        <div className="mt-8 rounded-2xl border px-6 py-10 text-center" style={{ borderColor: 'var(--line-soft)', background: 'var(--surface)' }}>
          <p className="font-display text-2xl">Tu primera prédica</p>
          <p className="mx-auto mt-2 max-w-sm text-sm" style={{ color: 'var(--ink-soft)' }}>Arma el guion por fases, con tiempos, y las diapositivas para la pantalla de la iglesia.</p>
          <button className="btn btn-primary mt-5" onClick={create}>Empezar</button>
        </div>
      ) : (
        <ul className="mt-6 grid gap-2">
          {db.rows.map((s) => {
            const st = STATUS[s.status]
            const mins = phases.rows.filter((p) => p.sermon_id === s.id).reduce((a, p) => a + (p.minutes ?? 0), 0)
            const n = slides.rows.filter((x) => x.sermon_id === s.id).length
            return (
              <li key={s.id}>
                <Link to={`/app/pulpito/predica/${s.id}`} className="flex min-h-16 items-center justify-between gap-4 rounded-xl border px-4 py-3" style={{ background: 'var(--surface)', borderColor: 'var(--line-soft)' }}>
                  <span className="min-w-0"><span className="block truncate font-semibold">{s.title}</span><span className="block truncate text-sm" style={{ color: 'var(--ink-soft)' }}>{[s.scripture, s.preach_date].filter(Boolean).join(' · ') || 'Sin pasaje ni fecha'}</span></span>
                  <span className="shrink-0 text-right text-xs" style={{ color: 'var(--ink-faint)' }}><span className="block" style={{ color: st.color }}>{st.label}</span>{mins > 0 && `${mins} min`}{mins > 0 && n > 0 && ' · '}{n > 0 && `${n} diap.`}</span>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
