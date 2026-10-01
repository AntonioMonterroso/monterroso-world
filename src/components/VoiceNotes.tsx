import { Loader2, Lock, Mic, Square, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from '../lib/auth'
import { getSettings, patchSettings } from '../lib/settings'
import { supabase } from '../lib/supabase'
import { removeObject, signedUrlFor, uploadBlob } from '../lib/storage'
import { useTable } from '../lib/table'
import { MAX_SECONDS, SOFT_CAP_BYTES, extFor, fmtBytes, fmtClock, startRecording, usageLevel, usageTotal, type Recorder, type Recording, type VoiceNote } from '../lib/voice'
import type { Song } from '../lib/music'
import Field from './Field'

const BUCKET = 'voice-notes'

function Player({ path }: { path: string }) {
  const [url, setUrl] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const load = async () => { setBusy(true); setUrl(await signedUrlFor(BUCKET, path)); setBusy(false) }
  if (url) return <audio controls autoPlay preload="auto" src={url} className="w-full" />
  return <button className="btn btn-ghost" onClick={load} disabled={busy}>{busy ? <Loader2 size={16} className="animate-spin" aria-hidden /> : null} Escuchar</button>
}

/** Notas de voz privadas. `songId` las limita a una canción. Nunca aparecen en enlaces públicos ni en PDF. */
export default function VoiceNotes({ songId }: { songId?: string }) {
  const { session } = useAuth()
  const notes = useTable<VoiceNote>('voice_notes', { col: 'created_at', asc: false })
  const songs = useTable<Song>('songs', { col: 'title', asc: true })
  const [enabled, setEnabled] = useState(true)
  const [rec, setRec] = useState<Recorder | null>(null)
  const [secs, setSecs] = useState(0)
  const [take, setTake] = useState<(Recording & { url: string }) | null>(null)
  const [title, setTitle] = useState('')
  const [pickSong, setPickSong] = useState(songId ?? '')
  const [err, setErr] = useState('')
  const [saving, setSaving] = useState(false)
  const [confirm, setConfirm] = useState<string | null>(null)
  const recRef = useRef<Recorder | null>(null)

  useEffect(() => { getSettings().then((s) => { const v = (s as { voice?: { enabled?: boolean } }).voice; if (v && v.enabled === false) setEnabled(false) }) }, [])
  useEffect(() => () => recRef.current?.cancel(), [])

  const all = notes.rows
  const shown = useMemo(() => (songId ? all.filter((n) => n.song_id === songId) : all), [all, songId])
  const used = usageTotal(all)
  const level = usageLevel(used)

  const toggle = (on: boolean) => { setEnabled(on); patchSettings({ voice: { enabled: on } } as never) }

  const start = async () => {
    setErr('')
    try {
      const r = await startRecording(setSecs, () => setErr(`Llegaste al máximo de ${MAX_SECONDS / 60} minutos. Se detuvo solo.`))
      recRef.current = r; setRec(r); setSecs(0)
    } catch (e) {
      const m = (e as Error).message
      setErr(m === 'unsupported' ? 'Este navegador no puede grabar audio.' : 'No pude usar el micrófono. Revisa el permiso del navegador.')
    }
  }
  const stop = async () => {
    if (!rec) return
    try {
      const r = await rec.stop()
      setTake({ ...r, url: URL.createObjectURL(r.blob) })
      setTitle(`Idea ${new Date().toLocaleDateString('es', { day: 'numeric', month: 'short' })}`)
    } catch (e) {
      const m = (e as Error).message
      setErr(m === 'too_big' ? 'La grabación pesa demasiado. Haz una más corta.' : m === 'empty' ? 'No se grabó nada.' : 'No se pudo grabar.')
    }
    setRec(null); recRef.current = null
  }
  const discard = () => { if (take) URL.revokeObjectURL(take.url); setTake(null) }

  const save = async () => {
    if (!take) return
    if (level === 'full') return setErr('Llegaste al tope de espacio para notas de voz. Borra algunas para seguir.')
    setSaving(true); setErr('')
    try {
      const path = await uploadBlob(BUCKET, session?.user.id, take.blob, extFor(take.mime), take.mime)
      const { error } = await supabase.from('voice_notes').insert({ song_id: pickSong || null, title: title.trim() || 'Idea', duration_sec: take.seconds, size_bytes: take.blob.size, mime: take.mime, audio_path: path })
      if (error) { void removeObject(BUCKET, path); throw error }
      await notes.reload()
      discard()
    } catch { setErr('No se pudo guardar. Revisa tu conexión e intenta de nuevo.') }
    setSaving(false)
  }

  const remove = async (n: VoiceNote) => { await removeObject(BUCKET, n.audio_path); await notes.remove(n.id); setConfirm(null) }

  return (
    <section aria-labelledby="vn">
      <h2 id="vn" className="font-display text-2xl">Notas de voz</h2>
      <p className="mt-1 flex items-center gap-2 text-sm" style={{ color: 'var(--ink-soft)' }}><Lock size={14} aria-hidden /> Privadas. No salen en enlaces públicos ni en PDF.</p>

      {!enabled ? (
        <div className="mt-3 rounded-xl border p-4 text-sm" style={{ borderColor: 'var(--line-soft)', background: 'var(--surface)' }}>
          Las notas de voz están desactivadas. <button className="underline" onClick={() => toggle(true)}>Activarlas</button>
        </div>
      ) : take ? (
        <div className="mt-3 grid gap-3 rounded-2xl border p-4" style={{ borderColor: 'var(--line)', background: 'var(--surface)' }}>
          <audio controls src={take.url} className="w-full" />
          <p className="text-xs" style={{ color: 'var(--ink-faint)' }}>{fmtClock(take.seconds)} · {fmtBytes(take.blob.size)}</p>
          <input className="field" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} aria-label="Nombre de la nota" />
          {!songId && songs.rows.length > 0 && <select className="field" value={pickSong} onChange={(e) => setPickSong(e.target.value)} aria-label="Canción"><option value="">Sin canción</option>{songs.rows.map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}</select>}
          <div className="flex gap-2"><button className="btn btn-primary" onClick={save} disabled={saving}>{saving && <Loader2 size={16} className="animate-spin" aria-hidden />} Guardar</button><button className="btn btn-ghost" onClick={discard} disabled={saving}>Descartar</button></div>
        </div>
      ) : (
        <div className="mt-3 flex items-center gap-4 rounded-2xl border p-4" style={{ borderColor: rec ? '#e8a393' : 'var(--line-soft)', background: 'var(--surface)' }}>
          <button onClick={rec ? stop : start} className="grid size-16 shrink-0 place-items-center rounded-full" style={{ background: rec ? '#e8a393' : 'var(--accent)', color: 'var(--bg)', transition: 'transform 120ms var(--ease-out), background-color 160ms' }} aria-label={rec ? 'Detener grabación' : 'Grabar nota de voz'}>{rec ? <Square size={22} aria-hidden /> : <Mic size={24} aria-hidden />}</button>
          <div aria-live="off">
            <p className="font-display text-3xl" style={{ fontVariantNumeric: 'tabular-nums' }}>{fmtClock(secs)}</p>
            <p className="text-xs" style={{ color: 'var(--ink-faint)' }}>{rec ? `Grabando… máximo ${MAX_SECONDS / 60} min` : 'Toca para grabar una idea'}</p>
          </div>
        </div>
      )}
      {err && <p role="alert" className="mt-3 text-sm" style={{ color: '#e8a393' }}>{err}</p>}
      {notes.error && <p role="alert" className="mt-3 text-sm" style={{ color: '#e8a393' }}>{notes.error}</p>}

      {shown.length > 0 && (
        <ul className="mt-4 grid gap-3">
          {shown.map((n) => (
            <li key={n.id} className="rounded-xl border p-3" style={{ background: 'var(--surface)', borderColor: 'var(--line-soft)' }}>
              <div className="flex items-center gap-2">
                <div className="min-w-0 flex-1"><Field value={n.title} onCommit={(v) => v.trim() && notes.update(n.id, { title: v.trim() })} maxLength={200} aria-label="Nombre de la nota" /></div>
                <button className="grid size-11 shrink-0 place-items-center" aria-label={`Borrar ${n.title}`} onClick={() => (confirm === n.id ? remove(n) : setConfirm(n.id))} style={{ color: confirm === n.id ? '#e8a393' : undefined }}>{confirm === n.id ? <span className="text-xs">¿Seguro?</span> : <Trash2 size={16} aria-hidden />}</button>
              </div>
              <p className="mt-1 text-xs" style={{ color: 'var(--ink-faint)' }}>{fmtClock(n.duration_sec)} · {fmtBytes(n.size_bytes)} · {new Date(n.created_at).toLocaleDateString('es')}{!songId && n.song_id && songs.rows.find((s) => s.id === n.song_id) ? ` · ${songs.rows.find((s) => s.id === n.song_id)!.title}` : ''}</p>
              <div className="mt-2"><Player path={n.audio_path} /></div>
            </li>
          ))}
        </ul>
      )}
      {notes.loading ? null : shown.length === 0 && enabled && !take && <p className="mt-3 text-sm" style={{ color: 'var(--ink-faint)' }}>{songId ? 'Aún no hay notas de voz para esta canción.' : 'Cuando se te ocurra una melodía, grábala antes de que se te olvide.'}</p>}

      <div className="mt-5 rounded-xl p-3 text-xs" style={{ background: 'var(--bg)', color: 'var(--ink-faint)' }}>
        <div className="flex items-center justify-between gap-3"><span>Espacio usado: {fmtBytes(used)} de ~{fmtBytes(SOFT_CAP_BYTES)} ({all.length} {all.length === 1 ? 'nota' : 'notas'})</span>{enabled && <button className="min-h-11 underline" onClick={() => toggle(false)}>Desactivar</button>}</div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full" style={{ background: 'var(--surface-2)' }} role="img" aria-label={`${Math.min(100, Math.round((used / SOFT_CAP_BYTES) * 100))}% del espacio`}><div className="h-full rounded-full" style={{ width: `${Math.min(100, (used / SOFT_CAP_BYTES) * 100)}%`, background: level === 'ok' ? '#8fd1a4' : level === 'warn' ? 'var(--personal)' : '#e8a393' }} /></div>
        {level !== 'ok' && <p className="mt-2" style={{ color: level === 'full' ? '#e8a393' : 'var(--personal)' }}>{level === 'full' ? 'Ya no puedes grabar más hasta borrar algunas.' : 'Te queda poco espacio. Considera borrar las que ya no uses.'}</p>}
      </div>
    </section>
  )
}
