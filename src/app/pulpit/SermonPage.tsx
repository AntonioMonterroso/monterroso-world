import { ArrowDown, ArrowLeft, ArrowUp, Plus, Presentation, Share2, Trash2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { PHASES, SLIDE_KINDS, isHttps, normalizeEmbed, phaseLabel, type Phase, type PhaseKind, type Sermon, type SermonStatus, type Slide, type SlideKind } from '../../lib/pulpit'
import { shareQuote } from '../../lib/shareImage'
import { useTable } from '../../lib/table'

/** Campo que guarda al salir de él, para no escribir en la base en cada tecla. */
function Field({ value, onCommit, multiline, ...rest }: { value: string; onCommit: (v: string) => void; multiline?: boolean } & Record<string, unknown>) {
  const [v, setV] = useState(value)
  const latest = useRef(value)
  useEffect(() => { setV(value); latest.current = value }, [value])
  const common = {
    value: v,
    onChange: (e: { target: { value: string } }) => { latest.current = e.target.value; setV(e.target.value) },
    onBlur: () => { if (latest.current !== value) onCommit(latest.current) },
    className: 'field',
    ...rest,
  }
  return multiline ? <textarea {...(common as object)} className="field py-3" /> : <input {...(common as object)} />
}

const chip = (on: boolean, color = 'var(--accent)') => ({ borderColor: on ? color : 'var(--line)', color: on ? color : 'var(--ink-soft)', background: on ? `color-mix(in oklab, ${color} 14%, transparent)` : 'transparent' })

export default function SermonPage() {
  const { id } = useParams()
  const nav = useNavigate()
  const sermons = useTable<Sermon>('sermons', { col: 'created_at', asc: false })
  const phasesDb = useTable<Phase>('sermon_phases', { col: 'position', asc: true })
  const slidesDb = useTable<Slide>('sermon_slides', { col: 'position', asc: true })
  const [confirm, setConfirm] = useState(false)
  const [msg, setMsg] = useState('')

  const sermon = sermons.rows.find((s) => s.id === id)
  const phases = phasesDb.rows.filter((p) => p.sermon_id === id).sort((a, b) => a.position - b.position)
  const slides = slidesDb.rows.filter((s) => s.sermon_id === id).sort((a, b) => a.position - b.position)

  if (sermons.loading) return <p style={{ color: 'var(--ink-soft)' }}>Cargando…</p>
  if (!sermon) return <div><Link to="/app/pulpito" className="underline">Volver a prédicas</Link><p className="mt-4">No encontré esta prédica.</p></div>

  const totalMin = phases.reduce((a, p) => a + (p.minutes ?? 0), 0)
  const upd = (patch: Partial<Omit<Sermon, 'id'>>) => sermons.update(sermon.id, patch)

  const swap = async <T extends { id: string; position: number }>(list: T[], i: number, d: number, up: (id: string, p: { position: number }) => Promise<void>) => {
    const a = list[i], b = list[i + d]
    if (!a || !b) return
    await Promise.all([up(a.id, { position: b.position }), up(b.id, { position: a.position })])
  }

  const addPhase = (kind: PhaseKind) => {
    const t = PHASES.find((p) => p.kind === kind)
    phasesDb.add({ sermon_id: sermon.id, position: (phases.at(-1)?.position ?? 0) + 1, kind, title: t?.label ?? 'Fase', body: '', minutes: t?.minutes ?? null })
  }
  const addSlide = (kind: SlideKind) => slidesDb.add({ sermon_id: sermon.id, position: (slides.at(-1)?.position ?? 0) + 1, kind, title: null, body: null, reference: null, url: null })

  const setSlideUrl = (s: Slide, raw: string) => {
    const v = raw.trim()
    if (!v) return slidesDb.update(s.id, { url: null })
    if (s.kind === 'embed') {
      const n = normalizeEmbed(v)
      if (!n) { setMsg('Ese enlace no está admitido. Usa un enlace de Canva (Compartir → Ver) o de YouTube.'); return }
      setMsg(''); return slidesDb.update(s.id, { url: n })
    }
    if (!isHttps(v)) { setMsg('El enlace de la imagen debe empezar con https://'); return }
    setMsg(''); slidesDb.update(s.id, { url: v })
  }

  return (
    <div>
      <Link to="/app/pulpito" className="mb-4 inline-flex min-h-11 items-center gap-2 text-sm" style={{ color: 'var(--ink-soft)' }}><ArrowLeft size={16} aria-hidden /> Prédicas</Link>

      <Field value={sermon.title} onCommit={(v) => v.trim() && upd({ title: v.trim() })} maxLength={200} aria-label="Título de la prédica" />
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="grid gap-2 text-sm">Pasaje<Field value={sermon.scripture ?? ''} onCommit={(v) => upd({ scripture: v.trim() || null })} maxLength={200} placeholder="Juan 3:1-21" /></label>
        <label className="grid gap-2 text-sm">Fecha<input type="date" className="field" value={sermon.preach_date ?? ''} onChange={(e) => upd({ preach_date: e.target.value || null })} /></label>
      </div>
      <div role="group" aria-label="Estado" className="mt-3 flex flex-wrap gap-2">
        {([['draft', 'Borrador'], ['ready', 'Lista'], ['delivered', 'Predicada']] as [SermonStatus, string][]).map(([v, l]) => <button key={v} aria-pressed={sermon.status === v} onClick={() => upd({ status: v })} className="min-h-11 rounded-full border px-4 text-sm" style={chip(sermon.status === v)}>{l}</button>)}
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <Link to={`/app/pulpito/predica/${sermon.id}/presentar`} className="btn btn-primary"><Presentation size={16} aria-hidden /> Presentar y predicar</Link>
        <span className="text-sm" style={{ color: 'var(--ink-soft)' }}>{totalMin > 0 ? `${totalMin} min planeados` : 'Agrega fases con tiempo para ver cuánto durará.'}</span>
      </div>

      {(sermons.error || phasesDb.error || slidesDb.error) && <p role="alert" className="mt-3 rounded-xl px-3 py-2 text-sm" style={{ background: 'color-mix(in oklab, #e8a393 15%, transparent)', color: '#e8a393' }}>{sermons.error || phasesDb.error || slidesDb.error}</p>}
      {msg && <p role="alert" className="mt-3 rounded-xl px-3 py-2 text-sm" style={{ background: 'color-mix(in oklab, #e8a393 15%, transparent)', color: '#e8a393' }}>{msg}</p>}

      {/* Guion */}
      <section className="mt-10" aria-labelledby="guion">
        <h2 id="guion" className="font-display text-2xl">Guion</h2>
        <p className="mt-1 text-sm" style={{ color: 'var(--ink-soft)' }}>Las fases de tu mensaje, en orden. Te sirven de guía mientras predicas.</p>
        <ol className="mt-4 grid gap-3">
          {phases.map((p, i) => (
            <li key={p.id} className="rounded-xl border p-4" style={{ background: 'var(--surface)', borderColor: 'var(--line-soft)' }}>
              <div className="flex items-center gap-2">
                <span className="font-display text-xl" style={{ color: 'var(--accent)' }}>{i + 1}</span>
                <Field value={p.title} onCommit={(v) => v.trim() && phasesDb.update(p.id, { title: v.trim() })} maxLength={200} aria-label="Nombre de la fase" />
                <label className="flex shrink-0 items-center gap-1 text-sm"><Field value={p.minutes ? String(p.minutes) : ''} onCommit={(v) => phasesDb.update(p.id, { minutes: Number(v) > 0 ? Math.min(240, Number(v)) : null })} inputMode="numeric" aria-label="Minutos" style={{ width: 64 }} /> min</label>
              </div>
              <p className="mt-1 text-xs" style={{ color: 'var(--ink-faint)' }}>{phaseLabel(p.kind)} · {PHASES.find((x) => x.kind === p.kind)?.hint}</p>
              <div className="mt-3"><Field multiline rows={4} value={p.body} onCommit={(v) => phasesDb.update(p.id, { body: v })} maxLength={20000} aria-label={`Notas de ${p.title}`} /></div>
              <div className="mt-2 flex justify-end">
                <button className="grid size-11 place-items-center" disabled={i === 0} onClick={() => swap(phases, i, -1, phasesDb.update)} aria-label="Subir fase"><ArrowUp size={16} aria-hidden /></button>
                <button className="grid size-11 place-items-center" disabled={i === phases.length - 1} onClick={() => swap(phases, i, 1, phasesDb.update)} aria-label="Bajar fase"><ArrowDown size={16} aria-hidden /></button>
                <button className="grid size-11 place-items-center" onClick={() => phasesDb.remove(p.id)} aria-label="Eliminar fase"><Trash2 size={16} aria-hidden /></button>
              </div>
            </li>
          ))}
        </ol>
        <div className="mt-3 flex flex-wrap gap-2" aria-label="Agregar fase">
          {PHASES.map((p) => <button key={p.kind} className="inline-flex min-h-11 items-center gap-1 rounded-full border px-3 text-sm" style={{ borderColor: 'var(--line)' }} onClick={() => addPhase(p.kind)}><Plus size={14} aria-hidden /> {p.label}</button>)}
          <button className="inline-flex min-h-11 items-center gap-1 rounded-full border px-3 text-sm" style={{ borderColor: 'var(--line)' }} onClick={() => addPhase('other')}><Plus size={14} aria-hidden /> Otra</button>
        </div>
      </section>

      {/* Diapositivas */}
      <section className="mt-12" aria-labelledby="diaps">
        <h2 id="diaps" className="font-display text-2xl">Diapositivas</h2>
        <p className="mt-1 text-sm" style={{ color: 'var(--ink-soft)' }}>Lo que verá la congregación en la pantalla. Versículos, frases, imágenes y presentaciones de Canva.</p>
        <ol className="mt-4 grid gap-3">
          {slides.map((s, i) => (
            <li key={s.id} className="rounded-xl border p-4" style={{ background: 'var(--surface)', borderColor: 'var(--line-soft)' }}>
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold"><span style={{ color: 'var(--accent)' }}>{i + 1}</span> · {SLIDE_KINDS.find((k) => k.id === s.kind)?.label}</span>
                <span className="flex">
                  {(s.kind === 'verse' || s.kind === 'phrase') && s.body && <button className="grid size-11 place-items-center" onClick={() => shareQuote(s.body!, s.reference)} aria-label="Compartir como imagen"><Share2 size={16} aria-hidden /></button>}
                  <button className="grid size-11 place-items-center" disabled={i === 0} onClick={() => swap(slides, i, -1, slidesDb.update)} aria-label="Subir diapositiva"><ArrowUp size={16} aria-hidden /></button>
                  <button className="grid size-11 place-items-center" disabled={i === slides.length - 1} onClick={() => swap(slides, i, 1, slidesDb.update)} aria-label="Bajar diapositiva"><ArrowDown size={16} aria-hidden /></button>
                  <button className="grid size-11 place-items-center" onClick={() => slidesDb.remove(s.id)} aria-label="Eliminar diapositiva"><Trash2 size={16} aria-hidden /></button>
                </span>
              </div>
              <div className="mt-2 grid gap-2">
                {(s.kind === 'title' || s.kind === 'image' || s.kind === 'embed') && <Field value={s.title ?? ''} onCommit={(v) => slidesDb.update(s.id, { title: v.trim() || null })} maxLength={200} placeholder="Título" aria-label="Título" />}
                {(s.kind === 'verse' || s.kind === 'phrase' || s.kind === 'title') && <Field multiline rows={s.kind === 'title' ? 2 : 3} value={s.body ?? ''} onCommit={(v) => slidesDb.update(s.id, { body: v.trim() || null })} maxLength={4000} placeholder={s.kind === 'verse' ? 'Texto del versículo' : s.kind === 'phrase' ? 'La frase' : 'Subtítulo (opcional)'} aria-label="Texto" />}
                {(s.kind === 'verse') && <Field value={s.reference ?? ''} onCommit={(v) => slidesDb.update(s.id, { reference: v.trim() || null })} maxLength={120} placeholder="Juan 3:16" aria-label="Referencia" />}
                {(s.kind === 'image' || s.kind === 'embed') && <Field value={s.url ?? ''} onCommit={(v) => setSlideUrl(s, v)} inputMode="url" placeholder={s.kind === 'embed' ? 'Enlace de Canva o YouTube' : 'https:// enlace de la imagen'} aria-label="Enlace" />}
              </div>
            </li>
          ))}
        </ol>
        <div className="mt-3 flex flex-wrap gap-2" aria-label="Agregar diapositiva">
          {SLIDE_KINDS.map((k) => <button key={k.id} className="inline-flex min-h-11 items-center gap-1 rounded-full border px-3 text-sm" style={{ borderColor: 'var(--line)' }} onClick={() => addSlide(k.id)}><Plus size={14} aria-hidden /> {k.label}</button>)}
        </div>
      </section>

      <section className="mt-12" aria-labelledby="notas-p">
        <h2 id="notas-p" className="font-display text-2xl">Notas</h2>
        <div className="mt-3"><Field multiline rows={4} value={sermon.notes ?? ''} onCommit={(v) => upd({ notes: v.trim() || null })} maxLength={4000} aria-label="Notas de la prédica" /></div>
      </section>

      <div className="mt-10">
        <button className="btn btn-ghost" style={{ color: confirm ? '#e8a393' : undefined }} onClick={async () => { if (confirm) { await sermons.remove(sermon.id); nav('/app/pulpito') } else setConfirm(true) }}><Trash2 size={16} aria-hidden /> {confirm ? '¿Seguro? Se borra con su guion y diapositivas' : 'Eliminar prédica'}</button>
      </div>
    </div>
  )
}
