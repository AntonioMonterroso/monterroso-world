import { describe, expect, it } from 'vitest'
import { parseMonthQuery } from './searchDates'

describe('parseMonthQuery', () => {
  const today = '2026-11-11'
  it('entiende el mes por nombre', () => expect(parseMonthQuery('pagos de octubre', today)).toMatchObject({ what: 'pagos', month: '2026-10', label: 'Pagos de octubre' }))
  it('un mes que aún no llega es del año pasado', () => expect(parseMonthQuery('gastos de diciembre', today)?.month).toBe('2025-12'))
  it('con año y con resto', () => expect(parseMonthQuery('Cobros de marzo 2025 imperio', today)).toMatchObject({ what: 'pagos', month: '2025-03', rest: 'imperio' }))
  it('este mes y mes pasado', () => { expect(parseMonthQuery('eventos de este mes', today)?.month).toBe('2026-11'); expect(parseMonthQuery('ingresos del mes pasado', today)?.month).toBe('2026-10') })
  it('ignora lo demás', () => { expect(parseMonthQuery('pagos', today)).toBeNull(); expect(parseMonthQuery('canción de octubre', today)).toBeNull() })
})
