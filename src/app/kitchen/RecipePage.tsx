import { ArrowLeft, ChefHat, Clock, Heart, Pencil, ShoppingBag, Users } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Chk } from '../../components/ui'
import { mealLabel, missing, norm, type PantryItem, type Recipe } from '../../lib/kitchen'
import { sendToShopping } from '../../lib/kitchenDb'
import { useTable } from '../../lib/table'
import { localISO } from '../../lib/time'
import { ErrorBar } from '../money/shared'
import RecipeEditor from './RecipeEditor'

export default function RecipePage() {
  const { id } = useParams()
  const nav = useNavigate()
  const db = useTable<Recipe>('recipes', { col: 'title', asc: true })
  const pantry = useTable<PantryItem>('pantry_items', { col: 'name', asc: true })
  const [editing, setEditing] = useState(false)
  const [msg, setMsg] = useState('')
  const [done, setDone] = useState<number[]>([])
  const r = db.rows.find((x) => x.id === id)

  if (db.loading) return <p style={{ color: 'var(--ink-soft)' }}>Cargando…</p>
  if (!r) return <div><Link to="/app/cocina" className="underline">Volver a Cocina</Link><p className="mt-4">No encontré esta receta.</p></div>

  const miss = missing(r, pantry.rows)
  const say = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 4000) }
  const inPantry = (k: string) => pantry.rows.find((p) => norm(p.name) === norm(k))

  // Tocar un ingrediente cambia si lo hay en casa (y lo agrega a la despensa si no estaba)
  const toggle = async (k: string) => {
    const p = inPantry(k)
    if (p) await pantry.update(p.id, { have: !p.have })
    else await pantry.add({ name: k, category: 'Otro', have: true, notes: null })
  }
  const shop = async () => {
    const n = await sendToShopping(miss)
    if (n === null) say('No pude agregarlo a Por comprar.')
    else say(n ? `Agregué ${n} ${n === 1 ? 'cosa' : 'cosas'} a Por comprar.` : 'Ya estaba todo en Por comprar.')
  }
  const cooked = async () => {
    await db.update(r.id, { cooked_count: r.cooked_count + 1, last_cooked: localISO() })
    say('¡Buen provecho! Quedó anotado.')
  }

  return (
    <div>
      <Link to="/app/cocina" className="mb-4 inline-flex min-h-11 items-center gap-2 text-sm" style={{ color: 'var(--ink-soft)' }}><ArrowLeft size={16} aria-hidden /> Cocina</Link>
      <p className="eyebrow">{mealLabel(r.meal)}</p>
      <div className="flex items-start gap-2">
        <h1 className="min-w-0 flex-1 font-display text-3xl">{r.title}</h1>
        <button className="grid size-11 shrink-0 place-items-center" onClick={() => db.update(r.id, { favorite: !r.favorite })} aria-pressed={r.favorite} aria-label={r.favorite ? 'Quitar de favoritas' : 'Marcar como favorita'}>
          <Heart size={20} aria-hidden style={{ color: r.favorite ? 'var(--neg)' : 'var(--ink-soft)', fill: r.favorite ? 'var(--neg)' : 'none' }} />
        </button>
        <button className="grid size-11 shrink-0 place-items-center" onClick={() => setEditing(true)} aria-label="Editar receta"><Pencil size={18} aria-hidden /></button>
      </div>
      <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm" style={{ color: 'var(--ink-soft)' }}>
        {r.minutes && <span className="inline-flex items-center gap-1.5"><Clock size={14} aria-hidden /> {r.minutes} min</span>}
        {r.servings && <span className="inline-flex items-center gap-1.5"><Users size={14} aria-hidden /> {r.servings} {r.servings === 1 ? 'porción' : 'porciones'}</span>}
        {r.cooked_count > 0 && <span className="inline-flex items-center gap-1.5"><ChefHat size={14} aria-hidden /> La hiciste {r.cooked_count} {r.cooked_count === 1 ? 'vez' : 'veces'}{r.last_cooked ? ` · última: ${r.last_cooked}` : ''}</span>}
      </p>
      <ErrorBar msg={db.error || pantry.error} onClose={db.clearError} />
      {msg && <p role="status" className="mt-3 rounded-xl px-3 py-2 text-sm" style={{ background: 'color-mix(in oklab, var(--sky) 14%, transparent)', color: 'var(--sky)' }}>{msg}</p>}

      <div className="mt-5 rounded-xl border p-4" style={{ background: 'var(--surface)', borderColor: 'var(--line-soft)' }}>
        {miss.length ? (
          <>
            <p className="text-sm"><b>Te falta:</b> {miss.join(', ')}</p>
            <button className="btn btn-tint mt-3" onClick={shop}><ShoppingBag size={16} aria-hidden /> Agregar a Por comprar</button>
          </>
        ) : <p className="text-sm" style={{ color: 'var(--pos)' }}>Tienes todo lo necesario.</p>}
      </div>

      <h2 className="mt-8 font-display text-2xl">Ingredientes</h2>
      <p className="mt-1 text-xs" style={{ color: 'var(--ink-faint)' }}>Toca un ingrediente para marcar si lo hay en casa.</p>
      <ul className="mt-3 grid gap-1">
        {r.ingredients.map((ing, idx) => {
          const p = ing.k ? inPantry(ing.k) : undefined
          const have = Boolean(p?.have)
          const body = <><span className="min-w-0 flex-1">{ing.n}{ing.opt && <span className="text-xs" style={{ color: 'var(--ink-faint)' }}> · opcional</span>}</span>{ing.k && !have && !ing.opt && <span className="text-xs" style={{ color: 'var(--neg)' }}>falta</span>}</>
          return (
            <li key={idx}>
              {ing.k ? (
                <button className="flex min-h-11 w-full items-center gap-3 text-left" onClick={() => toggle(ing.k!)} aria-pressed={have} aria-label={`${ing.n}: ${have ? 'lo hay en casa' : 'no lo hay'}`}>
                  <Chk on={have} tone="var(--pos)" />{body}
                </button>
              ) : <div className="flex min-h-11 items-center gap-3"><span className="size-[22px] shrink-0" aria-hidden />{body}</div>}
            </li>
          )
        })}
      </ul>

      {r.steps.length > 0 && (
        <>
          <h2 className="mt-8 font-display text-2xl">Pasos</h2>
          <ol className="mt-3 grid gap-2">
            {r.steps.map((s, idx) => {
              const on = done.includes(idx)
              return (
                <li key={idx}>
                  <button className="flex w-full items-start gap-3 rounded-xl p-3 text-left" style={{ background: 'var(--surface)', opacity: on ? 0.55 : 1 }} onClick={() => setDone((d) => (on ? d.filter((x) => x !== idx) : [...d, idx]))} aria-pressed={on}>
                    <span className="grid size-7 shrink-0 place-items-center rounded-full text-sm font-semibold" style={{ background: 'var(--surface-2)' }}>{idx + 1}</span>
                    <span style={{ textDecoration: on ? 'line-through' : 'none' }}>{s}</span>
                  </button>
                </li>
              )
            })}
          </ol>
        </>
      )}
      {r.tips && <p className="mt-6 rounded-xl p-4 text-sm" style={{ background: 'color-mix(in oklab, var(--personal) 12%, transparent)' }}><b>Truco:</b> {r.tips}</p>}

      <button className="btn btn-primary mt-8" onClick={cooked}><ChefHat size={16} aria-hidden /> La cociné hoy</button>

      <RecipeEditor open={editing} recipe={r} pantry={pantry.rows} onClose={() => setEditing(false)}
        onSave={async (v) => { await db.update(r.id, v); setEditing(false) }}
        onDelete={async () => { await db.remove(r.id); nav('/app/cocina') }} />
    </div>
  )
}
