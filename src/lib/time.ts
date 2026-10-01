export const DAYS = [
  { n: 1, short: 'L', long: 'Lunes' },
  { n: 2, short: 'M', long: 'Martes' },
  { n: 3, short: 'X', long: 'Miércoles' },
  { n: 4, short: 'J', long: 'Jueves' },
  { n: 5, short: 'V', long: 'Viernes' },
  { n: 6, short: 'S', long: 'Sábado' },
  { n: 0, short: 'D', long: 'Domingo' },
]

export const fmtMin = (m: number) => `${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
export const toMin = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + (m || 0)
}
export const nowMin = (d = new Date()) => d.getHours() * 60 + d.getMinutes()

/** Fecha local en formato YYYY-MM-DD (no UTC). */
export const localISO = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
