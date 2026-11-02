import { Heart, Loader2, Plus, Search } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Group, PageHeader, Row } from '../../components/ui'
import { MEALS, mealLabel, norm, rankRecipes, type Meal, type PantryItem, type Recipe } from '../../lib/kitchen'
import { ensureKitchenSeed } from '../../lib/kitchenDb'
import { useTable } from '../../lib/table'
import { Empty, ErrorBar, chip } from '../money/shared'
import RecipeEditor from './RecipeEditor'

export default function Recipes() {
  const db = useTable<Recipe>('recipes', { col: 'title', asc: true })
  const pantry = useTable<PantryItem>('pantry_items', { col: 'name', asc: true })
  const nav = useNavigate()
  const [q, setQ] = useState('')
  const [meal, setMeal] = useState<Meal | 'all' | 'fav'>('all')
  const [editing, setEditing] = useState(false)
  const [seeded, setSeeded] = useState(false)

  // Primera visita: carga la despensa y el recetario inicial
  useEffect(() => {
    if (db.loading || pantry.loading || seeded) return
    setSeeded(true)
    if (!db.rows.length && !pantry.rows.length) void ensureKitchenSeed().then((did) => { if (did) { db.reload(); pantry.reload() } })
  }, [db, pantry, seeded])

  const ranked = useMemo(() => {
    const t = norm(q)
    const list = db.rows.filter((r) => (meal === 'all' || (meal === 'fav' ? r.favorite : r.meal === meal)) && (!t || norm(r.title).includes(t) || r.ingredients.some((i) => norm(i.n).includes(t))))
    return rankRecipes(list, pantry.rows)
  }, [db.rows, pantry.rows, q, meal])
  const ready = ranked.filter((x) => x.miss.length === 0)
  const close = ranked.filter((x) => x.miss.length > 0 && x.miss.length <= 2)
  const far = ranked.filter((x) => x.miss.length > 2)
  const readyAll = useMemo(() => rankRecipes(db.rows, pantry.rows).filter((x) => x.miss.length === 0).length, [db.rows, pantry.rows])

  const row = ({ r, miss }: { r: Recipe; miss: string[] }) => (
    <Row key={r.id} to={`/app/cocina/receta/${r.id}`} tone={miss.length ? 'var(--ink-faint)' : 'var(--pos)'}
      title={<>{r.title}{r.favorite && <Heart size={13} aria-label="Favorita" className="ml-1.5 inline -translate-y-px" style={{ color: 'var(--aviso-texto)', fill: 'var(--aviso)' }} />}</>}
      sub={[mealLabel(r.meal), r.minutes ? `${r.minutes} min` : '', miss.length ? `falta: ${miss.join(', ')}` : 'tienes todo'].filter(Boolean).join(' · ')} />
  )

  return (
    <div>
      <PageHeader eyebrow="Cuidarme" title="¿Qué cocino hoy?" sub={db.rows.length ? `${readyAll} de ${db.rows.length} recetas se pueden hacer con lo que hay en casa` : undefined}
        action={<button className="btn btn-primary" onClick={() => setEditing(true)}><Plus size={18} aria-hidden /> Receta</button>} />
      <ErrorBar msg={db.error || pantry.error} onClose={db.clearError} />

      <div className="relative mt-6">
        <Search size={16} aria-hidden className="absolute top-1/2 left-4 -translate-y-1/2" style={{ color: 'var(--ink-faint)' }} />
        <input className="field pl-10" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar receta o ingrediente" aria-label="Buscar recetas" autoComplete="off" />
      </div>
      <div className="mt-3 flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }} role="group" aria-label="Tipo de comida">
        {[{ id: 'all', label: 'Todas' }, { id: 'fav', label: 'Favoritas' }, ...MEALS].map((m) => (
          <button key={m.id} type="button" aria-pressed={meal === m.id} onClick={() => setMeal(m.id as Meal | 'all' | 'fav')} className="min-h-11 shrink-0 rounded-full border px-4 text-sm" style={chip(meal === m.id)}>{m.label}</button>
        ))}
      </div>

      {db.loading || (!seeded && !db.rows.length) ? <div className="grid h-40 place-items-center"><Loader2 className="animate-spin" aria-label="Cargando" /></div> : ranked.length === 0 ? (
        <Empty title={db.rows.length ? 'Nada coincide' : 'Tu recetario'} text="Guarda tus recetas con sus ingredientes y la app te dice cuáles puedes hacer con lo que hay en tu despensa." action={db.rows.length ? undefined : 'Agregar la primera'} onAction={() => setEditing(true)} />
      ) : (
        <>
          {ready.length > 0 && <Group className="mt-6" title="Puedes hacerla ya" aside={ready.length}>{ready.map(row)}</Group>}
          {close.length > 0 && <Group className="mt-6" title="Te falta poco" aside={close.length}>{close.map(row)}</Group>}
          {far.length > 0 && <Group className="mt-6" title="Para otro día" aside={far.length}>{far.map(row)}</Group>}
        </>
      )}

      <RecipeEditor open={editing} pantry={pantry.rows} onClose={() => setEditing(false)} onSave={async (v) => {
        const r = await db.add({ ...v, favorite: false, cooked_count: 0, last_cooked: null })
        setEditing(false)
        if (r) nav(`/app/cocina/receta/${r.id}`)
      }} />
    </div>
  )
}
