import { Camera, ExternalLink, ImagePlus, Loader2, Play, Plus, Search, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import Sheet from '../../components/Sheet'
import { useAuth } from '../../lib/auth'
import { inspirationEmbed, normalizeTags, type Board, type InspKind, type Inspiration } from '../../lib/inspire'
import { hostOf } from '../../lib/learn'
import { removeImage, signedUrls, uploadImage } from '../../lib/storage'
import { useTable } from '../../lib/table'
import { Empty, ErrorBar, chip } from '../money/shared'

type Draft = { id?: string; kind: InspKind; title: string; url: string; note: string; tags: string; board: string; newBoard: string; file: File | null; preview: string; image_path: string | null }
const blank = (): Draft => ({ kind: 'link', title: '', url: '', note: '', tags: '', board: '', newBoard: '', file: null, preview: '', image_path: null })
const KINDS: { id: InspKind; label: string }[] = [{ id: 'link', label: 'Link' }, { id: 'image', label: 'Imagen' }, { id: 'note', label: 'Nota' }]

function Card({ item, img, boardName, onEdit, onTag }: { item: Inspiration; img?: string; boardName?: string; onEdit: () => void; onTag: (t: string) => void }) {
  const [play, setPlay] = useState(false)
  const embed = item.kind === 'link' && item.url ? inspirationEmbed(item.url) : null
  return (
    <li className="overflow-hidden rounded-2xl border" style={{ background: 'var(--surface)', borderColor: 'var(--line-soft)' }}>
      {item.kind === 'image' && (img ? <img src={img} alt={item.title} loading="lazy" className="w-full object-cover" style={{ maxHeight: 420 }} /> : <div className="grid h-40 place-items-center text-sm" style={{ color: 'var(--ink-faint)' }}>Cargando imagen…</div>)}
      {embed && (play
        ? <div style={{ aspectRatio: embed.ratio ?? undefined, height: embed.ratio ? undefined : embed.height }} className="w-full"><iframe title={item.title} src={embed.src} className="size-full border-0" allow="autoplay; encrypted-media; fullscreen; picture-in-picture" allowFullScreen referrerPolicy="no-referrer" sandbox="allow-scripts allow-same-origin allow-presentation allow-popups" /></div>
        : <button onClick={() => setPlay(true)} className="flex min-h-24 w-full items-center justify-center gap-2 text-sm" style={{ background: 'linear-gradient(150deg, var(--surface-2), var(--bg))' }} aria-label={`Reproducir ${item.title}`}><Play size={18} aria-hidden /> Reproducir aquí</button>)}
      <div className="p-4">
        <h2 className="font-semibold">{item.title}</h2>
        {item.url && <a href={item.url} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex min-h-8 items-center gap-1 text-xs underline" style={{ color: 'var(--sky)' }}><ExternalLink size={12} aria-hidden /> {hostOf(item.url)}</a>}
        {item.note && <p className="mt-2 whitespace-pre-wrap text-sm" style={{ color: 'var(--ink-soft)' }}>{item.note}</p>}
        {(item.tags.length > 0 || boardName) && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {boardName && <span className="rounded-full px-2 py-0.5 text-xs" style={{ background: 'color-mix(in oklab, var(--accent) 16%, transparent)', color: 'var(--accent)' }}>{boardName}</span>}
            {item.tags.map((t) => <button key={t} onClick={() => onTag(t)} className="min-h-7 rounded-full px-2 text-xs" style={{ background: 'var(--surface-2)', color: 'var(--sky)' }}>#{t}</button>)}
          </div>
        )}
        <button className="mt-2 min-h-11 text-sm underline" style={{ color: 'var(--ink-soft)' }} onClick={onEdit}>Editar</button>
      </div>
    </li>
  )
}

export default function Inspiration() {
  const { session } = useAuth()
  const db = useTable<Inspiration>('inspirations', { col: 'created_at', asc: false })
  const boards = useTable<Board>('boards', { col: 'name', asc: true })
  const [q, setQ] = useState('')
  const [board, setBoard] = useState('')
  const [tag, setTag] = useState('')
  const [draft, setDraft] = useState<Draft | null>(null)
  const [urls, setUrls] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [confirm, setConfirm] = useState(false)
  const [sp, setSp] = useSearchParams()
  useEffect(() => { if (sp.get('nuevo')) { setDraft(blank()); setSp({}, { replace: true }) } }, [sp, setSp])
  const pick = useRef<HTMLInputElement>(null)
  const cam = useRef<HTMLInputElement>(null)

  // Enlaces temporales para las imágenes que se ven
  useEffect(() => {
    const need = db.rows.filter((r) => r.image_path && !urls[r.image_path]).map((r) => r.image_path!)
    if (need.length) signedUrls(need).then((m) => setUrls((u) => ({ ...u, ...m })))
  }, [db.rows]) // eslint-disable-line react-hooks/exhaustive-deps

  const tags = useMemo(() => [...new Set(db.rows.flatMap((r) => r.tags))].sort(), [db.rows])
  const list = useMemo(() => {
    const t = q.trim().toLowerCase()
    return db.rows.filter((r) => (!board || r.board_id === board) && (!tag || r.tags.includes(tag)) && (!t || `${r.title} ${r.note ?? ''} ${r.url ?? ''} ${r.tags.join(' ')}`.toLowerCase().includes(t)))
  }, [db.rows, board, tag, q])

  const onFile = (f: File | undefined) => {
    if (!f || !draft) return
    if (!f.type.startsWith('image/')) return setErr('Elige una imagen.')
    setErr(''); setDraft({ ...draft, file: f, preview: URL.createObjectURL(f), title: draft.title || f.name.replace(/\.[^.]+$/, '') })
  }

  const save = async () => {
    if (!draft) return
    const title = draft.title.trim()
    if (!title) return setErr('Ponle un título.')
    if (draft.kind === 'link' && !/^https?:\/\//i.test(draft.url.trim())) return setErr('El enlace debe empezar con https://')
    if (draft.kind === 'image' && !draft.file && !draft.image_path) return setErr('Elige o toma una imagen.')
    setBusy(true); setErr('')
    try {
      let boardId = draft.board || null
      if (draft.newBoard.trim()) {
        const name = draft.newBoard.trim()
        const existing = boards.rows.find((b) => b.name.toLowerCase() === name.toLowerCase())
        boardId = existing?.id ?? (await boards.add({ name }))?.id ?? null
      }
      let path = draft.image_path
      if (draft.kind === 'image' && draft.file) { path = await uploadImage(session?.user.id, draft.file); if (draft.image_path) void removeImage(draft.image_path) }
      const v = { kind: draft.kind, title, url: draft.kind === 'link' ? draft.url.trim() : null, note: draft.note.trim() || null, tags: normalizeTags(draft.tags), board_id: boardId, image_path: draft.kind === 'image' ? path : null }
      if (draft.id) await db.update(draft.id, v); else await db.add({ ...v, created_at: undefined as never })
      setDraft(null)
    } catch { setErr('No se pudo guardar. Revisa tu conexión e intenta de nuevo.') }
    setBusy(false)
  }

  const remove = async (r: Inspiration) => { if (r.image_path) await removeImage(r.image_path); await db.remove(r.id); setDraft(null); setConfirm(false) }

  const edit = (r: Inspiration) => { setConfirm(false); setErr(''); setDraft({ id: r.id, kind: r.kind, title: r.title, url: r.url ?? '', note: r.note ?? '', tags: r.tags.join(', '), board: r.board_id ?? '', newBoard: '', file: null, preview: r.image_path ? urls[r.image_path] ?? '' : '', image_path: r.image_path }) }
  const editing = draft?.id ? db.rows.find((r) => r.id === draft.id) : undefined

  return (
    <div>
      <div className="flex items-end justify-between gap-3">
        <div><p className="eyebrow">Descubrir</p><h1 className="mt-2 font-display text-4xl">Inspiración</h1></div>
        <button className="btn btn-primary" onClick={() => { setErr(''); setDraft(blank()) }}><Plus size={18} aria-hidden /> Guardar</button>
      </div>
      <ErrorBar msg={db.error || boards.error} onClose={db.clearError} />

      <div className="relative mt-6">
        <Search size={16} aria-hidden className="absolute top-1/2 left-4 -translate-y-1/2" style={{ color: 'var(--ink-faint)' }} />
        <input className="field pl-10" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar en tu inspiración" aria-label="Buscar inspiración" autoComplete="off" />
      </div>
      {boards.rows.length > 0 && (
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Tablero">
          <button aria-pressed={!board} onClick={() => setBoard('')} className="min-h-11 shrink-0 rounded-full border px-4 text-sm" style={chip(!board)}>Todo</button>
          {boards.rows.map((b) => <button key={b.id} aria-pressed={board === b.id} onClick={() => setBoard(board === b.id ? '' : b.id)} className="min-h-11 shrink-0 rounded-full border px-4 text-sm" style={chip(board === b.id)}>{b.name}</button>)}
        </div>
      )}
      {tags.length > 0 && (
        <div className="mt-2 flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Etiquetas">
          {tags.map((t) => <button key={t} aria-pressed={tag === t} onClick={() => setTag(tag === t ? '' : t)} className="min-h-11 shrink-0 rounded-full border px-3 text-sm" style={chip(tag === t, 'var(--sky)')}>#{t}</button>)}
        </div>
      )}

      {db.loading ? <div className="grid h-40 place-items-center"><Loader2 className="animate-spin" aria-label="Cargando" /></div> : db.rows.length === 0 ? (
        <Empty title="Todo lo que te inspira, en un lugar" text="Guarda enlaces, canciones, videos, fotos y notas. Ordénalos en tableros y con etiquetas, y escucha o mira lo que guardaste sin salir." action="Guardar lo primero" onAction={() => setDraft(blank())} />
      ) : (
        <ul className="mt-5 grid items-start gap-4 sm:grid-cols-2">
          {list.map((r) => <Card key={r.id} item={r} img={r.image_path ? urls[r.image_path] : undefined} boardName={boards.rows.find((b) => b.id === r.board_id)?.name} onEdit={() => edit(r)} onTag={setTag} />)}
          {list.length === 0 && <li className="text-sm" style={{ color: 'var(--ink-soft)' }}>Nada coincide.</li>}
        </ul>
      )}

      <Sheet open={Boolean(draft)} title={draft?.id ? 'Editar' : 'Guardar inspiración'} onClose={() => setDraft(null)}>
        {draft && (
          <form className="grid gap-4" onSubmit={(e) => { e.preventDefault(); void save() }}>
            {!draft.id && <div className="flex gap-2" role="group" aria-label="Tipo">{KINDS.map((k) => <button key={k.id} type="button" aria-pressed={draft.kind === k.id} onClick={() => setDraft({ ...draft, kind: k.id })} className="min-h-11 rounded-full border px-4 text-sm" style={chip(draft.kind === k.id)}>{k.label}</button>)}</div>}
            {draft.kind === 'image' && (
              <div className="grid gap-2">
                {draft.preview && <img src={draft.preview} alt="Vista previa" className="max-h-56 rounded-xl object-contain" />}
                <div className="flex flex-wrap gap-2">
                  <button type="button" className="btn btn-ghost" onClick={() => pick.current?.click()}><ImagePlus size={16} aria-hidden /> {draft.preview ? 'Cambiar' : 'Elegir imagen'}</button>
                  <button type="button" className="btn btn-ghost" onClick={() => cam.current?.click()}><Camera size={16} aria-hidden /> Tomar foto</button>
                </div>
                <input ref={pick} type="file" accept="image/*" hidden onChange={(e) => onFile(e.target.files?.[0])} />
                <input ref={cam} type="file" accept="image/*" capture="environment" hidden onChange={(e) => onFile(e.target.files?.[0])} />
                <p className="text-xs" style={{ color: 'var(--ink-faint)' }}>Se reduce y se guarda en tu almacenamiento privado; solo tú la ves.</p>
              </div>
            )}
            {draft.kind === 'link' && <label className="grid gap-2 text-sm">Enlace<input className="field" inputMode="url" value={draft.url} onChange={(e) => setDraft({ ...draft, url: e.target.value })} placeholder="https://" maxLength={1000} autoComplete="off" autoFocus />{draft.url && inspirationEmbed(draft.url) && <span className="text-xs" style={{ color: '#8fd1a4' }}>Se podrá reproducir aquí mismo.</span>}</label>}
            <label className="grid gap-2 text-sm">Título<input className="field" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} maxLength={200} /></label>
            <label className="grid gap-2 text-sm">Nota<textarea className="field py-3" rows={3} value={draft.note} onChange={(e) => setDraft({ ...draft, note: e.target.value })} maxLength={2000} placeholder={draft.kind === 'note' ? 'La idea completa' : 'Por qué te gustó'} /></label>
            <label className="grid gap-2 text-sm">Etiquetas<input className="field" value={draft.tags} onChange={(e) => setDraft({ ...draft, tags: e.target.value })} placeholder="diseño, logos, referencia" maxLength={300} autoComplete="off" /></label>
            <div className="grid grid-cols-2 gap-3">
              <label className="grid gap-2 text-sm">Tablero<select className="field" value={draft.board} onChange={(e) => setDraft({ ...draft, board: e.target.value })}><option value="">Sin tablero</option>{boards.rows.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select></label>
              <label className="grid gap-2 text-sm">O uno nuevo<input className="field" value={draft.newBoard} onChange={(e) => setDraft({ ...draft, newBoard: e.target.value })} maxLength={80} placeholder="Logos, Sonidos…" /></label>
            </div>
            {err && <p role="alert" className="text-sm" style={{ color: '#e8a393' }}>{err}</p>}
            <div className="flex items-center gap-3">
              <button className="btn btn-primary" disabled={busy}>{busy && <Loader2 size={16} className="animate-spin" aria-hidden />} Guardar</button>
              {editing && <button type="button" className="btn btn-ghost ml-auto" style={{ color: confirm ? '#e8a393' : undefined }} onClick={() => (confirm ? remove(editing) : setConfirm(true))}><Trash2 size={16} aria-hidden /> {confirm ? '¿Seguro?' : 'Eliminar'}</button>}
            </div>
          </form>
        )}
      </Sheet>
    </div>
  )
}
