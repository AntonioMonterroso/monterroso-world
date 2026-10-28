import { Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import Sheet from '../../components/Sheet'
import { MEALS, ingredientsText, parseIngredients, type Meal, type PantryItem, type Recipe } from '../../lib/kitchen'
import { chip } from '../money/shared'

export type RecipeDraft = Omit<Recipe, 'id' | 'favorite' | 'cooked_count' | 'last_cooked'>
type Form = { title: string; meal: Meal; minutes: string; servings: string; ingredients: string; steps: string; tips: string }

const toForm = (r?: Recipe | null): Form => ({
  title: r?.title ?? '', meal: r?.meal ?? 'almuerzo', minutes: r?.minutes ? String(r.minutes) : '', servings: r?.servings ? String(r.servings) : '',
  ingredients: r ? ingredientsText(r.ingredients) : '', steps: r ? r.steps.join('\n') : '', tips: r?.tips ?? '',
})

/** Hoja para crear o editar una receta. Un ingrediente por línea; la app reconoce solo cuál es de la despensa. */
export default function RecipeEditor({ open, recipe, pantry, onClose, onSave, onDelete }: {
  open: boolean
  recipe?: Recipe | null
  pantry: PantryItem[]
  onClose: () => void
  onSave: (v: RecipeDraft) => Promise<void> | void
  onDelete?: () => Promise<void> | void
}) {
  const [f, setF] = useState<Form>(toForm(recipe))
  const [err, setErr] = useState('')
  const [confirm, setConfirm] = useState(false)
  useEffect(() => { if (open) { setF(toForm(recipe)); setErr(''); setConfirm(false) } }, [open, recipe])

  const num = (s: string, max: number) => { const n = Math.round(Number(s)); return s.trim() && n >= 1 && n <= max ? n : null }
  const save = async () => {
    if (!f.title.trim()) return setErr('Ponle un nombre.')
    const ingredients = parseIngredients(f.ingredients, pantry, recipe?.ingredients)
    if (!ingredients.length) return setErr('Escribe al menos un ingrediente.')
    await onSave({
      title: f.title.trim(), meal: f.meal, minutes: num(f.minutes, 1440), servings: num(f.servings, 50), ingredients,
      steps: f.steps.split('\n').map((s) => s.trim()).filter(Boolean), tips: f.tips.trim() || null,
    })
  }

  return (
    <Sheet open={open} title={recipe ? 'Editar receta' : 'Nueva receta'} onClose={onClose}>
      <form className="grid gap-4" onSubmit={(e) => { e.preventDefault(); void save() }}>
        <label className="grid gap-2 text-sm">Nombre<input className="field" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} maxLength={160} placeholder="Pollo en salsa de tomate" autoFocus /></label>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Tipo de comida">
          {MEALS.map((m) => <button key={m.id} type="button" aria-pressed={f.meal === m.id} onClick={() => setF({ ...f, meal: m.id })} className="min-h-11 rounded-full border px-4 text-sm" style={chip(f.meal === m.id)}>{m.label}</button>)}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <label className="grid gap-2 text-sm">Minutos<input className="field" inputMode="numeric" value={f.minutes} onChange={(e) => setF({ ...f, minutes: e.target.value })} placeholder="30" /></label>
          <label className="grid gap-2 text-sm">Porciones<input className="field" inputMode="numeric" value={f.servings} onChange={(e) => setF({ ...f, servings: e.target.value })} placeholder="4" /></label>
        </div>
        <label className="grid gap-2 text-sm">Ingredientes, uno por línea<textarea className="field py-3" rows={7} value={f.ingredients} onChange={(e) => setF({ ...f, ingredients: e.target.value })} placeholder={'2 pechugas de pollo\n1 cebolla\nCilantro (opcional)'} /></label>
        <p className="-mt-2 text-xs" style={{ color: 'var(--ink-faint)' }}>Escribe «(opcional)» al final si no hace falta tenerlo.</p>
        <label className="grid gap-2 text-sm">Pasos, uno por línea<textarea className="field py-3" rows={7} value={f.steps} onChange={(e) => setF({ ...f, steps: e.target.value })} /></label>
        <label className="grid gap-2 text-sm">Truco o nota<textarea className="field py-3" rows={2} value={f.tips} onChange={(e) => setF({ ...f, tips: e.target.value })} maxLength={1000} /></label>
        {err && <p role="alert" className="text-sm" style={{ color: 'var(--neg)' }}>{err}</p>}
        <div className="flex items-center gap-3">
          <button className="btn btn-primary">Guardar</button>
          {onDelete && <button type="button" className="btn btn-ghost ml-auto" style={{ color: confirm ? 'var(--neg)' : undefined }} onClick={async () => { if (confirm) await onDelete(); else setConfirm(true) }}><Trash2 size={16} aria-hidden /> {confirm ? '¿Seguro?' : 'Eliminar'}</button>}
        </div>
      </form>
    </Sheet>
  )
}
