/** Presupuesto por quincena: del 1 al 15 y del 16 al último día. El límite del mes se parte a la mitad. */
export type Quincena = { n: 1 | 2; from: string; to: string; label: string }

export function quincenaOf(iso: string): Quincena {
  const [y, m, d] = iso.split('-').map(Number)
  const last = new Date(y, m, 0).getDate()
  const mm = `${y}-${String(m).padStart(2, '0')}`
  return d <= 15
    ? { n: 1, from: `${mm}-01`, to: `${mm}-15`, label: 'Primera quincena (1 al 15)' }
    : { n: 2, from: `${mm}-16`, to: `${mm}-${String(last).padStart(2, '0')}`, label: `Segunda quincena (16 al ${last})` }
}

export type QStatus = { category: string; limit: number; spent: number; pct: number; state: 'ok' | 'warn' | 'over' }

export function quincenaStatus(budgets: { category: string; limit_amount: number; currency: string }[], txs: { kind: string; category: string; amount: number; tx_date: string; currency: string }[], q: Quincena): QStatus[] {
  return budgets.map((b) => {
    const limit = Math.round((Number(b.limit_amount) / 2) * 100) / 100
    const spent = Math.round(txs.filter((t) => t.kind === 'expense' && t.category === b.category && t.currency === b.currency && t.tx_date >= q.from && t.tx_date <= q.to).reduce((s, t) => s + Number(t.amount), 0) * 100) / 100
    const pct = limit > 0 ? Math.round((spent / limit) * 100) : 0
    return { category: b.category, limit, spent, pct, state: pct >= 100 ? 'over' : pct >= 80 ? 'warn' : 'ok' }
  })
}
