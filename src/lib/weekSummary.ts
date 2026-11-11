/** Resumen de la semana que cierra (lunes a domingo): lo cobrado, lo gastado, hábitos y práctica.
 *  Se muestra el domingo y el lunes; nunca regaña, solo cuenta lo que pasó. */
export type WeekSummary = { from: string; to: string; collected: number; spent: number; topSpend: { category: string; total: number } | null; habitChecks: number; practiceMin: number; practiceDays: number }

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

/** Lunes y domingo de la semana a resumir: el domingo es la que termina hoy; el lunes, la que terminó ayer. */
export function weekRange(now: Date): { from: string; to: string } | null {
  const dow = now.getDay() // 0 domingo
  if (dow !== 0 && dow !== 1) return null
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (dow === 1 ? 1 : 0))
  const start = new Date(end.getFullYear(), end.getMonth(), end.getDate() - 6)
  return { from: iso(start), to: iso(end) }
}

export function weekSummary(
  range: { from: string; to: string },
  data: {
    payments: { amount: number; paid_at: string | null }[]
    txs: { kind: string; amount: number; category: string; tx_date: string; currency?: string }[]
    habitLogs: { day: string }[]
    practice: { minutes: number; practiced_on: string }[]
  },
): WeekSummary {
  const inR = (d: string | null | undefined) => !!d && d.slice(0, 10) >= range.from && d.slice(0, 10) <= range.to
  const r2 = (n: number) => Math.round(n * 100) / 100
  const collected = r2(data.payments.filter((p) => inR(p.paid_at)).reduce((s, p) => s + Number(p.amount), 0))
  const exp = data.txs.filter((t) => t.kind === 'expense' && (t.currency ?? 'GTQ') === 'GTQ' && inR(t.tx_date))
  const spent = r2(exp.reduce((s, t) => s + Number(t.amount), 0))
  const byCat = new Map<string, number>()
  for (const t of exp) byCat.set(t.category, (byCat.get(t.category) ?? 0) + Number(t.amount))
  const top = [...byCat.entries()].sort((a, b) => b[1] - a[1])[0]
  const prac = data.practice.filter((p) => inR(p.practiced_on))
  return {
    ...range, collected, spent,
    topSpend: top ? { category: top[0], total: r2(top[1]) } : null,
    habitChecks: data.habitLogs.filter((l) => inR(l.day)).length,
    practiceMin: prac.reduce((s, p) => s + Number(p.minutes || 0), 0),
    practiceDays: new Set(prac.map((p) => p.practiced_on)).size,
  }
}
