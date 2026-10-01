import { ArrowUpRight, Loader2, Plus } from 'lucide-react'
import { useState } from 'react'
import { hostOf, type LinkRow } from '../../lib/learn'
import { useTable } from '../../lib/table'
import { Empty, ErrorBar } from '../money/shared'
import { LinkSheet, blankLink, toDraft } from './Links'

export default function Portfolio() {
  const db = useTable<LinkRow>('links', { col: 'created_at', asc: false })
  const [draft, setDraft] = useState<Parameters<typeof LinkSheet>[0]['draft']>(null)
  const items = db.rows.filter((l) => l.portfolio)

  return (
    <div>
      <div className="flex items-end justify-between gap-3">
        <div><p className="eyebrow">Descubrir</p><h1 className="mt-2 font-display text-4xl">Portafolio</h1><p className="mt-1 max-w-md text-sm" style={{ color: 'var(--ink-soft)' }}>Tu página y los trabajos que ya publicaste, a un toque para mostrarlos.</p></div>
        <button className="btn btn-primary" onClick={() => setDraft(blankLink(true))}><Plus size={18} aria-hidden /> Trabajo</button>
      </div>
      <ErrorBar msg={db.error} onClose={db.clearError} />

      {db.loading ? <div className="grid h-40 place-items-center"><Loader2 className="animate-spin" aria-label="Cargando" /></div> : items.length === 0 ? (
        <Empty title="Aún no hay trabajos aquí" text="Agrega tu página y los sitios que hiciste. Si ya los tienes en Links, ábrelos y marca “Es parte de mi portafolio”." action="Agregar el primero" onAction={() => setDraft(blankLink(true))} />
      ) : (
        <ul className="mt-6 grid gap-5 sm:grid-cols-2">
          {items.map((l) => (
            <li key={l.id} className="overflow-hidden rounded-2xl border" style={{ background: 'var(--surface)', borderColor: 'var(--line-soft)' }}>
              <a href={l.url} target="_blank" rel="noopener noreferrer" className="block" aria-label={`Abrir ${l.title}`}>
                <span className="grid aspect-[16/10] place-items-center overflow-hidden" style={{ background: 'linear-gradient(150deg, var(--surface-2), var(--bg))' }}>
                  {l.image_url ? <img src={l.image_url} alt="" loading="lazy" referrerPolicy="no-referrer" className="size-full object-cover" /> : <span className="font-display text-5xl" style={{ color: 'var(--accent)' }} aria-hidden>{l.title.slice(0, 1).toUpperCase()}</span>}
                </span>
              </a>
              <div className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0"><h2 className="truncate font-display text-xl">{l.title}</h2><p className="truncate text-xs" style={{ color: 'var(--ink-faint)' }}>{hostOf(l.url)} · {l.category}</p></div>
                  <a href={l.url} target="_blank" rel="noopener noreferrer" className="grid size-11 shrink-0 place-items-center rounded-full border" style={{ borderColor: 'var(--line)' }} aria-label={`Abrir ${l.title}`}><ArrowUpRight size={16} aria-hidden /></a>
                </div>
                {l.description && <p className="mt-2 text-sm" style={{ color: 'var(--ink-soft)' }}>{l.description}</p>}
                <button className="mt-2 min-h-11 text-sm underline" style={{ color: 'var(--ink-soft)' }} onClick={() => setDraft(toDraft(l))}>Editar</button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <LinkSheet draft={draft} setDraft={setDraft} db={db} />
    </div>
  )
}
