import { ArrowLeft, Maximize2, Minus, Pencil, Plus, Printer, Share2, Trash2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { KEYS, diatonic, prefersFlats, transposeKey } from '../../lib/chords'
import { INSTRUMENTS, SONG_STATUS, TIME_SIGS, beatsOf, fmtDuration, instrumentLabel, parseDuration, statusOf, type Song } from '../../lib/music'
import { useTable } from '../../lib/table'
import VoiceNotes from '../../components/VoiceNotes'
import ShareSheet from './ShareSheet'
import ChordSheet from './ChordSheet'
import Metronome from './Metronome'

function Editor({ song, onSave, onCancel, onDelete }: { song: Song; onSave: (p: Partial<Omit<Song, 'id'>>) => void; onCancel: () => void; onDelete: () => void }) {
  const [f, setF] = useState({ title: song.title, artist: song.artist ?? '', key: song.song_key ?? '', bpm: song.bpm ? String(song.bpm) : '', sig: song.time_sig, status: song.status, instruments: song.instruments, duration: song.duration_sec ? fmtDuration(song.duration_sec) : '', capo: song.capo, content: song.content, notes: song.notes ?? '' })
  const [err, setErr] = useState('')
  const [confirm, setConfirm] = useState(false)
  const area = useRef<HTMLTextAreaElement>(null)
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((p) => ({ ...p, [k]: v }))

  const insert = (text: string) => {
    const el = area.current
    const start = el?.selectionStart ?? f.content.length, end = el?.selectionEnd ?? start
    const next = f.content.slice(0, start) + text + f.content.slice(end)
    set('content', next)
    requestAnimationFrame(() => { el?.focus(); el?.setSelectionRange(start + text.length, start + text.length) })
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!f.title.trim()) return setErr('Ponle un título.')
    const bpm = f.bpm ? Number(f.bpm) : null
    if (bpm !== null && (Number.isNaN(bpm) || bpm < 20 || bpm > 300)) return setErr('El BPM debe estar entre 20 y 300.')
    const dur = f.duration ? parseDuration(f.duration) : null
    if (f.duration && dur === null) return setErr('La duración va como 3:25 o en minutos.')
    onSave({ title: f.title.trim(), artist: f.artist.trim() || null, song_key: f.key || null, bpm, time_sig: f.sig, status: f.status, instruments: f.instruments, duration_sec: dur, capo: f.capo, content: f.content, notes: f.notes.trim() || null })
  }

  const chords = f.key ? diatonic(f.key) : []
  const chip = (on: boolean, color = 'var(--accent)') => ({ borderColor: on ? color : 'var(--line)', color: on ? color : 'var(--ink-soft)', background: on ? `color-mix(in oklab, ${color} 14%, transparent)` : 'transparent' })

  return (
    <form onSubmit={submit} className="grid gap-4">
      <label className="grid gap-2 text-sm">Título<input className="field" value={f.title} onChange={(e) => set('title', e.target.value)} maxLength={200} /></label>
      <label className="grid gap-2 text-sm">Artista<input className="field" value={f.artist} onChange={(e) => set('artist', e.target.value)} maxLength={200} /></label>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <label className="grid gap-2 text-sm">Tono
          <select className="field" value={f.key} onChange={(e) => set('key', e.target.value)}><option value="">—</option>{KEYS.flatMap((k) => [k, `${k}m`]).map((k) => <option key={k}>{k}</option>)}</select>
        </label>
        <label className="grid gap-2 text-sm">BPM<input className="field" inputMode="numeric" value={f.bpm} onChange={(e) => set('bpm', e.target.value.replace(/\D/g, ''))} /></label>
        <label className="grid gap-2 text-sm">Compás<select className="field" value={f.sig} onChange={(e) => set('sig', e.target.value)}>{TIME_SIGS.map((s) => <option key={s}>{s}</option>)}</select></label>
        <label className="grid gap-2 text-sm">Duración<input className="field" value={f.duration} onChange={(e) => set('duration', e.target.value)} placeholder="3:25" /></label>
      </div>
      <fieldset>
        <legend className="mb-2 text-sm">Estado</legend>
        <div className="flex flex-wrap gap-2">{SONG_STATUS.map((s) => <button key={s.id} type="button" aria-pressed={f.status === s.id} onClick={() => set('status', s.id)} className="min-h-11 rounded-full border px-4 text-sm" style={chip(f.status === s.id, s.color)}>{s.label}</button>)}</div>
      </fieldset>
      <fieldset>
        <legend className="mb-2 text-sm">Instrumentos (puedes combinarlos)</legend>
        <div className="flex flex-wrap gap-2">{INSTRUMENTS.map((i) => { const on = f.instruments.includes(i.id); return <button key={i.id} type="button" aria-pressed={on} onClick={() => set('instruments', on ? f.instruments.filter((x) => x !== i.id) : [...f.instruments, i.id])} className="min-h-11 rounded-full border px-4 text-sm" style={chip(on, 'var(--sky)')}>{i.label}</button> })}</div>
      </fieldset>
      <label className="grid max-w-40 gap-2 text-sm">Capo (traste)<input type="number" min={0} max={12} className="field" value={f.capo} onChange={(e) => set('capo', Math.min(12, Math.max(0, Number(e.target.value) || 0)))} /></label>

      <fieldset>
        <legend className="mb-2 text-sm">Letra y acordes</legend>
        <p className="mb-2 text-xs" style={{ color: 'var(--ink-faint)' }}>Acordes entre corchetes dentro de la letra: <code>[Am]Hola [F]mundo</code>. Una línea con <code>#</code> es una sección; con <code>//</code>, una nota (golpes, tablatura, cifrado de batería, producción).</p>
        <div className="mb-2 flex flex-wrap gap-2">
          {['Intro', 'Verso', 'Pre-coro', 'Coro', 'Puente', 'Solo', 'Final'].map((s) => <button key={s} type="button" className="min-h-11 rounded-full border px-3 text-xs" style={{ borderColor: 'var(--line)' }} onClick={() => insert(`\n# ${s}\n`)}>{s}</button>)}
          <button type="button" className="min-h-11 rounded-full border px-3 text-xs" style={{ borderColor: 'var(--music)', color: 'var(--music)' }} onClick={() => insert('// ')}>Nota</button>
        </div>
        {chords.length > 0 && <div className="mb-2 flex flex-wrap gap-2" aria-label={`Acordes de ${f.key}`}>{chords.map((c) => <button key={c} type="button" className="min-h-11 rounded-full border px-3 text-sm font-semibold" style={{ borderColor: 'var(--sky)', color: 'var(--sky)' }} onClick={() => insert(`[${c}]`)}>{c}</button>)}</div>}
        <textarea ref={area} className="field py-3" style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', minHeight: 280, lineHeight: 1.5 }} value={f.content} onChange={(e) => set('content', e.target.value)} maxLength={60000} spellCheck={false} aria-label="Letra y acordes" />
      </fieldset>
      <label className="grid gap-2 text-sm">Notas generales<textarea className="field py-3" rows={3} value={f.notes} onChange={(e) => set('notes', e.target.value)} maxLength={4000} /></label>

      {err && <p role="alert" className="text-sm" style={{ color: 'var(--neg)' }}>{err}</p>}
      <div className="flex flex-wrap items-center gap-3">
        <button className="btn btn-primary">Guardar</button>
        <button type="button" className="btn btn-ghost" onClick={onCancel}>Cancelar</button>
        <button type="button" className="btn btn-ghost ml-auto" style={{ color: confirm ? 'var(--neg)' : undefined }} onClick={() => (confirm ? onDelete() : setConfirm(true))}><Trash2 size={16} aria-hidden /> {confirm ? '¿Seguro?' : 'Eliminar'}</button>
      </div>
    </form>
  )
}

export default function SongPage() {
  const { id } = useParams()
  const nav = useNavigate()
  const [sp, setSp] = useSearchParams()
  const db = useTable<Song>('songs', { col: 'title', asc: true })
  const song = db.rows.find((s) => s.id === id)
  const [semis, setSemis] = useState(0)
  const [bpm, setBpm] = useState<number | null>(null)
  const [sharing, setSharing] = useState(false)
  const editing = sp.get('editar') === '1'

  useEffect(() => { if (song && bpm === null) setBpm(song.bpm ?? 100) }, [song, bpm])

  if (db.loading) return <p style={{ color: 'var(--ink-soft)' }}>Cargando…</p>
  if (!song) return <div><Link to="/app/musica" className="underline">Volver a canciones</Link><p className="mt-4">No encontré esta canción.</p></div>

  const flats = prefersFlats(song.song_key ? transposeKey(song.song_key, semis) : null)
  const shownKey = song.song_key ? transposeKey(song.song_key, semis, flats) : null
  const st = statusOf(song.status)

  return (
    <div>
      <Link to="/app/musica" className="no-print mb-4 inline-flex min-h-11 items-center gap-2 text-sm" style={{ color: 'var(--ink-soft)' }}><ArrowLeft size={16} aria-hidden /> Canciones</Link>

      {editing ? (
        <Editor song={song} onCancel={() => setSp({})} onSave={async (p) => { await db.update(song.id, p); setBpm(p.bpm ?? 100); setSp({}) }} onDelete={async () => { await db.remove(song.id); nav('/app/musica') }} />
      ) : (
        <div className="print-area">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 className="font-display text-4xl">{song.title}</h1>
              {song.artist && <p className="mt-1" style={{ color: 'var(--ink-soft)' }}>{song.artist}</p>}
              <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm" style={{ color: 'var(--ink-soft)' }}>
                <span style={{ color: st.color }}>{st.label}</span>
                {shownKey && <span>Tono {shownKey}{semis ? ` (original ${song.song_key})` : ''}</span>}
                {song.bpm && <span>{song.bpm} bpm</span>}
                <span>{song.time_sig}</span>
                {song.duration_sec && <span>{fmtDuration(song.duration_sec)}</span>}
                {song.capo > 0 && <span>Capo {song.capo}</span>}
                {song.instruments.length > 0 && <span>{song.instruments.map(instrumentLabel).join(' + ')}</span>}
              </p>
            </div>
            <div className="no-print flex shrink-0 gap-2">
              <button className="grid size-11 place-items-center rounded-full border" style={{ borderColor: 'var(--line)' }} onClick={() => setSp({ editar: '1' })} aria-label="Editar"><Pencil size={18} aria-hidden /></button>
              <button className="grid size-11 place-items-center rounded-full border" style={{ borderColor: 'var(--line)' }} onClick={() => setSharing(true)} aria-label="Compartir con un enlace público"><Share2 size={18} aria-hidden /></button>
              <button className="grid size-11 place-items-center rounded-full border" style={{ borderColor: 'var(--line)' }} onClick={() => window.print()} aria-label="Imprimir o guardar en PDF"><Printer size={18} aria-hidden /></button>
            </div>
          </div>

          <div className="no-print mt-5 flex flex-wrap items-center gap-3">
            <div className="inline-flex items-center gap-1 rounded-full border px-1" style={{ borderColor: 'var(--line)' }} role="group" aria-label="Transponer">
              <button className="grid size-11 place-items-center" onClick={() => setSemis((n) => n - 1)} aria-label="Bajar un semitono"><Minus size={16} aria-hidden /></button>
              <span className="min-w-14 text-center text-sm">{semis > 0 ? `+${semis}` : semis}</span>
              <button className="grid size-11 place-items-center" onClick={() => setSemis((n) => n + 1)} aria-label="Subir un semitono"><Plus size={16} aria-hidden /></button>
            </div>
            {semis !== 0 && <button className="min-h-11 text-sm underline" onClick={() => setSemis(0)}>Tono original</button>}
            <Link to={`/app/musica/cancion/${song.id}/escenario?t=${semis}`} className="btn btn-primary ml-auto"><Maximize2 size={16} aria-hidden /> Escenario</Link>
          </div>

          <div className="mt-6"><ChordSheet content={song.content} semis={semis} targetKey={shownKey} /></div>
          {song.notes && <p className="mt-6 text-sm" style={{ color: 'var(--ink-soft)' }}>{song.notes}</p>}

          <div className="no-print mt-8"><Metronome bpm={bpm ?? 100} onBpm={setBpm} beats={beatsOf(song.time_sig)} /></div>
        </div>
      )}

      {!editing && <div className="no-print mt-10"><VoiceNotes songId={song.id} /></div>}
      <ShareSheet open={sharing} onClose={() => setSharing(false)} kind="song" id={song.id} title={song.title} />
    </div>
  )
}
