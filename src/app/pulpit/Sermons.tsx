import { Loader2, Plus } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useTable } from '../../lib/table'
import type { Phase, Sermon, Slide } from '../../lib/pulpit'
import { Group, PageHeader, Row } from '../../components/ui'

const STATUS = { draft: { label: 'Borrador', color: 'var(--personal)' }, ready: { label: 'Lista', color: 'var(--music)' }, delivered: { label: 'Predicada', color: 'var(--pos)' } }

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
      <PageHeader eyebrow="Púlpito" title="Prédicas" action={<button className="btn btn-primary" onClick={create}><Plus size={18} aria-hidden /> Prédica</button>} />

      {db.error && <p role="alert" className="mt-3 rounded-xl px-3 py-2 text-sm" style={{ background: 'color-mix(in oklab, var(--neg) 15%, transparent)', color: 'var(--neg)' }}>{db.error}</p>}

      {db.loading ? <div className="grid h-48 place-items-center"><Loader2 className="animate-spin" aria-label="Cargando" /></div> : db.rows.length === 0 ? (
        <div className="mt-8 rounded-2xl border px-6 py-10 text-center" style={{ borderColor: 'var(--line-soft)', background: 'var(--surface)' }}>
          <p className="font-display text-2xl">Tu primera prédica</p>
          <p className="mx-auto mt-2 max-w-sm text-sm" style={{ color: 'var(--ink-soft)' }}>Arma el guion por fases, con tiempos, y las diapositivas para la pantalla de la iglesia.</p>
          <button className="btn btn-primary mt-5" onClick={create}>Empezar</button>
        </div>
      ) : (
        <Group>
          {db.rows.map((s) => {
            const st = STATUS[s.status]
            const mins = phases.rows.filter((p) => p.sermon_id === s.id).reduce((a, p) => a + (p.minutes ?? 0), 0)
            const n = slides.rows.filter((x) => x.sermon_id === s.id).length
            return <Row key={s.id} tone={st.color} title={s.title} to={`/app/pulpito/predica/${s.id}`}
              sub={[s.scripture, s.preach_date].filter(Boolean).join(' · ') || st.label}
              value={[mins > 0 && `${mins} min`, n > 0 && `${n} diap.`].filter(Boolean).join(' · ') || undefined} valueTone="soft" />
          })}
        </Group>
      )}
    </div>
  )
}
