import {Lightbulb, Link2, PlayCircle, Plus, Repeat, Briefcase } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Group, PageHeader, Row } from '../../components/ui'
import type { Board, Inspiration } from '../../lib/inspire'
import { STATUS, dueReviews, finishedThisWeek, thumbUrl, type LinkRow, type Video } from '../../lib/learn'
import { getSettings } from '../../lib/settings'
import { useTable } from '../../lib/table'
import { localISO } from '../../lib/time'

const QUICK = [
  { label: 'Video', to: '/app/descubrir/aprender?nuevo=1' },
  { label: 'Link', to: '/app/descubrir/links?nuevo=1' },
  { label: 'Idea', to: '/app/descubrir/inspiracion?nuevo=1' },
  { label: 'Lugar', to: '/app/lugares?nuevo=1' },
  { label: 'Compra', to: '/app/compras?nuevo=1' },
]

const HubRow = ({ to, icon: Icon, title, line, color }: { to: string; icon: typeof Link2; title: string; line: string; color: string }) => (
  <Row to={to} icon={<Icon size={17} aria-hidden />} tone={color} title={title} sub={line} />
)

export default function Hub() {
  const nav = useNavigate()
  const today = localISO()
  const videos = useTable<Video>('videos', { col: 'created_at', asc: false })
  const links = useTable<LinkRow>('links', { col: 'created_at', asc: false })
  const insp = useTable<Inspiration>('inspirations', { col: 'created_at', asc: false })
  const boards = useTable<Board>('boards', { col: 'name', asc: true })
  const [goal, setGoal] = useState(3)
  useEffect(() => { getSettings().then((s) => { const g = (s as { learnGoal?: number }).learnGoal; if (g) setGoal(g) }) }, [])

  const due = useMemo(() => dueReviews(videos.rows, today), [videos.rows, today])
  const watching = videos.rows.find((v) => v.status === 'watching') ?? videos.rows.find((v) => v.status === 'queue')
  const week = finishedThisWeek(videos.rows, today)
  const queue = videos.rows.filter((v) => v.status === 'queue').length
  const portfolio = links.rows.filter((l) => l.portfolio).length
  const favs = links.rows.filter((l) => l.favorite).length

  const summary = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`

  return (
    <div>
      <PageHeader eyebrow="Centro" title="Descubrir" sub="Lo que aprendes, lo que guardas y lo que quieres conocer o comprar." />

      <div className="flex flex-wrap gap-2" role="group" aria-label="Agregar rápido">
        {QUICK.map((q) => <button key={q.label} onClick={() => nav(q.to)} className="btn btn-tint !min-h-10"><Plus size={14} aria-hidden /> {q.label}</button>)}
      </div>

      <div className="mt-2 grid gap-2 lg:grid-cols-[1.25fr_1fr] lg:gap-14">
        {/* Aprender: lo accionable va primero */}
        <section aria-labelledby="h-aprender">
          <div className="group-head !mt-6"><h3 id="h-aprender">Aprender</h3><span><Link to="/app/descubrir/aprender" className="underline">Ver videos</Link></span></div>

          <div className="mt-3 rounded-2xl border p-4" style={{ borderColor: 'var(--line-soft)', background: 'var(--surface)' }}>
            <p className="text-sm" style={{ color: 'var(--ink-soft)' }}>Esta semana terminaste <strong style={{ color: 'var(--ink)' }}>{week}</strong> de <strong style={{ color: 'var(--ink)' }}>{goal}</strong> videos</p>
            <div className="mt-3 h-2 overflow-hidden rounded-full" style={{ background: 'var(--surface-2)' }} role="img" aria-label={`${week} de ${goal}`}><div className="h-full rounded-full" style={{ width: `${Math.min(100, (week / goal) * 100)}%`, background: week >= goal ? 'var(--pos)' : 'var(--music)', transition: 'width 400ms var(--ease-out)' }} /></div>
          </div>

          {due.length > 0 && (
            <div className="mt-5">
              <h3 className="flex items-center gap-2 text-sm font-semibold" style={{ color: 'var(--personal)' }}><Repeat size={15} aria-hidden /> Para repasar hoy</h3>
              <ul className="mt-2 grid gap-2">{due.slice(0, 3).map((v) => <li key={v.id}><Link to={`/app/descubrir/video/${v.id}`} className="flex min-h-12 items-center justify-between gap-3 rounded-xl border px-4 py-2" style={{ background: 'var(--surface)', borderColor: 'var(--personal)' }}><span className="truncate">{v.title}</span><span className="shrink-0 text-xs" style={{ color: 'var(--personal)' }}>repaso {v.review_step + 1}</span></Link></li>)}</ul>
              {due.length > 3 && <Link to="/app/descubrir/aprender" className="mt-1 inline-flex min-h-11 items-center text-sm underline" style={{ color: 'var(--ink-soft)' }}>y {due.length - 3} más</Link>}
            </div>
          )}

          {watching ? (
            <div className="mt-5">
              <h3 className="text-sm font-semibold" style={{ color: 'var(--ink-soft)' }}>{watching.status === 'watching' ? 'Sigue viendo' : 'Lo siguiente'}</h3>
              <Link to={`/app/descubrir/video/${watching.id}`} className="mt-2 flex gap-3 rounded-xl border p-2" style={{ background: 'var(--surface)', borderColor: 'var(--line-soft)' }}>
                <span className="grid aspect-video w-32 shrink-0 place-items-center overflow-hidden rounded-lg sm:w-40" style={{ background: 'var(--bg)' }}>{thumbUrl(watching) ? <img src={thumbUrl(watching)!} alt="" loading="lazy" referrerPolicy="no-referrer" className="size-full object-cover" /> : <PlayCircle size={28} aria-hidden style={{ color: 'var(--ink-faint)' }} />}</span>
                <span className="min-w-0 flex-1 py-1"><span className="line-clamp-2 block font-semibold">{watching.title}</span><span className="mt-1 block text-xs" style={{ color: 'var(--ink-faint)' }}>{STATUS.find((s) => s.id === watching.status)?.label}{watching.topic && ` · ${watching.topic}`}{queue > 1 && ` · ${queue - 1} más por ver`}</span></span>
              </Link>
            </div>
          ) : !videos.loading && (
            <p className="mt-5 text-sm" style={{ color: 'var(--ink-soft)' }}>Guarda un video de lo que quieres aprender. Lo ves aquí mismo, tomas notas con el minuto exacto y la app te recuerda repasarlo.</p>
          )}
        </section>

        <div className="grid content-start">
          <Group title="Guardar">
              <HubRow to="/app/descubrir/links" icon={Link2} color="var(--dev)" title="Links" line={links.rows.length ? `${summary(links.rows.length, 'link', 'links')}${favs ? ` · ${favs} ${favs === 1 ? 'favorito' : 'favoritos'}` : ''}` : 'Tu directorio por categorías'} />
              <HubRow to="/app/descubrir/inspiracion" icon={Lightbulb} color="var(--music)" title="Inspiración" line={insp.rows.length ? `${summary(insp.rows.length, 'cosa guardada', 'cosas guardadas')}${boards.rows.length ? ` · ${summary(boards.rows.length, 'tablero', 'tableros')}` : ''}` : 'Enlaces, fotos, canciones y notas'} />
              <HubRow to="/app/descubrir/portafolio" icon={Briefcase} color="var(--personal)" title="Portafolio" line={portfolio ? summary(portfolio, 'trabajo para mostrar', 'trabajos para mostrar') : 'Tu página y lo que ya publicaste'} />
          </Group>

        </div>
      </div>
    </div>
  )
}
