import { describe, expect, it } from 'vitest'
import { cleanAll, digits, reminderText, waNumber } from './clientNotes'

describe('notas de cliente', () => {
  it('el número de Guatemala lleva 502', () => { expect(waNumber('3764 5139')).toBe('50237645139'); expect(waNumber('+502 3764-5139')).toBe('50237645139'); expect(digits('(1) 2-3')).toBe('123') })
  it('lee ajustes dañados como vacío', () => { expect(cleanAll(null)).toEqual({}); expect(cleanAll({ a: { phone: 5, log: 'x' } })).toEqual({ a: { phone: undefined, log: [] } }) })
})

describe('recordatorio de cobro', () => {
  it('es amable y lleva el concepto y el monto', () => { expect(reminderText({ name: 'Imperio', concept: 'la mensualidad de octubre', amount: 'Q 250.00' })).toBe('Hola Imperio, ¿cómo estás? Te recuerdo el pago de la mensualidad de octubre por Q 250.00. Cuando lo hagas, me avisas por aquí. ¡Gracias!') })
})
