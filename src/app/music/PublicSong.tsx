import { Loader2, Minus, Plus, Printer } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import Globe from '../../components/Globe'
import { prefersFlats, transposeKey } from '../../lib/chords'
import { isValidToken } from '../../lib/share'
import { supabase } from '../../lib/supabase'
import ChordSheet from './ChordSheet'

type PSong = { title: string; artist: string | null; key: string | null; bpm: number | null; time_sig: string; capo: number; content: string }
type Data = { kind: 'song' | 'setlist'; includeNotes: boolean; title?: string; event_date?: string | null; songs: PSong[] }
const SIZES = ['md', 'lg', 'xl'] as const

function SongBlock({ s, notes, size }: { s: PSong; notes: boolean; size: (typeof SIZES)[number] }) {
  const [semis, setSemis] = useState(0)
  const flats = prefersFlats(s.key ? transposeKey(s.key, semis) : null)
  const shown = s.key ? transposeKey(s.key, semis, flats) : null
  return (
    <article className="print-area">
      <h2 className="font-display text-3xl">{s.title}</h2>
      {s.artist && <p style={{ color: 'var(--ink-soft)' }}>{s.artist}</p>}
      <p className="mt-2 flex flex-wrap gap-x-4 text-sm" style={{ color: 'var(--ink-soft)' }}>
        {shown && <span>Tono {shown}{semis ? ` (original ${s.key})` : ''}</span>}
        {s.bpm && <span>{s.bpm} bpm</span>}<span>{s.time_sig}</span>{s.capo > 0 && <span>Capo {s.capo}</span>}
      </p>
      <div className="no-print mt-3 inline-flex items-center gap-1 rounded-full border px-1" style={{ borderColor: 'var(--line)' }} role="group" aria-label="Transponer">
        <button className="grid size-11 place-items-center" onClick={() => setSemis((n) => n - 1)} aria-label="Bajar un semitono"><Minus size={16} aria-hidden /></button>
        <span className="min-w-12 text-center text-sm">{semis > 0 ? `+${semis}` : semis}</span>
        <button className="grid size-11 place-items-center" onClick={() => setSemis((n) => n + 1)} aria-label="Subir un semitono"><Plus size={16} aria-hidden /></button>
      </div>
      <div className="mt-5"><ChordSheet content={s.content} semis={semis} targetKey={shown} size={size} showNotes={notes} /></div>
    </article>
  )
}

/** Página pública de solo lectura de una canción o setlist. No hay acceso a nada más. */
export default function PublicSong() {
  const { token = '' } = useParams()
  const [data, setData] = useState<Data | null>(null)
  const [fail, setFail] = useState<'invalid' | 'network' | null>(null)
  const [loading, setLoading] = useState(true)
  const [size, setSize] = useState(0)

  const load = useCallback(async () => {
    setLoading(true)
    if (!isValidToken(token)) { setFail('invalid'); setLoading(false); return }
    const { data, error } = await supabase.functions.invoke('song-share', { body: { token } })
    setLoading(false)
    if (error) {
      const ctx = (error as { context?: Response }).context
      const j = await ctx?.json?.().catch(() => null) as { error?: string } | null
      return setFail(j?.error === 'invalid' ? 'invalid' : 'network')
    }
    setData(data as Data); setFail(null)
  }, [token])

  useEffect(() => { void load() }, [load])

  const shell = (children: React.ReactNode) => (
    <main className="safe-top mx-auto min-h-dvh max-w-2xl px-4 py-8">
      <header className="no-print mb-6 flex items-center justify-between gap-3">
        <span className="flex items-center gap-2 font-display text-lg"><Globe size={26} /> Monterroso World</span>
        <span className="rounded-full px-3 py-1 text-xs" style={{ background: 'var(--surface-2)', color: 'var(--ink-soft)' }}>Solo lectura</span>
      </header>
      {children}
    </main>
  )

  if (loading) return shell(<div className="grid h-48 place-items-center"><Loader2 className="animate-spin" aria-label="Cargando" /></div>)
  if (fail === 'invalid') return shell(<div className="rounded-2xl border p-6 text-center" style={{ borderColor: 'var(--line-soft)', background: 'var(--surface)' }}><p className="font-display text-2xl">Este enlace ya no funciona</p><p className="mt-2 text-sm" style={{ color: 'var(--ink-soft)' }}>Pudo caducar o ser revocado. Pídele uno nuevo a quien te lo compartió.</p></div>)
  if (fail === 'network' || !data) return shell(<div className="rounded-2xl border p-6 text-center" style={{ borderColor: 'var(--line-soft)', background: 'var(--surface)' }}><p className="font-display text-2xl">No pude conectar</p><button className="btn btn-primary mt-4" onClick={() => void load()}>Reintentar</button></div>)

  return shell(
    <>
      {data.kind === 'setlist' && (
        <div className="mb-6">
          <h1 className="font-display text-4xl">{data.title}</h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--ink-soft)' }}>{data.event_date ? `${data.event_date} · ` : ''}{data.songs.length} {data.songs.length === 1 ? 'canción' : 'canciones'}</p>
          <ol className="no-print mt-3 grid gap-1 text-sm">{data.songs.map((s, i) => <li key={i}><a href={`#c${i}`} className="flex min-h-11 items-center gap-3 rounded-lg px-2 underline" style={{ color: 'var(--sky)' }}><span style={{ color: 'var(--accent)' }}>{i + 1}</span>{s.title}</a></li>)}</ol>
        </div>
      )}
      <div className="no-print mb-6 flex flex-wrap items-center gap-2">
        <div className="inline-flex items-center rounded-full border" style={{ borderColor: 'var(--line)' }} role="group" aria-label="Tamaño de letra">
          <button className="grid size-11 place-items-center" onClick={() => setSize((n) => Math.max(0, n - 1))} aria-label="Letra más pequeña"><Minus size={16} aria-hidden /></button>
          <span className="px-1 text-sm font-semibold" aria-hidden>Aa</span>
          <button className="grid size-11 place-items-center" onClick={() => setSize((n) => Math.min(2, n + 1))} aria-label="Letra más grande"><Plus size={16} aria-hidden /></button>
        </div>
        <button className="btn btn-ghost" onClick={() => window.print()}><Printer size={16} aria-hidden /> Imprimir o guardar en PDF</button>
      </div>
      <div className="grid gap-12">
        {data.songs.map((s, i) => <div key={i} id={`c${i}`} style={{ scrollMarginTop: 'calc(env(safe-area-inset-top) + 16px)' }}><SongBlock s={s} notes={data.includeNotes} size={SIZES[size]} /></div>)}
        {data.songs.length === 0 && <p style={{ color: 'var(--ink-soft)' }}>Este setlist todavía no tiene canciones.</p>}
      </div>
    </>,
  )
}
