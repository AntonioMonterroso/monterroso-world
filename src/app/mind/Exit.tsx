import { DoorOpen, Pencil, Plus, RotateCcw, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import Sheet from '../../components/Sheet'
import { Chk, Group, PageHeader, Row, Segmented } from '../../components/ui'
import { EXIT_KINDS, SEEDS, newItem, oftenForgotten, seedItems, type ExitItem, type ExitKind, type ExitList } from '../../lib/exitlist'
import { syncReminder } from '../../lib/remind'
import { supabase } from '../../lib/supabase'
import { useTable } from '../../lib/table'
import { fmtMin, localISO, toMin } from '../../lib/time'
import { Empty, ErrorBar } from '../money/shared'

const KEY = 'mw_exit_checked'
type Checked = { day: string; lists: Record<string, string[]> }
const loadChecked = (): Checked => { try { const c = JSON.parse(localStorage.getItem(KEY) ?? '') as Checked; if (c.day === localISO()) return c } catch { /* vacío */ } return { day: localISO(), lists: {} } }

let seeding: Promise<void> | null = null
async function seedOnce() {
  const { data: s } = await supabase.from('settings').select('data').maybeSingle()
  const cur = (s?.data ?? {}) as { exitSeeded?: boolean }
  if (cur.exitSeeded) return
  await supabase.from('settings').upsert({ data: { ...cur, exitSeeded: true } })
  await supabase.from('exit_lists').insert(SEEDS.map((l, i) => ({ name: l.name, kind: l.kind, items: seedItems(l.items), position: i + 1 })))
}

type Draft = { id?: string; name: string; kind: ExitKind; text: string; remind: boolean; time: string; daily: boolean; date: string }

/** Antes de salir: una lista por contexto. Marca lo que ya llevas; avisa lo que más olvidas. */
export default function Exit() {
  const db = useTable<ExitList>('exit_lists', { col: 'position', asc: true })
  const [sp, setSp] = useSearchParams()
  const [sel, setSel] = useState('')
  const [checked, setChecked] = useState<Checked>(loadChecked)
  const [draft, setDraft] = useState<Draft | null>(null)

  useEffect(() => {
    if (db.loading || db.rows.length > 0) return
    seeding ??= seedOnce().finally(() => { seeding = null })
    seeding.then(() => db.reload())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db.loading, db.rows.length])
  useEffect(() => { try { localStorage.setItem(KEY, JSON.stringify(checked)) } catch { /* sin almacenamiento */ } }, [checked])
  useEffect(() => { const l = sp.get('lista'); if (l) { setSel(l); setSp({}, { replace: true }) } }, [sp, setSp])

  const list = db.rows.find((l) => l.id === sel) ?? db.rows[0]
  const done = list ? checked.lists[list.id] ?? [] : []
  const ready = list ? list.items.length > 0 && list.items.every((i) => done.includes(i.id)) : false
  const often = useMemo(() => (list ? oftenForgotten(list) : []), [list])

  const toggle = (item: ExitItem) => list && setChecked((c) => { const cur = c.lists[list.id] ?? []; return { ...c, lists: { ...c.lists, [list.id]: cur.includes(item.id) ? cur.filter((x) => x !== item.id) : [...cur, item.id] } } })
  const reset = () => list && setChecked((c) => ({ ...c, lists: { ...c.lists, [list.id]: [] } }))
  const forgot = (item: ExitItem) => list && db.update(list.id, { items: list.items.map((i) => (i.id === item.id ? { ...i, forgot: i.forgot + 1 } : i)) })

  const openEdit = (l?: ExitList) => setDraft({ id: l?.id, name: l?.name ?? '', kind: l?.kind ?? 'other', text: (l?.items ?? []).map((i) => i.text).join('\n'), remind: l?.remind_min != null, time: fmtMin(l?.remind_min ?? 8 * 60), daily: true, date: localISO() })
  const commit = async () => {
    if (!draft || !draft.name.trim()) return
    const old = db.rows.find((l) => l.id === draft.id)
    const lines = draft.text.split('\n').map((x) => x.trim()).filter(Boolean).slice(0, 60)
    const items = lines.map((t) => old?.items.find((i) => i.text === t) ?? newItem(t))
    const minute = draft.remind ? toMin(draft.time) : null
    const name = draft.name.trim()
    const event_id = await syncReminder(old?.event_id ?? null, draft.remind && minute != null ? { title: `Antes de salir: ${name}`, action: 'Revisa tu lista antes de salir', date: draft.daily ? localISO() : draft.date, daily: draft.daily, minute } : null)
    const extra = { remind_min: minute, event_id }
    if (old) await db.update(old.id, { name, kind: draft.kind, items, ...extra })
    else { const row = await db.add({ name, kind: draft.kind, items, position: (db.rows.at(-1)?.position ?? 0) + 1, ...extra }); if (row) setSel(row.id) }
    setDraft(null)
  }

  return (
    <div>
      <PageHeader eyebrow="Mente y cuerpo" title="Antes de salir" sub="Revisa la lista del lugar al que vas. Dos minutos aquí te ahorran el regreso por lo que faltó." action={<button className="btn btn-tint" onClick={() => openEdit()}><Plus size={16} aria-hidden /> Lista</button>} />
      <ErrorBar msg={db.error} onClose={db.clearError} />

      {db.rows.length === 0 ? <Empty title="Preparando tus listas…" text="Un momento: estoy creando las listas base (trabajo, ensayo, tocada, iglesia, gimnasio y cliente)." /> : list && (
        <>
          <Segmented label="Lista" value={list.id} onChange={setSel} options={db.rows.map((l) => ({ id: l.id, label: l.name }))} />

          {often.length > 0 && <p className="mt-4 rounded-xl px-3 py-2 text-sm" style={{ background: 'color-mix(in oklab, var(--accent) 12%, transparent)', color: 'var(--accent)' }}>Lo que más se te olvida aquí: {often.join(', ')}.</p>}

          <Group title={`${list.name} · ${done.length}/${list.items.length}`} aside={<button className="inline-flex min-h-9 items-center gap-1 underline" onClick={reset}><RotateCcw size={12} aria-hidden /> Reiniciar</button>}>
            {list.items.length === 0 ? <li className="row"><p className="row-hit text-sm" style={{ color: 'var(--ink-faint)' }}>Esta lista está vacía. Agrega lo que no puede faltar.</p></li> : list.items.map((i) => {
              const on = done.includes(i.id)
              return <Row key={i.id} icon={<Chk on={on} tone="var(--pos)" />} title={i.text} muted={on} chevron={false} onClick={() => toggle(i)}
                sub={i.forgot > 0 ? <span style={{ color: i.forgot >= 2 ? 'var(--accent)' : undefined }}>Se te ha olvidado {i.forgot} {i.forgot === 1 ? 'vez' : 'veces'}</span> : undefined}
                trailing={<button className="min-h-11 rounded-full px-3 text-xs font-semibold" style={{ color: 'var(--ink-faint)' }} onClick={() => void forgot(i)} aria-label={`Se me olvidó ${i.text}`}>Se me olvidó</button>} />
            })}
            <Row icon={<Pencil size={16} aria-hidden />} tone="var(--accent)" title={<span style={{ color: 'var(--accent)' }}>Editar esta lista</span>} onClick={() => openEdit(list)} chevron={false} />
          </Group>

          <div className={`ready ${ready ? 'on' : ''}`} role="status" aria-live="polite">
            <DoorOpen size={20} aria-hidden /> {ready ? '¡Listo para salir!' : `Faltan ${list.items.length - done.length} para salir tranquilo`}
          </div>
          <p className="group-foot">Si ya saliste y algo faltó, toca “Se me olvidó” en esa cosa: la lista la recordará más fuerte la próxima vez.</p>
        </>
      )}

      <Sheet open={Boolean(draft)} title={draft?.id ? 'Editar lista' : 'Nueva lista'} onClose={() => setDraft(null)}>
        {draft && (
          <form className="grid gap-4" onSubmit={(e) => { e.preventDefault(); void commit() }}>
            <label className="grid gap-2 text-sm">Nombre<input autoFocus className="field" value={draft.name} maxLength={60} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Tocada en la boda" /></label>
            <label className="grid gap-2 text-sm">Tipo (para avisarte antes de tus eventos)
              <select className="field" value={draft.kind} onChange={(e) => setDraft({ ...draft, kind: e.target.value as ExitKind })}>{(Object.keys(EXIT_KINDS) as ExitKind[]).map((k) => <option key={k} value={k}>{EXIT_KINDS[k]}</option>)}</select>
            </label>
            <label className="grid gap-2 text-sm">Qué llevar, una cosa por línea<textarea className="field py-3" rows={8} value={draft.text} onChange={(e) => setDraft({ ...draft, text: e.target.value })} placeholder={'Cables\nPedales\nBaquetas'} /></label>
            <label className="flex min-h-11 items-center gap-3 text-sm"><input type="checkbox" className="size-5" checked={draft.remind} onChange={(e) => setDraft({ ...draft, remind: e.target.checked })} /> Avisarme con una notificación</label>
            {draft.remind && (
              <div className="grid grid-cols-2 gap-3">
                <label className="grid gap-2 text-sm">Hora<input type="time" className="field" value={draft.time} onChange={(e) => setDraft({ ...draft, time: e.target.value })} /></label>
                <label className="grid gap-2 text-sm">Cuándo<select className="field" value={draft.daily ? 'd' : 'o'} onChange={(e) => setDraft({ ...draft, daily: e.target.value === 'd' })}><option value="d">Todos los días</option><option value="o">Solo una vez</option></select></label>
                {!draft.daily && <label className="col-span-2 grid gap-2 text-sm">Fecha<input type="date" className="field" value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} /></label>}
              </div>
            )}
            <div className="flex items-center gap-3">
              <button className="btn btn-primary">Guardar</button>
              {draft.id && <button type="button" className="btn btn-ghost ml-auto" style={{ color: 'var(--neg)' }} onClick={async () => { await syncReminder(db.rows.find((l) => l.id === draft.id)?.event_id ?? null, null); await db.remove(draft.id!); setDraft(null) }}><Trash2 size={16} aria-hidden /> Eliminar</button>}
            </div>
          </form>
        )}
      </Sheet>
    </div>
  )
}
