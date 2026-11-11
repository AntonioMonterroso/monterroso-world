import { describe, expect, it } from 'vitest'
import { isDuplicate, parseAmount, parseBankCsv, parseDate } from './bankCsv'

describe('bankCsv', () => {
  it('lee montos de varias formas', () => {
    expect(parseAmount('1,234.50')).toBe(1234.5)
    expect(parseAmount('Q 1.234,50')).toBe(1234.5)
    expect(parseAmount('(45.00)')).toBe(-45)
    expect(parseAmount('-45')).toBe(-45)
    expect(parseAmount('')).toBeNull()
  })
  it('lee fechas día/mes', () => {
    expect(parseDate('15/10/2026')).toBe('2026-10-15')
    expect(parseDate('2026-10-05')).toBe('2026-10-05')
    expect(parseDate('5-1-26')).toBe('2026-01-05')
    expect(parseDate('xx')).toBeNull()
  })
  it('con débito y crédito', () => {
    const p = parseBankCsv('Banco X\nCuenta 123\nFecha;Descripción;Débito;Crédito;Saldo\n01/10/2026;Super La Torre;"1,250.00";;5000\n02/10/2026;Depósito cliente;;1500.00;6500\n;;;;\n')
    expect(p.rows).toEqual([
      { date: '2026-10-01', desc: 'Super La Torre', amount: 1250, kind: 'expense' },
      { date: '2026-10-02', desc: 'Depósito cliente', amount: 1500, kind: 'income' },
    ])
    expect(p.skipped).toBe(1)
  })
  it('con una sola columna de monto', () => {
    const p = parseBankCsv('date,description,amount\n2026-10-03,Netflix,-75.5\n2026-10-04,Pago,300')
    expect(p.rows.map((r) => [r.kind, r.amount])).toEqual([['expense', 75.5], ['income', 300]])
  })
  it('detecta lo que ya estaba', () => {
    expect(isDuplicate({ date: '2026-10-03', desc: '', amount: 75.5, kind: 'expense' }, [{ kind: 'expense', amount: 75.5, tx_date: '2026-10-01' }])).toBe(true)
    expect(isDuplicate({ date: '2026-10-10', desc: '', amount: 75.5, kind: 'expense' }, [{ kind: 'expense', amount: 75.5, tx_date: '2026-10-01' }])).toBe(false)
  })
})
