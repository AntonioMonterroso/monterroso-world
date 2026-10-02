import { ArrowLeft, Check, Clock, Repeat, Trash2 } from 'lucide-react'
import { useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import Field from '../../components/Field'
import { REVIEW_DAYS, STATUS, advanceReview, embedUrl, fmtTs, parseTs, startReviews, type Video, type VideoNote, type VideoStatus } from '../../lib/learn'
import { useTable } from '../../lib/table'
import { localISO } from '../../lib/time'
import { chip } from '../money/shared'
import YouTubePlayer, { type PlayerHandle } from './YouTubePlayer'

export default function VideoPage() {
  const { id } = useParams()
  const nav = useNavigate()
  const db = useTable<Video>('videos', { col: 'created_at', asc: false })
  const notes = useTable<VideoNote>('video_notes', { col: 'at_sec', asc: true })
  const handle = useRef<PlayerHandle | null>(null)
  const today = localISO()
  const [ts, setTs] = useState('')
  const [text, setText] = useState('')
  const [err, setErr] = useState('')
  const [confirm, setConfirm] = useState(false)

  const v = db.rows.find((x) => x.id === id)
  const mine = useMemo(() => notes.rows.filter((n) => n.video_id === id).sort((a, b) => a.at_sec - b.at_sec), [notes.rows, id])
  const topics = useMemo(() => [...new Set(db.rows.map((x) => x.topic).filter((t): t is string => Boolean(t)))], [db.rows])

  if (db.loading) return <p style={{ color: 'var(--ink-soft)' }}>Cargando…</p>
  if (!v) return <div><Link to="/app/descubrir/aprender" className="underline">Volver a Aprender</Link><p className="mt-4">No encontré este video.</p></div>

  const dueNow = v.next_review !== null && v.next_review <= today

  const setStatus = (s: VideoStatus) => {
    if (s === v.status) return
    if (s === 'done') db.update(v.id, { status: 'done', finished_on: today, ...startReviews(today) })
    else db.update(v.id, { status: s })
  }

  const stamp = () => { const t = handle.current?.time(); if (t !== undefined) setTs(fmtTs(t)) }

  const addNote = async (e: React.FormEvent) => {
    e.preventDefault()
    const body = text.trim()
    if (!body) return setErr('Escribe la nota.')
    const at = ts.trim() ? parseTs(ts) : Math.floor(handle.current?.time() ?? 0)
    if (at === null) return setErr('El minuto va como 3:25 o en segundos.')
    setErr('')
    await notes.add({ video_id: v.id, at_sec: at, body })
    setText(''); setTs('')
  }

  return (
    <div>
      <Link to="/app/descubrir/aprender" className="mb-4 inline-flex min-h-11 items-center gap-2 text-sm" style={{ color: 'var(--ink-soft)' }}><ArrowLeft size={16} aria-hidden /> Aprender</Link>

      <div className="aspect-video w-full overflow-hidden rounded-2xl" style={{ background: '#000' }}>
        {v.provider === 'youtube'
          ? <YouTubePlayer videoId={v.video_id} start={v.start_sec} handle={handle} />
          : <iframe title={v.title} className="size-full" src={embedUrl(v)} allow="fullscreen; picture-in-picture" allowFullScreen referrerPolicy="no-referrer" />}
      </div>

      <div className="mt-4"><Field value={v.title} onCommit={(t) => t.trim() && db.update(v.id, { title: t.trim() })} maxLength={300} aria-label="Título" /></div>
      <label className="mt-3 grid gap-2 text-sm">Tema o ruta
        <Field value={v.topic ?? ''} onCommit={(t) => db.update(v.id, { topic: t.trim() || null })} list="vtopics" maxLength={80} placeholder="React, teoría musical…" />
        <datalist id="vtopics">{topics.map((t) => <option key={t} value={t} />)}</datalist>
      </label>

      <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Estado">
        {STATUS.map((s) => <button key={s.id} aria-pressed={v.status === s.id} onClick={() => setStatus(s.id)} className="min-h-11 rounded-full border px-4 text-sm" style={chip(v.status === s.id, s.color === 'var(--ink-soft)' ? 'var(--accent)' : s.color)}>{s.label}</button>)}
      </div>

      {v.status === 'done' && (
        <div className="mt-4 rounded-2xl border p-4 text-sm" style={{ borderColor: dueNow ? 'var(--personal)' : 'var(--line-soft)', background: 'var(--surface)' }}>
          <p className="flex items-center gap-2 font-semibold"><Repeat size={16} aria-hidden /> Repaso espaciado</p>
          {v.next_review ? (
            <>
              <p className="mt-1" style={{ color: 'var(--ink-soft)' }}>{dueNow ? 'Toca repasarlo ahora.' : `Próximo repaso: ${v.next_review}.`} Llevas {v.review_step} de {REVIEW_DAYS.length}.</p>
              {dueNow && <button className="btn btn-primary mt-3" onClick={() => db.update(v.id, advanceReview(v.review_step, today))}><Check size={16} aria-hidden /> Ya lo repasé</button>}
            </>
          ) : <p className="mt-1" style={{ color: 'var(--pos)' }}>Completaste los {REVIEW_DAYS.length} repasos. Ya es tuyo.</p>}
        </div>
      )}

      <section className="mt-8" aria-labelledby="notas-v">
        <h2 id="notas-v" className="font-display text-2xl">Notas</h2>
        <form onSubmit={addNote} className="mt-3 grid gap-2">
          <div className="flex gap-2">
            <input className="field !w-28 text-center" value={ts} onChange={(e) => setTs(e.target.value)} placeholder="0:00" aria-label="Minuto" inputMode="numeric" />
            <button type="button" className="btn btn-ghost shrink-0" onClick={stamp} disabled={v.provider !== 'youtube'} title={v.provider === 'youtube' ? undefined : 'Con Vimeo escribe el minuto a mano'}><Clock size={16} aria-hidden /> Minuto actual</button>
          </div>
          <textarea className="field py-3" rows={2} value={text} onChange={(e) => setText(e.target.value)} placeholder="Lo que quieres recordar de este momento" maxLength={2000} aria-label="Nota" />
          {err && <p role="alert" className="text-sm" style={{ color: 'var(--neg)' }}>{err}</p>}
          <button className="btn btn-primary w-fit">Guardar nota</button>
        </form>
        {mine.length > 0 && (
          <ul className="mt-4 grid gap-2">
            {mine.map((n) => (
              <li key={n.id} className="flex items-start gap-2 rounded-xl border px-3 py-2" style={{ background: 'var(--surface)', borderColor: 'var(--line-soft)' }}>
                <button className="min-h-11 shrink-0 rounded-md px-2 text-sm font-semibold" style={{ color: 'var(--sky)', background: 'color-mix(in oklab, var(--sky) 12%, transparent)' }} onClick={() => handle.current?.seek(n.at_sec)} aria-label={`Ir al minuto ${fmtTs(n.at_sec)}`}>{fmtTs(n.at_sec)}</button>
                <p className="min-w-0 flex-1 whitespace-pre-wrap py-2 text-sm">{n.body}</p>
                <button className="grid size-11 shrink-0 place-items-center" onClick={() => notes.remove(n.id)} aria-label="Borrar nota"><Trash2 size={14} aria-hidden /></button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="mt-10">
        <button className="btn btn-ghost" style={{ color: confirm ? 'var(--neg)' : undefined }} onClick={async () => { if (confirm) { await db.remove(v.id); nav('/app/descubrir/aprender') } else setConfirm(true) }}><Trash2 size={16} aria-hidden /> {confirm ? '¿Seguro? Se borran también sus notas' : 'Quitar video'}</button>
      </div>
    </div>
  )
}
