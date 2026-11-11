/** Exportar tu agenda a un archivo .ics para verla en el calendario del teléfono (solo lectura, una foto de los próximos días). */
export type IcsItem = { uid: string; title: string; date: string; startMin: number; endMin?: number | null; location?: string | null; notes?: string | null }

const esc = (s: string) => s.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\;')
const stamp = (date: string, min: number) => `${date.replace(/-/g, '')}T${String(Math.floor(min / 60)).padStart(2, '0')}${String(min % 60).padStart(2, '0')}00`

export function buildIcs(items: IcsItem[], now = new Date()): string {
  const dt = now.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
  const out = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Monterroso World//Agenda//ES', 'CALSCALE:GREGORIAN', 'X-WR-CALNAME:Monterroso World']
  for (const it of items) {
    const end = it.endMin && it.endMin > it.startMin ? it.endMin : it.startMin + 60
    out.push('BEGIN:VEVENT', `UID:${it.uid}@monterroso-world`, `DTSTAMP:${dt}`, `DTSTART:${stamp(it.date, it.startMin)}`, `DTEND:${stamp(it.date, Math.min(end, 1439))}`, `SUMMARY:${esc(it.title)}`)
    if (it.location) out.push(`LOCATION:${esc(it.location)}`)
    if (it.notes) out.push(`DESCRIPTION:${esc(it.notes)}`)
    out.push('END:VEVENT')
  }
  out.push('END:VCALENDAR')
  return out.join('\r\n') + '\r\n'
}

export function downloadIcs(items: IcsItem[]) {
  const blob = new Blob([buildIcs(items)], { type: 'text/calendar' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob); a.download = 'monterroso-world-agenda.ics'; a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 4000)
}
