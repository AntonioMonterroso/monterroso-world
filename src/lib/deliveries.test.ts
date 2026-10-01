import { describe, expect, it } from 'vitest'
import { addDays, daysSince, describeLog, followUpDue, isOpen, isWaiting, nextStep, type Delivery } from './deliveries'

const d = (p: Partial<Delivery>): Delivery => ({ id: '1', title: 'x', recipient: null, kind: 'quote', channel: 'email', status: 'sent', sent_at: null, follow_up_date: null, event_id: null, project_id: null, notes: null, created_at: '', ...p })

describe('deliveries', () => {
  it('detecta el seguimiento vencido solo si sigue esperando', () => {
    expect(followUpDue(d({ follow_up_date: '2026-10-01' }), '2026-10-01')).toBe(true)
    expect(followUpDue(d({ follow_up_date: '2026-10-02' }), '2026-10-01')).toBe(false)
    expect(followUpDue(d({ status: 'replied', follow_up_date: '2026-09-01' }), '2026-10-01')).toBe(false)
    expect(followUpDue(d({ status: 'to_send', follow_up_date: '2026-09-01' }), '2026-10-01')).toBe(false)
  })
  it('clasifica abiertos y esperando', () => {
    expect(isWaiting(d({ status: 'seen' }))).toBe(true)
    expect(isOpen(d({ status: 'to_send' }))).toBe(true)
    expect(isOpen(d({ status: 'paid' }))).toBe(false)
  })
  it('avanza el estado', () => {
    expect(nextStep('to_send')?.to).toBe('sent')
    expect(nextStep('paid')).toBeNull()
  })
  it('suma días y cuenta días', () => {
    expect(addDays('2026-10-30', 3)).toBe('2026-11-02')
    expect(daysSince('2026-09-28T15:00:00Z', '2026-10-01')).toBe(3)
    expect(daysSince(null, '2026-10-01')).toBe(0)
  })
  it('describe el historial de avisos', () => {
    expect(describeLog('alert:0').text).toBe('Aviso a la hora')
    expect(describeLog('alert:1440').text).toBe('Aviso 1 día antes')
    expect(describeLog('alert:180').text).toBe('Aviso 3 h antes')
    expect(describeLog('alert:10').text).toBe('Aviso 10 min antes')
    expect(describeLog('nag').tone).toBe('nag')
    expect(describeLog('snooze').tone).toBe('snooze')
  })
})
