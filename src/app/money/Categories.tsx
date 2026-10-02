import { ArrowDown, ArrowUp, Loader2, Plus, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import Sheet from '../../components/Sheet'
import { Group, PageHeader, Row } from '../../components/ui'
import type { Kind, Sub, Tx } from '../../lib/finance'
import { supabase } from '../../lib/supabase'
import { useTable } from '../../lib/table'
import { AREA_COLORS, useTaxonomy, type FinArea, type FinCategory } from '../../lib/taxonomy'
import { ErrorBar } from './shared'

type Target = { type: 'area'; area?: FinArea } | { type: 'cat'; kind: Kind; cat?: FinCategory }

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`

/** Áreas y categorías de dinero: crea las que necesites, cámbiales el nombre, el color y el orden. */
export default function Categories() {
  const tax = useTaxonomy()
  const txs = useTable<Tx>('fin_transactions', { col: 'tx_date', asc: false })
  const subs = useTable<Sub>('subscriptions', { col: 'next_due', asc: true })
  const [target, setTarget] = useState<Target | null>(null)

  const areaUse = useMemo(() => { const m = new Map<string, number>(); for (const t of txs.rows) m.set(t.area, (m.get(t.area) ?? 0) + 1); for (const s of subs.rows) m.set(s.area, (m.get(s.area) ?? 0) + 1); return m }, [txs.rows, subs.rows])
  const catUse = useMemo(() => { const m = new Map<string, number>(); for (const t of txs.rows) { const k = `${t.kind}|${t.category}`; m.set(k, (m.get(k) ?? 0) + 1) } return m }, [txs.rows])

  if (tax.loading || txs.loading) return <div className="grid h-48 place-items-center"><Loader2 className="animate-spin" aria-label="Cargando" /></div>

  const kinds: { kind: Kind; title: string; foot: string }[] = [
    { kind: 'expense', title: 'Categorías de gasto', foot: 'Salen en el selector de Movimientos, Presupuesto y Suscripciones.' },
    { kind: 'income', title: 'Categorías de ingreso', foot: 'También puedes crear una al registrar un movimiento.' },
  ]

  return (
    <div>
      <PageHeader eyebrow="Dinero" title="Áreas y categorías" sub="Ordena tu dinero como tú lo piensas. Cambia un nombre y se actualiza en todo lo que ya registraste." />
      <ErrorBar msg={tax.error || txs.error} onClose={tax.clearError} />

      <Group className="!mt-2" title="Áreas" footer="Una área es de dónde viene o a dónde va el dinero: tu trabajo web, la música, lo personal… o lo que quieras.">
        {tax.areas.map((a, i) => (
          <Row key={a.id} tone={a.color} title={a.name} chevron={false} sub={plural(areaUse.get(a.key) ?? 0, 'movimiento', 'movimientos')} onClick={() => setTarget({ type: 'area', area: a })}
            trailing={<Mover i={i} n={tax.areas.length} label={a.name} onMove={(d) => tax.move(tax.areas, i, d, tax.areasDb)} />} />
        ))}
        <Row icon={<Plus size={16} aria-hidden />} tone="var(--accent)" title={<span style={{ color: 'var(--accent)' }}>Nueva área</span>} chevron={false} onClick={() => setTarget({ type: 'area' })} />
      </Group>

      {kinds.map(({ kind, title, foot }) => {
        const list = tax.cats(kind)
        return (
          <Group key={kind} title={title} footer={foot}>
            {list.map((c, i) => (
              <Row key={c.id} title={c.name} chevron={false} sub={plural(catUse.get(`${kind}|${c.name}`) ?? 0, 'movimiento', 'movimientos')} onClick={() => setTarget({ type: 'cat', kind, cat: c })}
                trailing={<Mover i={i} n={list.length} label={c.name} onMove={(d) => tax.move(list, i, d, tax.catsDb)} />} />
            ))}
            <Row icon={<Plus size={16} aria-hidden />} tone="var(--accent)" title={<span style={{ color: 'var(--accent)' }}>Nueva categoría</span>} chevron={false} onClick={() => setTarget({ type: 'cat', kind })} />
          </Group>
        )
      })}

      <Editor target={target} onClose={() => setTarget(null)} tax={tax} areaUse={areaUse} catUse={catUse} />
    </div>
  )
}

function Mover({ i, n, label, onMove }: { i: number; n: number; label: string; onMove: (d: -1 | 1) => void }) {
  return (
    <span className="flex">
      <button className="grid size-11 place-items-center rounded-full disabled:opacity-25" style={{ color: 'var(--ink-faint)' }} disabled={i === 0} onClick={() => onMove(-1)} aria-label={`Subir ${label}`}><ArrowUp size={15} aria-hidden /></button>
      <button className="grid size-11 place-items-center rounded-full disabled:opacity-25" style={{ color: 'var(--ink-faint)' }} disabled={i === n - 1} onClick={() => onMove(1)} aria-label={`Bajar ${label}`}><ArrowDown size={15} aria-hidden /></button>
    </span>
  )
}

function Editor({ target, onClose, tax, areaUse, catUse }: { target: Target | null; onClose: () => void; tax: ReturnType<typeof useTaxonomy>; areaUse: Map<string, number>; catUse: Map<string, number> }) {
  return (
    <Sheet open={Boolean(target)} title={!target ? '' : target.type === 'area' ? (target.area ? 'Editar área' : 'Nueva área') : target.cat ? 'Editar categoría' : 'Nueva categoría'} onClose={onClose}>
      {target?.type === 'area' && <AreaForm key={target.area?.id ?? 'new'} area={target.area} tax={tax} uses={target.area ? areaUse.get(target.area.key) ?? 0 : 0} onDone={onClose} />}
      {target?.type === 'cat' && <CatForm key={target.cat?.id ?? `new-${target.kind}`} kind={target.kind} cat={target.cat} tax={tax} uses={target.cat ? catUse.get(`${target.kind}|${target.cat.name}`) ?? 0 : 0} onDone={onClose} />}
    </Sheet>
  )
}

function AreaForm({ area, tax, uses, onDone }: { area?: FinArea; tax: ReturnType<typeof useTaxonomy>; uses: number; onDone: () => void }) {
  const [name, setName] = useState(area?.name ?? '')
  const [color, setColor] = useState(area?.color ?? AREA_COLORS[tax.areas.length % AREA_COLORS.length].id)
  const [moveTo, setMoveTo] = useState('')
  const [confirm, setConfirm] = useState(false)
  const [err, setErr] = useState('')
  const others = tax.areas.filter((a) => a.id !== area?.id)

  const save = async () => {
    const n = name.trim()
    if (!n) return setErr('Ponle un nombre.')
    if (tax.areas.some((a) => a.id !== area?.id && a.name.toLowerCase() === n.toLowerCase())) return setErr('Ya tienes un área con ese nombre.')
    if (area) await tax.areasDb.update(area.id, { name: n, color }); else await tax.addArea(n, color)
    onDone()
  }
  const remove = async () => {
    if (!area) return
    if (uses > 0) {
      if (!moveTo) return setErr('Elige a qué área pasan sus movimientos.')
      await supabase.from('fin_transactions').update({ area: moveTo }).eq('area', area.key)
      await supabase.from('subscriptions').update({ area: moveTo }).eq('area', area.key)
    }
    await tax.areasDb.remove(area.id)
    onDone()
  }

  return (
    <form className="grid gap-4" onSubmit={(e) => { e.preventDefault(); void save() }}>
      <label className="grid gap-2 text-sm">Nombre<input autoFocus className="field" value={name} onChange={(e) => setName(e.target.value)} maxLength={40} placeholder="Clases, Iglesia, Negocio…" /></label>
      <fieldset>
        <legend className="mb-2 text-sm">Color</legend>
        <div className="flex flex-wrap gap-3">{AREA_COLORS.map((c) => <button key={c.id} type="button" aria-pressed={color === c.id} aria-label={c.label} onClick={() => setColor(c.id)} className="swatch" style={{ ['--sw' as string]: c.id }} />)}</div>
      </fieldset>
      {area && uses > 0 && confirm && (
        <label className="grid gap-2 text-sm">Pasar sus {uses} {uses === 1 ? 'movimiento' : 'movimientos'} a
          <select className="field" value={moveTo} onChange={(e) => setMoveTo(e.target.value)}><option value="">Elige un área…</option>{others.map((a) => <option key={a.id} value={a.key}>{a.name}</option>)}</select>
        </label>
      )}
      {err && <p role="alert" className="text-sm" style={{ color: 'var(--neg)' }}>{err}</p>}
      <div className="flex items-center gap-3">
        <button className="btn btn-primary">Guardar</button>
        {area && others.length > 0 && <button type="button" className="btn btn-ghost ml-auto" style={{ color: confirm ? 'var(--neg)' : undefined }} onClick={() => (confirm || uses === 0 ? void remove() : setConfirm(true))}><Trash2 size={16} aria-hidden /> {confirm ? 'Eliminar' : 'Eliminar área'}</button>}
      </div>
    </form>
  )
}

function CatForm({ kind, cat, tax, uses, onDone }: { kind: Kind; cat?: FinCategory; tax: ReturnType<typeof useTaxonomy>; uses: number; onDone: () => void }) {
  const [name, setName] = useState(cat?.name ?? '')
  const [confirm, setConfirm] = useState(false)
  const [err, setErr] = useState('')

  const save = async () => {
    const n = name.trim()
    if (!n) return setErr('Ponle un nombre.')
    if (tax.cats(kind).some((c) => c.id !== cat?.id && c.name.toLowerCase() === n.toLowerCase())) return setErr('Ya existe una con ese nombre.')
    if (cat) await tax.renameCategory(cat, n); else await tax.ensureCategory(kind, n)
    onDone()
  }

  return (
    <form className="grid gap-4" onSubmit={(e) => { e.preventDefault(); void save() }}>
      <label className="grid gap-2 text-sm">Nombre<input autoFocus className="field" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} placeholder={kind === 'expense' ? 'Gasolina, Cursos, Regalos…' : 'Regalías, Eventos, Consultoría…'} /></label>
      {cat && uses > 0 && <p className="text-sm" style={{ color: 'var(--ink-soft)' }}>Si le cambias el nombre, se actualizan sus {uses} {uses === 1 ? 'movimiento' : 'movimientos'}.</p>}
      {err && <p role="alert" className="text-sm" style={{ color: 'var(--neg)' }}>{err}</p>}
      <div className="flex items-center gap-3">
        <button className="btn btn-primary">Guardar</button>
        {cat && <button type="button" className="btn btn-ghost ml-auto" style={{ color: confirm ? 'var(--neg)' : undefined }} onClick={async () => { if (confirm) { await tax.catsDb.remove(cat.id); onDone() } else setConfirm(true) }}><Trash2 size={16} aria-hidden /> {confirm ? (uses > 0 ? 'Eliminar (los movimientos conservan el nombre)' : 'Eliminar') : 'Eliminar'}</button>}
      </div>
    </form>
  )
}
