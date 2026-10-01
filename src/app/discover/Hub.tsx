import { ArrowRight, BookmarkCheck, Lightbulb, Link2, MapPin, PlayCircle, Plus, Repeat, ShoppingBag, Briefcase } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { pendingTotals, type Board, type Inspiration, type Place, type ShopItem } from '../../lib/inspire'
import { STATUS, dueReviews, finishedThisWeek, thumbUrl, type LinkRow, type Video } from '../../lib/learn'
import { money } from '../../lib/projects'
import { getSettings } from '../../lib/settings'
import { useTable } from '../../lib/table'
import { localISO } from '../../lib/time'

const QUICK = [
  { label: 'Video', to: '/app/descubrir/aprender?nuevo=1' },
  { label: 'Link', to: '/app/descubrir/links?nuevo=1' },
  { label: 'Idea', to: '/app/descubrir/inspiracion?nuevo=1' },
  { label: 'Lugar', to: '/app/descubrir/lugares?nuevo=1' },
  { label: 'Compra', to: '/app/descubrir/compras?nuevo=1' },
]

function Row({ to, icon: Icon, title, line, color }: { to: string; icon: typeof Link2; title: string; line: string; color: string }) {
  return (
    <Link to={to} className="group flex min-h-16 items-center gap-4 border-b py-3 last:border-b-0" style={{ borderColor: 'var(--line-soft)' }}>
      <span className="grid size-10 shrink-0 place-items-center rounded-full" style={{ background: `color-mix(in oklab, ${color} 14%, transparent)`, color }}><Icon size={18} aria-hidden /></span>
      <span className="min-w-0 flex-1"><span className="block font-semibold">{title}</span><span className="block truncate text-sm" style={{ color: 'var(--ink-soft)' }}>{line}</span></span>
      <ArrowRight size={16} aria-hidden className="shrink-0 transition-transform duration-200 group-hover:translate-x-0.5" style={{ color: 'var(--ink-faint)' }} />
    </Link>
  )
}

export default function Hub() {
  const nav = useNavigate()
  const today = localISO()
  const videos = useTable<Video>('videos', { col: 'created_at', asc: false })
  const links = useTable<LinkRow>('links', { col: 'created_at', asc: false })
  const insp = useTable<Inspiration>('inspirations', { col: 'created_at', asc: false })
  const boards = useTable<Board>('boards', { col: 'name', asc: true })
  const places = useTable<Place>('places', { col: 'created_at', asc: false })
  const shop = useTable<ShopItem>('shopping_items', { col: 'created_at', asc: false })
  const [goal, setGoal] = useState(3)
  useEffect(() => { getSettings().then((s) => { const g = (s as { learnGoal?: number }).learnGoal; if (g) setGoal(g) }) }, [])

  const due = useMemo(() => dueReviews(videos.rows, today), [videos.rows, today])
  const watching = videos.rows.find((v) => v.status === 'watching') ?? videos.rows.find((v) => v.status === 'queue')
  const week = finishedThisWeek(videos.rows, today)
  const queue = videos.rows.filter((v) => v.status === 'queue').length
  const pendingShop = shop.rows.filter((i) => i.status === 'pending')
  const totals = pendingTotals(shop.rows)
  const want = places.rows.filter((p) => p.status === 'want').length
  const portfolio = links.rows.filter((l) => l.portfolio).length
  const favs = links.rows.filter((l) => l.favorite).length

  const summary = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`

  return (
    <div>
      <p className="eyebrow">Centro</p>
      <h1 className="mt-2 font-display text-4xl">Descubrir</h1>
      <p className="mt-2 max-w-md text-sm" style={{ color: 'var(--ink-soft)' }}>Lo que aprendes, lo que guardas y lo que quieres conocer o comprar.</p>

      <div className="mt-5 flex flex-wrap gap-2" role="group" aria-label="Agregar rápido">
        {QUICK.map((q) => <button key={q.label} onClick={() => nav(q.to)} className="inline-flex min-h-11 items-center gap-1 rounded-full border px-4 text-sm" style={{ borderColor: 'var(--line)' }}><Plus size={14} aria-hidden /> {q.label}</button>)}
      </div>

      <div className="mt-8 grid gap-10 lg:grid-cols-[1.25fr_1fr] lg:gap-14">
        {/* Aprender: lo accionable va primero */}
        <section aria-labelledby="h-aprender">
          <div className="flex items-baseline justify-between">
            <h2 id="h-aprender" className="font-display text-2xl">Aprender</h2>
            <Link to="/app/descubrir/aprender" className="inline-flex min-h-11 items-center text-sm underline" style={{ color: 'var(--ink-soft)' }}>Ver videos</Link>
          </div>

          <div className="mt-3 rounded-2xl border p-4" style={{ borderColor: 'var(--line-soft)', background: 'var(--surface)' }}>
            <p className="text-sm" style={{ color: 'var(--ink-soft)' }}>Esta semana terminaste <strong style={{ color: 'var(--ink)' }}>{week}</strong> de <strong style={{ color: 'var(--ink)' }}>{goal}</strong> videos</p>
            <div className="mt-3 h-2 overflow-hidden rounded-full" style={{ background: 'var(--surface-2)' }} role="img" aria-label={`${week} de ${goal}`}><div className="h-full rounded-full" style={{ width: `${Math.min(100, (week / goal) * 100)}%`, background: week >= goal ? '#8fd1a4' : 'var(--music)', transition: 'width 400ms var(--ease-out)' }} /></div>
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

        <div className="grid content-start gap-10">
          <section aria-labelledby="h-guardar">
            <h2 id="h-guardar" className="font-display text-2xl">Guardar</h2>
            <div className="mt-1">
              <Row to="/app/descubrir/links" icon={Link2} color="var(--dev)" title="Links" line={links.rows.length ? `${summary(links.rows.length, 'link', 'links')}${favs ? ` · ${favs} ${favs === 1 ? 'favorito' : 'favoritos'}` : ''}` : 'Tu directorio por categorías'} />
              <Row to="/app/descubrir/inspiracion" icon={Lightbulb} color="var(--music)" title="Inspiración" line={insp.rows.length ? `${summary(insp.rows.length, 'cosa guardada', 'cosas guardadas')}${boards.rows.length ? ` · ${summary(boards.rows.length, 'tablero', 'tableros')}` : ''}` : 'Enlaces, fotos, canciones y notas'} />
              <Row to="/app/descubrir/portafolio" icon={Briefcase} color="var(--personal)" title="Portafolio" line={portfolio ? summary(portfolio, 'trabajo para mostrar', 'trabajos para mostrar') : 'Tu página y lo que ya publicaste'} />
            </div>
          </section>

          <section aria-labelledby="h-salir">
            <h2 id="h-salir" className="font-display text-2xl">Salir y comprar</h2>
            <div className="mt-1">
              <Row to="/app/descubrir/lugares" icon={MapPin} color="var(--music)" title="Lugares" line={places.rows.length ? `${want} por visitar · ${places.rows.length - want} ${places.rows.length - want === 1 ? 'visitado' : 'visitados'}` : 'Sitios que quieres conocer'} />
              <Row to="/app/descubrir/compras" icon={pendingShop.length ? ShoppingBag : BookmarkCheck} color="var(--dev)" title="Por comprar" line={pendingShop.length ? `${summary(pendingShop.length, 'pendiente', 'pendientes')}${Object.keys(totals).length ? ` · ${Object.entries(totals).map(([c, v]) => money(v, c)).join(' · ')}` : ''}` : shop.rows.length ? 'Todo comprado' : 'Instrumentos, equipo y más'} />
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
