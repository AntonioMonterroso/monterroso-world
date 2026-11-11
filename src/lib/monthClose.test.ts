import { describe, expect, it } from 'vitest'
import { buildClose, cleanCloses, closeNote } from './monthClose'

describe('cierre del mes', () => {
  const c = buildClose({ month: '2026-10', income: 5000.456, expense: 3200, saved: 500, pending: 250, clients: 4, paidClients: 3, now: new Date(2026, 10, 1) })
  it('calcula lo que sobró y guarda la fecha', () => { expect(c).toMatchObject({ income: 5000.46, left: 1800.46, saved: 500, closedAt: '2026-11-01', paidClients: 3 }) })
  it('la frase es amable en los tres casos', () => {
    expect(closeNote(c)).toMatch(/Buen cierre/)
    expect(closeNote({ ...c, left: 0 })).toMatch(/cero/)
    expect(closeNote({ ...c, left: -10 })).not.toMatch(/mal|fall/i)
    expect(closeNote(buildClose({ month: '2026-09', income: 0, expense: 0, saved: 0, pending: 0, clients: 0, paidClients: 0 }))).toMatch(/sin movimientos/i)
  })
  it('lee ajustes dañados como vacío', () => { expect(cleanCloses(null)).toEqual({}); expect(cleanCloses({ malo: 1, '2026-10': c })['2026-10']).toBeDefined() })
})
