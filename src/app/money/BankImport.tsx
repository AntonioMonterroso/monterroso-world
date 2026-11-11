import { FileUp } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import Sheet from '../../components/Sheet'
import type { Account } from '../../lib/accounts'
import { categoryFor, type Learned } from '../../lib/anotar'
import { isDuplicate, parseBankCsv, type BankRow } from '../../lib/bankCsv'
import type { Tx } from '../../lib/finance'
import { money } from '../../lib/projects'
import { getSettings } from '../../lib/settings'
import { supabase } from '../../lib/supabase'

type Pick_ = BankRow & { on: boolean; dup: boolean; category: string }

/** Importar el estado de cuenta (CSV): lees lo que entendió, quitas lo repetido y guardas solo lo que marques. */
export default function BankImport({ open, onClose, accounts, existing, onDone }: { open: boolean; onClose: () => void; accounts: Account[]; existing: Tx[]; onDone: (msg: string) => void }) {
  const [text, setText] = useState('')
  const [acct, setAcct] = useState('')
  const [rows, setRows] = useState<Pick_[] | null>(null)
  const [skipped, setSkipped] = useState(0)
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const [learned, setLearned] = useState<Learned>({})
  useEffect(() => { if (open) { setText(''); setRows(null); setErr(''); setBusy(false); setAcct(accounts[0]?.id ?? ''); void getSettings().then((s) => setLearned(((s as { anotarWords?: Learned }).anotarWords) ?? {})) } }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  const read = (t: string) => {
    setText(t)
    const p = parseBankCsv(t)
    if (!p.columns) { setRows(null); setErr('No encontré las columnas de fecha y monto. Revisa que sea el CSV que descarga tu banco.'); return }
    setErr(''); setSkipped(p.skipped)
    const inAcct = existing.filter((x) => !acct || x.account_id === acct || !x.account_id)
    setRows(p.rows.map((r) => { const dup = isDuplicate(r, inAcct); return { ...r, dup, on: !dup, category: r.kind === 'expense' ? categoryFor(r.desc, learned) : 'Otros' } }))
  }
  const file = async (f: File | undefined) => { if (f) read(await f.text()) }
  const chosen = useMemo(() => (rows ?? []).filter((r) => r.on), [rows])
  const totals = useMemo(() => chosen.reduce((a, r) => ({ inc: a.inc + (r.kind === 'income' ? r.amount : 0), out: a.out + (r.kind === 'expense' ? r.amount : 0) }), { inc: 0, out: 0 }), [chosen])

  const save = async () => {
    if (!chosen.length || busy) return
    setBusy(true)
    const payload = chosen.map((r) => ({ kind: r.kind, amount: r.amount, currency: 'GTQ', category: r.category, area: 'personal', tx_date: r.date, note: r.desc, account_id: acct || null }))
    const { error } = await supabase.from('fin_transactions').insert(payload)
    setBusy(false)
    if (error) return setErr('No se pudo importar. Intenta otra vez.')
    onDone(`Importé ${chosen.length} ${chosen.length === 1 ? 'movimiento' : 'movimientos'} del banco.`)
    onClose()
  }

  return (
    <Sheet open={open} title="Importar estado de cuenta" onClose={onClose}>
      <div className="grid gap-4">
        {!rows ? (
          <>
            <p className="text-sm" style={{ color: 'var(--ink-soft)' }}>Descarga el estado de cuenta en CSV desde la banca en línea y súbelo aquí. Antes de guardar, ves todo y quitas lo que ya tenías anotado.</p>
            <label className="btn btn-sec w-fit cursor-pointer"><FileUp size={16} aria-hidden /> Elegir archivo CSV<input type="file" accept=".csv,text/csv,text/plain" className="sr-only" onChange={(e) => void file(e.target.files?.[0])} /></label>
            <details><summary className="min-h-11 cursor-pointer text-sm">O pegar el texto</summary><textarea className="field mt-2 min-h-32 font-mono text-xs" value={text} onChange={(e) => read(e.target.value)} placeholder="Fecha;Descripción;Débito;Crédito" /></details>
          </>
        ) : (
          <>
            {accounts.length > 0 && <label className="grid gap-2 text-sm">¿De qué cuenta es?<select className="field" value={acct} onChange={(e) => setAcct(e.target.value)}>{accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}<option value="">Sin cuenta</option></select></label>}
            <p className="text-sm">Encontré <strong>{rows.length}</strong> movimientos{(() => { const n = rows.filter((r) => r.dup).length; return n ? `; ${n} ${n === 1 ? 'parece repetido y no va marcado' : 'parecen repetidos y no van marcados'}` : '' })()}{skipped ? ` · ${skipped} filas sin fecha o monto se saltaron` : ''}.</p>
            <ul className="grid max-h-[45vh] gap-1 overflow-auto">
              {rows.map((r, i) => (
                <li key={i} className="flex items-center gap-3 rounded-xl px-2 py-1" style={{ background: r.dup ? 'var(--aviso-suave)' : undefined }}>
                  <input type="checkbox" className="size-5 shrink-0" checked={r.on} onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, on: e.target.checked } : x)))} aria-label={`Importar ${r.desc}`} />
                  <span className="min-w-0 flex-1"><span className="block truncate text-sm">{r.desc}</span><span className="block text-xs" style={{ color: 'var(--ink-soft)' }}>{r.date}{r.kind === 'expense' ? ` · ${r.category}` : ''}{r.dup ? ' · ya estaba' : ''}</span></span>
                  <span className="shrink-0 text-sm font-semibold" style={{ fontVariantNumeric: 'tabular-nums', color: r.kind === 'income' ? 'var(--pos)' : undefined }}>{r.kind === 'income' ? '+' : '−'}{money(r.amount)}</span>
                </li>
              ))}
            </ul>
            <p className="text-sm" style={{ color: 'var(--ink-soft)' }}>Marcados: entra {money(totals.inc)} · sale {money(totals.out)}. Puedes cambiar la categoría después en Movimientos.</p>
            <div className="flex flex-wrap gap-2"><button className="btn btn-primary" disabled={!chosen.length || busy} onClick={() => void save()}>{busy ? 'Importando…' : `Importar ${chosen.length}`}</button><button className="btn btn-ghost" onClick={() => setRows(null)}>Otro archivo</button></div>
          </>
        )}
        {err && <p role="alert" className="text-sm" style={{ color: 'var(--aviso-texto)' }}>{err}</p>}
      </div>
    </Sheet>
  )
}
