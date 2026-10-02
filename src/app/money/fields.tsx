import { Plus } from 'lucide-react'
import { useState } from 'react'
import type { Kind } from '../../lib/finance'
import type { useTaxonomy } from '../../lib/taxonomy'
import { chip } from './shared'

type Tax = ReturnType<typeof useTaxonomy>
const NEW = '__nueva__'

/** Categoría: elige de tu lista o crea una al momento (queda guardada para la próxima). */
export function CategoryField({ kind, value, onChange, tax, label = 'Categoría' }: { kind: Kind; value: string; onChange: (v: string) => void; tax: Tax; label?: string }) {
  const list = tax.cats(kind)
  const known = list.some((c) => c.name === value)
  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState('')

  const create = async () => {
    const name = await tax.ensureCategory(kind, draft)
    if (name) onChange(name)
    setDraft(''); setAdding(false)
  }

  return (
    <div className="grid gap-2 text-sm">
      <label htmlFor={`cat-${kind}`}>{label}</label>
      {adding ? (
        <div className="flex gap-2">
          <input autoFocus className="field" value={draft} onChange={(e) => setDraft(e.target.value)} maxLength={60} placeholder="Nombre de la categoría" onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void create() } if (e.key === 'Escape') setAdding(false) }} />
          <button type="button" className="btn btn-tint shrink-0" onClick={create} disabled={!draft.trim()}>Crear</button>
        </div>
      ) : (
        <select id={`cat-${kind}`} className="field" value={known ? value : value ? '__otra__' : ''} onChange={(e) => { if (e.target.value === NEW) setAdding(true); else onChange(e.target.value) }}>
          {!known && value && <option value="__otra__">{value}</option>}
          {!value && <option value="">Elige una…</option>}
          {list.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
          <option value={NEW}>＋ Nueva categoría…</option>
        </select>
      )}
    </div>
  )
}

/** Área: chips con tus áreas y una para crear otra al momento. */
export function AreaField({ value, onChange, tax }: { value: string; onChange: (v: string) => void; tax: Tax }) {
  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState('')
  const create = async () => {
    const key = await tax.addArea(draft)
    if (key) onChange(key)
    setDraft(''); setAdding(false)
  }
  return (
    <fieldset>
      <legend className="mb-2 text-sm">Área</legend>
      <div className="flex flex-wrap gap-2">
        {tax.areas.map((a) => <button key={a.id} type="button" aria-pressed={value === a.key} onClick={() => onChange(a.key)} className="min-h-11 rounded-full border px-4 text-sm" style={chip(value === a.key, a.color)}>{a.name}</button>)}
        {!adding && <button type="button" onClick={() => setAdding(true)} className="inline-flex min-h-11 items-center gap-1 rounded-full px-4 text-sm" style={{ color: 'var(--accent)', background: 'color-mix(in oklab, var(--accent) 12%, transparent)' }}><Plus size={14} aria-hidden /> Nueva</button>}
      </div>
      {adding && (
        <div className="mt-2 flex gap-2">
          <input autoFocus className="field" value={draft} onChange={(e) => setDraft(e.target.value)} maxLength={40} placeholder="Nombre del área" onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void create() } if (e.key === 'Escape') setAdding(false) }} />
          <button type="button" className="btn btn-tint shrink-0" onClick={create} disabled={!draft.trim()}>Crear</button>
        </div>
      )}
    </fieldset>
  )
}
