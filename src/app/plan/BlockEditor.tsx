import { motion } from 'motion/react'
import { Trash2, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { kindMeta, type Block, type Kind, type NewBlock } from '../../lib/data'
import { DAYS, fmtMin, toMin } from '../../lib/time'

type Props = {
  block: Block | null
  day: number
  /** Fecha que se está viendo en el horario (AAAA-MM-DD): sugerida para un bloque de un solo día. */
  date: string
  onClose: () => void
  onSave: (id: string | null, v: NewBlock) => void
  onDelete: (id: string) => void
  onSplit: (b: Block, v: NewBlock) => void
}

const ease = [0.23, 1, 0.32, 1] as const

export default function BlockEditor({ block, day, date, onClose, onSave, onDelete, onSplit }: Props) {
  const [title, setTitle] = useState('')
  const [kind, setKind] = useState<Kind>('other')
  const [days, setDays] = useState<number[]>([])
  const [start, setStart] = useState('09:00')
  const [end, setEnd] = useState('10:00')
  const [notes, setNotes] = useState('')
  const [notify, setNotify] = useState(true)
  const [once, setOnce] = useState(false)
  const [onDate, setOnDate] = useState('')
  const [confirm, setConfirm] = useState(false)
  const [err, setErr] = useState('')

  useEffect(() => {
    if (!block) return
    setTitle(block.title); setKind(block.kind); setDays(block.days)
    setStart(fmtMin(block.start_min)); setEnd(block.end_min >= 1440 ? '23:59' : fmtMin(block.end_min)); setNotes(block.notes ?? ''); setNotify(block.notify !== false)
    setOnce(Boolean(block.on_date)); setOnDate(block.on_date ?? date)
    setConfirm(false); setErr('')
  }, [block])

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])

  const value = (): NewBlock | null => {
    const s = toMin(start), e = toMin(end)
    if (!title.trim()) { setErr('Ponle un nombre al bloque.'); return null }
    if (e <= s) { setErr('La hora de fin debe ser después del inicio.'); return null }
    if (once && !/^\d{4}-\d{2}-\d{2}$/.test(onDate)) { setErr('Elige la fecha del bloque.'); return null }
    if (!once && days.length === 0) { setErr('Elige al menos un día.'); return null }
    const wd = once ? new Date(Number(onDate.slice(0, 4)), Number(onDate.slice(5, 7)) - 1, Number(onDate.slice(8, 10))).getDay() : 0
    return { title: title.trim(), kind, days: once ? [wd] : days, on_date: once ? onDate : null, start_min: s, end_min: e, notes: notes.trim() || null, notify }
  }

  const submit = (ev: React.FormEvent) => {
    ev.preventDefault()
    const v = value()
    if (v && block) onSave(block.id, v)
  }

  return (
    <>
      {block && (
        <motion.div className="fixed inset-0 z-40 grid items-end justify-items-center md:items-center" style={{ background: 'rgba(5,10,24,.6)' }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }} onMouseDown={onClose}>
          <motion.form
            role="dialog" aria-modal="true" aria-label="Editar bloque"
            onSubmit={submit} onMouseDown={(e) => e.stopPropagation()}
            className="sheet-max w-full max-w-lg overflow-auto rounded-t-3xl border p-5 md:rounded-3xl"
            style={{ background: 'var(--surface)', borderColor: 'var(--line)', paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom))' }}
            initial={{ transform: 'translateY(40px)', opacity: 0 }} animate={{ transform: 'translateY(0px)', opacity: 1 }} transition={{ duration: 0.28, ease }}
          >
            <div className="flex items-center justify-between">
              <h2 className="font-display text-2xl">Bloque</h2>
              <button type="button" onClick={onClose} className="grid size-11 place-items-center rounded-full" aria-label="Cerrar"><X size={20} aria-hidden /></button>
            </div>

            <div className="mt-4 grid gap-4">
              <label className="grid gap-2 text-sm">Nombre
                <input className="field" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} />
              </label>

              <fieldset>
                <legend className="mb-2 text-sm">Tipo</legend>
                <div className="flex flex-wrap gap-2">
                  {(Object.keys(kindMeta) as Kind[]).map((k) => {
                    const M = kindMeta[k]
                    const on = kind === k
                    return (
                      <button key={k} type="button" aria-pressed={on} onClick={() => setKind(k)} className="inline-flex min-h-11 items-center gap-2 rounded-full border px-3 text-sm"
                        style={{ borderColor: on ? M.color : 'var(--line)', color: on ? M.color : 'var(--ink-soft)', background: on ? 'color-mix(in oklab, ' + M.color + ' 14%, transparent)' : 'transparent' }}>
                        <M.icon size={16} aria-hidden /> {M.label}
                      </button>
                    )
                  })}
                </div>
              </fieldset>

              <div className="grid grid-cols-2 gap-3">
                <label className="grid gap-2 text-sm">Inicio<input type="time" step={300} className="field" value={start} onChange={(e) => setStart(e.target.value)} /></label>
                <label className="grid gap-2 text-sm">Fin<input type="time" step={300} className="field" value={end} onChange={(e) => setEnd(e.target.value)} /></label>
              </div>

              <fieldset>
                <legend className="mb-2 text-sm">Cuándo</legend>
                <div className="seg" role="group" aria-label="Frecuencia">
                  <button type="button" className="seg-item" aria-pressed={!once} onClick={() => setOnce(false)}><span className="seg-label">Cada semana</span></button>
                  <button type="button" className="seg-item" aria-pressed={once} onClick={() => { setOnce(true); if (!onDate) setOnDate(date) }}><span className="seg-label">Solo un día</span></button>
                </div>
                {once ? (
                  <label className="mt-3 grid gap-2 text-sm">Fecha
                    <input type="date" className="field" value={onDate} onChange={(e) => setOnDate(e.target.value)} />
                  </label>
                ) : (
                  <div className="mt-3 flex gap-2">
                    {DAYS.map((d) => {
                      const on = days.includes(d.n)
                      return (
                        <button key={d.n} type="button" aria-pressed={on} aria-label={d.long} onClick={() => setDays(on ? days.filter((x) => x !== d.n) : [...days, d.n])}
                          className="grid size-11 place-items-center rounded-full border text-sm font-semibold"
                          style={{ borderColor: on ? 'var(--accent)' : 'var(--line)', background: on ? 'var(--accent)' : 'transparent', color: on ? 'var(--bg)' : 'var(--ink-soft)' }}>
                          {d.short}
                        </button>
                      )
                    })}
                  </div>
                )}
              </fieldset>

              <label className="grid gap-2 text-sm">Notas
                <textarea className="field py-3" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
              </label>
              <label className="flex min-h-11 items-center gap-3 text-sm"><input type="checkbox" className="size-5" checked={notify} onChange={(e) => setNotify(e.target.checked)} /> Avisarme cuando empiece</label>
            </div>

            {err && <p role="alert" className="mt-3 text-sm" style={{ color: 'var(--neg)' }}>{err}</p>}

            <div className="mt-5 flex flex-wrap items-center gap-3">
              <button className="btn btn-primary">Guardar</button>
              {block && !block.on_date && block.days.length > 1 && block.days.includes(day) && (
                <button type="button" className="btn btn-ghost" onClick={() => { const v = value(); if (v) onSplit(block, v) }}>Solo este día</button>
              )}
              <button type="button" className="btn btn-ghost ml-auto" style={{ color: confirm ? 'var(--neg)' : undefined }} onClick={() => (confirm ? onDelete(block!.id) : setConfirm(true))}>
                <Trash2 size={16} aria-hidden /> {confirm ? '¿Seguro?' : 'Eliminar'}
              </button>
            </div>
          </motion.form>
        </motion.div>
      )}
    </>
  )
}
