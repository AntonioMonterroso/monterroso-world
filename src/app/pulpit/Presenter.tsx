import type { RealtimeChannel } from '@supabase/supabase-js'
import { Check, ChevronLeft, ChevronRight, Copy, Mic, MicOff, Pause, Play, QrCode, RotateCcw, X } from 'lucide-react'
import QRCode from 'qrcode'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getSettings, patchSettings, type Church } from '../../lib/settings'
import { supabase } from '../../lib/supabase'
import { useTable } from '../../lib/table'
import { liveChannel, parseCommand, type LivePayload, type Phase, type Sermon, type Slide } from '../../lib/pulpit'

type SR = { start: () => void; stop: () => void; lang: string; continuous: boolean; interimResults: boolean; onresult: ((e: { resultIndex: number; results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null; onend: (() => void) | null; onerror: (() => void) | null }
const speechCtor = (): (new () => SR) | null => {
  const w = window as unknown as { SpeechRecognition?: new () => SR; webkitSpeechRecognition?: new () => SR }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

const mmss = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`

const label = (s: Slide) => (s.kind === 'verse' ? s.reference || s.body : s.kind === 'phrase' ? s.body : s.title || s.body || s.url) ?? '(vacía)'

/** Control remoto: avanza las diapositivas de la pantalla de la iglesia y te guía con el guion y los tiempos. */
export default function Presenter() {
  const { id } = useParams()
  const nav = useNavigate()
  const sermons = useTable<Sermon>('sermons', { col: 'created_at', asc: false })
  const phasesDb = useTable<Phase>('sermon_phases', { col: 'position', asc: true })
  const slidesDb = useTable<Slide>('sermon_slides', { col: 'position', asc: true })
  const sermon = sermons.rows.find((s) => s.id === id)
  const slides = slidesDb.rows.filter((s) => s.sermon_id === id).sort((a, b) => a.position - b.position)
  const phases = phasesDb.rows.filter((p) => p.sermon_id === id).sort((a, b) => a.position - b.position)

  const [tab, setTab] = useState<'slides' | 'script'>('slides')
  const [idx, setIdx] = useState(-1) // -1 = pantalla de inicio con el logo
  const [church, setChurch] = useState<Church>({ name: '', logo: '' })
  const [displays, setDisplays] = useState(0)
  const [copied, setCopied] = useState(false)
  const [qr, setQr] = useState('')
  const [showQr, setShowQr] = useState(false)
  const [voice, setVoice] = useState(false)
  const [voiceMsg, setVoiceMsg] = useState('')
  const chan = useRef<RealtimeChannel | null>(null)
  const ready = useRef(false)

  // Guion y tiempo
  const [running, setRunning] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [pi, setPi] = useState(0)

  useEffect(() => { getSettings().then((s) => s.church && setChurch(s.church)) }, [])

  const payload = useCallback((): LivePayload => {
    const s = idx >= 0 ? slides[idx] : undefined
    return {
      slide: s ? { kind: s.kind, title: s.title ?? undefined, body: s.body ?? undefined, reference: s.reference ?? undefined, url: s.url ?? undefined } : null,
      index: idx, total: slides.length, brand: { name: church.name || 'Monterroso World', logo: church.logo || null },
    }
  }, [idx, slides, church])
  const latest = useRef(payload)
  latest.current = payload

  const send = useCallback(() => {
    if (ready.current) chan.current?.send({ type: 'broadcast', event: 'slide', payload: latest.current() })
  }, [])

  // Canal en vivo
  const token = sermon?.live_token
  useEffect(() => {
    if (!token) return
    const ch = supabase.channel(liveChannel(token), { config: { broadcast: { self: false }, presence: { key: `controller-${Math.random().toString(36).slice(2, 8)}` } } })
    chan.current = ch
    ch.on('broadcast', { event: 'hello' }, () => send())
      .on('presence', { event: 'sync' }, () => setDisplays(Object.keys(ch.presenceState()).filter((k) => k.startsWith('display')).length))
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') { ready.current = true; ch.track({ role: 'controller' }); send() }
      })
    return () => { ready.current = false; supabase.removeChannel(ch); chan.current = null }
  }, [token, send])

  useEffect(() => { send() }, [idx, slides.length, church, send, slidesDb.rows])

  const go = useCallback((d: number) => setIdx((i) => Math.min(slides.length - 1, Math.max(-1, i + d))), [slides.length])

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      if (e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); go(1) }
      if (e.key === 'ArrowLeft') go(-1)
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [go])

  // Pantalla encendida
  useEffect(() => {
    let lock: WakeLockSentinel | null = null
    navigator.wakeLock?.request('screen').then((l) => { lock = l }).catch(() => {})
    return () => { lock?.release().catch(() => {}) }
  }, [])

  // Cronómetro
  useEffect(() => {
    if (!running) return
    const t = setInterval(() => setElapsed((e) => e + 1), 1000)
    return () => clearInterval(t)
  }, [running])

  // Voz (opcional, depende del navegador)
  useEffect(() => {
    if (!voice) return
    const Ctor = speechCtor()
    if (!Ctor) { setVoiceMsg('Este navegador no reconoce voz.'); setVoice(false); return }
    const rec = new Ctor()
    rec.lang = 'es-ES'; rec.continuous = true; rec.interimResults = false
    let on = true, last = 0
    rec.onresult = (e) => {
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const cmd = parseCommand(e.results[i][0].transcript)
        if (cmd && Date.now() - last > 1200) { last = Date.now(); go(cmd === 'next' ? 1 : -1) }
      }
    }
    rec.onend = () => { if (on) { try { rec.start() } catch { /* ya iniciado */ } } }
    rec.onerror = () => setVoiceMsg('No pude usar el micrófono.')
    try { rec.start(); setVoiceMsg('Escuchando: di “siguiente” o “anterior”.') } catch { setVoice(false) }
    return () => { on = false; rec.stop(); setVoiceMsg('') }
  }, [voice, go])

  const link = token ? `${location.origin}${import.meta.env.BASE_URL}live/${token}` : ''
  useEffect(() => { if (showQr && link) QRCode.toDataURL(link, { margin: 1, width: 220, color: { dark: '#0b1730', light: '#f1ebdd' } }).then(setQr) }, [showQr, link])

  const copy = async () => { try { await navigator.clipboard.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 1800) } catch { /* sin permiso */ } }
  const saveChurch = (c: Church) => { setChurch(c); patchSettings({ church: c }) }

  if (!sermon) return <div className="fixed inset-0 z-50 grid place-items-center" style={{ background: 'var(--bg)' }}><p>{sermons.loading ? 'Cargando…' : 'No encontré esta prédica.'}</p></div>

  const cur = idx >= 0 ? slides[idx] : null
  const planned = phases.reduce<number[]>((acc, p) => [...acc, (acc.at(-1) ?? 0) + (p.minutes ?? 0) * 60], [])
  const phase = phases[pi]
  const over = planned[pi] !== undefined && planned[pi] > 0 && elapsed > planned[pi]

  return (
    <div className="fixed inset-0 z-50 flex flex-col overflow-hidden" style={{ background: '#08111f' }}>
      <div className="flex items-center gap-2 px-3 py-2">
        <button className="grid size-11 place-items-center rounded-full" onClick={() => nav(`/app/pulpito/predica/${sermon.id}`)} aria-label="Salir"><X size={22} aria-hidden /></button>
        <div className="min-w-0 flex-1"><p className="truncate font-semibold">{sermon.title}</p><p className="text-xs" style={{ color: displays ? '#8fd1a4' : 'var(--ink-faint)' }}>{displays ? `${displays} ${displays === 1 ? 'pantalla conectada' : 'pantallas conectadas'}` : 'Ninguna pantalla conectada'}</p></div>
        <div className="inline-flex rounded-full p-1" style={{ background: 'var(--surface)' }} role="tablist">
          {([['slides', 'Diapositivas'], ['script', 'Guion']] as const).map(([v, l]) => <button key={v} role="tab" aria-selected={tab === v} onClick={() => setTab(v)} className="min-h-10 rounded-full px-3 text-sm font-semibold" style={{ background: tab === v ? 'var(--accent)' : 'transparent', color: tab === v ? 'var(--bg)' : 'var(--ink-soft)' }}>{l}</button>)}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-4">
        <div className="mx-auto grid max-w-3xl gap-5">
          {/* Enlace de la pantalla */}
          <section className="rounded-2xl border p-4" style={{ borderColor: 'var(--line-soft)', background: 'var(--surface)' }} aria-label="Pantalla de la iglesia">
            <p className="text-sm" style={{ color: 'var(--ink-soft)' }}>Abre este enlace en la pantalla de la iglesia. Solo quien lo tenga podrá verla.</p>
            <p className="mt-2 break-all rounded-lg px-3 py-2 text-xs" style={{ background: 'var(--bg)', color: 'var(--sky)' }}>{link}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button className="btn btn-ghost" onClick={copy}>{copied ? <Check size={16} aria-hidden /> : <Copy size={16} aria-hidden />} {copied ? 'Copiado' : 'Copiar enlace'}</button>
              <button className="btn btn-ghost" onClick={() => setShowQr((v) => !v)}><QrCode size={16} aria-hidden /> QR</button>
              <button className="btn btn-ghost" aria-pressed={voice} onClick={() => setVoice((v) => !v)}>{voice ? <Mic size={16} aria-hidden /> : <MicOff size={16} aria-hidden />} Voz</button>
            </div>
            {showQr && qr && <img src={qr} alt="Código QR del enlace de la pantalla" width={160} height={160} className="mt-3 rounded-lg" />}
            {voiceMsg && <p role="status" className="mt-2 text-sm" style={{ color: 'var(--sky)' }}>{voiceMsg}</p>}
            <details className="mt-3 text-sm">
              <summary className="min-h-11 cursor-pointer py-2" style={{ color: 'var(--ink-soft)' }}>Logo y nombre de la iglesia</summary>
              <div className="mt-2 grid gap-3">
                <label className="grid gap-2">Nombre<input className="field" value={church.name} maxLength={80} onChange={(e) => setChurch({ ...church, name: e.target.value })} onBlur={() => saveChurch(church)} /></label>
                <label className="grid gap-2">Enlace del logo (https)<input className="field" inputMode="url" value={church.logo} maxLength={1000} onChange={(e) => setChurch({ ...church, logo: e.target.value })} onBlur={() => saveChurch(church)} placeholder="https://" /></label>
              </div>
            </details>
          </section>

          {tab === 'slides' ? (
            <>
              <section aria-label="Diapositiva actual" className="rounded-2xl border p-5 text-center" style={{ borderColor: 'var(--line)', background: 'var(--surface)' }}>
                <p className="text-xs" style={{ color: 'var(--ink-faint)' }}>{idx < 0 ? 'Pantalla de inicio' : `Diapositiva ${idx + 1} de ${slides.length}`}</p>
                <p className="mt-3 font-display text-2xl">{cur ? label(cur) : church.name || 'Monterroso World'}</p>
                {cur?.kind === 'verse' && cur.body && <p className="mt-2 text-sm" style={{ color: 'var(--ink-soft)' }}>{cur.body}</p>}
              </section>
              <div className="grid grid-cols-2 gap-3">
                <button className="btn btn-ghost min-h-16 justify-center text-lg" onClick={() => go(-1)} disabled={idx < 0}><ChevronLeft size={22} aria-hidden /> Anterior</button>
                <button className="btn btn-primary min-h-16 justify-center text-lg" onClick={() => go(1)} disabled={idx >= slides.length - 1}>Siguiente <ChevronRight size={22} aria-hidden /></button>
              </div>
              <ol className="grid gap-2" aria-label="Todas las diapositivas">
                <li><button onClick={() => setIdx(-1)} className="flex min-h-11 w-full items-center rounded-xl border px-4 text-left text-sm" style={{ borderColor: idx === -1 ? 'var(--accent)' : 'var(--line-soft)', background: 'var(--surface)' }}>Pantalla de inicio</button></li>
                {slides.map((s, i) => <li key={s.id}><button onClick={() => setIdx(i)} className="flex min-h-12 w-full items-center gap-3 rounded-xl border px-4 text-left text-sm" style={{ borderColor: idx === i ? 'var(--accent)' : 'var(--line-soft)', background: 'var(--surface)' }}><span style={{ color: 'var(--accent)' }}>{i + 1}</span><span className="truncate">{label(s)}</span></button></li>)}
              </ol>
              {slides.length === 0 && <p className="text-sm" style={{ color: 'var(--ink-soft)' }}>Esta prédica no tiene diapositivas. Agrégalas en su página.</p>}
            </>
          ) : (
            <>
              <section className="rounded-2xl border p-4" style={{ borderColor: over ? 'var(--personal)' : 'var(--line)', background: 'var(--surface)' }} aria-label="Cronómetro">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-display text-5xl" style={{ color: over ? 'var(--personal)' : 'var(--ink)' }} aria-live="off">{mmss(elapsed)}</p>
                  <div className="flex gap-2">
                    <button className="btn btn-primary" onClick={() => setRunning((r) => !r)} aria-pressed={running}>{running ? <Pause size={16} aria-hidden /> : <Play size={16} aria-hidden />} {running ? 'Pausar' : 'Iniciar'}</button>
                    <button className="grid size-11 place-items-center rounded-full border" style={{ borderColor: 'var(--line)' }} onClick={() => { setRunning(false); setElapsed(0); setPi(0) }} aria-label="Reiniciar"><RotateCcw size={16} aria-hidden /></button>
                  </div>
                </div>
                {phases.length > 0 && <p className="mt-2 text-sm" style={{ color: 'var(--ink-soft)' }}>Planeado en total: {mmss(planned.at(-1) ?? 0)}{over && ' · Vas pasado de tiempo en esta fase, sin prisa: ve cerrando.'}</p>}
              </section>

              {phases.length === 0 ? <p className="text-sm" style={{ color: 'var(--ink-soft)' }}>Esta prédica no tiene guion. Agrega fases en su página.</p> : (
                <>
                  <ol className="flex gap-2 overflow-x-auto pb-1" aria-label="Fases">
                    {phases.map((p, i) => <li key={p.id}><button onClick={() => setPi(i)} aria-current={pi === i} className="min-h-11 shrink-0 rounded-full border px-4 text-sm" style={{ borderColor: pi === i ? 'var(--accent)' : 'var(--line)', background: pi === i ? 'var(--accent)' : 'transparent', color: pi === i ? 'var(--bg)' : 'var(--ink-soft)' }}>{i + 1}. {p.title}{p.minutes ? ` · ${p.minutes}′` : ''}</button></li>)}
                  </ol>
                  <section className="rounded-2xl border p-5" style={{ borderColor: 'var(--line-soft)', background: 'var(--surface)' }} aria-label={phase?.title}>
                    <h2 className="font-display text-3xl">{phase?.title}</h2>
                    <p className="mt-4 whitespace-pre-wrap" style={{ fontSize: '1.35rem', lineHeight: 1.45 }}>{phase?.body || 'Sin notas en esta fase.'}</p>
                  </section>
                  <div className="grid grid-cols-2 gap-3">
                    <button className="btn btn-ghost min-h-14 justify-center" onClick={() => setPi((i) => Math.max(0, i - 1))} disabled={pi === 0}><ChevronLeft size={20} aria-hidden /> Fase anterior</button>
                    <button className="btn btn-primary min-h-14 justify-center" onClick={() => setPi((i) => Math.min(phases.length - 1, i + 1))} disabled={pi >= phases.length - 1}>Siguiente fase <ChevronRight size={20} aria-hidden /></button>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
