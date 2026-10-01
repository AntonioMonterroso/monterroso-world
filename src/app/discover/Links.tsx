import { ExternalLink, Loader2, Plus, Search, Star, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import Sheet from '../../components/Sheet'
import { LINK_CATEGORIES, hostOf, type LinkRow } from '../../lib/learn'
import { useTable } from '../../lib/table'
import { Empty, ErrorBar, chip } from '../money/shared'

type Draft = { id?: string; url: string; title: string; category: string; description: string; favorite: boolean; portfolio: boolean; image_url: string }
export const blankLink = (portfolio = false): Draft => ({ url: '', title: '', category: portfolio ? 'Clientes' : 'Otros', description: '', favorite: false, portfolio, image_url: '' })
export const toDraft = (l: LinkRow): Draft => ({ id: l.id, url: l.url, title: l.title, category: l.category, description: l.description ?? '', favorite: l.favorite, portfolio: l.portfolio, image_url: l.image_url ?? '' })

const withScheme = (u: string) => { const t = u.trim(); return /^https?:\/\//i.test(t) ? t : t ? `https://${t}` : '' }

/** Hoja para crear o editar un link. La usan el directorio y el portafolio. */
export function LinkSheet({ draft, setDraft, db }: { draft: Draft | null; setDraft: (d: Draft | null) => void; db: ReturnType<typeof useTable<LinkRow>> }) {
  const [err, setErr] = useState('')
  const [confirm, setConfirm] = useState(false)
  useEffect(() => { setErr(''); setConfirm(false) }, [draft?.id, draft === null])

  const save = async () => {
    if (!draft) return
    const url = withScheme(draft.url)
    try { if (!/^https?:$/.test(new URL(url).protocol)) throw new Error('x') } catch { return setErr('Escribe un enlace válido.') }
    const image = draft.image_url.trim()
    if (image && !/^https:\/\//i.test(image)) return setErr('El enlace de la imagen debe empezar con https://')
    const v = { url, title: draft.title.trim() || hostOf(url), category: draft.category.trim() || 'Otros', description: draft.description.trim() || null, favorite: draft.favorite, portfolio: draft.portfolio, image_url: image || null }
    if (draft.id) await db.update(draft.id, v); else await db.add({ ...v, created_at: undefined as never })
    setDraft(null)
  }

  return (
    <Sheet open={Boolean(draft)} title={draft?.id ? 'Editar link' : 'Nuevo link'} onClose={() => setDraft(null)}>
      {draft && (
        <form className="grid gap-4" onSubmit={(e) => { e.preventDefault(); void save() }}>
          <label className="grid gap-2 text-sm">Enlace<input className="field" inputMode="url" value={draft.url} onChange={(e) => setDraft({ ...draft, url: e.target.value })} placeholder="https://" maxLength={1000} autoFocus autoComplete="off" /></label>
          <label className="grid gap-2 text-sm">Nombre<input className="field" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} maxLength={200} placeholder={draft.url ? hostOf(withScheme(draft.url)) : 'Cómo quieres verlo'} /></label>
          <label className="grid gap-2 text-sm">Categoría
            <input className="field" list="lcats" value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })} maxLength={60} />
            <datalist id="lcats">{LINK_CATEGORIES.map((c) => <option key={c} value={c} />)}</datalist>
          </label>
          <label className="grid gap-2 text-sm">Descripción (opcional)<textarea className="field py-3" rows={2} value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} maxLength={500} /></label>
          <label className="flex min-h-11 items-center gap-3 text-sm"><input type="checkbox" className="size-5" checked={draft.favorite} onChange={(e) => setDraft({ ...draft, favorite: e.target.checked })} /> Favorito</label>
          <label className="flex min-h-11 items-center gap-3 text-sm"><input type="checkbox" className="size-5" checked={draft.portfolio} onChange={(e) => setDraft({ ...draft, portfolio: e.target.checked })} /> Es parte de mi portafolio</label>
          {draft.portfolio && <label className="grid gap-2 text-sm">Imagen o captura (enlace https, opcional)<input className="field" inputMode="url" value={draft.image_url} onChange={(e) => setDraft({ ...draft, image_url: e.target.value })} maxLength={1000} placeholder="https://" /></label>}
          {err && <p role="alert" className="text-sm" style={{ color: '#e8a393' }}>{err}</p>}
          <div className="flex items-center gap-3">
            <button className="btn btn-primary">Guardar</button>
            {draft.id && <button type="button" className="btn btn-ghost ml-auto" style={{ color: confirm ? '#e8a393' : undefined }} onClick={async () => { if (confirm) { await db.remove(draft.id!); setDraft(null) } else setConfirm(true) }}><Trash2 size={16} aria-hidden /> {confirm ? '¿Seguro?' : 'Eliminar'}</button>}
          </div>
        </form>
      )}
    </Sheet>
  )
}

export default function Links() {
  const db = useTable<LinkRow>('links', { col: 'created_at', asc: false })
  const [sp, setSp] = useSearchParams()
  const [q, setQ] = useState('')
  const [cat, setCat] = useState('')
  const [favs, setFavs] = useState(false)
  const [draft, setDraft] = useState<Draft | null>(null)

  // Viene del buscador general
  useEffect(() => { const s = sp.get('q'); if (s) { setQ(s); setSp({}, { replace: true }) } }, [sp, setSp])

  const cats = useMemo(() => [...new Set(db.rows.map((l) => l.category))].sort((a, b) => a.localeCompare(b, 'es')), [db.rows])
  const list = useMemo(() => {
    const t = q.trim().toLowerCase()
    return db.rows
      .filter((l) => (!cat || l.category === cat) && (!favs || l.favorite) && (!t || `${l.title} ${l.url} ${l.description ?? ''} ${l.category}`.toLowerCase().includes(t)))
      .sort((a, b) => Number(b.favorite) - Number(a.favorite) || a.title.localeCompare(b.title, 'es'))
  }, [db.rows, q, cat, favs])

  return (
    <div>
      <div className="flex items-end justify-between gap-3">
        <div><p className="eyebrow">Descubrir</p><h1 className="mt-2 font-display text-4xl">Links</h1></div>
        <button className="btn btn-primary" onClick={() => setDraft(blankLink())}><Plus size={18} aria-hidden /> Link</button>
      </div>
      <ErrorBar msg={db.error} onClose={db.clearError} />

      <div className="relative mt-6">
        <Search size={16} aria-hidden className="absolute top-1/2 left-4 -translate-y-1/2" style={{ color: 'var(--ink-faint)' }} />
        <input className="field pl-10" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nombre, dirección o categoría" aria-label="Buscar links" autoComplete="off" />
      </div>
      {db.rows.length > 0 && (
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Categoría">
          <button aria-pressed={favs} onClick={() => setFavs((v) => !v)} className="inline-flex min-h-11 shrink-0 items-center gap-1 rounded-full border px-4 text-sm" style={chip(favs, 'var(--personal)')}><Star size={14} aria-hidden /> Favoritos</button>
          <button aria-pressed={!cat} onClick={() => setCat('')} className="min-h-11 shrink-0 rounded-full border px-4 text-sm" style={chip(!cat)}>Todos</button>
          {cats.map((c) => <button key={c} aria-pressed={cat === c} onClick={() => setCat(cat === c ? '' : c)} className="min-h-11 shrink-0 rounded-full border px-4 text-sm" style={chip(cat === c)}>{c}</button>)}
        </div>
      )}

      {db.loading ? <div className="grid h-40 place-items-center"><Loader2 className="animate-spin" aria-label="Cargando" /></div> : db.rows.length === 0 ? (
        <Empty title="Tu directorio de links" text="Guarda lo que usas seguido: documentación, herramientas, referencias, accesos de clientes. Ordénalo por categoría y búscalo en un segundo." action="Guardar el primero" onAction={() => setDraft(blankLink())} />
      ) : (
        <ul className="mt-5 grid gap-2">
          {list.map((l) => (
            <li key={l.id} className="flex items-center rounded-xl border" style={{ background: 'var(--surface)', borderColor: 'var(--line-soft)' }}>
              <button className="grid size-11 shrink-0 place-items-center" onClick={() => db.update(l.id, { favorite: !l.favorite })} aria-pressed={l.favorite} aria-label={l.favorite ? `Quitar ${l.title} de favoritos` : `Marcar ${l.title} como favorito`}><Star size={16} aria-hidden fill={l.favorite ? 'var(--personal)' : 'none'} style={{ color: l.favorite ? 'var(--personal)' : 'var(--ink-faint)' }} /></button>
              <a href={l.url} target="_blank" rel="noopener noreferrer" className="min-w-0 flex-1 py-3 pr-2">
                <span className="block truncate font-semibold">{l.title}</span>
                <span className="block truncate text-xs" style={{ color: 'var(--ink-faint)' }}>{hostOf(l.url)} · {l.category}{l.portfolio ? ' · portafolio' : ''}</span>
                {l.description && <span className="mt-0.5 line-clamp-1 block text-xs" style={{ color: 'var(--ink-soft)' }}>{l.description}</span>}
              </a>
              <ExternalLink size={14} aria-hidden style={{ color: 'var(--ink-faint)' }} />
              <button className="min-h-11 px-3 text-sm underline" style={{ color: 'var(--ink-soft)' }} onClick={() => setDraft(toDraft(l))}>Editar</button>
            </li>
          ))}
          {list.length === 0 && <li className="text-sm" style={{ color: 'var(--ink-soft)' }}>Nada coincide.</li>}
        </ul>
      )}
      <LinkSheet draft={draft} setDraft={setDraft} db={db} />
    </div>
  )
}
