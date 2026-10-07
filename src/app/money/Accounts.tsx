import { ArrowRightLeft, Banknote, Building2, CreditCard, Loader2, Plus, Scale, Smartphone, Trash2, type LucideIcon } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import Sheet from '../../components/Sheet'
import { Group, PageHeader, Row, Stat } from '../../components/ui'
import { ACCOUNT_SEEDS, GT_BANKS, KIND_LABEL, creditLeft, last4Of, reconcile, type Account, type AccountKind } from '../../lib/accounts'
import { money } from '../../lib/projects'
import { supabase } from '../../lib/supabase'
import { useBalances } from '../../lib/balances'
import { decryptItem, encryptItem } from '../../lib/vault'
import { copySecret, useVaultKey } from '../../lib/vaultSession'
import { AREA_COLORS } from '../../lib/taxonomy'
import { localISO } from '../../lib/time'
import { Empty, ErrorBar, toNum } from './shared'

const ICON: Record<AccountKind, LucideIcon> = { cash: Banknote, bank: Building2, card: CreditCard, wallet: Smartphone }
type AForm = { id?: string; number: string; vaultId?: string; numberLoaded?: boolean; name: string; kind: AccountKind; bank: string; last4: string; opening: string; limit: string; color: string }
const blankA = (kind: AccountKind = 'bank'): AForm => ({ number: '', name: kind === 'cash' ? 'Efectivo' : '', kind, bank: '', last4: '', opening: '', limit: '', color: kind === 'cash' ? '#98d6a3' : 'var(--teal)' })

/** Cuentas: tu dinero en efectivo y en bancos, tarjetas y billeteras, con transferencias y conciliación. */
export default function Accounts() {
  const { accounts, txs, transfers, balances: bal, totals: tot, inGoals } = useBalances()
  const dk = useVaultKey()
  const [form, setForm] = useState<AForm | null>(null)
  const [moving, setMoving] = useState<{ from: string; to: string; amount: string; fee: string; date: string; note: string } | null>(null)
  const [rec, setRec] = useState<{ acc: Account; real: string } | null>(null)
  const [confirm, setConfirm] = useState(false)
  const [err, setErr] = useState('')
  const [msg, setMsg] = useState('')

  const active = useMemo(() => accounts.rows.filter((a) => !a.archived), [accounts.rows])
  const unassigned = useMemo(() => txs.rows.filter((t) => !t.account_id).length, [txs.rows])
  // Al abrir una cuenta con número guardado, se descifra de la Bóveda (si está desbloqueada)
  const formId = form?.id, formVault = form?.vaultId
  useEffect(() => {
    if (!formId || !formVault || !dk) return
    let live = true
    ;(async () => {
      const { data } = await supabase.from('vault_items').select('ciphertext,iv').eq('id', formVault).maybeSingle()
      if (!data || !live) return
      try {
        const p = await decryptItem(dk, formVault, data as { ciphertext: string; iv: string })
        const n = p.fields.find((f) => f.label === 'Número de cuenta')?.value ?? ''
        if (live) setForm((f) => (f && f.id === formId ? { ...f, number: n, numberLoaded: true } : f))
      } catch { if (live) setErr('No pude descifrar el número de cuenta.') }
    })()
    return () => { live = false }
  }, [formId, formVault, dk])

  const note = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 4500) }

  const saveAccount = async () => {
    if (!form) return
    const name = form.name.trim()
    if (!name) return setErr('Ponle un nombre a la cuenta.')
    const opening = form.opening.trim() ? toNum(form.opening) : 0
    if (!Number.isFinite(opening)) return setErr('El saldo no es válido.')
    const limit = form.kind === 'card' && form.limit.trim() ? toNum(form.limit) : null
    if (limit !== null && !(limit >= 0)) return setErr('El límite no es válido.')
    if (form.last4 && !/^\d{4}$/.test(form.last4)) return setErr('Los últimos dígitos deben ser 4 números.')
    const number = form.number.trim()
    if (number && !/^[0-9-]{4,30}$/.test(number)) return setErr('El número de cuenta solo lleva dígitos y guiones (4 a 30).')
    const touched = dk && (!form.vaultId || form.numberLoaded)  // sin la Bóveda abierta no se toca el número guardado
    const v = { name, kind: form.kind, bank: form.bank.trim() || null, last4: form.last4 || (touched && number ? number.replace(/\D/g, '').slice(-4) : '') || null, opening_balance: opening, credit_limit: limit, color: form.color }
    let vault_item_id = form.vaultId ?? null
    if (touched && dk) {
      if (number) {
        const id = vault_item_id ?? crypto.randomUUID()
        const row = await encryptItem(dk, id, { title: `${name} · número de cuenta`, fields: [{ label: 'Banco', value: form.bank.trim(), secret: false }, { label: 'Número de cuenta', value: number, secret: true }] })
        const { error } = await supabase.from('vault_items').upsert({ id, category: 'bank', critical: false, project_id: null, ...row })
        if (error) return setErr('No pude guardar el número en la Bóveda.')
        vault_item_id = id
      } else if (vault_item_id) { await supabase.from('vault_items').delete().eq('id', vault_item_id); vault_item_id = null }
    }
    if (form.id) await accounts.update(form.id, { ...v, vault_item_id })
    else await accounts.add({ ...v, vault_item_id, position: (accounts.rows.at(-1)?.position ?? 0) + 1, archived: false })
    setForm(null); setErr(''); setConfirm(false)
  }

  const doTransfer = async () => {
    if (!moving) return
    const amount = toNum(moving.amount), fee = moving.fee.trim() ? toNum(moving.fee) : 0
    if (!moving.from || !moving.to || moving.from === moving.to) return setErr('Elige dos cuentas distintas.')
    if (!(amount > 0)) return setErr('Escribe un monto mayor a cero.')
    if (!(fee >= 0)) return setErr('La comisión no es válida.')
    const row = await transfers.add({ from_id: moving.from, to_id: moving.to, amount, fee, tx_date: moving.date, note: moving.note.trim() || null })
    if (!row) return
    const to = accounts.rows.find((a) => a.id === moving.to)
    setMoving(null); setErr(''); note(`Listo: ${money(amount)} pasaron a ${to?.name ?? 'la otra cuenta'}${fee ? ` (comisión ${money(fee)})` : ''}.`)
  }

  const doReconcile = async () => {
    if (!rec) return
    const real = toNum(rec.real)
    if (!Number.isFinite(real)) return setErr('Escribe el saldo que muestra tu banco.')
    const r = reconcile(bal[rec.acc.id] ?? 0, real)
    if (r.kind) await txs.add({ kind: r.kind, amount: r.diff, currency: 'GTQ', category: 'Ajuste de saldo', area: 'personal', tx_date: localISO(), note: `Conciliación de ${rec.acc.name}`, account_id: rec.acc.id })
    setRec(null); setErr(''); note(r.kind ? `Saldo ajustado: ${r.kind === 'income' ? '+' : '−'}${money(r.diff)} registrado como “Ajuste de saldo”.` : 'Tu saldo ya coincide con el del banco.')
  }

  const removeAccount = async (a: Account) => {
    const used = txs.rows.some((t) => t.account_id === a.id) || transfers.rows.some((t) => t.from_id === a.id || t.to_id === a.id)
    if (used) await accounts.update(a.id, { archived: true })
    else { await accounts.remove(a.id); if (a.vault_item_id) await supabase.from('vault_items').delete().eq('id', a.vault_item_id) }
    setForm(null); setConfirm(false); note(used ? `${a.name} se archivó (conserva su historial).` : `${a.name} se eliminó.`)
  }

  const seed = async () => { for (const s of ACCOUNT_SEEDS) await accounts.add({ ...blankA(s.kind), name: s.name, bank: null, last4: null, opening_balance: 0, credit_limit: null, color: '#98d6a3', position: 1, archived: false }) }

  if (accounts.loading || txs.loading) return <div className="grid h-48 place-items-center"><Loader2 className="animate-spin" aria-label="Cargando" /></div>

  const openForm = (a?: Account) => { setErr(''); setConfirm(false); setForm(a ? { id: a.id, number: '', vaultId: a.vault_item_id ?? undefined, name: a.name, kind: a.kind, bank: a.bank ?? '', last4: a.last4 ?? '', opening: String(a.opening_balance || ''), limit: a.credit_limit != null ? String(a.credit_limit) : '', color: a.color } : blankA()) }
  const openMove = (from = '') => { setErr(''); setMoving({ from: from || active[0]?.id || '', to: active.find((a) => a.id !== (from || active[0]?.id))?.id ?? '', amount: '', fee: '', date: localISO(), note: '' }) }
  const kinds: AccountKind[] = ['cash', 'bank', 'wallet', 'card']
  const nameOf = (id: string) => accounts.rows.find((a) => a.id === id)?.name ?? 'Cuenta borrada'

  return (
    <div>
      <PageHeader eyebrow="Dinero" title="Cuentas" sub="Cuánto tienes en efectivo y en cada banco. Los movimientos se asignan a una cuenta y el saldo se calcula solo." action={<button className="btn btn-primary" onClick={() => openForm()}><Plus size={18} aria-hidden /> Cuenta</button>} />
      <ErrorBar msg={accounts.error || txs.error || transfers.error} onClose={accounts.clearError} />
      {msg && <p role="status" className="mb-3 text-sm" style={{ color: 'var(--pos)' }}>{msg}</p>}

      {active.length === 0 ? (
        <Empty title="¿Dónde está tu dinero?" text="Crea tu efectivo y tus cuentas de banco. Al registrar un movimiento eliges de cuál sale o entra, y aquí ves el saldo de cada una." action="Crear mi efectivo" onAction={seed} />
      ) : (
        <>
          <div className="stats">
            <Stat label="Disponible" value={money(tot.available)} tone={tot.available < 0 ? 'neg' : 'pos'} note="Efectivo + bancos + billeteras" />
            <Stat label="Efectivo" value={money(tot.cash)} />
            <Stat label="En bancos" value={money(tot.banks + tot.wallets)} />
            {inGoals > 0 && <Stat label="Apartado en metas" value={money(inGoals)} note="Ya no está en tus cuentas" />}
            {tot.cards < 0 && <Stat label="Deuda en tarjetas" value={money(-tot.cards)} tone="neg" />}
          </div>

          {active.length > 1 && <div className="mt-4 flex flex-wrap gap-2"><button className="btn btn-tint" onClick={() => openMove()}><ArrowRightLeft size={16} aria-hidden /> Transferir entre cuentas</button></div>}

          {kinds.map((k) => {
            const list = active.filter((a) => a.kind === k)
            if (!list.length) return null
            return (
              <Group key={k} title={k === 'cash' ? 'Efectivo' : k === 'bank' ? 'Bancos' : k === 'wallet' ? 'Billeteras' : 'Tarjetas de crédito'}>
                {list.map((a) => {
                  const Icon = ICON[a.kind]
                  const b = bal[a.id] ?? 0
                  const left = a.kind === 'card' ? creditLeft(a, b) : null
                  return <Row key={a.id} icon={<Icon size={17} aria-hidden />} tone={a.color} title={a.name}
                    sub={[a.bank, last4Of(a) && `•••• ${last4Of(a)}`, left !== null && `Crédito disponible ${money(left)}`].filter(Boolean).join(' · ') || KIND_LABEL[a.kind]}
                    value={money(b)} valueTone={b < 0 ? 'neg' : undefined} onClick={() => openForm(a)} />
                })}
              </Group>
            )
          })}

          {unassigned > 0 && <p className="group-foot">Tienes {unassigned} {unassigned === 1 ? 'movimiento' : 'movimientos'} sin cuenta. No suman a ningún saldo; edítalos en Movimientos para asignarles una.</p>}

          {transfers.rows.length > 0 && (
            <Group title="Transferencias recientes">
              {transfers.rows.slice(0, 5).map((t) => <Row key={t.id} icon={<ArrowRightLeft size={16} aria-hidden />} tone="var(--sky)" title={`${nameOf(t.from_id)} → ${nameOf(t.to_id)}`} sub={`${t.tx_date}${t.fee ? ` · comisión ${money(t.fee)}` : ''}${t.note ? ` · ${t.note}` : ''}`} value={money(t.amount)} valueTone="soft" chevron={false}
                trailing={<button className="grid size-11 place-items-center rounded-full" style={{ color: 'var(--ink-faint)' }} aria-label="Deshacer transferencia" onClick={() => void transfers.remove(t.id)}><Trash2 size={15} aria-hidden /></button>} />)}
            </Group>
          )}
        </>
      )}

      <Sheet open={Boolean(form)} title={form?.id ? 'Editar cuenta' : 'Nueva cuenta'} onClose={() => setForm(null)}>
        {form && (
          <form className="grid gap-4" onSubmit={(e) => { e.preventDefault(); void saveAccount() }}>
            <fieldset><legend className="mb-2 text-sm">Tipo</legend>
              <div className="flex flex-wrap gap-2">{kinds.map((k) => <button key={k} type="button" aria-pressed={form.kind === k} onClick={() => setForm({ ...form, kind: k, name: form.name || (k === 'cash' ? 'Efectivo' : '') })} className="min-h-11 rounded-full px-4 text-sm" style={{ background: form.kind === k ? 'color-mix(in oklab, var(--accent) 20%, transparent)' : 'var(--surface-2)', color: form.kind === k ? 'var(--accent)' : 'var(--ink-soft)' }}>{k === 'cash' ? 'Efectivo' : k === 'bank' ? 'Banco' : k === 'wallet' ? 'Billetera' : 'Tarjeta'}</button>)}</div>
            </fieldset>
            <label className="grid gap-2 text-sm">Nombre<input autoFocus className="field" value={form.name} maxLength={60} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder={form.kind === 'bank' ? 'Monetaria BAC' : form.kind === 'card' ? 'Visa Industrial' : 'Efectivo'} /></label>
            {(form.kind === 'bank' || form.kind === 'card') && (
              <div className="grid grid-cols-[1fr_6.5rem] gap-3">
                <label className="grid gap-2 text-sm">Banco<input className="field" list="gtbanks" value={form.bank} maxLength={60} onChange={(e) => setForm({ ...form, bank: e.target.value })} /><datalist id="gtbanks">{GT_BANKS.map((b) => <option key={b} value={b} />)}</datalist></label>
                <label className="grid gap-2 text-sm">Últimos 4<input className="field" inputMode="numeric" maxLength={4} value={form.last4} onChange={(e) => setForm({ ...form, last4: e.target.value.replace(/\D/g, '') })} placeholder="1234" /></label>
              </div>
            )}
            {(form.kind === 'bank' || form.kind === 'card' || form.kind === 'wallet') && (
              dk ? (
                <label className="grid gap-2 text-sm">Número de cuenta{form.kind === 'card' ? ' o de tarjeta' : ''} · cifrado en tu Bóveda
                  <div className="flex gap-2">
                    <input className="field" inputMode="numeric" autoComplete="off" value={form.number} maxLength={30} onChange={(e) => setForm({ ...form, number: e.target.value.replace(/[^0-9-]/g, ''), numberLoaded: true })} placeholder={form.vaultId && !form.numberLoaded ? 'Descifrando…' : '0000-000000-0'} />
                    {form.number && <button type="button" className="btn btn-ghost shrink-0" onClick={async () => { if (await copySecret(form.number)) note('Número copiado (se borra del portapapeles en 30 s).') }}>Copiar</button>}
                  </div>
                </label>
              ) : (
                <div className="rounded-xl px-3 py-3 text-sm" style={{ background: 'var(--surface-2)' }}>
                  <p className="font-semibold">Número de cuenta</p>
                  <p className="mt-0.5" style={{ color: 'var(--ink-soft)' }}>{form.vaultId ? 'Está guardado cifrado en tu Bóveda.' : 'Se guarda cifrado en tu Bóveda, no en la base.'} Desbloquéala para {form.vaultId ? 'verlo o cambiarlo' : 'agregarlo'}.</p>
                  <Link to="/app/boveda" className="mt-2 inline-flex min-h-11 items-center underline" style={{ color: 'var(--accent)' }}>Abrir la Bóveda</Link>
                </div>
              )
            )}
            <label className="grid gap-2 text-sm">{form.kind === 'card' ? 'Deuda actual (en negativo, o 0)' : 'Saldo con el que empiezas'}<input className="field" inputMode="decimal" value={form.opening} onChange={(e) => setForm({ ...form, opening: e.target.value })} placeholder="0.00" /></label>
            {form.kind === 'card' && <label className="grid gap-2 text-sm">Límite de crédito<input className="field" inputMode="decimal" value={form.limit} onChange={(e) => setForm({ ...form, limit: e.target.value })} placeholder="0.00" /></label>}
            <fieldset><legend className="mb-2 text-sm">Color</legend>
              <div className="flex flex-wrap gap-3">{AREA_COLORS.map((c) => <button key={c.id} type="button" aria-pressed={form.color === c.id} aria-label={c.label} onClick={() => setForm({ ...form, color: c.id })} className="swatch" style={{ ['--sw' as string]: c.id }} />)}</div>
            </fieldset>
            {err && <p role="alert" className="text-sm" style={{ color: 'var(--neg)' }}>{err}</p>}
            <div className="flex flex-wrap items-center gap-3">
              <button className="btn btn-primary">Guardar</button>
              {form.id && <button type="button" className="btn btn-ghost" onClick={() => { const a = accounts.rows.find((x) => x.id === form.id)!; setForm(null); setRec({ acc: a, real: '' }); setErr('') }}><Scale size={16} aria-hidden /> Conciliar</button>}
              {form.id && <button type="button" className="btn btn-ghost ml-auto" style={{ color: confirm ? 'var(--neg)' : undefined }} onClick={() => { const a = accounts.rows.find((x) => x.id === form.id)!; if (confirm) void removeAccount(a); else setConfirm(true) }}><Trash2 size={16} aria-hidden /> {confirm ? 'Confirmar' : 'Quitar'}</button>}
            </div>
            {form.id && confirm && <p className="text-xs" style={{ color: 'var(--ink-faint)' }}>Si ya tiene movimientos, se archiva y conserva su historial; si no, se elimina.</p>}
          </form>
        )}
      </Sheet>

      <Sheet open={Boolean(moving)} title="Transferir entre cuentas" onClose={() => setMoving(null)}>
        {moving && (
          <form className="grid gap-4" onSubmit={(e) => { e.preventDefault(); void doTransfer() }}>
            <div className="grid grid-cols-2 gap-3">
              <label className="grid gap-2 text-sm">De<select className="field" value={moving.from} onChange={(e) => setMoving({ ...moving, from: e.target.value })}>{active.map((a) => <option key={a.id} value={a.id}>{a.name} · {money(bal[a.id] ?? 0)}</option>)}</select></label>
              <label className="grid gap-2 text-sm">A<select className="field" value={moving.to} onChange={(e) => setMoving({ ...moving, to: e.target.value })}>{active.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select></label>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <label className="grid gap-2 text-sm">Monto<input autoFocus className="field" inputMode="decimal" value={moving.amount} onChange={(e) => setMoving({ ...moving, amount: e.target.value })} placeholder="0.00" /></label>
              <label className="grid gap-2 text-sm">Comisión (opcional)<input className="field" inputMode="decimal" value={moving.fee} onChange={(e) => setMoving({ ...moving, fee: e.target.value })} placeholder="0.00" /></label>
            </div>
            <label className="grid gap-2 text-sm">Fecha<input type="date" className="field" value={moving.date} onChange={(e) => setMoving({ ...moving, date: e.target.value })} /></label>
            <label className="grid gap-2 text-sm">Nota<input className="field" value={moving.note} maxLength={300} onChange={(e) => setMoving({ ...moving, note: e.target.value })} placeholder="Retiro para gastos de la semana" /></label>
            {err && <p role="alert" className="text-sm" style={{ color: 'var(--neg)' }}>{err}</p>}
            <button className="btn btn-primary w-fit">Transferir</button>
          </form>
        )}
      </Sheet>

      <Sheet open={Boolean(rec)} title={rec ? `Conciliar ${rec.acc.name}` : ''} onClose={() => setRec(null)}>
        {rec && (
          <form className="grid gap-4" onSubmit={(e) => { e.preventDefault(); void doReconcile() }}>
            <p className="text-sm" style={{ color: 'var(--ink-soft)' }}>La app calcula <strong style={{ color: 'var(--ink)' }}>{money(bal[rec.acc.id] ?? 0)}</strong>. Escribe lo que muestra tu banco (o cuenta lo que hay en la cartera) y registro la diferencia como un ajuste.</p>
            <label className="grid gap-2 text-sm">Saldo real<input autoFocus className="field" inputMode="decimal" value={rec.real} onChange={(e) => setRec({ ...rec, real: e.target.value })} placeholder="0.00" /></label>
            {Number.isFinite(toNum(rec.real)) && rec.real.trim() && (() => { const r = reconcile(bal[rec.acc.id] ?? 0, toNum(rec.real)); return <p className="text-sm" style={{ color: r.kind === 'expense' ? 'var(--neg)' : r.kind ? 'var(--pos)' : 'var(--ink-soft)' }}>{r.kind ? `Diferencia: ${r.kind === 'income' ? '+' : '−'}${money(r.diff)}` : 'Coincide: no hay nada que ajustar.'}</p> })()}
            {err && <p role="alert" className="text-sm" style={{ color: 'var(--neg)' }}>{err}</p>}
            <button className="btn btn-primary w-fit">Ajustar saldo</button>
          </form>
        )}
      </Sheet>
    </div>
  )
}
