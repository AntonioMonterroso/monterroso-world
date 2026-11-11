import { ChevronLeft, ChevronRight, Minus, Pause, Play, Plus, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { prefersFlats, transposeKey } from '../../lib/chords'
import { useTable } from '../../lib/table'
import type { Setlist, Song } from '../../lib/music'
import ChordSheet from './ChordSheet'

const SIZES = ['md', 'lg', 'xl'] as const

/** Modo escenario: letra grande, desplazamiento automático y pantalla encendida. Con ?s=<setlist>&i=<n> avanza por el setlist. */
export default function Stage() {
  const { id } = useParams()
  const [sp] = useSearchParams()
  const nav = useNavigate()
  const songs = useTable<Song>('songs', { col: 'title', asc: true })
  const sets = useTable<Setlist>('setlists', { col: 'created_at', asc: true })
  const song = songs.rows.find((s) => s.id === id)
  const setlist = sets.rows.find((s) => s.id === sp.get('s'))
  const idx = Number(sp.get('i') ?? -1)

  const [semis, setSemis] = useState(Number(sp.get('t') ?? 0) || 0)
  const [size, setSizeRaw] = useState(() => { try { const n = Number(localStorage.getItem('mw_stage_size')); return n >= 0 && n <= 2 && localStorage.getItem('mw_stage_size') !== null ? n : 1 } catch { return 1 } })
  const setSize = (f: (n: number) => number) => setSizeRaw((n) => { const v = f(n); try { localStorage.setItem('mw_stage_size', String(v)) } catch { /* sin almacenamiento */ } return v })
  // Deslizar a los lados cambia de canción dentro del setlist
  const touch = useRef<{ x: number; y: number } | null>(null)
  const swiped = useRef(false)
  const [speed, setSpeed] = useState(0) // px por segundo
  const [bar, setBar] = useState(true)
  const scroller = useRef<HTMLDivElement>(null)

  useEffect(() => { setSemis(Number(sp.get('t') ?? 0) || 0) }, [id, sp])

  // Pantalla encendida mientras tocas
  useEffect(() => {
    let lock: WakeLockSentinel | null = null
    navigator.wakeLock?.request('screen').then((l) => { lock = l }).catch(() => {})
    return () => { lock?.release().catch(() => {}) }
  }, [])

  // Autoscroll
  useEffect(() => {
    if (!speed) return
    let raf = 0, last = performance.now(), acc = 0
    const tick = (t: number) => {
      acc += ((t - last) / 1000) * speed
      last = t
      if (acc >= 1 && scroller.current) { scroller.current.scrollTop += Math.floor(acc); acc -= Math.floor(acc) }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [speed])

  useEffect(() => { scroller.current?.scrollTo({ top: 0 }); setSpeed(0) }, [id])

  const close = () => nav(setlist ? `/app/musica/setlists?s=${setlist.id}` : `/app/musica/cancion/${id}`)
  const go = (d: number) => {
    if (!setlist) return
    const n = idx + d
    const next = setlist.song_ids[n]
    if (next) nav(`/app/musica/cancion/${next}/escenario?s=${setlist.id}&i=${n}`, { replace: true })
  }

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); if (e.key === 'ArrowRight') go(1); if (e.key === 'ArrowLeft') go(-1) }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  })

  if (!song) return <div className="fixed inset-0 z-50 grid place-items-center" style={{ background: 'var(--bg)' }}><p>{songs.loading ? 'Cargando…' : 'No encontré esta canción.'}</p></div>

  const shownKey = song.song_key ? transposeKey(song.song_key, semis, prefersFlats(transposeKey(song.song_key, semis))) : null

  return (
    <div className="safe-top fixed inset-0 z-50 flex flex-col force-dark" style={{ background: '#0d0d0f' }}>
      <div className="flex items-center gap-2 px-3 py-2" style={{ opacity: bar ? 1 : 0.15, transition: 'opacity 200ms var(--ease-out)' }}>
        <button className="grid size-11 place-items-center rounded-full" onClick={close} aria-label="Salir del escenario"><X size={22} aria-hidden /></button>
        <div className="min-w-0 flex-1 text-center">
          <p className="truncate font-semibold">{song.title}</p>
          <p className="text-xs" style={{ color: 'var(--ink-soft)' }}>{[shownKey && `Tono ${shownKey}`, song.bpm && `${song.bpm} bpm`, setlist && idx >= 0 && `${idx + 1}/${setlist.song_ids.length}`].filter(Boolean).join(' · ')}</p>
        </div>
        {setlist && <>
          <button className="grid size-11 place-items-center rounded-full" onClick={() => go(-1)} aria-label="Canción anterior" disabled={idx <= 0}><ChevronLeft size={22} aria-hidden /></button>
          <button className="grid size-11 place-items-center rounded-full" onClick={() => go(1)} aria-label="Canción siguiente" disabled={idx >= setlist.song_ids.length - 1}><ChevronRight size={22} aria-hidden /></button>
        </>}
      </div>

      <div ref={scroller} className="flex-1 overflow-y-auto px-5 pb-40" style={{ touchAction: 'pan-y' }}
        onClick={() => { if (swiped.current) { swiped.current = false; return } setBar((v) => !v) }}
        onTouchStart={(e) => { const t = e.touches[0]; touch.current = { x: t.clientX, y: t.clientY } }}
        onTouchEnd={(e) => { const s0 = touch.current; touch.current = null; if (!s0 || !setlist) return; const t = e.changedTouches[0]; const dx = t.clientX - s0.x, dy = t.clientY - s0.y; if (Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy) * 2) { swiped.current = true; go(dx < 0 ? 1 : -1) } }}>
        <div className="mx-auto max-w-3xl pt-2">
          <ChordSheet content={song.content} semis={semis} targetKey={shownKey} size={SIZES[size]} />
          {setlist && idx >= 0 && (() => { const nx = songs.rows.find((x) => x.id === setlist.song_ids[idx + 1]); return nx ? <button type="button" className="mt-10 w-full rounded-2xl border p-4 text-left" style={{ borderColor: 'var(--line)' }} onClick={(e) => { e.stopPropagation(); go(1) }}><span className="block text-xs" style={{ color: 'var(--ink-soft)' }}>Sigue · desliza a la izquierda</span><span className="block font-semibold">{nx.title}</span></button> : <p className="mt-10 text-center text-sm" style={{ color: 'var(--ink-soft)' }}>Fin del setlist</p> })()}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3 border-t px-3 py-3" style={{ borderColor: 'var(--line-soft)', background: 'var(--surface)', paddingBottom: 'max(.75rem, env(safe-area-inset-bottom))' }}>
        <div className="inline-flex items-center rounded-full border" style={{ borderColor: 'var(--line)' }} role="group" aria-label="Tamaño de letra">
          <button className="grid size-11 place-items-center" onClick={() => setSize((n) => Math.max(0, n - 1))} aria-label="Letra más pequeña"><Minus size={16} aria-hidden /></button>
          <span className="px-1 text-sm font-semibold" aria-hidden>Aa</span>
          <button className="grid size-11 place-items-center" onClick={() => setSize((n) => Math.min(2, n + 1))} aria-label="Letra más grande"><Plus size={16} aria-hidden /></button>
        </div>
        <div className="inline-flex items-center rounded-full border" style={{ borderColor: 'var(--line)' }} role="group" aria-label="Transponer">
          <button className="grid size-11 place-items-center" onClick={() => setSemis((n) => n - 1)} aria-label="Bajar un semitono"><Minus size={16} aria-hidden /></button>
          <span className="min-w-10 text-center text-sm">{semis > 0 ? `+${semis}` : semis}</span>
          <button className="grid size-11 place-items-center" onClick={() => setSemis((n) => n + 1)} aria-label="Subir un semitono"><Plus size={16} aria-hidden /></button>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn btn-primary" onClick={() => setSpeed((s) => (s ? 0 : 20))} aria-pressed={speed > 0}>{speed ? <Pause size={16} aria-hidden /> : <Play size={16} aria-hidden />} Scroll</button>
          <input type="range" min={5} max={80} value={speed || 20} onChange={(e) => setSpeed(Number(e.target.value))} aria-label="Velocidad de desplazamiento" className="w-28" />
        </div>
      </div>
    </div>
  )
}
