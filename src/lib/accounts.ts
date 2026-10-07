import type { Tx } from './finance'

export type AccountKind = 'cash' | 'bank' | 'card' | 'wallet'
export type Account = { id: string; name: string; kind: AccountKind; bank: string | null; last4: string | null; vault_item_id?: string | null; opening_balance: number; credit_limit: number | null; color: string; position: number; archived: boolean }
export type Transfer = { id: string; from_id: string; to_id: string; amount: number; fee: number; tx_date: string; note: string | null }

export const KIND_LABEL: Record<AccountKind, string> = { cash: 'Efectivo', bank: 'Cuenta de banco', card: 'Tarjeta de crédito', wallet: 'Billetera digital' }
export const GT_BANKS = ['BAC Credomatic', 'Banco Industrial', 'Banrural', 'G&T Continental', 'Banco Promerica', 'BAM', 'Banco Azteca', 'Ficohsa', 'Inmobiliario', 'Citi', 'Otro']

const r2 = (n: number) => Math.round(n * 100) / 100

export type LoanLite = { id: string; direction: 'lent' | 'borrowed'; amount: number; account_id?: string | null }
export type PayLite = { loan_id: string; amount: number; account_id?: string | null }
export type GoalMove = { account_id: string; amount: number }
type TxLite = Pick<Tx, 'kind' | 'amount'> & { account_id?: string | null }
export type Links = { loans?: LoanLite[]; payments?: PayLite[]; goalMoves?: GoalMove[] }

/** Saldo actual: inicial + ingresos − gastos ± transferencias (y comisiones)
 *  − lo que prestaste + lo que te prestaron, ± los pagos de esos préstamos, − lo apartado para metas.
 *  Una tarjeta suma gastos como deuda (saldo negativo). */
export function balanceOf(a: Pick<Account, 'id' | 'opening_balance'>, txs: TxLite[], transfers: Transfer[], links: Links = {}): number {
  let b = Number(a.opening_balance)
  for (const t of txs) if (t.account_id === a.id) b += t.kind === 'income' ? Number(t.amount) : -Number(t.amount)
  for (const x of transfers) { if (x.to_id === a.id) b += Number(x.amount); if (x.from_id === a.id) b -= Number(x.amount) + Number(x.fee) }
  const dir = new Map((links.loans ?? []).map((l) => [l.id, l.direction]))
  for (const l of links.loans ?? []) if (l.account_id === a.id) b += l.direction === 'lent' ? -Number(l.amount) : Number(l.amount)
  for (const p of links.payments ?? []) if (p.account_id === a.id) b += dir.get(p.loan_id) === 'lent' ? Number(p.amount) : -Number(p.amount)
  for (const g of links.goalMoves ?? []) if (g.account_id === a.id) b -= Number(g.amount)
  return r2(b)
}

export type Totals = { cash: number; banks: number; wallets: number; cards: number; available: number }
/** Dinero disponible: efectivo + bancos + billeteras. Las tarjetas se muestran aparte como deuda. */
export function totals(accounts: Account[], balances: Record<string, number>): Totals {
  const t: Totals = { cash: 0, banks: 0, wallets: 0, cards: 0, available: 0 }
  for (const a of accounts) {
    if (a.archived) continue
    const b = balances[a.id] ?? 0
    if (a.kind === 'cash') t.cash += b; else if (a.kind === 'bank') t.banks += b; else if (a.kind === 'wallet') t.wallets += b; else t.cards += b
  }
  t.available = t.cash + t.banks + t.wallets
  return { cash: r2(t.cash), banks: r2(t.banks), wallets: r2(t.wallets), cards: r2(t.cards), available: r2(t.available) }
}

/** Crédito disponible de una tarjeta: límite − deuda. */
export const creditLeft = (a: Pick<Account, 'credit_limit'>, balance: number): number | null => (a.credit_limit == null ? null : r2(a.credit_limit + Math.min(0, balance)))

export type Reconcile = { diff: number; kind: 'income' | 'expense' | null }
/** Conciliar: el saldo real del banco contra el que lleva la app. La diferencia se registra como un ajuste. */
export function reconcile(current: number, real: number): Reconcile {
  const diff = r2(real - current)
  return { diff: Math.abs(diff), kind: diff === 0 ? null : diff > 0 ? 'income' : 'expense' }
}

/** Los últimos 4 dígitos sí se ven en la lista; el número completo vive cifrado en la Bóveda. */
export const last4Of = (a: Pick<Account, 'last4'>): string | null => a.last4 || null

export const ACCOUNT_SEEDS: { name: string; kind: AccountKind }[] = [{ name: 'Efectivo', kind: 'cash' }]
