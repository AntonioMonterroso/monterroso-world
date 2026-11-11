import { norm } from './searchIndex'

/** «pagos de octubre», «gastos de septiembre 2026», «eventos de diciembre»: qué y de qué mes. */
export type MonthQuery = { what: 'pagos' | 'gastos' | 'ingresos' | 'movimientos' | 'eventos'; month: string; label: string; rest: string }

const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
const WHAT: Record<string, MonthQuery['what']> = { pago: 'pagos', pagos: 'pagos', cobro: 'pagos', cobros: 'pagos', gasto: 'gastos', gastos: 'gastos', ingreso: 'ingresos', ingresos: 'ingresos', movimiento: 'movimientos', movimientos: 'movimientos', evento: 'eventos', eventos: 'eventos' }

export function parseMonthQuery(q: string, today: string): MonthQuery | null {
  const t = norm(q).replace(/setiembre/g, 'septiembre').trim()
  const m = /^(pagos?|cobros?|gastos?|ingresos?|movimientos?|eventos?)\s+(?:de|del|en)\s+(?:(este|el)\s+mes|mes\s+pasado|([a-z]+))(?:\s+(?:de\s+)?(\d{4}))?(?:\s+(.*))?$/.exec(t)
  if (!m) return null
  const what = WHAT[m[1]]
  const [ty, tm] = today.split('-').map(Number)
  let y = ty, mo: number
  if (m[2]) mo = tm
  else if (/mes\s+pasado/.test(t) && !m[3]) { mo = tm - 1; if (mo === 0) { mo = 12; y -= 1 } }
  else {
    const i = MONTHS.indexOf(m[3] ?? '')
    if (i < 0) return null
    mo = i + 1
    // Sin año: el último mes con ese nombre que ya pasó o es el actual
    if (!m[4] && mo > tm) y -= 1
  }
  if (m[4]) y = Number(m[4])
  const month = `${y}-${String(mo).padStart(2, '0')}`
  return { what, month, label: `${what.charAt(0).toUpperCase()}${what.slice(1)} de ${MONTHS[mo - 1]}${y !== ty ? ` ${y}` : ''}`, rest: (m[5] ?? '').trim() }
}
