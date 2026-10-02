import { Loader2, Plus, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTable } from '../../lib/table'
import { fmtDuration, instrumentLabel, SONG_STATUS, statusOf, type Song, type SongStatus } from '../../lib/music'
import { Group, PageHeader, Row, Segmented } from '../../components/ui'
import { Empty } from '../money/shared'

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
      <PageHeader eyebrow="Música" title="Canciones" action={<button className="btn btn-primary" onClick={create}><Plus size={18} aria-hidden /> Canción</button>} />

      <div className="relative mt-6">
        <Search size={16} aria-hidden className="absolute top-1/2 left-4 -translate-y-1/2" style={{ color: 'var(--ink-faint)' }} />
        <input className="field pl-10" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por título o artista" aria-label="Buscar canciones" />
      </div>
      <div className="mt-3"><Segmented label="Estado" value={status} onChange={setStatus} options={[{ id: 'all', label: 'Todas' }, ...SONG_STATUS.map((x) => ({ id: x.id, label: x.label }))] as { id: SongStatus | 'all'; label: string }[]} /></div>

      {db.error && <p role="alert" className="mt-3 flex justify-between rounded-xl px-3 py-2 text-sm" style={{ background: 'color-mix(in oklab, var(--neg) 15%, transparent)', color: 'var(--neg)' }}>{db.error} <button className="underline" onClick={db.clearError}>Cerrar</button></p>}

      {db.loading ? <div className="grid h-48 place-items-center"><Loader2 className="animate-spin" aria-label="Cargando" /></div> : list.length === 0 ? (
        <Empty title={db.rows.length ? 'Nada coincide' : 'Tu repertorio empieza aquí'} text="Escribe la letra con los acordes entre corchetes, como [Am]así, y la app los pone sobre la letra y los transpone." action={db.rows.length ? undefined : 'Agregar la primera'} onAction={create} />
      ) : (
        <Group>
          {list.map((s) => {
            const st = statusOf(s.status)
            return <Row key={s.id} tone={st.color} title={s.title} to={`/app/musica/cancion/${s.id}`}
              sub={[s.artist, s.instruments.map(instrumentLabel).join(' + ')].filter(Boolean).join(' · ')}
              value={<span className="text-xs font-medium" style={{ color: 'var(--ink-faint)' }}>{[s.song_key, s.bpm && `${s.bpm} bpm`, s.duration_sec && fmtDuration(s.duration_sec)].filter(Boolean).join(' · ') || st.label}</span>} valueTone="soft" />
          })}
        </Group>
      )}
    </div>
  )
}
