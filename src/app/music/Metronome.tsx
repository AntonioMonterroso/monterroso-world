import { Minus, Pause, Play, Plus } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'

export default function Metronome({ bpm, onBpm, beats = 4 }: { bpm: number; onBpm: (n: number) => void; beats?: number }) {
  const [playing, setPlaying] = useState(false)
  const [beat, setBeat] = useState(-1)
  const ctx = useRef<AudioContext | null>(null)
  const timer = useRef<ReturnType<typeof setInterval> | undefined>(undefined)
  const next = useRef(0)
  const idx = useRef(0)
  const live = useRef({ bpm, beats })
  live.current = { bpm, beats }
  const taps = useRef<number[]>([])

  const stop = useCallback(() => {
    clearInterval(timer.current)
    ctx.current?.close()
    ctx.current = null
    setPlaying(false)
    setBeat(-1)
  }, [])

  const start = () => {
    const c = new AudioContext()
    ctx.current = c
    next.current = c.currentTime + 0.05
    idx.current = 0
    timer.current = setInterval(() => {
      while (next.current < c.currentTime + 0.12) {
        const accent = idx.current % live.current.beats === 0
        const o = c.createOscillator(), g = c.createGain()
        o.frequency.value = accent ? 1500 : 1000
        g.gain.setValueAtTime(0.0001, next.current)
        g.gain.exponentialRampToValueAtTime(0.5, next.current + 0.002)
        g.gain.exponentialRampToValueAtTime(0.0001, next.current + 0.06)
        o.connect(g).connect(c.destination)
        o.start(next.current); o.stop(next.current + 0.07)
        const b = idx.current % live.current.beats
        setTimeout(() => setBeat(b), Math.max(0, (next.current - c.currentTime) * 1000))
        next.current += 60 / live.current.bpm
        idx.current++
      }
    }, 25)
    setPlaying(true)
  }

  useEffect(() => stop, [stop])

  const set = (n: number) => onBpm(Math.min(260, Math.max(30, Math.round(n))))
  const tap = () => {
    const now = performance.now()
    taps.current = [...taps.current.filter((t) => now - t < 2500), now].slice(-6)
    if (taps.current.length >= 2) {
      const gaps = taps.current.slice(1).map((t, i) => t - taps.current[i])
      set(60000 / (gaps.reduce((a, b) => a + b, 0) / gaps.length))
    }
  }

  return (
    <div className="rounded-2xl border p-4" style={{ borderColor: 'var(--line-soft)', background: 'var(--surface)' }}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button className="grid size-11 place-items-center rounded-full border" style={{ borderColor: 'var(--line)' }} onClick={() => set(bpm - 1)} aria-label="Bajar tempo"><Minus size={16} aria-hidden /></button>
          <div className="min-w-20 text-center"><span className="font-display text-4xl">{bpm}</span><span className="block text-xs" style={{ color: 'var(--ink-faint)' }}>BPM</span></div>
          <button className="grid size-11 place-items-center rounded-full border" style={{ borderColor: 'var(--line)' }} onClick={() => set(bpm + 1)} aria-label="Subir tempo"><Plus size={16} aria-hidden /></button>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn btn-ghost" onClick={tap}>Tap</button>
          <button className="btn btn-primary" onClick={playing ? stop : start} aria-pressed={playing}>{playing ? <Pause size={18} aria-hidden /> : <Play size={18} aria-hidden />} {playing ? 'Parar' : 'Iniciar'}</button>
        </div>
      </div>
      <input type="range" min={30} max={260} value={bpm} onChange={(e) => set(Number(e.target.value))} className="mt-3 w-full" aria-label="Tempo" />
      <div className="mt-2 flex justify-center gap-2" aria-hidden>
        {Array.from({ length: beats }).map((_, i) => <span key={i} className="size-3 rounded-full" style={{ background: beat === i ? (i === 0 ? 'var(--accent)' : 'var(--sky)') : 'var(--surface-2)', transition: 'background-color 80ms' }} />)}
      </div>
    </div>
  )
}
