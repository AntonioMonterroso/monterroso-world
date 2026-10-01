import { Briefcase, Check, Cloud, Copy, Eye, EyeOff, ExternalLink, KeyRound, Loader2, Lock, Mail, Pencil, Plus, Search, Settings as Cog, StickyNote, Trash2, X } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import Sheet from '../../components/Sheet'
import { supabase } from '../../lib/supabase'
import { useTable } from '../../lib/table'
import { CATEGORIES, TEMPLATES, VaultError, decryptItem, encryptItem, type Category, type DataKey, type Field, type ItemPayload } from '../../lib/vault'
import { copySecret, lockVault } from '../../lib/vaultSession'
import type { Project } from '../../lib/projects'
import { chip } from '../money/shared'
import VaultSettings from './VaultSettings'
import type { VaultMeta } from '../../lib/vault'

type Row = { id: string; category: Category; critical: boolean; project_id: string | null; ciphertext: string; iv: string; updated_at: string }
type Item = { id: string; category: Category; critical: boolean; project_id: string | null; payload: ItemPayload | null; updated_at: string }

const icons = { password: KeyRound, email: Mail, client: Briefcase, api: Cloud, note: StickyNote } as const

function FieldRow({ f, onCopy }: { f: Field; onCopy: (v: string) => void }) {
  const [show, setShow] = useState(false)
  const [done, setDone] = useState(false)
  if (!f.value) return null
  return (
    <div className="flex items-center gap-2 rounded-xl px-3" style={{ background: 'var(--bg)' }}>
      <div className="min-w-0 flex-1 py-2">
        <p className="text-xs" style={{ color: 'var(--ink-faint)' }}>{f.label}</p>
        <p className="break-all text-sm" style={{ fontFamily: f.secret && show ? 'ui-monospace, Menlo, monospace' : undefined }}>{f.secret && !show ? '•'.repeat(Math.min(14, Math.max(8, f.value.length))) : f.value}</p>
      </div>
      {f.secret && <button className="grid size-11 place-items-center" onClick={() => setShow((v) => !v)} aria-label={show ? `Ocultar ${f.label}` : `Mostrar ${f.label}`}>{show ? <EyeOff size={16} aria-hidden /> : <Eye size={16} aria-hidden />}</button>}
      <button className="grid size-11 place-items-center" aria-label={`Copiar ${f.label}`} onClick={() => { onCopy(f.value); setDone(true); setTimeout(() => setDone(false), 1500) }}>{done ? <Check size={16} aria-hidden style={{ color: '#8fd1a4' }} /> : <Copy size={16} aria-hidden />}</button>
    </div>
  )
}

type Draft = { id: string | null; category: Category; critical: boolean; project_id: string; title: string; url: string; fields: Field[]; notes: string }
const blank = (c: Category): Draft => ({ id: null, category: c, critical: false, project_id: '', title: '', url: '', fields: TEMPLATES[c].map((f) => ({ ...f })), notes: '' })

export default function Items({ dk, meta, onMeta, userName }: { dk: DataKey; meta: VaultMeta; onMeta: (m: VaultMeta | null) => void; userName: string }) {
  const rows = useTable<Row>('vault_items', { col: 'updated_at', asc: false })
  const projects = useTable<Project>('projects', { col: 'created_at', asc: false })
  const [items, setItems] = useState<Item[]>([])
  const [ready, setReady] = useState(false)
  const [q, setQ] = useState('')
  const [cat, setCat] = useState<Category | 'all'>('all')
  const [openId, setOpenId] = useState<string | null>(null)
  const [draft, setDraft] = useState<Draft | null>(null)
  const [settings, setSettings] = useState(false)
  const [toast, setToast] = useState('')
  const [err, setErr] = useState('')
  const [confirm, setConfirm] = useState(false)
  const [busy, setBusy] = useState(false)

  // Descifra en este dispositivo todo lo que llega del servidor
  useEffect(() => {
    let alive = true
    ;(async () => {
      const out = await Promise.all(rows.rows.map(async (r): Promise<Item> => {
        try { return { id: r.id, category: r.category, critical: r.critical, project_id: r.project_id, updated_at: r.updated_at, payload: await decryptItem(dk, r.id, r) } }
        catch (e) { return { id: r.id, category: r.category, critical: r.critical, project_id: r.project_id, updated_at: r.updated_at, payload: e instanceof VaultError ? null : null } }
      }))
      if (alive) { setItems(out); setReady(true) }
    })()
    return () => { alive = false }
  }, [rows.rows, dk])

  const copy = useCallback(async (v: string) => {
    const ok = await copySecret(v)
    setToast(ok ? 'Copiado. Se borra del portapapeles en 30 s.' : 'No pude copiar. Mantén presionado para copiar a mano.')
    setTimeout(() => setToast(''), 3000)
  }, [])

  const list = useMemo(() => {
    const t = q.trim().toLowerCase()
    return items.filter((i) => (cat === 'all' || i.category === cat) && (!t || (i.payload && [i.payload.title, i.payload.url ?? '', ...i.payload.fields.filter((f) => !f.secret).map((f) => f.value)].join(' ').toLowerCase().includes(t))))
  }, [items, q, cat])

  const open = items.find((i) => i.id === openId)
  const projectName = (id: string | null) => projects.rows.find((p) => p.id === id)?.title

  const save = async () => {
    if (!draft) return
    if (!draft.title.trim()) return setErr('Ponle un nombre.')
    setBusy(true); setErr('')
    const id = draft.id ?? crypto.randomUUID()
    const payload: ItemPayload = { title: draft.title.trim(), url: draft.url.trim() || undefined, fields: draft.fields.filter((f) => f.label.trim() || f.value), notes: draft.notes.trim() || undefined }
    try {
      const enc = await encryptItem(dk, id, payload)
      const base = { category: draft.category, critical: draft.critical, project_id: draft.project_id || null, ...enc }
      const { error } = draft.id ? await supabase.from('vault_items').update(base).eq('id', id) : await supabase.from('vault_items').insert({ id, ...base })
      if (error) throw error
      await rows.reload()
      setDraft(null); setOpenId(id)
    } catch { setErr('No se pudo guardar. Intenta de nuevo.') }
    setBusy(false)
  }

  const remove = async (id: string) => {
    await rows.remove(id)
    setOpenId(null); setConfirm(false)
  }

  const edit = (i: Item) => i.payload && setDraft({ id: i.id, category: i.category, critical: i.critical, project_id: i.project_id ?? '', title: i.payload.title, url: i.payload.url ?? '', fields: i.payload.fields.map((f) => ({ ...f })), notes: i.payload.notes ?? '' })

  const setField = (idx: number, patch: Partial<Field>) => setDraft((d) => d && { ...d, fields: d.fields.map((f, i) => (i === idx ? { ...f, ...patch } : f)) })

  return (
    <div>
      <div className="flex items-end justify-between gap-3">
        <div><p className="eyebrow">Bóveda</p><h1 className="mt-2 font-display text-4xl">Tus accesos</h1></div>
        <div className="flex gap-2">
          <button className="grid size-12 place-items-center rounded-full border" style={{ borderColor: 'var(--line)' }} onClick={() => setSettings(true)} aria-label="Ajustes de la bóveda"><Cog size={18} aria-hidden /></button>
          <button className="btn btn-ghost" onClick={lockVault}><Lock size={16} aria-hidden /> Bloquear</button>
        </div>
      </div>

      <div className="relative mt-6">
        <Search size={16} aria-hidden className="absolute top-1/2 left-4 -translate-y-1/2" style={{ color: 'var(--ink-faint)' }} />
        <input className="field pl-10" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar" aria-label="Buscar en la bóveda" autoComplete="off" />
      </div>
      <div role="group" aria-label="Categoría" className="mt-3 flex gap-2 overflow-x-auto pb-1">
        {([{ id: 'all', label: 'Todo' }, ...CATEGORIES] as { id: Category | 'all'; label: string }[]).map((c) => <button key={c.id} aria-pressed={cat === c.id} onClick={() => setCat(c.id)} className="min-h-11 shrink-0 rounded-full border px-4 text-sm" style={chip(cat === c.id)}>{c.label}</button>)}
      </div>

      {(rows.error) && <p role="alert" className="mt-3 rounded-xl px-3 py-2 text-sm" style={{ background: 'color-mix(in oklab, #e8a393 15%, transparent)', color: '#e8a393' }}>{rows.error}</p>}

      {rows.loading || !ready ? <div className="grid h-40 place-items-center"><Loader2 className="animate-spin" aria-label="Descifrando" /></div> : list.length === 0 ? (
        <div className="mt-8 rounded-2xl border px-6 py-10 text-center" style={{ borderColor: 'var(--line-soft)', background: 'var(--surface)' }}>
          <p className="font-display text-2xl">{items.length ? 'Nada coincide' : 'Aún no hay nada guardado'}</p>
          {!items.length && <p className="mx-auto mt-2 max-w-sm text-sm" style={{ color: 'var(--ink-soft)' }}>Guarda contraseñas, correos y accesos de clientes con su base de datos y llaves. Todo cifrado aquí antes de subirse.</p>}
        </div>
      ) : (
        <ul className="mt-5 grid gap-2">
          {list.map((i) => {
            const Icon = icons[i.category]
            const sub = i.payload ? (i.payload.fields.find((f) => !f.secret && f.value)?.value ?? i.payload.url ?? '') : ''
            return (
              <li key={i.id}>
                <button onClick={() => { setOpenId(i.id); setConfirm(false) }} className="flex min-h-14 w-full items-center gap-3 rounded-xl border px-4 py-3 text-left" style={{ background: 'var(--surface)', borderColor: 'var(--line-soft)' }}>
                  <Icon size={18} aria-hidden style={{ color: 'var(--ink-faint)' }} />
                  <span className="min-w-0 flex-1"><span className="block truncate font-semibold">{i.payload?.title ?? 'No se pudo descifrar'}</span><span className="block truncate text-xs" style={{ color: 'var(--ink-faint)' }}>{[sub, projectName(i.project_id)].filter(Boolean).join(' · ')}</span></span>
                  {i.critical && <span className="rounded-full px-2 py-0.5 text-xs" style={{ background: 'color-mix(in oklab, #e8a393 18%, transparent)', color: '#e8a393' }}>Crítica</span>}
                </button>
              </li>
            )
          })}
        </ul>
      )}

      <button className="btn btn-primary fixed right-4 z-30 shadow-lg" style={{ bottom: 'calc(5rem + env(safe-area-inset-bottom))' }} onClick={() => setDraft({ ...blank('password'), id: null })} aria-label="Nuevo elemento"><Plus size={18} aria-hidden /> Nuevo</button>

      {toast && <div role="status" className="fixed left-1/2 z-50 -translate-x-1/2 rounded-full px-5 py-3 text-sm" style={{ bottom: 'calc(8rem + env(safe-area-inset-bottom))', background: 'var(--surface-2)', border: '1px solid var(--line)' }}>{toast}</div>}

      {/* Ver */}
      <Sheet open={Boolean(open) && !draft} title={open?.payload?.title ?? 'Elemento'} onClose={() => setOpenId(null)}>
        {open && (open.payload ? (
          <div className="grid gap-3">
            <p className="text-xs" style={{ color: 'var(--ink-faint)' }}>{CATEGORIES.find((c) => c.id === open.category)?.label}{open.project_id && projectName(open.project_id) ? ` · ${projectName(open.project_id)}` : ''}</p>
            {open.payload.url && /^https?:\/\//i.test(open.payload.url) && <a href={open.payload.url} target="_blank" rel="noreferrer noopener" className="inline-flex min-h-11 items-center gap-2 text-sm underline" style={{ color: 'var(--sky)' }}><ExternalLink size={14} aria-hidden /> {open.payload.url}</a>}
            {open.payload.fields.map((f, i) => <FieldRow key={i} f={f} onCopy={copy} />)}
            {open.payload.notes && <p className="whitespace-pre-wrap rounded-xl px-3 py-2 text-sm" style={{ background: 'var(--bg)', color: 'var(--ink-soft)' }}>{open.payload.notes}</p>}
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <button className="btn btn-primary" onClick={() => edit(open)}><Pencil size={16} aria-hidden /> Editar</button>
              <button className="btn btn-ghost ml-auto" style={{ color: confirm ? '#e8a393' : undefined }} onClick={() => (confirm ? remove(open.id) : setConfirm(true))}><Trash2 size={16} aria-hidden /> {confirm ? '¿Seguro?' : 'Eliminar'}</button>
            </div>
          </div>
        ) : <p className="text-sm" style={{ color: '#e8a393' }}>Este elemento no se pudo descifrar con la llave actual.</p>)}
      </Sheet>

      {/* Crear / editar */}
      <Sheet open={Boolean(draft)} title={draft?.id ? 'Editar' : 'Nuevo elemento'} onClose={() => { setDraft(null); setErr('') }}>
        {draft && (
          <form className="grid gap-4" onSubmit={(e) => { e.preventDefault(); void save() }}>
            {!draft.id && (
              <fieldset>
                <legend className="mb-2 text-sm">Tipo</legend>
                <div className="flex flex-wrap gap-2">{CATEGORIES.map((c) => <button key={c.id} type="button" aria-pressed={draft.category === c.id} onClick={() => setDraft({ ...draft, category: c.id, fields: TEMPLATES[c.id].map((f) => ({ ...f })) })} className="min-h-11 rounded-full border px-4 text-sm" style={chip(draft.category === c.id)}>{c.label}</button>)}</div>
              </fieldset>
            )}
            <label className="grid gap-2 text-sm">Nombre<input className="field" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} maxLength={200} autoComplete="off" /></label>
            <label className="grid gap-2 text-sm">Enlace (opcional)<input className="field" inputMode="url" value={draft.url} onChange={(e) => setDraft({ ...draft, url: e.target.value })} maxLength={500} placeholder="https://" autoComplete="off" /></label>
            <div className="grid gap-3">
              {draft.fields.map((f, i) => (
                <div key={i} className="grid gap-2 rounded-xl border p-3" style={{ borderColor: 'var(--line)' }}>
                  <div className="flex gap-2">
                    <input className="field" value={f.label} onChange={(e) => setField(i, { label: e.target.value })} placeholder="Campo" aria-label="Nombre del campo" maxLength={60} autoComplete="off" />
                    <button type="button" className="grid size-12 shrink-0 place-items-center" onClick={() => setDraft({ ...draft, fields: draft.fields.filter((_, j) => j !== i) })} aria-label={`Quitar ${f.label || 'campo'}`}><X size={16} aria-hidden /></button>
                  </div>
                  <input className="field" type={f.secret ? 'password' : 'text'} value={f.value} onChange={(e) => setField(i, { value: e.target.value })} placeholder="Valor" aria-label={`Valor de ${f.label || 'campo'}`} maxLength={4000} autoComplete="off" />
                  <label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" className="size-5" checked={f.secret} onChange={(e) => setField(i, { secret: e.target.checked })} /> Ocultar por defecto</label>
                </div>
              ))}
              <button type="button" className="btn btn-ghost w-fit" onClick={() => setDraft({ ...draft, fields: [...draft.fields, { label: '', value: '', secret: true }] })}><Plus size={16} aria-hidden /> Agregar campo</button>
            </div>
            <label className="grid gap-2 text-sm">Notas<textarea className="field py-3" rows={3} value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} maxLength={4000} /></label>
            {projects.rows.length > 0 && <label className="grid gap-2 text-sm">Ligar a un trabajo (opcional)<select className="field" value={draft.project_id} onChange={(e) => setDraft({ ...draft, project_id: e.target.value })}><option value="">—</option>{projects.rows.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}</select></label>}
            <label className="flex min-h-11 items-center gap-3 text-sm"><input type="checkbox" className="size-5" checked={draft.critical} onChange={(e) => setDraft({ ...draft, critical: e.target.checked })} /> Marcar como crítica (por ejemplo, service_role)</label>
            {err && <p role="alert" className="text-sm" style={{ color: '#e8a393' }}>{err}</p>}
            <button className="btn btn-primary w-fit" disabled={busy}>{busy && <Loader2 size={16} className="animate-spin" aria-hidden />} Guardar cifrado</button>
          </form>
        )}
      </Sheet>

      <VaultSettings open={settings} onClose={() => setSettings(false)} dk={dk} meta={meta} onMeta={onMeta} userName={userName} count={rows.rows.length} />
    </div>
  )
}
