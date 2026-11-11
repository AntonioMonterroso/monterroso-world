/** Estado de cuenta del banco en CSV (BI, Banrural, BAM, G&T… cada uno exporta distinto):
 *  detecta las columnas de fecha, descripción y monto (o débito/crédito) y arma movimientos para revisar antes de guardar. */
export type BankRow = { date: string; desc: string; amount: number; kind: 'income' | 'expense' }

/** Separa una línea CSV respetando comillas. */
export function splitCsv(line: string, sep: string): string[] {
  const out: string[] = []
  let cur = '', q = false
  for (let i = 0; i < line.length; i++) {
    const c = line[i]
    if (c === '"') { if (q && line[i + 1] === '"') { cur += '"'; i++ } else q = !q }
    else if (c === sep && !q) { out.push(cur.trim()); cur = '' }
    else cur += c
  }
  out.push(cur.trim())
  return out
}

const n = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()

/** «1,234.50», «-45.00», «Q 1.234,50», «(45.00)» → número. */
export function parseAmount(raw: string): number | null {
  let s = raw.replace(/[Qq$\s]|GTQ/g, '')
  if (!s) return null
  let neg = false
  if (/^\(.*\)$/.test(s)) { neg = true; s = s.slice(1, -1) }
  if (s.startsWith('-')) { neg = true; s = s.slice(1) }
  if (s.endsWith('-')) { neg = true; s = s.slice(0, -1) }
  const lastComma = s.lastIndexOf(','), lastDot = s.lastIndexOf('.')
  if (lastComma > lastDot && s.length - lastComma <= 3) s = s.replace(/\./g, '').replace(',', '.')
  else s = s.replace(/,/g, '')
  const v = Number(s)
  return Number.isFinite(v) ? (neg ? -v : v) : null
}

/** «15/10/2026», «2026-10-15», «15-10-26» → ISO. Los bancos de Guatemala usan día/mes. */
export function parseDate(raw: string): string | null {
  const s = raw.trim()
  let m = /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/.exec(s)
  if (m) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`
  m = /^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})/.exec(s)
  if (m) { const y = m[3].length === 2 ? `20${m[3]}` : m[3]; const mo = Number(m[2]), d = Number(m[1]); if (mo < 1 || mo > 12 || d < 1 || d > 31) return null; return `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}` }
  return null
}

export type Parsed = { rows: BankRow[]; skipped: number; columns: { date: number; desc: number; amount?: number; debit?: number; credit?: number } | null }

export function parseBankCsv(text: string): Parsed {
  const lines = text.replace(/\r\n?/g, '\n').split('\n').filter((l) => l.trim())
  if (!lines.length) return { rows: [], skipped: 0, columns: null }
  const sep = [';', ',', '\t'].map((c) => ({ c, k: (lines.slice(0, 10).join('\n').match(new RegExp(c === '\t' ? '\t' : `\\${c}`, 'g')) ?? []).length })).sort((a, b) => b.k - a.k)[0].c
  // La fila de encabezados: la primera que nombra una fecha
  const hi = lines.findIndex((l) => /fecha|date/i.test(l))
  if (hi < 0) return { rows: [], skipped: lines.length, columns: null }
  const head = splitCsv(lines[hi], sep).map(n)
  const find = (re: RegExp) => head.findIndex((h) => re.test(h))
  const date = find(/^fecha|date/)
  const desc = find(/descrip|concepto|detalle|referencia|movimiento|transacci/)
  const debit = find(/debito|cargo|retiro|egreso|salida/)
  const credit = find(/credito|abono|deposito|ingreso|entrada/)
  const amount = find(/^monto|importe|valor|amount/)
  if (date < 0 || (amount < 0 && debit < 0 && credit < 0)) return { rows: [], skipped: lines.length - hi - 1, columns: null }
  const rows: BankRow[] = []
  let skipped = 0
  for (const l of lines.slice(hi + 1)) {
    const c = splitCsv(l, sep)
    const d = parseDate(c[date] ?? '')
    let v: number | null = null
    if (debit >= 0 || credit >= 0) {
      const dv = debit >= 0 ? parseAmount(c[debit] ?? '') : null, cv = credit >= 0 ? parseAmount(c[credit] ?? '') : null
      if (cv && Math.abs(cv) > 0) v = Math.abs(cv)
      else if (dv && Math.abs(dv) > 0) v = -Math.abs(dv)
    } else v = parseAmount(c[amount] ?? '')
    if (!d || v === null || v === 0) { skipped++; continue }
    rows.push({ date: d, desc: (desc >= 0 ? c[desc] : '')?.slice(0, 200) || 'Movimiento del banco', amount: Math.round(Math.abs(v) * 100) / 100, kind: v > 0 ? 'income' : 'expense' })
  }
  return { rows, skipped, columns: { date, desc, ...(amount >= 0 && debit < 0 && credit < 0 ? { amount } : {}), ...(debit >= 0 ? { debit } : {}), ...(credit >= 0 ? { credit } : {}) } }
}

/** ¿Ya lo tenías anotado? Mismo tipo y monto, con fecha a 3 días o menos. */
export function isDuplicate(r: BankRow, existing: { kind: string; amount: number; tx_date: string }[]): boolean {
  const t = new Date(`${r.date}T12:00:00`).getTime()
  return existing.some((x) => x.kind === r.kind && Math.abs(Number(x.amount) - r.amount) < 0.005 && Math.abs(new Date(`${x.tx_date}T12:00:00`).getTime() - t) <= 3 * 86_400_000)
}
