import { Loader2, Plus, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTable } from '../../lib/table'
import { fmtDuration, instrumentLabel, SONG_STATUS, statusOf, type Song, type SongStatus } from '../../lib/music'

export default function Songs() {
  const db = useTable<Song>('songs', { col: 'title', asc: true })
  const nav = useNavigate()
  const [q, setQ] = useState('')
  const [status, setStatus] = useState<SongStatus | 'all'>('all')

  const list = useMemo(() => {
    const t = q.trim().toLowerCase()
    return db.rows.filter((s) => (status === 'all' || s.status === status) && (!t || s.title.toLowerCase().includes(t) || (s.artist ?? '').toLowerCase().includes(t)))
  }, [db.rows, q, status])

  const create = async () => {
    const s = await db.add({ title: 'Nueva canción', artist: null, song_key: null, bpm: null, time_sig: '4/4', status: 'learning', instruments: ['guitar'], duration_sec: null, capo: 0, content: '', notes: null })
    if (s) nav(`/app/musica/cancion/${s.id}?editar=1`)
  }

  return (
    <div>
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="eyebrow">Música</p>
          <h1 className="mt-2 font-display text-4xl">Canciones</h1>
        </div>
        <button className="btn btn-primary" onClick={create}><Plus size={18} aria-hidden /> Canción</button>
      </div>

      <div className="relative mt-6">
        <Search size={16} aria-hidden className="absolute top-1/2 left-4 -translate-y-1/2" style={{ color: 'var(--ink-faint)' }} />
        <input className="field pl-10" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por título o artista" aria-label="Buscar canciones" />
      </div>
      <div role="group" aria-label="Estado" className="mt-3 flex gap-2 overflow-x-auto pb-1">
        {([{ id: 'all', label: 'Todas' }, ...SONG_STATUS] as { id: SongStatus | 'all'; label: string }[]).map((s) => (
          <button key={s.id} aria-pressed={status === s.id} onClick={() => setStatus(s.id)} className="min-h-11 shrink-0 rounded-full border px-4 text-sm" style={{ borderColor: status === s.id ? 'var(--accent)' : 'var(--line)', background: status === s.id ? 'var(--accent)' : 'transparent', color: status === s.id ? 'var(--bg)' : 'var(--ink-soft)' }}>{s.label}</button>
        ))}
      </div>

      {db.error && <p role="alert" className="mt-3 flex justify-between rounded-xl px-3 py-2 text-sm" style={{ background: 'color-mix(in oklab, #e8a393 15%, transparent)', color: '#e8a393' }}>{db.error} <button className="underline" onClick={db.clearError}>Cerrar</button></p>}

      {db.loading ? <div className="grid h-48 place-items-center"><Loader2 className="animate-spin" aria-label="Cargando" /></div> : list.length === 0 ? (
        <div className="mt-8 rounded-2xl border px-6 py-10 text-center" style={{ borderColor: 'var(--line-soft)', background: 'var(--surface)' }}>
          <p className="font-display text-2xl">{db.rows.length ? 'Nada coincide' : 'Tu repertorio empieza aquí'}</p>
          <p className="mx-auto mt-2 max-w-sm text-sm" style={{ color: 'var(--ink-soft)' }}>Escribe la letra con los acordes entre corchetes, como [Am]así, y la app los pone sobre la letra y los transpone.</p>
          {!db.rows.length && <button className="btn btn-primary mt-5" onClick={create}>Agregar la primera</button>}
        </div>
      ) : (
        <ul className="mt-5 grid gap-2">
          {list.map((s) => {
            const st = statusOf(s.status)
            return (
              <li key={s.id}>
                <Link to={`/app/musica/cancion/${s.id}`} className="flex min-h-16 items-center gap-4 rounded-xl border px-4 py-3" style={{ background: 'var(--surface)', borderColor: 'var(--line-soft)' }}>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">{s.title}</span>
                    <span className="block truncate text-sm" style={{ color: 'var(--ink-soft)' }}>{[s.artist, s.instruments.map(instrumentLabel).join(' + ')].filter(Boolean).join(' · ')}</span>
                  </span>
                  <span className="shrink-0 text-right text-xs" style={{ color: 'var(--ink-faint)' }}>
                    <span className="block" style={{ color: st.color }}>{st.label}</span>
                    {[s.song_key, s.bpm && `${s.bpm} bpm`, s.duration_sec && fmtDuration(s.duration_sec)].filter(Boolean).join(' · ')}
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
