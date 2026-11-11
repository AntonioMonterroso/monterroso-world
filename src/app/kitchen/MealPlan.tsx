import { Loader2, ShoppingCart, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import Sheet from '../../components/Sheet'
import { Group, PageHeader } from '../../components/ui'
import { cleanPlan, shoppingFor, weekDays, type MealPlan } from '../../lib/mealPlan'
import { mealLabel, type PantryItem, type Recipe } from '../../lib/kitchen'
import { getSettings, patchSettings } from '../../lib/settings'
import { supabase } from '../../lib/supabase'
import { useTable } from '../../lib/table'
import { localISO } from '../../lib/time'

const dayName = (d: string) => new Date(`${d}T12:00:00`).toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'short' })

/** Qué cocino esta semana: eliges recetas por día y arma la lista de lo que falta comprar. */
export default function MealPlanPage() {
  const recipes = useTable<Recipe>('recipes', { col: 'title', asc: true })
  const pantry = useTable<PantryItem>('pantry_items', { col: 'name', asc: true })
  const shop = useTable<{ id: string; name: string; status: string }>('shopping_items', { col: 'created_at', asc: false })
  const today = localISO()
  const [offset, setOffset] = useState(0)
  const days = useMemo(() => weekDays(today, offset), [today, offset])
  const [plan, setPlan] = useState<MealPlan>({})
  const [loaded, setLoaded] = useState(false)
  const [list, setList] = useState<{ name: string; for: string[]; on: boolean }[] | null>(null)
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => { void getSettings().then((s) => { setPlan(cleanPlan((s as { mealPlan?: unknown }).mealPlan, today)); setLoaded(true) }) }, [today])
  const save = (next: MealPlan) => { setPlan(next); void patchSettings({ mealPlan: cleanPlan(next, today) } as never) }
  const add = (day: string, id: string) => { if (!id) return; save({ ...plan, [day]: [...(plan[day] ?? []), id] }) }
  const drop = (day: string, i: number) => save({ ...plan, [day]: (plan[day] ?? []).filter((_, j) => j !== i) })

  const build = () => {
    const pending = shop.rows.filter((x) => x.status === 'pending')
    setList(shoppingFor(plan, days.filter((d) => d >= today || offset > 0), recipes.rows, pantry.rows, pending).map((x) => ({ ...x, on: true })))
  }
  const addToShop = async () => {
    if (!list) return
    setBusy(true)
    const chosen = list.filter((x) => x.on)
    for (const x of chosen) await supabase.from('shopping_items').insert({ name: x.name, category: 'Súper y comida', priority: 2, currency: 'GTQ', status: 'pending' })
    setBusy(false); setList(null); void shop.reload()
    setMsg(`Listo: ${chosen.length} ${chosen.length === 1 ? 'cosa agregada' : 'cosas agregadas'} a Por comprar.`)
  }

  if (recipes.loading || !loaded) return <div className="grid h-48 place-items-center"><Loader2 className="animate-spin" aria-label="Cargando" /></div>
  const planned = days.reduce((n, d) => n + (plan[d]?.length ?? 0), 0)

  return (
    <div>
      <PageHeader eyebrow="Cocina" title="Mi semana" sub="Elige qué cocinar cada día. Después armo la lista de lo que falta, sin lo que ya tienes en la despensa." action={planned > 0 ? <button className="btn btn-primary" onClick={build}><ShoppingCart size={16} aria-hidden /> Armar lista</button> : undefined} />
      <div className="mt-2 mb-4 inline-flex rounded-full p-1" style={{ background: 'var(--surface-2)' }} role="group" aria-label="Semana">
        {[['Esta semana', 0], ['La siguiente', 1]].map(([l, o]) => <button key={String(o)} type="button" aria-pressed={offset === o} onClick={() => setOffset(o as number)} className="min-h-10 rounded-full px-4 text-sm font-semibold" style={{ background: offset === o ? 'var(--tinta)' : 'transparent', color: offset === o ? 'var(--fondo)' : 'var(--ink-soft)' }}>{l}</button>)}
      </div>
      {msg && <p role="status" className="mb-4 rounded-xl px-4 py-3 text-sm" style={{ background: 'var(--personal-suave)', color: 'var(--personal-texto)' }}>{msg} <Link to="/app/compras" className="underline">Ver</Link></p>}
      {recipes.rows.length === 0 && <p className="text-sm" style={{ color: 'var(--ink-soft)' }}>Primero agrega recetas en «Qué cocino».</p>}
      {recipes.rows.length > 0 && days.map((d) => (
        <Group key={d} title={<span className="first-letter:uppercase" style={{ fontWeight: d === today ? 700 : undefined }}>{dayName(d)}{d === today ? ' · hoy' : ''}</span>}>
          <li className="row"><div className="flex w-full flex-wrap items-center gap-2 px-4 py-3">
            {(plan[d] ?? []).map((id, i) => { const r = recipes.rows.find((x) => x.id === id); return r ? (
              <span key={`${id}-${i}`} className="inline-flex min-h-10 items-center gap-1 rounded-full pl-3 text-sm" style={{ background: 'var(--surface-2)' }}>
                <Link to={`/app/cocina/receta/${r.id}`} className="underline-offset-2 hover:underline">{r.title}</Link>
                <button type="button" className="grid size-10 place-items-center rounded-full" onClick={() => drop(d, i)} aria-label={`Quitar ${r.title} del ${dayName(d)}`}><X size={14} aria-hidden /></button>
              </span>
            ) : null })}
            {recipes.rows.length > 0 && (
              <select className="field !min-h-10 !w-auto text-sm" value="" onChange={(e) => add(d, e.target.value)} aria-label={`Agregar receta al ${dayName(d)}`}>
                <option value="">+ Receta…</option>
                {recipes.rows.map((r) => <option key={r.id} value={r.id}>{r.title} · {mealLabel(r.meal)}</option>)}
              </select>
            )}
          </div></li>
        </Group>
      ))}

      <Sheet open={Boolean(list)} title="Lo que falta comprar" onClose={() => setList(null)}>
        {list && (list.length === 0 ? <div className="grid gap-3"><p>Tienes todo para lo que planeaste (o ya está en Por comprar).</p><button className="btn btn-sec w-fit" onClick={() => setList(null)}>Cerrar</button></div> : (
          <div className="grid gap-4">
            <ul className="grid gap-2">{list.map((x, i) => (
              <li key={x.name}><label className="flex min-h-11 items-start gap-3 text-sm"><input type="checkbox" className="mt-1 size-5" checked={x.on} onChange={(e) => setList(list.map((y, j) => (j === i ? { ...y, on: e.target.checked } : y)))} /><span><strong>{x.name}</strong><br /><span style={{ color: 'var(--ink-soft)' }}>Para {x.for.join(', ')}</span></span></label></li>
            ))}</ul>
            <div className="flex flex-wrap gap-2"><button className="btn btn-primary" disabled={busy || !list.some((x) => x.on)} onClick={() => void addToShop()}>{busy ? 'Agregando…' : `Agregar ${list.filter((x) => x.on).length} a Por comprar`}</button><button className="btn btn-ghost" onClick={() => setList(null)}>Cancelar</button></div>
          </div>
        ))}
      </Sheet>
    </div>
  )
}
