import { Loader2, Pencil, Plus, ShoppingBag, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import Sheet from '../../components/Sheet'
import { Chk, PageHeader } from '../../components/ui'
import { PANTRY_CATEGORIES, norm, type PantryItem } from '../../lib/kitchen'
import { sendToShopping } from '../../lib/kitchenDb'
import { useTable } from '../../lib/table'
import { Empty, ErrorBar, chip } from '../money/shared'

type Draft = { id?: string; name: string; category: string; notes: string }

export default function Pantry() {
  const db = useTable<PantryItem>('pantry_items', { col: 'name', asc: true })
  const [quick, setQuick] = useState('')
  const [view, setView] = useState<'all' | 'out'>('all')
  const [d, setD] = useState<Draft | null>(null)
  const [confirm, setConfirm] = useState(false)
  const [err, setErr] = useState('')
  const [msg, setMsg] = useState('')
  const say = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 4000) }

  const out = db.rows.filter((p) => !p.have)
  const groups = useMemo(() => {
    const list = view === 'out' ? db.rows.filter((p) => !p.have) : db.rows
    const cats = [...PANTRY_CATEGORIES, ...new Set(list.map((p) => p.category).filter((c) => !PANTRY_CATEGORIES.includes(c)))]
    return cats.map((c) => ({ c, items: list.filter((p) => p.category === c).sort((a, b) => a.name.localeCompare(b.name, 'es')) })).filter((g) => g.items.length)
  }, [db.rows, view])

  const exists = (name: string, id?: string) => db.rows.some((p) => p.id !== id && norm(p.name) === norm(name))
  const addQuick = async () => {
    const name = quick.trim()
    if (!name) return
    const dup = db.rows.find((p) => norm(p.name) === norm(name))
    if (dup) { if (!dup.have) await db.update(dup.id, { have: true }); say(`${dup.name} ya estaba; quedó como «en casa».`) }
    else await db.add({ name, category: 'Otro', have: true, notes: null })
    setQuick('')
  }
  const save = async () => {
    if (!d) return
    const name = d.name.trim()
    if (!name) return setErr('Ponle un nombre.')
    if (exists(name, d.id)) return setErr('Ya tienes ese ingrediente en la despensa.')
    const v = { name, category: d.category.trim() || 'Otro', notes: d.notes.trim() || null }
    if (d.id) await db.update(d.id, v); else await db.add({ ...v, have: true })
    setD(null)
  }
  const shopOut = async () => {
    const n = await sendToShopping(out.map((p) => p.name))
    if (n === null) say('No pude agregarlo a Por comprar.')
    else say(n ? `Agregué ${n} ${n === 1 ? 'cosa' : 'cosas'} a Por comprar.` : 'Ya estaba todo en Por comprar.')
  }

  return (
    <div>
      <PageHeader eyebrow="Cocina" title="Despensa" sub={db.rows.length ? `${db.rows.length - out.length} en casa · ${out.length} ${out.length === 1 ? 'se acabó' : 'se acabaron'}` : undefined}
        action={<button className="btn btn-primary" onClick={() => { setErr(''); setConfirm(false); setD({ name: '', category: 'Otro', notes: '' }) }}><Plus size={18} aria-hidden /> Ingrediente</button>} />
      <ErrorBar msg={db.error} onClose={db.clearError} />
      {msg && <p role="status" className="mt-3 rounded-xl px-3 py-2 text-sm" style={{ background: 'color-mix(in oklab, var(--sky) 14%, transparent)', color: 'var(--sky)' }}>{msg}</p>}

      <form className="mt-6 flex gap-2" onSubmit={(e) => { e.preventDefault(); void addQuick() }}>
        <input className="field min-w-0 flex-1" value={quick} onChange={(e) => setQuick(e.target.value)} maxLength={120} placeholder="Agregar rápido: leche, limón…" aria-label="Agregar ingrediente rápido" autoComplete="off" />
        <button className="btn btn-tint shrink-0" aria-label="Agregar"><Plus size={18} aria-hidden /></button>
      </form>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button type="button" aria-pressed={view === 'all'} onClick={() => setView('all')} className="min-h-11 rounded-full border px-4 text-sm" style={chip(view === 'all')}>Todo</button>
        <button type="button" aria-pressed={view === 'out'} onClick={() => setView('out')} className="min-h-11 rounded-full border px-4 text-sm" style={chip(view === 'out', 'var(--neg)')}>Se acabó ({out.length})</button>
        {out.length > 0 && <button className="btn btn-ghost ml-auto" onClick={shopOut}><ShoppingBag size={16} aria-hidden /> Pasar a Por comprar</button>}
      </div>
      <p className="mt-2 text-xs" style={{ color: 'var(--ink-faint)' }}>Toca un ingrediente cuando se acabe. Al comprarlo en Por comprar vuelve solo a «en casa».</p>

      {db.loading ? <div className="grid h-40 place-items-center"><Loader2 className="animate-spin" aria-label="Cargando" /></div> : groups.length === 0 ? (
        <Empty title={db.rows.length ? 'No se acabó nada' : 'Tu despensa'} text={db.rows.length ? 'Todo lo que tienes registrado está en casa.' : 'Anota lo que hay en casa y Cocina te dice qué puedes preparar.'} />
      ) : groups.map((g) => (
        <section key={g.c} className="group-sec mt-6">
          <div className="group-head"><h3>{g.c}</h3><span>{g.items.length}</span></div>
          <ul className="group-list">
            {g.items.map((p) => (
              <li key={p.id} className="row row-split">
                <button type="button" className="row-hit" onClick={() => db.update(p.id, { have: !p.have })} aria-pressed={p.have} aria-label={`${p.name}: ${p.have ? 'en casa' : 'se acabó'}`}>
                  <Chk on={p.have} tone="var(--pos)" />
                  <span className="row-main"><span className="row-title" style={p.have ? undefined : { color: 'var(--ink-faint)', textDecoration: 'line-through' }}>{p.name}</span>{p.notes && <span className="row-sub">{p.notes}</span>}</span>
                </button>
                <span className="row-trail"><button className="grid size-11 place-items-center" onClick={() => { setErr(''); setConfirm(false); setD({ id: p.id, name: p.name, category: p.category, notes: p.notes ?? '' }) }} aria-label={`Editar ${p.name}`}><Pencil size={15} aria-hidden style={{ color: 'var(--ink-faint)' }} /></button></span>
              </li>
            ))}
          </ul>
        </section>
      ))}

      <Sheet open={Boolean(d)} title={d?.id ? 'Editar ingrediente' : 'Nuevo ingrediente'} onClose={() => setD(null)}>
        {d && (
          <form className="grid gap-4" onSubmit={(e) => { e.preventDefault(); void save() }}>
            <label className="grid gap-2 text-sm">Nombre<input className="field" value={d.name} onChange={(e) => setD({ ...d, name: e.target.value })} maxLength={120} autoFocus /></label>
            <label className="grid gap-2 text-sm">Categoría<input className="field" list="pcat" value={d.category} onChange={(e) => setD({ ...d, category: e.target.value })} maxLength={60} /><datalist id="pcat">{PANTRY_CATEGORIES.map((c) => <option key={c} value={c} />)}</datalist></label>
            <label className="grid gap-2 text-sm">Nota<input className="field" value={d.notes} onChange={(e) => setD({ ...d, notes: e.target.value })} maxLength={300} placeholder="Marca, dónde está guardado…" /></label>
            {err && <p role="alert" className="text-sm" style={{ color: 'var(--neg)' }}>{err}</p>}
            <div className="flex items-center gap-3">
              <button className="btn btn-primary">Guardar</button>
              {d.id && <button type="button" className="btn btn-ghost ml-auto" style={{ color: confirm ? 'var(--neg)' : undefined }} onClick={async () => { if (confirm) { await db.remove(d.id!); setD(null) } else setConfirm(true) }}><Trash2 size={16} aria-hidden /> {confirm ? '¿Seguro?' : 'Eliminar'}</button>}
            </div>
          </form>
        )}
      </Sheet>
    </div>
  )
}
