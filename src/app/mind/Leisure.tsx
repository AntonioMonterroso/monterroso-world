import { animate, motion, useMotionValue, useReducedMotion } from 'motion/react'
import { Dices, Pencil, Plus, RotateCw, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import Sheet from '../../components/Sheet'
import { Group, PageHeader, Row, Segmented } from '../../components/ui'
import { useInbox, usePriorities } from '../../lib/data'
import { getSettings, patchSettings } from '../../lib/settings'
import { DEFAULT_WHEELS, pickIndex, sliceSize, targetRotation, winnerAt, type Wheel } from '../../lib/wheel'

const COLORS = ['var(--teal)', 'var(--sky)', 'var(--clay)', 'var(--brass)', '#b9a6d9', '#8fd1a0']
const SIZE = 300, R = 146, C = SIZE / 2

const polar = (deg: number, r: number) => { const a = ((deg - 90) * Math.PI) / 180; return [C + r * Math.cos(a), C + r * Math.sin(a)] as const }
const slicePath = (i: number, n: number) => {
  const s = sliceSize(n)
  if (n === 1) return `M${C} ${C - R} A${R} ${R} 0 1 1 ${C - 0.01} ${C - R} Z`
  const [x0, y0] = polar(i * s, R), [x1, y1] = polar((i + 1) * s, R)
  return `M${C} ${C} L${x0} ${y0} A${R} ${R} 0 ${s > 180 ? 1 : 0} 1 ${x1} ${y1} Z`
}

/** Zona Ocio: ruleta de decisiones para dejar de pensar en lo pequeño. */
export default function Leisure() {
  const calm = useReducedMotion()
  const pr = usePriorities()
  const inbox = useInbox()
  const [wheels, setWheels] = useState<Wheel[]>(DEFAULT_WHEELS)
  const [id, setId] = useState(DEFAULT_WHEELS[0].id)
  const [result, setResult] = useState<string | null>(null)
  const [spinning, setSpinning] = useState(false)
  const [edit, setEdit] = useState<{ wheel?: Wheel; name: string; text: string } | null>(null)
  const rot = useMotionValue(0)
  const live = useRef(0)

  useEffect(() => { getSettings().then((s) => { const w = (s as { wheels?: Wheel[] }).wheels; if (w?.length) { setWheels(w); setId(w[0].id) } }) }, [])
  const save = (next: Wheel[]) => { setWheels(next); void patchSettings({ wheels: next } as never) }

  const wheel = wheels.find((w) => w.id === id) ?? wheels[0]
  const options = useMemo(() => wheel.source === 'tasks' ? [...pr.tasks.filter((t) => !t.done).map((t) => t.title), ...inbox.items.map((i) => i.text)].slice(0, 10) : wheel.options, [wheel, pr.tasks, inbox.items])
  const n = options.length

  const spin = () => {
    if (n < 2 || spinning) return
    setResult(null); setSpinning(true)
    const k = pickIndex(n)
    const target = targetRotation(rot.get(), k, n, 5, Math.random() * 2 - 1)
    const done = () => { setSpinning(false); setResult(options[winnerAt(rot.get(), n)]); navigator.vibrate?.(30) }
    live.current = Date.now()
    if (calm) { rot.set(target); done(); return }
    animate(rot, target, { duration: 4.6, ease: [0.12, 0.7, 0.18, 1], onComplete: done })
  }

  const openEdit = (w?: Wheel) => setEdit({ wheel: w, name: w?.name ?? '', text: (w?.options ?? []).join('\n') })
  const commit = () => {
    if (!edit || !edit.name.trim()) return
    const opts = edit.text.split('\n').map((x) => x.trim()).filter(Boolean).slice(0, 12)
    if (edit.wheel) save(wheels.map((w) => (w.id === edit.wheel!.id ? { ...w, name: edit.name.trim(), options: w.source ? w.options : opts } : w)))
    else { const w: Wheel = { id: `w-${Math.random().toString(36).slice(2, 8)}`, name: edit.name.trim(), options: opts }; save([...wheels, w]); setId(w.id) }
    setEdit(null)
  }
  const removeWheel = () => { if (!edit?.wheel) return; const rest = wheels.filter((w) => w.id !== edit.wheel!.id); save(rest.length ? rest : DEFAULT_WHEELS); setId((rest[0] ?? DEFAULT_WHEELS[0]).id); setEdit(null) }
  const dropResult = () => { if (!result || wheel.source) return; save(wheels.map((w) => (w.id === wheel.id ? { ...w, options: w.options.filter((o) => o !== result) } : w))); setResult(null) }

  return (
    <div>
      <PageHeader eyebrow="Mente y cuerpo" title="Zona Ocio" sub="Si decidir te cansa, que decida la ruleta. Gira, acepta y sigue con tu día." action={<button className="btn btn-tint" onClick={() => openEdit()}><Plus size={16} aria-hidden /> Ruleta</button>} />

      <Segmented label="Ruleta" value={wheel.id} onChange={(v) => { setId(v); setResult(null) }} options={wheels.map((w) => ({ id: w.id, label: w.name }))} />

      <div className="wheel-wrap">
        <div className="wheel-pointer" aria-hidden />
        <motion.div className="wheel" style={{ rotate: rot }} aria-hidden>
          <svg viewBox={`0 0 ${SIZE} ${SIZE}`} width="100%" height="100%">
            {n >= 2 ? options.map((o, i) => {
              const mid = (i + 0.5) * sliceSize(n)
              const [tx, ty] = polar(mid, R * 0.62)
              return (
                <g key={`${o}-${i}`}>
                  <path d={slicePath(i, n)} fill={COLORS[i % COLORS.length]} fillOpacity=".24" stroke="var(--bg)" strokeWidth="2" />
                  <text x={tx} y={ty} transform={`rotate(${mid - 90} ${tx} ${ty})`} textAnchor="middle" dominantBaseline="middle" fontSize={n > 8 ? 11 : 13} fontWeight="600" fill="var(--ink)">{o.length > 16 ? `${o.slice(0, 15)}…` : o}</text>
                </g>
              )
            }) : <circle cx={C} cy={C} r={R} fill="var(--surface-2)" />}
            <circle cx={C} cy={C} r="22" fill="var(--bg)" stroke="var(--line)" strokeWidth="2" />
          </svg>
        </motion.div>
      </div>

      <div className="mt-5 grid justify-items-center gap-3 text-center" role="status" aria-live="polite">
        {n < 2 ? (
          <p className="max-w-xs text-sm" style={{ color: 'var(--ink-soft)' }}>{wheel.source ? 'No tienes tareas abiertas. Agrega prioridades o capturas en Hoy y vuelve.' : 'Agrega al menos dos opciones para poder girar.'}</p>
        ) : result ? (
          <div className="result-pop">
            <p className="text-xs font-semibold" style={{ color: 'var(--ink-faint)' }}>Te tocó</p>
            <p className="mt-1 text-3xl font-bold tracking-tight" style={{ color: 'var(--accent)' }}>{result}</p>
          </div>
        ) : <p className="text-sm" style={{ color: 'var(--ink-soft)' }}>{spinning ? 'Girando…' : `${n} opciones. Toca para girar.`}</p>}

        <div className="flex flex-wrap justify-center gap-2">
          <button className="btn btn-primary" disabled={n < 2 || spinning} onClick={spin}><Dices size={18} aria-hidden /> {result ? 'Girar otra vez' : 'Girar'}</button>
          {result && wheel.source === 'tasks' && <Link className="btn btn-tint" to={`/app/mente/enfoque?tarea=${encodeURIComponent(result)}&min=2&auto=1`}>2 minutos y ya</Link>}
          {result && !wheel.source && <button className="btn btn-ghost" onClick={dropResult}><RotateCw size={16} aria-hidden /> Quitarla de la rueda</button>}
        </div>
      </div>

      <Group title={wheel.name} footer={wheel.source ? 'Esta ruleta se arma sola con tus prioridades abiertas y tus capturas.' : 'Edita las opciones o crea otra ruleta: qué ver, qué estudiar, a dónde salir.'}>
        {options.length === 0 ? <li className="row"><p className="row-hit text-sm" style={{ color: 'var(--ink-faint)' }}>Sin opciones todavía.</p></li> : options.map((o, i) => <Row key={`${o}-${i}`} tone={COLORS[i % COLORS.length]} title={o} chevron={false} />)}
        <Row icon={<Pencil size={16} aria-hidden />} tone="var(--accent)" title={<span style={{ color: 'var(--accent)' }}>{wheel.source ? 'Renombrar ruleta' : 'Editar opciones'}</span>} onClick={() => openEdit(wheel)} />
      </Group>

      <Sheet open={Boolean(edit)} title={edit?.wheel ? 'Editar ruleta' : 'Nueva ruleta'} onClose={() => setEdit(null)}>
        {edit && (
          <form className="grid gap-4" onSubmit={(e) => { e.preventDefault(); commit() }}>
            <label className="grid gap-2 text-sm">Nombre<input autoFocus className="field" value={edit.name} maxLength={40} onChange={(e) => setEdit({ ...edit, name: e.target.value })} placeholder="¿Qué veo hoy?" /></label>
            {!edit.wheel?.source && <label className="grid gap-2 text-sm">Opciones, una por línea (máx. 12)<textarea className="field py-3" rows={7} value={edit.text} onChange={(e) => setEdit({ ...edit, text: e.target.value })} placeholder={'Película\nSerie\nParque'} /></label>}
            <div className="flex items-center gap-3">
              <button className="btn btn-primary">Guardar</button>
              {edit.wheel && wheels.length > 1 && <button type="button" className="btn btn-ghost ml-auto" style={{ color: 'var(--neg)' }} onClick={removeWheel}><Trash2 size={16} aria-hidden /> Eliminar</button>}
            </div>
          </form>
        )}
      </Sheet>
    </div>
  )
}
