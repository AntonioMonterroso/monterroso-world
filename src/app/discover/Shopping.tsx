import { Check, ExternalLink, Loader2, PiggyBank, Plus, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import Sheet from '../../components/Sheet'
import type { Goal, Tx } from '../../lib/finance'
import { PRIORITIES, SHOP_CATEGORIES, expenseCategoryFor, pendingTotals, sortShopping, type ShopItem } from '../../lib/inspire'
import { hostOf } from '../../lib/learn'
import { money } from '../../lib/projects'
import { useTable } from '../../lib/table'
import { localISO } from '../../lib/time'
import { CurrencySelect, Empty, ErrorBar, chip, defaultCurrency, toNum } from '../money/shared'
import { PageHeader } from '../../components/ui'

type Draft = { id?: string; name: string; priority: 1 | 2 | 3; category: string; price: string; currency: string; store: string; url: string; notes: string }
const blank = (): Draft => ({ name: '', priority: 2, category: 'Equipo y tecnología', price: '', currency: defaultCurrency(), store: '', url: '', notes: '' })

export default function Shopping() {
  const db = useTable<ShopItem>('shopping_items', { col: 'created_at', asc: false })
  const txs = useTable<Tx>('fin_transactions', { col: 'tx_date', asc: false })
  const goals = useTable<Goal>('savings_goals', { col: 'created_at', asc: true })
  const [d, setD] = useState<Draft | null>(null)
  const [buy, setBuy] = useState<ShopItem | null>(null)
  const [buyPrice, setBuyPrice] = useState('')
  const [record, setRecord] = useState(true)
  const [err, setErr] = useState('')
  const [msg, setMsg] = useState('')
  const [confirm, setConfirm] = useState(false)
  const [showBought, setShowBought] = useState(false)
  const [sp, setSp] = useSearchParams()
  useEffect(() => { if (sp.get('nuevo')) { setD(blank()); setSp({}, { replace: true }) } }, [sp, setSp])
  // Viene de Hoy: «ya lo compré» abre la confirmación de ese artículo
  useEffect(() => {
    const id = sp.get('comprar')
    if (!id || db.loading) return
    const it = db.rows.find((x) => x.id === id && x.status === 'pending')
    if (it) startBuy(it)
    setSp({}, { replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sp, db.loading, db.rows, setSp])

  const pending = useMemo(() => sortShopping(db.rows.filter((i) => i.status === 'pending')), [db.rows])
  const bought = useMemo(() => db.rows.filter((i) => i.status === 'bought'), [db.rows])
  const totals = useMemo(() => pendingTotals(db.rows), [db.rows])

  const save = async () => {
    if (!d) return
    if (!d.name.trim()) return setErr('Ponle un nombre.')
    const price = d.price.trim() ? toNum(d.price) : null
    if (price !== null && !(price >= 0)) return setErr('El precio no es válido.')
    if (d.url.trim() && !/^https?:\/\//i.test(d.url.trim())) return setErr('El enlace debe empezar con https://')
    const v = { name: d.name.trim(), priority: d.priority, category: d.category.trim() || 'Otro', price, currency: d.currency, store: d.store.trim() || null, url: d.url.trim() || null, notes: d.notes.trim() || null }
    if (d.id) await db.update(d.id, v); else await db.add({ ...v, status: 'pending', bought_on: null })
    setD(null); setErr(''); setConfirm(false)
  }

  const startBuy = (i: ShopItem) => { setBuy(i); setBuyPrice(i.price ? String(i.price) : ''); setRecord(Boolean(i.price)) }
  const confirmBuy = async () => {
    if (!buy) return
    const price = buyPrice.trim() ? toNum(buyPrice) : null
    if (price !== null && !(price >= 0)) return setErr('El precio no es válido.')
    await db.update(buy.id, { status: 'bought', bought_on: localISO(), price })
    if (record && price && price > 0) await txs.add({ kind: 'expense', amount: price, currency: buy.currency, category: expenseCategoryFor(buy.category), area: 'personal', tx_date: localISO(), note: buy.name })
    setBuy(null); setErr(''); setMsg(record && price ? 'Listo. También quedó registrado como gasto.' : 'Listo, marcado como comprado.')
    setTimeout(() => setMsg(''), 4000)
  }

  const saveFor = async (i: ShopItem) => {
    if (!i.price) return setMsg('Ponle un precio para crear la meta de ahorro.')
    await goals.add({ title: i.name, target: i.price, saved: 0, currency: i.currency, due_date: null })
    setMsg('Creé una meta de ahorro en Dinero → Metas.'); setTimeout(() => setMsg(''), 4000)
  }

  const row = (i: ShopItem) => {
    const pr = PRIORITIES.find((p) => p.id === i.priority)!
    return (
      <li key={i.id} className="rounded-xl border" style={{ background: 'var(--surface)', borderColor: 'var(--line-soft)', opacity: i.status === 'bought' ? 0.65 : 1 }}>
        <div className="flex items-center gap-1">
          {i.status === 'pending' && <button className="grid size-12 shrink-0 place-items-center" onClick={() => startBuy(i)} aria-label={`Marcar ${i.name} como comprado`}><span className="grid size-6 place-items-center rounded-full border" style={{ borderColor: 'var(--pos)' }} aria-hidden /></button>}
          {i.status === 'bought' && <span className="grid size-12 shrink-0 place-items-center" aria-hidden><Check size={18} style={{ color: 'var(--pos)' }} /></span>}
          <button className="min-w-0 flex-1 py-3 text-left" onClick={() => { setErr(''); setConfirm(false); setD({ id: i.id, name: i.name, priority: i.priority, category: i.category, price: i.price ? String(i.price) : '', currency: i.currency, store: i.store ?? '', url: i.url ?? '', notes: i.notes ?? '' }) }}>
            <span className="block truncate font-semibold" style={{ textDecoration: i.status === 'bought' ? 'line-through' : 'none' }}>{i.name}</span>
            <span className="block truncate text-xs" style={{ color: 'var(--ink-faint)' }}><span style={{ color: pr.color }}>{pr.label}</span> · {i.category}{i.store ? ` · ${i.store}` : ''}{i.status === 'bought' && i.bought_on ? ` · ${i.bought_on}` : ''}</span>
          </button>
          {i.price != null && <span className="shrink-0 text-sm font-semibold">{money(Number(i.price), i.currency)}</span>}
          {i.url && <a className="grid size-11 shrink-0 place-items-center" href={i.url} target="_blank" rel="noopener noreferrer" aria-label={`Abrir ${hostOf(i.url)}`}><ExternalLink size={16} aria-hidden /></a>}
          {i.status === 'pending' && i.price && <button className="grid size-11 shrink-0 place-items-center" onClick={() => saveFor(i)} aria-label={`Ahorrar para ${i.name}`} title="Crear meta de ahorro"><PiggyBank size={16} aria-hidden style={{ color: 'var(--sky)' }} /></button>}
        </div>
      </li>
    )
  }

  return (
    <div>
      <PageHeader eyebrow="Salir y comprar" title="Por comprar" sub={<>Pendiente: {Object.entries(totals).map(([c, v]) => money(v, c)).join(' · ')}</>} action={<button className="btn btn-primary" onClick={() => { setErr(''); setD(blank()) }}><Plus size={18} aria-hidden /> Artículo</button>} />
      <ErrorBar msg={db.error || txs.error || goals.error} onClose={db.clearError} />
      {msg && <p role="status" className="mt-3 rounded-xl px-3 py-2 text-sm" style={{ background: 'color-mix(in oklab, var(--sky) 14%, transparent)', color: 'var(--sky)' }}>{msg}</p>}

      {db.loading ? <div className="grid h-40 place-items-center"><Loader2 className="animate-spin" aria-label="Cargando" /></div> : db.rows.length === 0 ? (
        <Empty title="Lo que quieres comprar" text="Instrumentos, equipo, software, libros. Con prioridad, precio y tienda. Al comprarlo se registra como gasto, y puedes crear una meta de ahorro para lo grande." action="Agregar el primero" onAction={() => setD(blank())} />
      ) : (
        <>
          <ul className="mt-6 grid gap-2">{pending.map(row)}{pending.length === 0 && <li className="text-sm" style={{ color: 'var(--ink-soft)' }}>No tienes nada pendiente.</li>}</ul>
          {bought.length > 0 && (
            <section className="mt-8">
              <button className="min-h-11 text-sm underline" style={{ color: 'var(--ink-soft)' }} onClick={() => setShowBought((v) => !v)} aria-expanded={showBought}>{bought.length} ya {bought.length === 1 ? 'comprado' : 'comprados'}</button>
              {showBought && <ul className="mt-2 grid gap-2">{bought.map(row)}</ul>}
            </section>
          )}
        </>
      )}

      <Sheet open={Boolean(d)} title={d?.id ? 'Editar artículo' : 'Nuevo artículo'} onClose={() => setD(null)}>
        {d && (
          <form className="grid gap-4" onSubmit={(e) => { e.preventDefault(); void save() }}>
            <label className="grid gap-2 text-sm">Qué es<input className="field" value={d.name} onChange={(e) => setD({ ...d, name: e.target.value })} maxLength={200} placeholder="Pedal de reverb" autoFocus /></label>
            <div className="flex gap-2" role="group" aria-label="Prioridad">{PRIORITIES.map((p) => <button key={p.id} type="button" aria-pressed={d.priority === p.id} onClick={() => setD({ ...d, priority: p.id })} className="min-h-11 rounded-full border px-4 text-sm" style={chip(d.priority === p.id, p.color)}>{p.label}</button>)}</div>
            <label className="grid gap-2 text-sm">Categoría<input className="field" list="scat" value={d.category} onChange={(e) => setD({ ...d, category: e.target.value })} maxLength={60} /><datalist id="scat">{SHOP_CATEGORIES.map((c) => <option key={c} value={c} />)}</datalist></label>
            <div className="grid grid-cols-2 gap-3">
              <label className="grid gap-2 text-sm">Precio<input className="field" inputMode="decimal" value={d.price} onChange={(e) => setD({ ...d, price: e.target.value })} placeholder="0.00" /></label>
              <CurrencySelect value={d.currency} onChange={(v) => setD({ ...d, currency: v })} />
            </div>
            <label className="grid gap-2 text-sm">Dónde<input className="field" value={d.store} onChange={(e) => setD({ ...d, store: e.target.value })} maxLength={200} placeholder="Tienda o sitio" /></label>
            <label className="grid gap-2 text-sm">Enlace (opcional)<input className="field" inputMode="url" value={d.url} onChange={(e) => setD({ ...d, url: e.target.value })} maxLength={1000} placeholder="https://" /></label>
            <label className="grid gap-2 text-sm">Notas<textarea className="field py-3" rows={2} value={d.notes} onChange={(e) => setD({ ...d, notes: e.target.value })} maxLength={500} /></label>
            {err && <p role="alert" className="text-sm" style={{ color: 'var(--neg)' }}>{err}</p>}
            <div className="flex items-center gap-3">
              <button className="btn btn-primary">Guardar</button>
              {d.id && <button type="button" className="btn btn-ghost ml-auto" style={{ color: confirm ? 'var(--neg)' : undefined }} onClick={async () => { if (confirm) { await db.remove(d.id!); setD(null); setConfirm(false) } else setConfirm(true) }}><Trash2 size={16} aria-hidden /> {confirm ? '¿Seguro?' : 'Eliminar'}</button>}
            </div>
          </form>
        )}
      </Sheet>

      <Sheet open={Boolean(buy)} title="Marcar como comprado" onClose={() => setBuy(null)}>
        {buy && (
          <form className="grid gap-4" onSubmit={(e) => { e.preventDefault(); void confirmBuy() }}>
            <p className="font-semibold">{buy.name}</p>
            <label className="grid gap-2 text-sm">¿Cuánto costó realmente? ({buy.currency})<input className="field" inputMode="decimal" value={buyPrice} onChange={(e) => setBuyPrice(e.target.value)} placeholder="0.00" autoFocus /></label>
            <label className="flex min-h-11 items-start gap-3 text-sm"><input type="checkbox" className="mt-0.5 size-5 shrink-0" checked={record} onChange={(e) => setRecord(e.target.checked)} /> Registrarlo como gasto en Finanzas ({expenseCategoryFor(buy.category)})</label>
            {err && <p role="alert" className="text-sm" style={{ color: 'var(--neg)' }}>{err}</p>}
            <button className="btn btn-primary w-fit">Listo, lo compré</button>
          </form>
        )}
      </Sheet>
    </div>
  )
}
