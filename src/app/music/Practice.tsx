import { Flame, Loader2, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTable } from '../../lib/table'
import { INSTRUMENTS, instrumentLabel, streak, type PracticeLog, type Song } from '../../lib/music'
import { dayNum, isoFromNum } from '../../lib/recur'
import { localISO } from '../../lib/time'

export default function Practice() {
  const logs = useTable<PracticeLog>('practice_logs', { col: 'practiced_on', asc: false })
  const songs = useTable<Song>('songs', { col: 'title', asc: true })
  const today = localISO()
  const [instrument, setInstrument] = useState('guitar')
  const [minutes, setMinutes] = useState('30')
  const [songId, setSongId] = useState('')
  const [date, setDate] = useState(today)
  const [note, setNote] = useState('')
  const [err, setErr] = useState('')

  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => {
    const iso = isoFromNum(dayNum(today) - (6 - i))
    return { iso, min: logs.rows.filter((l) => l.practiced_on === iso).reduce((a, l) => a + l.minutes, 0) }
  }), [logs.rows, today])
  const max = Math.max(30, ...days.map((d) => d.min))
  const week = days.reduce((a, d) => a + d.min, 0)
  const s = streak(logs.rows, today)

  const add = async (e: React.FormEvent) => {
    e.preventDefault()
    const m = Number(minutes)
    if (!m || m < 1 || m > 720) return setErr('Escribe los minutos (1 a 720).')
    setErr('')
    await logs.add({ instrument, minutes: m, practiced_on: date, song_id: songId || null, note: note.trim() || null })
    setNote('')
  }
  const titleOf = (id: string | null) => songs.rows.find((x) => x.id === id)?.title

  if (logs.loading) return <div className="grid h-48 place-items-center"><Loader2 className="animate-spin" aria-label="Cargando" /></div>

  return (
    <div>
      <p className="eyebrow">Música</p>
      <h1 className="mt-2 font-display text-4xl">Práctica</h1>

      <div className="mt-6 flex items-center gap-4 rounded-2xl border p-4" style={{ borderColor: 'var(--line-soft)', background: 'var(--surface)' }}>
        <Flame size={32} aria-hidden style={{ color: s > 0 ? 'var(--accent)' : 'var(--ink-faint)' }} />
        <div>
          <p className="font-display text-3xl">{s} {s === 1 ? 'día' : 'días'}</p>
          <p className="text-sm" style={{ color: 'var(--ink-soft)' }}>{s > 0 ? 'de práctica seguida' : 'Hoy es un buen día para empezar. Con 10 minutos cuenta.'} · {week} min esta semana</p>
        </div>
      </div>

      <div className="mt-4 flex h-28 items-end gap-2" role="img" aria-label={`Minutos por día de los últimos 7 días: ${days.map((d) => d.min).join(', ')}`}>
        {days.map((d) => (
          <div key={d.iso} className="flex flex-1 flex-col items-center gap-1">
            <div className="w-full rounded-t-md" style={{ height: `${Math.max(4, (d.min / max) * 80)}px`, background: d.min ? 'var(--music)' : 'var(--surface-2)', transition: 'height 400ms var(--ease-out)' }} />
            <span className="text-[11px]" style={{ color: d.iso === today ? 'var(--accent)' : 'var(--ink-faint)' }}>{new Date(d.iso + 'T12:00:00').toLocaleDateString('es', { weekday: 'narrow' })}</span>
          </div>
        ))}
      </div>

      <form onSubmit={add} className="mt-8 grid gap-3 rounded-2xl border p-4" style={{ borderColor: 'var(--line-soft)', background: 'var(--surface)' }}>
        <h2 className="font-display text-2xl">Registrar práctica</h2>
        <div className="grid grid-cols-2 gap-3">
          <label className="grid gap-2 text-sm">Instrumento<select className="field" value={instrument} onChange={(e) => setInstrument(e.target.value)}>{INSTRUMENTS.map((i) => <option key={i.id} value={i.id}>{i.label}</option>)}</select></label>
          <label className="grid gap-2 text-sm">Minutos<input className="field" inputMode="numeric" value={minutes} onChange={(e) => setMinutes(e.target.value.replace(/\D/g, ''))} /></label>
          <label className="grid gap-2 text-sm">Canción (opcional)<select className="field" value={songId} onChange={(e) => setSongId(e.target.value)}><option value="">—</option>{songs.rows.map((x) => <option key={x.id} value={x.id}>{x.title}</option>)}</select></label>
          <label className="grid gap-2 text-sm">Fecha<input type="date" className="field" value={date} max={today} onChange={(e) => setDate(e.target.value)} /></label>
        </div>
        <label className="grid gap-2 text-sm">Nota<input className="field" value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} placeholder="Qué trabajé o qué me costó" /></label>
        {err && <p role="alert" className="text-sm" style={{ color: '#e8a393' }}>{err}</p>}
        <button className="btn btn-primary w-fit">Guardar</button>
      </form>

      {logs.rows.length > 0 && (
        <ul className="mt-6 grid gap-2">
          {logs.rows.slice(0, 20).map((l) => (
            <li key={l.id} className="flex items-center gap-3 rounded-xl border px-4 py-2" style={{ background: 'var(--surface)', borderColor: 'var(--line-soft)' }}>
              <div className="min-w-0 flex-1 text-sm">
                <span className="font-semibold">{l.minutes} min</span> · {instrumentLabel(l.instrument)}{titleOf(l.song_id) && ` · ${titleOf(l.song_id)}`}
                <span className="block text-xs" style={{ color: 'var(--ink-faint)' }}>{l.practiced_on}{l.note && ` · ${l.note}`}</span>
              </div>
              <button className="grid size-11 place-items-center" onClick={() => logs.remove(l.id)} aria-label="Eliminar registro"><Trash2 size={16} aria-hidden /></button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
