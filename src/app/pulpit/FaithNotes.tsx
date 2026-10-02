import { Check, Loader2, Plus, Search, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useTable } from '../../lib/table'
import { NOTE_KINDS, type FaithNote, type NoteKind } from '../../lib/pulpit'
import { localISO } from '../../lib/time'
import { PageHeader } from '../../components/ui'

const kindLabel = (k: NoteKind) => NOTE_KINDS.find((x) => x.id === k)?.label ?? k

function NoteForm({ n, onSave, onDelete, onClose }: { n: FaithNote; onSave: (p: Partial<Omit<FaithNote, 'id'>>) => void; onDelete: () => void; onClose: () => void }) {
  const [f, setF] = useState({ kind: n.kind, title: n.title, body: n.body ?? '', reference: n.reference ?? '', speaker: n.speaker ?? '', date: n.note_date })
  const [confirm, setConfirm] = useState(false)
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((p) => ({ ...p, [k]: v }))
  return (
    <form className="grid gap-3 border-t px-4 py-4" style={{ borderColor: 'var(--line-soft)' }} onSubmit={(e) => { e.preventDefault(); if (!f.title.trim()) return; onSave({ kind: f.kind, title: f.title.trim(), body: f.body.trim() || null, reference: f.reference.trim() || null, speaker: f.speaker.trim() || null, note_date: f.date }); onClose() }}>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Tipo">
        {NOTE_KINDS.map((k) => <button key={k.id} type="button" aria-pressed={f.kind === k.id} onClick={() => set('kind', k.id)} className="min-h-11 rounded-full border px-3 text-sm" style={{ borderColor: f.kind === k.id ? 'var(--accent)' : 'var(--line)', color: f.kind === k.id ? 'var(--accent)' : 'var(--ink-soft)' }}>{k.label}</button>)}
      </div>
      <label className="grid gap-2 text-sm">Título<input className="field" value={f.title} onChange={(e) => set('title', e.target.value)} maxLength={200} /></label>
      <div className="grid grid-cols-2 gap-3">
        <label className="grid gap-2 text-sm">Pasaje<input className="field" value={f.reference} onChange={(e) => set('reference', e.target.value)} maxLength={200} placeholder="Salmo 23" /></label>
        <label className="grid gap-2 text-sm">Fecha<input type="date" className="field" value={f.date} onChange={(e) => set('date', e.target.value)} /></label>
      </div>
      {f.kind === 'heard' && <label className="grid gap-2 text-sm">Predicador<input className="field" value={f.speaker} onChange={(e) => set('speaker', e.target.value)} maxLength={200} /></label>}
      <label className="grid gap-2 text-sm">Notas<textarea className="field py-3" rows={5} value={f.body} onChange={(e) => set('body', e.target.value)} maxLength={10000} /></label>
      <div className="flex flex-wrap items-center gap-3">
        <button className="btn btn-primary">Guardar</button>
        <button type="button" className="btn btn-ghost" onClick={onClose}>Cerrar</button>
        <button type="button" className="btn btn-ghost ml-auto" style={{ color: confirm ? 'var(--neg)' : undefined }} onClick={() => (confirm ? onDelete() : setConfirm(true))}><Trash2 size={16} aria-hidden /> {confirm ? '¿Seguro?' : 'Eliminar'}</button>
      </div>
    </form>
  )
}

export default function FaithNotes() {
  const db = useTable<FaithNote>('faith_notes', { col: 'note_date', asc: false })
  const [filter, setFilter] = useState<NoteKind | 'all'>('all')
  const [q, setQ] = useState('')
  const [open, setOpen] = useState<string | null>(null)
  const [sp, setSp] = useSearchParams()

  // Viene del buscador: abre esa nota
  useEffect(() => {
    const id = sp.get('n')
    if (!id || db.loading) return
    if (db.rows.some((n) => n.id === id)) { setOpen(id); setFilter('all'); setQ('') }
    setSp({}, { replace: true })
  }, [sp, db.loading, db.rows, setSp])

  const list = useMemo(() => {
    const t = q.trim().toLowerCase()
    return db.rows.filter((n) => (filter === 'all' || n.kind === filter) && (!t || `${n.title} ${n.body ?? ''} ${n.reference ?? ''}`.toLowerCase().includes(t)))
  }, [db.rows, filter, q])

  const create = async (kind: NoteKind = 'heard') => {
    const n = await db.add({ kind, title: kind === 'prayer' ? 'Nueva petición' : 'Nueva nota', body: null, reference: null, speaker: null, note_date: localISO(), answered: false })
    if (n) setOpen(n.id)
  }

  return (
    <div>
      <PageHeader eyebrow="Púlpito" title="Notas de fe" action={<button className="btn btn-primary" onClick={() => create(filter === 'all' ? 'heard' : filter)}><Plus size={18} aria-hidden /> Nota</button>} />

      <div className="relative mt-6">
        <Search size={16} aria-hidden className="absolute top-1/2 left-4 -translate-y-1/2" style={{ color: 'var(--ink-faint)' }} />
        <input className="field pl-10" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar en tus notas" aria-label="Buscar notas" />
      </div>
      <div role="group" aria-label="Tipo" className="mt-3 flex gap-2 overflow-x-auto pb-1">
        {([{ id: 'all', label: 'Todas' }, ...NOTE_KINDS] as { id: NoteKind | 'all'; label: string }[]).map((k) => <button key={k.id} aria-pressed={filter === k.id} onClick={() => setFilter(k.id)} className="min-h-11 shrink-0 rounded-full border px-4 text-sm" style={{ borderColor: filter === k.id ? 'var(--accent)' : 'var(--line)', background: filter === k.id ? 'var(--accent)' : 'transparent', color: filter === k.id ? 'var(--bg)' : 'var(--ink-soft)' }}>{k.label}</button>)}
      </div>

      {db.error && <p role="alert" className="mt-3 rounded-xl px-3 py-2 text-sm" style={{ background: 'color-mix(in oklab, var(--neg) 15%, transparent)', color: 'var(--neg)' }}>{db.error}</p>}

      {db.loading ? <div className="grid h-48 place-items-center"><Loader2 className="animate-spin" aria-label="Cargando" /></div> : list.length === 0 ? (
        <div className="mt-8 rounded-2xl border px-6 py-10 text-center" style={{ borderColor: 'var(--line-soft)', background: 'var(--surface)' }}>
          <p className="font-display text-2xl">{db.rows.length ? 'Nada coincide' : 'Un lugar para lo que Dios te muestra'}</p>
          <p className="mx-auto mt-2 max-w-sm text-sm" style={{ color: 'var(--ink-soft)' }}>Guarda prédicas que escuchas, versículos, peticiones de oración y mensajes. Marca las peticiones cuando sean respondidas.</p>
        </div>
      ) : (
        <ul className="mt-5 grid gap-2">
          {list.map((n) => (
            <li key={n.id} className="rounded-xl border" style={{ background: 'var(--surface)', borderColor: 'var(--line-soft)', opacity: n.answered ? 0.7 : 1 }}>
              <div className="flex items-center gap-2">
                {n.kind === 'prayer' && (
                  <button onClick={() => db.update(n.id, { answered: !n.answered })} aria-pressed={n.answered} aria-label={n.answered ? 'Marcar como pendiente' : 'Marcar como respondida'} className="grid size-11 shrink-0 place-items-center">
                    <span className="grid size-6 place-items-center rounded-full border" style={{ borderColor: 'var(--pos)', background: n.answered ? 'var(--pos)' : 'transparent', color: 'var(--bg)' }}>{n.answered && <Check size={14} aria-hidden />}</span>
                  </button>
                )}
                <button onClick={() => setOpen(open === n.id ? null : n.id)} className="min-w-0 flex-1 px-4 py-3 text-left" aria-expanded={open === n.id}>
                  <span className="block truncate font-semibold" style={{ textDecoration: n.answered ? 'line-through' : 'none' }}>{n.title}</span>
                  <span className="block truncate text-xs" style={{ color: 'var(--ink-faint)' }}>{[kindLabel(n.kind), n.reference, n.speaker, n.note_date].filter(Boolean).join(' · ')}</span>
                  {open !== n.id && n.body && <span className="mt-1 line-clamp-2 block text-sm" style={{ color: 'var(--ink-soft)' }}>{n.body}</span>}
                </button>
              </div>
              {open === n.id && <NoteForm n={n} onSave={(p) => db.update(n.id, p)} onDelete={() => { db.remove(n.id); setOpen(null) }} onClose={() => setOpen(null)} />}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
