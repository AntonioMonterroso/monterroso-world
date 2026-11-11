import { describe, expect, it } from 'vitest'
import { buildIcs } from './ics'

describe('exportar agenda', () => {
  it('arma un VEVENT con hora local y escapa comas', () => {
    const s = buildIcs([{ uid: 'e1-2026-11-13', title: 'Ensayo, banda', date: '2026-11-13', startMin: 19 * 60, endMin: 21 * 60, location: 'Iglesia; salón' }], new Date('2026-11-11T12:00:00Z'))
    expect(s).toContain('BEGIN:VCALENDAR')
    expect(s).toContain('DTSTART:20261113T190000')
    expect(s).toContain('DTEND:20261113T210000')
    expect(s).toContain('SUMMARY:Ensayo\\, banda')
    expect(s).toContain('LOCATION:Iglesia\; salón')
    expect(s.split('\r\n').filter((l) => l === 'BEGIN:VEVENT')).toHaveLength(1)
  })
  it('sin hora de fin dura una hora', () => { expect(buildIcs([{ uid: 'x', title: 'X', date: '2026-11-13', startMin: 600 }])).toContain('DTEND:20261113T110000') })
})
