import { Loader2, Plus, Repeat } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { STATUS, dueReviews, finishedThisWeek, parseVideoUrl, thumbUrl, type Video, type VideoNote, type VideoStatus } from '../../lib/learn'
import { getSettings, patchSettings } from '../../lib/settings'
import { useTable } from '../../lib/table'
import { localISO } from '../../lib/time'
import { Empty, ErrorBar, chip } from '../money/shared'

export async function fetchYouTubeTitle(url: string): Promise<string | null> {
  try {
    const ctl = new AbortController()
    const t = setTimeout(() => ctl.abort(), 5000)
    const r = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`, { signal: ctl.signal })
    clearTimeout(t)
    if (!r.ok) return null
    const j = (await r.json()) as { title?: string }
    return j.title?.slice(0, 300) ?? null
  } catch { return null }
}

export default function Learn() {
  const db = useTable<Video>('videos', { col: 'created_at', asc: false })
  const notes = useTable<VideoNote>('video_notes', { col: 'at_sec', asc: true })
  const nav = useNavigate()
  const today = localISO()
  const [url, setUrl] = useState('')
  const [title, setTitle] = useState('')
  const [topic, setTopic] = useState('')
  const [adding, setAdding] = useState(false)
  const [needTitle, setNeedTitle] = useState(false)
  const [err, setErr] = useState('')
  const [status, setStatus] = useState<VideoStatus | 'all'>('all')
  const [topicFilter, setTopicFilter] = useState('')
  const [q, setQ] = useState('')
  const [goal, setGoal] = useState(3)

  useEffect(() => { getSettings().then((s) => { const g = (s as { learnGoal?: number }).learnGoal; if (g) setGoal(g) }) }, [])

  const topics = useMemo(() => [...new Set(db.rows.map((v) => v.topic).filter((t): t is string => Boolean(t)))].sort((a, b) => a.localeCompare(b, 'es')), [db.rows])
  const due = useMemo(() => dueReviews(db.rows, today), [db.rows, today])
  const week = finishedThisWeek(db.rows, today)

  const list = useMemo(() => {
    const t = q.trim().toLowerCase()
    return db.rows.filter((v) => (status === 'all' || v.status === status) && (!topicFilter || v.topic === topicFilter) && (!t || `${v.title} ${v.topic ?? ''}`.toLowerCase().includes(t)))
  }, [db.rows, status, topicFilter, q])

  const add = async (e: React.FormEvent) => {
    e.preventDefault()
    const p = parseVideoUrl(url)
    if (!p) return setErr('Pega un enlace de YouTube o de Vimeo.')
    setAdding(true); setErr('')
    let name = title.trim()
    if (!name && p.provider === 'youtube') name = (await fetchYouTubeTitle(`https://www.youtube.com/watch?v=${p.id}`)) ?? ''
    if (!name) { setAdding(false); setNeedTitle(true); return setErr('No pude traer el título. Escríbelo tú.') }
    const v = await db.add({ provider: p.provider, video_id: p.id, title: name, topic: topic.trim() || null, status: 'queue', start_sec: p.start, finished_on: null, review_step: 0, next_review: null, created_at: undefined as never })
    setAdding(false)
    if (v) { setUrl(''); setTitle(''); setNeedTitle(false); nav(`/app/descubrir/video/${v.id}`) }
  }

  const setGoalSaved = (n: number) => { const g = Math.min(21, Math.max(1, n)); setGoal(g); patchSettings({ learnGoal: g } as never) }

  if (db.loading) return <div className="grid h-48 place-items-center"><Loader2 className="animate-spin" aria-label="Cargando" /></div>

  return (
    <div>
      <p className="eyebrow">Descubrir</p>
      <h1 className="mt-2 font-display text-4xl">Aprender</h1>
      <ErrorBar msg={db.error || notes.error} onClose={db.clearError} />

      <section className="mt-6 rounded-2xl border p-4" style={{ borderColor: 'var(--line-soft)', background: 'var(--surface)' }} aria-label="Meta de la semana">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm" style={{ color: 'var(--ink-soft)' }}>Esta semana terminaste <strong style={{ color: 'var(--ink)' }}>{week}</strong> de <strong style={{ color: 'var(--ink)' }}>{goal}</strong> videos</p>
          <div className="flex items-center gap-1">
            <button className="grid size-11 place-items-center rounded-full border" style={{ borderColor: 'var(--line)' }} onClick={() => setGoalSaved(goal - 1)} aria-label="Bajar la meta">−</button>
            <button className="grid size-11 place-items-center rounded-full border" style={{ borderColor: 'var(--line)' }} onClick={() => setGoalSaved(goal + 1)} aria-label="Subir la meta">+</button>
          </div>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full" style={{ background: 'var(--surface-2)' }} role="img" aria-label={`${week} de ${goal}`}><div className="h-full rounded-full" style={{ width: `${Math.min(100, (week / goal) * 100)}%`, background: week >= goal ? '#8fd1a4' : 'var(--music)', transition: 'width 400ms var(--ease-out)' }} /></div>
        {db.rows.filter((v) => v.status === 'watching').length > 3 && <p className="mt-3 text-xs" style={{ color: 'var(--personal)' }}>Tienes más de 3 videos “viendo” a la vez. Terminar uno antes de empezar otro ayuda a no dispersarte.</p>}
      </section>

      {due.length > 0 && (
        <section className="mt-6" aria-labelledby="rev">
          <h2 id="rev" className="flex items-center gap-2 font-display text-2xl"><Repeat size={20} aria-hidden /> Para repasar</h2>
          <p className="mt-1 text-sm" style={{ color: 'var(--ink-soft)' }}>Repasar a tiempo es lo que hace que se quede.</p>
          <ul className="mt-3 grid gap-2">{due.map((v) => <li key={v.id}><Link to={`/app/descubrir/video/${v.id}`} className="flex min-h-12 items-center justify-between gap-3 rounded-xl border px-4 py-2" style={{ background: 'var(--surface)', borderColor: 'var(--personal)' }}><span className="truncate">{v.title}</span><span className="shrink-0 text-xs" style={{ color: 'var(--personal)' }}>repaso {v.review_step + 1}</span></Link></li>)}</ul>
        </section>
      )}

      <form onSubmit={add} className="mt-8 grid gap-3 rounded-2xl border p-4" style={{ borderColor: 'var(--line-soft)', background: 'var(--surface)' }}>
        <h2 className="font-display text-2xl">Agregar un video</h2>
        <input className="field" inputMode="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="Enlace de YouTube o Vimeo" aria-label="Enlace del video" autoComplete="off" />
        <div className="grid gap-3 sm:grid-cols-2">
          <input className="field" value={topic} onChange={(e) => setTopic(e.target.value)} list="topics" placeholder="Tema o ruta (React, piano…)" aria-label="Tema" maxLength={80} />
          <datalist id="topics">{topics.map((t) => <option key={t} value={t} />)}</datalist>
          {needTitle && <input className="field" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Título" aria-label="Título" maxLength={300} />}
        </div>
        {err && <p role="alert" className="text-sm" style={{ color: '#e8a393' }}>{err}</p>}
        <button className="btn btn-primary w-fit" disabled={adding || !url.trim()}>{adding ? <Loader2 size={16} className="animate-spin" aria-hidden /> : <Plus size={16} aria-hidden />} Agregar</button>
      </form>

      {db.rows.length === 0 ? (
        <Empty title="Tu biblioteca de aprendizaje" text="Guarda videos de lo que quieres aprender. Los ves aquí mismo, tomas notas con el minuto exacto y la app te recuerda repasarlos." />
      ) : (
        <>
          <input className="field mt-8" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar en tus videos" aria-label="Buscar videos" autoComplete="off" />
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Estado">
            {([{ id: 'all', label: 'Todos', color: 'var(--accent)' }, ...STATUS] as { id: VideoStatus | 'all'; label: string; color: string }[]).map((s) => <button key={s.id} aria-pressed={status === s.id} onClick={() => setStatus(s.id)} className="min-h-11 shrink-0 rounded-full border px-4 text-sm" style={chip(status === s.id, s.color === 'var(--ink-soft)' ? 'var(--accent)' : s.color)}>{s.label}</button>)}
          </div>
          {topics.length > 0 && (
            <div className="mt-2 flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Tema">
              <button aria-pressed={!topicFilter} onClick={() => setTopicFilter('')} className="min-h-11 shrink-0 rounded-full border px-4 text-sm" style={chip(!topicFilter, 'var(--sky)')}>Todos los temas</button>
              {topics.map((t) => <button key={t} aria-pressed={topicFilter === t} onClick={() => setTopicFilter(topicFilter === t ? '' : t)} className="min-h-11 shrink-0 rounded-full border px-4 text-sm" style={chip(topicFilter === t, 'var(--sky)')}>{t}</button>)}
            </div>
          )}
          <ul className="mt-5 grid gap-3">
            {list.map((v) => {
              const th = thumbUrl(v)
              const st = STATUS.find((s) => s.id === v.status)!
              const n = notes.rows.filter((x) => x.video_id === v.id).length
              return (
                <li key={v.id}>
                  <Link to={`/app/descubrir/video/${v.id}`} className="flex gap-3 rounded-xl border p-2" style={{ background: 'var(--surface)', borderColor: 'var(--line-soft)' }}>
                    <span className="grid aspect-video w-32 shrink-0 place-items-center overflow-hidden rounded-lg sm:w-40" style={{ background: 'var(--bg)' }}>{th ? <img src={th} alt="" loading="lazy" referrerPolicy="no-referrer" className="size-full object-cover" /> : <span className="text-xs" style={{ color: 'var(--ink-faint)' }}>Vimeo</span>}</span>
                    <span className="min-w-0 flex-1 py-1">
                      <span className="line-clamp-2 block font-semibold">{v.title}</span>
                      <span className="mt-1 block text-xs" style={{ color: 'var(--ink-faint)' }}><span style={{ color: st.color }}>{st.label}</span>{v.topic && ` · ${v.topic}`}{n > 0 && ` · ${n} ${n === 1 ? 'nota' : 'notas'}`}</span>
                    </span>
                  </Link>
                </li>
              )
            })}
            {list.length === 0 && <li className="text-sm" style={{ color: 'var(--ink-soft)' }}>Nada coincide.</li>}
          </ul>
        </>
      )}
    </div>
  )
}
