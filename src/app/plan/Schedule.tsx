import { Loader2, Plus } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { kindMeta, useBlocks, type Block } from '../../lib/data'
import { eventKinds, reminderMeta, useEvents } from '../../lib/events'
import { DAYS, fmtMin, localISO, nowMin } from '../../lib/time'
import BlockEditor from './BlockEditor'
import EventEditor, { type EditorTarget } from './EventEditor'

const HOUR_H = 60
const SNAP = 15
const PX = HOUR_H / 60
const snap = (m: number) => Math.round(m / SNAP) * SNAP
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v))

type Drag = { id: string; mode: 'move' | 'resize'; startY: number; s0: number; e0: number; s: number; e: number; moved: boolean }

/** Reparte los bloques que se traslapan en columnas. */
type Span = { id: string; start_min: number; end_min: number }
function lanes(list: Span[]) {
  const out = new Map<string, { col: number; cols: number }>()
  let group: Span[] = []
  let end = -1
  const flush = () => {
    const colEnds: number[] = []
    for (const b of group) {
      let c = colEnds.findIndex((e) => e <= b.start_min)
      if (c === -1) { c = colEnds.length; colEnds.push(b.end_min) } else colEnds[c] = b.end_min
      out.set(b.id, { col: c, cols: 0 })
    }
    for (const b of group) out.get(b.id)!.cols = colEnds.length
    group = []
  }
  for (const b of [...list].sort((a, c) => a.start_min - c.start_min)) {
    if (group.length && b.start_min >= end) { flush(); end = -1 }
    group.push(b)
    end = Math.max(end, b.end_min)
  }
  if (group.length) flush()
  return out
}

function Scene({ kind }: { kind: Block['kind'] }) {
  if (kind === 'code')
    return <div className="blk-code" aria-hidden>{[70, 45, 80, 55].map((w, i) => <span key={i} className="code-line" style={{ width: `${w}%`, animationDelay: `${i * 140}ms` }} />)}</div>
  if (kind === 'rehearsal')
    return <div className="blk-eq" aria-hidden>{Array.from({ length: 12 }).map((_, i) => <span key={i} className="eq-bar" style={{ animationDelay: `${(i * 97) % 900}ms`, animationDuration: `${1.5 + (i % 5) * 0.25}s` }} />)}</div>
  return null
}

export default function Schedule() {
  const { blocks, loading, error, update, add, remove, clearError } = useBlocks()
  const ev = useEvents()
  const [evTarget, setEvTarget] = useState<EditorTarget | null>(null)
  const [day, setDay] = useState(() => new Date().getDay())
  const [now, setNow] = useState(() => nowMin())
  const [editing, setEditing] = useState<Block | null>(null)
  const [drag, setDrag] = useState<Drag | null>(null)
  const dragRef = useRef<Drag | null>(null)
  const scroller = useRef<HTMLDivElement>(null)
  const isToday = day === new Date().getDay()

  useEffect(() => { const t = setInterval(() => setNow(nowMin()), 30_000); return () => clearInterval(t) }, [])

  const dayBlocks = useMemo(() => blocks.filter((b) => b.days.includes(day)), [blocks, day])
  // Fecha concreta del día elegido dentro de la semana en curso (lunes a domingo)
  const dayDate = useMemo(() => {
    const t = new Date()
    const delta = ((day + 6) % 7) - ((t.getDay() + 6) % 7)
    return localISO(new Date(t.getFullYear(), t.getMonth(), t.getDate() + delta))
  }, [day])
  const dayEvents = useMemo(() => ev.between(dayDate, dayDate), [ev, dayDate])
  const spans = useMemo<Span[]>(() => [
    ...dayBlocks,
    ...dayEvents.map((o) => ({ id: `ev-${o.event.id}`, start_min: o.event.start_min, end_min: o.event.end_min ?? Math.min(o.event.start_min + 30, 1440) })),
  ], [dayBlocks, dayEvents])
  const laneMap = useMemo(() => lanes(spans), [spans])

  // Al abrir, lleva la vista a la hora actual (o a las 7 si no es hoy)
  useEffect(() => {
    if (loading || !scroller.current) return
    const target = isToday ? Math.max(0, now - 90) : 7 * 60
    scroller.current.scrollTo({ top: target * PX, behavior: 'auto' })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, day])

  const setDragBoth = (d: Drag | null) => { dragRef.current = d; setDrag(d) }

  const startDrag = useCallback((e: React.PointerEvent, b: Block, mode: 'move' | 'resize') => {
    if (e.button !== 0) return
    e.stopPropagation()
    const touch = e.pointerType !== 'mouse'
    const base: Drag = { id: b.id, mode, startY: e.clientY, s0: b.start_min, e0: b.end_min, s: b.start_min, e: b.end_min, moved: false }
    let active = !touch
    let timer: ReturnType<typeof setTimeout> | undefined
    const stopScroll = (ev: TouchEvent) => { if (active) ev.preventDefault() }

    if (touch) timer = setTimeout(() => { active = true; navigator.vibrate?.(12); setDragBoth({ ...base }) }, 380)
    else setDragBoth({ ...base })

    const move = (ev: PointerEvent) => {
      const dy = ev.clientY - base.startY
      if (!active) { if (Math.abs(dy) > 8 && timer) { clearTimeout(timer); cleanup() } return }
      const dm = snap(dy / PX)
      const len = base.e0 - base.s0
      let s = base.s0, en = base.e0
      if (mode === 'move') { s = clamp(base.s0 + dm, 0, 1440 - len); en = s + len }
      else en = clamp(base.e0 + dm, base.s0 + SNAP, 1440)
      setDragBoth({ ...base, s, e: en, moved: Math.abs(dy) > 4 })
    }
    const up = () => {
      clearTimeout(timer)
      const d = dragRef.current
      cleanup()
      if (!d) { if (touch && !active) setEditing(b); return }
      if (d.moved && (d.s !== b.start_min || d.e !== b.end_min)) update(b.id, { start_min: d.s, end_min: d.e })
      else if (!d.moved) setEditing(b)
      setDragBoth(null)
    }
    const cleanup = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', up)
      window.removeEventListener('touchmove', stopScroll)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', up)
    window.addEventListener('touchmove', stopScroll, { passive: false })
  }, [update])

  const newBlock = async () => {
    const start = isToday ? clamp(Math.ceil(now / 30) * 30, 0, 1380) : 9 * 60
    const b = await add({ title: 'Nuevo bloque', kind: 'other', days: [day], start_min: start, end_min: Math.min(start + 60, 1440), notes: null })
    if (b) setEditing(b)
  }

  const save = (id: string | null, v: Parameters<typeof add>[0]) => { if (id) update(id, v); setEditing(null) }
  const split = async (b: Block, v: Parameters<typeof add>[0]) => {
    await update(b.id, { days: b.days.filter((d) => d !== day) })
    await add({ ...v, days: [day] })
    setEditing(null)
  }

  const total = 24 * HOUR_H

  return (
    <div>
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="eyebrow">Planear</p>
          <h1 className="mt-2 font-display text-4xl">Horario</h1>
        </div>
        <button className="btn btn-primary" onClick={newBlock}><Plus size={18} aria-hidden /> Bloque</button>
      </div>

      <div role="tablist" aria-label="Día de la semana" className="mt-6 flex gap-1.5">
        {DAYS.map((d) => {
          const on = d.n === day
          const isNow = d.n === new Date().getDay()
          return (
            <button key={d.n} role="tab" aria-selected={on} aria-label={d.long} onClick={() => setDay(d.n)} className="relative grid min-h-12 flex-1 place-items-center rounded-xl border text-sm font-semibold"
              style={{ borderColor: on ? 'var(--accent)' : 'var(--line-soft)', background: on ? 'var(--accent)' : 'var(--surface)', color: on ? 'var(--bg)' : 'var(--ink-soft)' }}>
              {d.short}
              {isNow && <span className="absolute bottom-1 size-1 rounded-full" style={{ background: on ? 'var(--bg)' : 'var(--accent)' }} aria-hidden />}
            </button>
          )
        })}
      </div>
      <p className="mt-3 text-xs" style={{ color: 'var(--ink-faint)' }}>
        Toca un bloque para editarlo. Arrástralo para moverlo (en el teléfono, mantenlo presionado) y estira el borde de abajo para cambiar su duración. Un cambio afecta todos los días del bloque; usa “Solo este día” para separarlo.
      </p>

      {error && (
        <p role="alert" className="mt-3 flex items-center justify-between rounded-xl px-3 py-2 text-sm" style={{ background: 'color-mix(in oklab, #e8a393 15%, transparent)', color: '#e8a393' }}>
          {error} <button className="underline" onClick={clearError}>Cerrar</button>
        </p>
      )}

      {loading ? (
        <div className="grid h-64 place-items-center"><Loader2 className="animate-spin" aria-label="Cargando" /></div>
      ) : (
        <div ref={scroller} className="relative mt-4 h-[62dvh] overflow-y-auto rounded-2xl border md:h-[68dvh]" style={{ borderColor: 'var(--line-soft)', background: 'var(--surface)' }}>
          <div className="relative" style={{ height: total }}>
            {Array.from({ length: 24 }).map((_, h) => (
              <div key={h} className="absolute inset-x-0 flex" style={{ top: h * HOUR_H, height: HOUR_H, borderTop: h ? '1px solid var(--line-soft)' : 'none' }}>
                <span className="w-12 shrink-0 pr-2 pt-1 text-right text-[11px]" style={{ color: 'var(--ink-faint)' }}>{h ? fmtMin(h * 60) : ''}</span>
              </div>
            ))}

            <div className="absolute inset-y-0 right-2 left-14">
              {dayBlocks.length === 0 && dayEvents.length === 0 && <p className="absolute inset-x-0 top-1/3 text-center text-sm" style={{ color: 'var(--ink-faint)' }}>Día libre. Agrega un bloque con el botón de arriba.</p>}
              {dayBlocks.map((b) => {
                const d = drag?.id === b.id ? drag : null
                const s = d ? d.s : b.start_min
                const e = d ? d.e : b.end_min
                const lane = laneMap.get(b.id) ?? { col: 0, cols: 1 }
                const M = kindMeta[b.kind]
                const live = isToday && now >= b.start_min && now < b.end_min
                const h = (e - s) * PX
                return (
                  <div key={b.id} role="button" tabIndex={0} aria-label={`${b.title}, ${fmtMin(s)} a ${fmtMin(e % 1440)}. Enter para editar`}
                    onKeyDown={(ev) => { if (ev.key === 'Enter') setEditing(b) }}
                    onPointerDown={(ev) => startDrag(ev, b, 'move')}
                    className="blk absolute overflow-hidden rounded-xl border px-3 py-2 text-left"
                    style={{
                      top: s * PX, height: Math.max(h, 26), left: `${(lane.col / lane.cols) * 100}%`, width: `calc(${100 / lane.cols}% - 4px)`,
                      color: M.color, borderColor: `color-mix(in oklab, ${M.color} 72%, transparent)`,
                      background: `color-mix(in oklab, ${M.color} ${live ? 30 : 20}%, var(--bg))`,
                      transform: d ? 'scale(1.015)' : undefined, zIndex: d ? 5 : 1,
                      boxShadow: d ? '0 14px 30px -12px rgba(0,0,0,.7)' : undefined,
                      transition: d ? 'none' : 'top 220ms var(--ease-out), height 220ms var(--ease-out), box-shadow 160ms var(--ease-out)',
                      touchAction: 'pan-y',
                    }}>
                    <Scene kind={b.kind} />
                    <div className="relative flex items-center gap-2 text-sm font-semibold" style={{ color: 'var(--ink)' }}>
                      <M.icon size={15} aria-hidden style={{ color: M.color }} />
                      <span className="truncate">{b.title}</span>
                      {live && <span className="ml-auto rounded-full px-2 text-[10px] tracking-wide uppercase" style={{ background: M.color, color: 'var(--bg)' }}>Ahora</span>}
                    </div>
                    {h >= 44 && <p className="relative mt-0.5 text-xs" style={{ color: 'var(--ink-soft)' }}>{fmtMin(s)} – {fmtMin(e % 1440)}</p>}
                    <span className="absolute inset-x-0 bottom-0 grid h-4 cursor-ns-resize place-items-center" style={{ touchAction: 'none' }} onPointerDown={(ev) => startDrag(ev, b, 'resize')} aria-hidden>
                      <span className="h-1 w-8 rounded-full" style={{ background: M.color, opacity: 0.5 }} />
                    </span>
                  </div>
                )
              })}

              {dayEvents.map((o) => {
                const e = o.event
                const M = e.type === 'reminder' ? reminderMeta : eventKinds[e.kind]
                const lane = laneMap.get(`ev-${e.id}`) ?? { col: 0, cols: 1 }
                const end = e.end_min ?? Math.min(e.start_min + 30, 1440)
                const h = (end - e.start_min) * PX
                return (
                  <button key={e.id + o.date} onClick={() => setEvTarget({ event: e, date: o.date })} aria-label={`${e.title}, ${fmtMin(e.start_min)}`}
                    className="absolute overflow-hidden rounded-xl px-3 py-1.5 text-left"
                    style={{ top: e.start_min * PX, height: Math.max(h, 28), left: `${(lane.col / lane.cols) * 100}%`, width: `calc(${100 / lane.cols}% - 4px)`, color: M.color, border: `1.5px dashed ${M.color}`, background: 'color-mix(in oklab, var(--bg) 82%, transparent)', opacity: o.state.done ? 0.5 : 1, zIndex: 2 }}>
                    <span className="flex items-center gap-2 text-sm font-semibold" style={{ color: 'var(--ink)', textDecoration: o.state.done ? 'line-through' : 'none' }}>
                      <M.icon size={14} aria-hidden style={{ color: M.color }} /> <span className="truncate">{e.title}</span>
                    </span>
                    {h >= 44 && <span className="block text-xs" style={{ color: 'var(--ink-soft)' }}>{fmtMin(e.start_min)}{e.end_min ? ` – ${fmtMin(e.end_min % 1440)}` : ''}</span>}
                  </button>
                )
              })}

              {isToday && (
                <div className="pointer-events-none absolute inset-x-0 z-10 flex items-center" style={{ top: now * PX }} aria-hidden>
                  <span className="-ml-1 size-2.5 rounded-full" style={{ background: '#e8a393' }} />
                  <span className="h-px flex-1" style={{ background: '#e8a393' }} />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <EventEditor target={evTarget} onClose={() => setEvTarget(null)}
        onSave={async (id, v) => { if (id) await ev.update(id, v); else await ev.add(v); setEvTarget(null) }}
        onDelete={(id) => { ev.remove(id); setEvTarget(null) }}
        onSkip={(e, d) => { ev.skip(e, d); setEvTarget(null) }} />
      <BlockEditor block={editing} day={day} onClose={() => setEditing(null)} onSave={save} onSplit={split} onDelete={(id) => { remove(id); setEditing(null) }} />
    </div>
  )
}
