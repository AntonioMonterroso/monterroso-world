import { X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { money, type Payment } from '../lib/projects'
import { useTable } from '../lib/table'
import { weekRange, weekSummary } from '../lib/weekSummary'
import type { Tx } from '../lib/finance'
import type { HabitLog } from '../lib/habits'
import type { PracticeLog } from '../lib/music'

const seenKey = (to: string) => `mw_week_seen_${to}`
const fmt = (d: string) => new Date(`${d}T12:00:00`).toLocaleDateString('es', { day: 'numeric', month: 'short' })

/** Tarjeta del domingo (y el lunes): cómo te fue la semana. Se cierra con la X y no vuelve hasta la otra semana. */
export default function WeekCard({ payments, now }: { payments: Payment[]; now: Date }) {
  const range = weekRange(now)
  const [hidden, setHidden] = useState(() => { if (!range) return true; try { return localStorage.getItem(seenKey(range.to)) === '1' } catch { return false } })
  const txs = useTable<Tx>('fin_transactions', { col: 'tx_date', asc: false })
  const logs = useTable<HabitLog>('habit_logs', { col: 'day', asc: false })
  const prac = useTable<PracticeLog>('practice_logs', { col: 'practiced_on', asc: false })
  const s = useMemo(() => (range ? weekSummary(range, { payments, txs: txs.rows, habitLogs: logs.rows, practice: prac.rows }) : null), [range, payments, txs.rows, logs.rows, prac.rows])
  if (!range || !s || hidden || txs.loading) return null
  const close = () => { setHidden(true); try { localStorage.setItem(seenKey(range.to), '1') } catch { /* sin almacenamiento */ } }
  const rows: { k: string; v: string; to: string }[] = [
    { k: 'Cobraste', v: money(s.collected), to: '/app/dinero/entra' },
    { k: 'Gastaste', v: `${money(s.spent)}${s.topSpend ? ` · más en ${s.topSpend.category}` : ''}`, to: '/app/dinero/movimientos' },
    { k: 'Hábitos marcados', v: String(s.habitChecks), to: '/app/mente' },
    { k: 'Práctica', v: s.practiceMin ? `${s.practiceMin} min en ${s.practiceDays} ${s.practiceDays === 1 ? 'día' : 'días'}` : 'Esta semana no hubo', to: '/app/musica/practica' },
  ]
  return (
    <section aria-labelledby="semana-t" className="bloque">
      <div className="bloque-head"><h3 id="semana-t">Tu semana · {fmt(s.from)} al {fmt(s.to)}</h3><button type="button" className="grid size-11 place-items-center rounded-full" aria-label="Cerrar el resumen de la semana" onClick={close}><X size={16} aria-hidden /></button></div>
      <ul>{rows.map((r) => <li key={r.k} className="fila-hoy"><Link to={r.to} className="flex min-h-11 w-full items-center justify-between gap-3"><span style={{ color: 'var(--ink-soft)' }}>{r.k}</span><span className="text-right font-semibold" style={{ fontVariantNumeric: 'tabular-nums' }}>{r.v}</span></Link></li>)}</ul>
    </section>
  )
}
