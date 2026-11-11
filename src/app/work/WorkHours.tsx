import { Play, Square, Timer } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Group, Row } from '../../components/ui'
import type { TimeLog } from '../../lib/clientNotes'
import { money, type Payment, type Project } from '../../lib/projects'
import { fmtHours, minutesSince, perHour, readTimer, startTimer, stopTimer, type Running } from '../../lib/workTimer'

/** Horas por trabajo: cronómetro de un toque, horas a mano y cuánto te sale por hora con lo que ya cobraste. */
export default function WorkHours({ client, projects, payments, hours, addHours, removeHours }: { client: string; projects: Project[]; payments: Payment[]; hours: TimeLog[]; addHours: (h: Omit<TimeLog, 'id'>) => void; removeHours: (id: string) => void }) {
  const [run, setRun] = useState<Running | null>(() => readTimer())
  const [now, setNow] = useState(() => Date.now())
  const [pid, setPid] = useState(projects.find((p) => p.status !== 'closed')?.id ?? projects[0]?.id ?? '')
  const [manual, setManual] = useState('')
  useEffect(() => { if (!run) return; const t = setInterval(() => setNow(Date.now()), 15_000); return () => clearInterval(t) }, [run])
  const mineRunning = run && projects.some((p) => p.id === run.projectId) ? run : null
  const otherRunning = run && !mineRunning ? run : null

  const start = () => { if (!pid) return; const r = { projectId: pid, client, start: Date.now() }; startTimer(r); setRun(r); setNow(Date.now()) }
  const stop = () => { if (!mineRunning) return; addHours({ projectId: mineRunning.projectId, start: new Date(mineRunning.start).toISOString(), min: minutesSince(mineRunning.start) }); stopTimer(); setRun(null) }
  const addManual = (e: React.FormEvent) => { e.preventDefault(); const n = Math.round(Number(manual.replace(',', '.')) * 60); if (!pid || !(n > 0)) return; addHours({ projectId: pid, start: new Date().toISOString(), min: Math.min(n, 24 * 60) }); setManual('') }

  const per = projects.map((p) => {
    const min = hours.filter((h) => h.projectId === p.id).reduce((s, h) => s + h.min, 0)
    const received = payments.filter((x) => x.project_id === p.id && x.paid_at).reduce((s, x) => s + Number(x.amount), 0)
    return { p, min, rate: perHour(received, min) }
  }).filter((x) => x.min > 0)

  return (
    <Group title="Horas" footer="Para saber cuánto te sale cada hora. Solo corre un cronómetro a la vez y sigue aunque cierres la app.">
      <li className="row"><div className="flex w-full flex-wrap items-center gap-2 px-4 py-3">
        <Timer size={16} aria-hidden />
        {projects.length > 1 && !mineRunning && <select className="field !min-h-11 !w-auto flex-1" value={pid} onChange={(e) => setPid(e.target.value)} aria-label="Trabajo">{projects.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}</select>}
        {mineRunning
          ? <><span className="flex-1 text-sm"><strong style={{ fontVariantNumeric: 'tabular-nums' }}>{fmtHours(minutesSince(mineRunning.start, now))}</strong> en {projects.find((p) => p.id === mineRunning.projectId)?.title}</span><button className="btn btn-primary btn-chico" onClick={stop}><Square size={14} aria-hidden /> Detener y guardar</button></>
          : <button className="btn btn-sec btn-chico" onClick={start} disabled={!pid}><Play size={14} aria-hidden /> Empezar a contar</button>}
      </div></li>
      {otherRunning && <Row title="Hay otro cronómetro corriendo" sub={`De ${otherRunning.client}. Al empezar aquí, ese se reemplaza sin guardarse.`} chevron={false} tone="var(--aviso)" />}
      <li className="row"><form className="row-hit" onSubmit={addManual}>
        <input className="row-input" inputMode="decimal" value={manual} onChange={(e) => setManual(e.target.value)} placeholder="Anotar horas a mano (por ejemplo 1.5)" aria-label="Horas a mano" />
        {manual.trim() && <button className="btn btn-sec btn-chico">Anotar</button>}
      </form></li>
      {per.map(({ p, min, rate }) => <Row key={p.id} title={p.title} chevron={false} sub={rate !== null && min >= 60 ? `${fmtHours(min)} · con lo cobrado te sale a ${money(rate)} la hora` : `${fmtHours(min)}${min < 60 ? ' · con 1 hora o más te digo cuánto te sale la hora' : ''}`} />)}
      {[...hours].sort((a, b) => b.start.localeCompare(a.start)).slice(0, 5).map((h) => (
        <Row key={h.id} chevron={false} title={fmtHours(h.min)} sub={`${projects.find((p) => p.id === h.projectId)?.title ?? 'Trabajo'} · ${new Date(h.start).toLocaleDateString('es', { day: 'numeric', month: 'short' })}`}
          trailing={<button className="min-h-11 px-3 text-sm underline" style={{ color: 'var(--ink-soft)' }} onClick={() => removeHours(h.id)}>Quitar</button>} />
      ))}
    </Group>
  )
}
