import { ArrowDown, ArrowUp, Loader2, Play, Plus, Printer, Trash2, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useTable } from '../../lib/table'
import { fmtDuration, type Setlist, type Song } from '../../lib/music'

function Detail({ set, songs, onChange, onDelete, onBack }: { set: Setlist; songs: Song[]; onChange: (p: Partial<Omit<Setlist, 'id'>>) => void; onDelete: () => void; onBack: () => void }) {
  const byId = useMemo(() => new Map(songs.map((s) => [s.id, s])), [songs])
  const items = set.song_ids.map((id) => byId.get(id)).filter((s): s is Song => Boolean(s))
  const total = items.reduce((a, s) => a + (s.duration_sec ?? 0), 0)
  const missing = items.filter((s) => !s.duration_sec).length
  const available = songs.filter((s) => !set.song_ids.includes(s.id))
  const [confirm, setConfirm] = useState(false)

  const move = (i: number, d: number) => {
    const ids = [...set.song_ids]
    const j = i + d
    if (j < 0 || j >= ids.length) return
    ;[ids[i], ids[j]] = [ids[j], ids[i]]
    onChange({ song_ids: ids })
  }

  return (
    <div className="print-area">
      <button className="no-print mb-4 min-h-11 text-sm underline" style={{ color: 'var(--ink-soft)' }} onClick={onBack}>← Setlists</button>
      <input className="field !h-14 !border-transparent !bg-transparent !px-0 font-display !text-3xl" value={set.title} onChange={(e) => onChange({ title: e.target.value })} maxLength={200} aria-label="Nombre del setlist" />
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm" style={{ color: 'var(--ink-soft)' }}>
        <label className="no-print flex items-center gap-2">Fecha <input type="date" className="field !w-auto" value={set.event_date ?? ''} onChange={(e) => onChange({ event_date: e.target.value || null })} /></label>
        <span>{items.length} {items.length === 1 ? 'canción' : 'canciones'} · {fmtDuration(total)}{missing > 0 && ` (faltan ${missing} duraciones)`}</span>
      </div>

      <ol className="mt-6 grid gap-2">
        {items.map((s, i) => (
          <li key={s.id} className="flex items-center gap-2 rounded-xl border px-3" style={{ background: 'var(--surface)', borderColor: 'var(--line-soft)' }}>
            <span className="w-6 text-center font-display text-xl" style={{ color: 'var(--accent)' }}>{i + 1}</span>
            <Link to={`/app/musica/cancion/${s.id}`} className="min-w-0 flex-1 py-3">
              <span className="block truncate font-semibold">{s.title}</span>
              <span className="block text-xs" style={{ color: 'var(--ink-faint)' }}>{[s.song_key, s.bpm && `${s.bpm} bpm`, fmtDuration(s.duration_sec)].filter(Boolean).join(' · ')}</span>
            </Link>
            <span className="no-print flex">
              <button className="grid size-11 place-items-center" onClick={() => move(i, -1)} aria-label={`Subir ${s.title}`} disabled={i === 0}><ArrowUp size={16} aria-hidden /></button>
              <button className="grid size-11 place-items-center" onClick={() => move(i, 1)} aria-label={`Bajar ${s.title}`} disabled={i === items.length - 1}><ArrowDown size={16} aria-hidden /></button>
              <button className="grid size-11 place-items-center" onClick={() => onChange({ song_ids: set.song_ids.filter((x) => x !== s.id) })} aria-label={`Quitar ${s.title}`}><X size={16} aria-hidden /></button>
            </span>
          </li>
        ))}
      </ol>

      <div className="no-print mt-5 flex flex-wrap items-center gap-3">
        {available.length > 0 && (
          <select className="field !w-auto max-w-full" value="" onChange={(e) => e.target.value && onChange({ song_ids: [...set.song_ids, e.target.value] })} aria-label="Agregar canción">
            <option value="">+ Agregar canción</option>
            {available.map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}
          </select>
        )}
        {items.length > 0 && <Link to={`/app/musica/cancion/${items[0].id}/escenario?s=${set.id}&i=0`} className="btn btn-primary"><Play size={16} aria-hidden /> Tocar</Link>}
        <button className="btn btn-ghost" onClick={() => window.print()}><Printer size={16} aria-hidden /> Imprimir</button>
        <button className="btn btn-ghost ml-auto" style={{ color: confirm ? '#e8a393' : undefined }} onClick={() => (confirm ? onDelete() : setConfirm(true))}><Trash2 size={16} aria-hidden /> {confirm ? '¿Seguro?' : 'Eliminar'}</button>
      </div>
      <label className="no-print mt-6 grid gap-2 text-sm">Notas<textarea className="field py-3" rows={3} value={set.notes ?? ''} onChange={(e) => onChange({ notes: e.target.value || null })} maxLength={2000} /></label>
    </div>
  )
}

export default function Setlists() {
  const sets = useTable<Setlist>('setlists', { col: 'created_at', asc: false })
  const songs = useTable<Song>('songs', { col: 'title', asc: true })
  const [sp, setSp] = useSearchParams()
  const sel = sets.rows.find((s) => s.id === sp.get('s'))

  const create = async () => {
    const s = await sets.add({ title: 'Nuevo setlist', event_date: null, notes: null, song_ids: [] })
    if (s) setSp({ s: s.id })
  }

  if (sets.loading || songs.loading) return <div className="grid h-48 place-items-center"><Loader2 className="animate-spin" aria-label="Cargando" /></div>
  if (sel) return <Detail set={sel} songs={songs.rows} onChange={(p) => sets.update(sel.id, p)} onDelete={async () => { await sets.remove(sel.id); setSp({}) }} onBack={() => setSp({})} />

  return (
    <div>
      <div className="flex items-end justify-between gap-3">
        <div><p className="eyebrow">Música</p><h1 className="mt-2 font-display text-4xl">Setlists</h1></div>
        <button className="btn btn-primary" onClick={create}><Plus size={18} aria-hidden /> Setlist</button>
      </div>
      {sets.error && <p role="alert" className="mt-3 rounded-xl px-3 py-2 text-sm" style={{ background: 'color-mix(in oklab, #e8a393 15%, transparent)', color: '#e8a393' }}>{sets.error}</p>}
      {sets.rows.length === 0 ? (
        <div className="mt-8 rounded-2xl border px-6 py-10 text-center" style={{ borderColor: 'var(--line-soft)', background: 'var(--surface)' }}>
          <p className="font-display text-2xl">Sin setlists todavía</p>
          <p className="mx-auto mt-2 max-w-sm text-sm" style={{ color: 'var(--ink-soft)' }}>Arma el orden de una tocada o un servicio y mira cuánto dura en total.</p>
          <button className="btn btn-primary mt-5" onClick={create}>Crear el primero</button>
        </div>
      ) : (
        <ul className="mt-6 grid gap-2">
          {sets.rows.map((s) => {
            const total = s.song_ids.reduce((a, id) => a + (songs.rows.find((x) => x.id === id)?.duration_sec ?? 0), 0)
            return (
              <li key={s.id}>
                <button onClick={() => setSp({ s: s.id })} className="flex min-h-16 w-full items-center justify-between gap-4 rounded-xl border px-4 py-3 text-left" style={{ background: 'var(--surface)', borderColor: 'var(--line-soft)' }}>
                  <span className="min-w-0"><span className="block truncate font-semibold">{s.title}</span><span className="block text-sm" style={{ color: 'var(--ink-soft)' }}>{s.event_date ?? 'Sin fecha'}</span></span>
                  <span className="shrink-0 text-xs" style={{ color: 'var(--ink-faint)' }}>{s.song_ids.length} canciones · {fmtDuration(total)}</span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
