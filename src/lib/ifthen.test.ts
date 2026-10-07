import { describe, expect, it } from 'vitest'
import { describe as say, dueRules, type Rule } from './ifthen'

const r = (o: Partial<Rule>): Rule => ({ id: Math.random().toString(), trigger_kind: 'time', time_min: null, block_kind: null, action: 'x', event_id: null, active: true, last_done: null, ...o })
const ctx = (nowMin: number, blocks: { kind: string; title: string; start_min: number; end_min: number }[] = [], today = '2026-10-07') => ({ nowMin, hour: Math.floor(nowMin / 60), today, blocks })

describe('si… entonces…', () => {
  it('por hora: visible 90 minutos desde la hora', () => {
    const rule = r({ trigger_kind: 'time', time_min: 12 * 60 })
    expect(dueRules([rule], ctx(11 * 60 + 59))).toHaveLength(0)
    expect(dueRules([rule], ctx(12 * 60))).toHaveLength(1)
    expect(dueRules([rule], ctx(13 * 60 + 29))).toHaveLength(1)
    expect(dueRules([rule], ctx(13 * 60 + 30))).toHaveLength(0)
  })
  it('mañana y noche', () => {
    expect(dueRules([r({ trigger_kind: 'open_morning' })], ctx(8 * 60))).toHaveLength(1)
    expect(dueRules([r({ trigger_kind: 'open_morning' })], ctx(15 * 60))).toHaveLength(0)
    expect(dueRules([r({ trigger_kind: 'open_night' })], ctx(21 * 60))).toHaveLength(1)
    expect(dueRules([r({ trigger_kind: 'open_night' })], ctx(18 * 60))).toHaveLength(0)
  })
  it('al empezar o terminar un bloque del tipo elegido', () => {
    const blocks = [{ kind: 'work', title: 'Trabajo', start_min: 8 * 60, end_min: 17 * 60 }]
    expect(dueRules([r({ trigger_kind: 'block_start', block_kind: 'work' })], ctx(8 * 60 + 10, blocks))).toHaveLength(1)
    expect(dueRules([r({ trigger_kind: 'block_start', block_kind: 'work' })], ctx(9 * 60, blocks))).toHaveLength(0)
    expect(dueRules([r({ trigger_kind: 'block_end', block_kind: 'work' })], ctx(17 * 60 + 5, blocks))).toHaveLength(1)
    expect(dueRules([r({ trigger_kind: 'block_end', block_kind: 'rehearsal' })], ctx(17 * 60 + 5, blocks))).toHaveLength(0)
    expect(dueRules([r({ trigger_kind: 'block_end', block_kind: 'other' })], ctx(17 * 60 + 5, blocks))).toHaveLength(1)
  })
  it('no aparece si ya la hiciste hoy o está apagada', () => {
    expect(dueRules([r({ trigger_kind: 'open_morning', last_done: '2026-10-07' })], ctx(8 * 60))).toHaveLength(0)
    expect(dueRules([r({ trigger_kind: 'open_morning', last_done: '2026-10-06' })], ctx(8 * 60))).toHaveLength(1)
    expect(dueRules([r({ trigger_kind: 'open_morning', active: false })], ctx(8 * 60))).toHaveLength(0)
  })
  it('se lee como una frase', () => {
    expect(say({ trigger_kind: 'time', time_min: 7 * 60 + 30, block_kind: null })).toBe('Si son las 07:30')
    expect(say({ trigger_kind: 'block_end', time_min: null, block_kind: 'work' })).toBe('Si termina un bloque de trabajo')
  })
})
