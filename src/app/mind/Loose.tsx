import { Handshake, MapPin, Plus, Search, Trash2, Undo2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import Sheet from '../../components/Sheet'
import { Chk, Group, PageHeader, Row, Segmented } from '../../components/ui'
import { daysLent, dueLabel, findStuff, promiseState, sortPromises, type Promise_, type Stuff } from '../../lib/loose'
import { syncReminder } from '../../lib/remind'
import { useTable } from '../../lib/table'
import { localISO } from '../../lib/time'
import { Empty, ErrorBar } from '../money/shared'

type SD = { id?: string; kind: 'placed' | 'lent'; name: string; place: string; person: string; remind: string }
type PD = { id?: string; text: string; person: string; due: string }

/** Cosas y promesas: dónde dejé algo, a quién se lo presté y lo que le prometí a alguien. */
export default function Loose() {
  const stuff = useTable<Stuff>('stuff', { col: 'created_at', asc: false })
  const promises = useTable<Promise_>('promises', { col: 'created_at', asc: false })
  const today = localISO()
  const [tab, setTab] = useState<'stuff' | 'promises'>('stuff')
  const [q, setQ] = useState('')
  const [sd, setSd] = useState<SD | null>(null)
  const [pd, setPd] = useState<PD | null>(null)
  const [confirm, setConfirm] = useState(false)
  const [err, setErr] = useState('')

  const open = useMemo(() => findStuff(stuff.rows.filter((i) => !i.returned), q), [stuff.rows, q])
  const placed = open.filter((i) => i.kind === 'placed')
  const lent = open.filter((i) => i.kind === 'lent')
  const gone = stuff.rows.filter((i) => i.returned).slice(0, 5)
  const pOpen = useMemo(() => sortPromises(promises.rows.filter((p) => !p.done), today), [promises.rows, today])
  const pDone = promises.rows.filter((p) => p.done).slice(0, 5)

  const saveStuff = async () => {
    if (!sd) return
    if (!sd.name.trim()) return setErr('¿Qué cosa es?')
    if (sd.kind === 'lent' && !sd.person.trim()) return setErr('¿A quién se lo prestaste?')
    const old = stuff.rows.find((i) => i.id === sd.id)
    const remind = sd.kind === 'lent' && sd.remind ? sd.remind : null
    const event_id = await syncReminder(old?.event_id ?? null, remind ? { title: `Pedir de vuelta: ${sd.name.trim()}`, action: `Pídele ${sd.name.trim()} a ${sd.person.trim()}.`, date: remind } : null)
    const v = { name: sd.name.trim(), kind: sd.kind, place: sd.kind === 'placed' ? sd.place.trim() || null : null, person: sd.kind === 'lent' ? sd.person.trim() : null, remind_on: remind, event_id }
    if (old) await stuff.update(old.id, v); else await stuff.add({ ...v, returned: false, returned_on: null, created_at: undefined as never })
    setSd(null); setErr(''); setConfirm(false)
  }
  const giveBack = async (i: Stuff) => {
    await syncReminder(i.event_id, null)
    await stuff.update(i.id, { returned: true, returned_on: today, event_id: null })
  }
  const removeStuff = async (i: Stuff) => { await syncReminder(i.event_id, null); await stuff.remove(i.id); setSd(null); setConfirm(false) }

  const savePromise = async () => {
    if (!pd) return
    if (!pd.text.trim()) return setErr('¿Qué prometiste?')
    const old = promises.rows.find((p) => p.id === pd.id)
    const event_id = await syncReminder(old?.event_id ?? null, pd.due ? { title: `Cumplir: ${pd.text.trim()}`, action: pd.person.trim() ? `Se lo prometiste a ${pd.person.trim()}.` : 'Es una promesa que hiciste.', date: pd.due } : null)
    const v = { text: pd.text.trim(), person: pd.person.trim() || null, due_date: pd.due || null, event_id }
    if (old) await promises.update(old.id, v); else await promises.add({ ...v, done: false, done_on: null, created_at: undefined as never })
    setPd(null); setErr(''); setConfirm(false)
  }
  const toggleDone = async (p: Promise_) => {
    if (!p.done) await syncReminder(p.event_id, null)
    await promises.update(p.id, p.done ? { done: false, done_on: null } : { done: true, done_on: today, event_id: null })
  }

  const loading = stuff.loading || promises.loading
  const stateColor = (p: Promise_) => { const s = promiseState(p, today); return s === 'overdue' ? 'var(--neg)' : s === 'today' ? 'var(--accent)' : s === 'soon' ? 'var(--sky)' : 'var(--ink-faint)' }

  return (
    <div>
      <PageHeader eyebrow="Mente y cuerpo" title="Cosas y promesas" sub="Para que no se te olvide dónde dejaste algo, a quién se lo prestaste ni lo que prometiste." action={<button className="btn btn-primary" onClick={() => { setErr(''); setConfirm(false); if (tab === 'stuff') setSd({ kind: 'placed', name: '', place: '', person: '', remind: '' }); else setPd({ text: '', person: '', due: '' }) }}><Plus size={18} aria-hidden /> {tab === 'stuff' ? 'Cosa' : 'Promesa'}</button>} />
      <ErrorBar msg={stuff.error || promises.error} onClose={stuff.clearError} />
      <Segmented label="Sección" value={tab} onChange={setTab} options={[{ id: 'stuff', label: `Dónde está${open.length ? ` · ${stuff.rows.filter((i) => !i.returned).length}` : ''}` }, { id: 'promises', label: `Promesas${pOpen.length ? ` · ${pOpen.length}` : ''}` }]} />

      {loading ? null : tab === 'stuff' ? (
        <>
          <div className="relative mt-4">
            <Search size={16} aria-hidden className="absolute top-1/2 left-4 -translate-y-1/2" style={{ color: 'var(--ink-faint)' }} />
            <input className="field pl-10" value={q} onChange={(e) => setQ(e.target.value)} placeholder="¿Dónde dejé…? Busca por cosa, lugar o persona" aria-label="Buscar" autoComplete="off" />
          </div>
          {stuff.rows.filter((i) => !i.returned).length === 0 ? <Empty title="Anota dónde dejas las cosas" text="Llaves, un cable, el pedal que prestaste. Escribe “puse X en Y” una vez y después solo lo buscas." action="Anotar una cosa" onAction={() => setSd({ kind: 'placed', name: '', place: '', person: '', remind: '' })} /> : (
            <>
              {placed.length > 0 && <Group title="Dónde las dejé">{placed.map((i) => <Row key={i.id} icon={<MapPin size={16} aria-hidden />} tone="var(--sky)" title={i.name} sub={i.place ?? 'Sin lugar'} onClick={() => setSd({ id: i.id, kind: i.kind, name: i.name, place: i.place ?? '', person: '', remind: '' })} />)}</Group>}
              {lent.length > 0 && <Group title="Lo que presté" footer="Cuando te lo devuelvan, tócalo con ↩ para quitarlo de la lista.">{lent.map((i) => {
                const days = daysLent(i, today)
                return <Row key={i.id} icon={<Handshake size={16} aria-hidden />} tone="var(--clay)" title={i.name} sub={<>Con {i.person} · {days === 0 ? 'hoy' : `hace ${days} d`}{i.remind_on && <> · pedir {dueLabel(i.remind_on, today).toLowerCase()}</>}</>} onClick={() => setSd({ id: i.id, kind: i.kind, name: i.name, place: '', person: i.person ?? '', remind: i.remind_on ?? '' })} chevron={false}
                  trailing={<button className="btn btn-tint !min-h-10" onClick={() => void giveBack(i)} aria-label={`${i.name} ya me lo devolvieron`}><Undo2 size={15} aria-hidden /> Devuelto</button>} />
              })}</Group>}
              {open.length === 0 && <p className="mt-6 text-sm" style={{ color: 'var(--ink-soft)' }}>Nada coincide con “{q}”.</p>}
              {gone.length > 0 && !q && <Group title="Devueltas hace poco">{gone.map((i) => <Row key={i.id} title={i.name} muted sub={`${i.person ? `Con ${i.person} · ` : ''}devuelto ${i.returned_on ?? ''}`} chevron={false} />)}</Group>}
            </>
          )}
        </>
      ) : (
        promises.rows.length === 0 ? <Empty title="Lo que prometes, a la vista" text="“Te mando la cotización”, “te llamo mañana”. Anótalo con la persona y la fecha y aparece en Hoy hasta que lo cumplas." action="Anotar una promesa" onAction={() => setPd({ text: '', person: '', due: '' })} /> : (
          <>
            <Group title="Por cumplir" footer={pOpen.length === 0 ? undefined : 'Marca el círculo cuando lo cumplas. Con fecha, te aviso ese día.'}>
              {pOpen.length === 0 ? <li className="row"><p className="row-hit text-sm" style={{ color: 'var(--ink-faint)' }}>No le debes nada a nadie. 🎉</p></li> : pOpen.map((p) => (
                <Row key={p.id} icon={<Chk on={false} tone={stateColor(p)} />} title={p.text} chevron={false} onClick={() => setPd({ id: p.id, text: p.text, person: p.person ?? '', due: p.due_date ?? '' })}
                  sub={<>{p.person && `${p.person} · `}<span style={{ color: stateColor(p) }}>{dueLabel(p.due_date, today)}</span></>}
                  trailing={<button className="grid size-11 place-items-center" aria-label={`Cumplida: ${p.text}`} onClick={() => void toggleDone(p)}><span className="buy-check"><span /></span></button>} />
              ))}
            </Group>
            {pDone.length > 0 && <Group title="Cumplidas">{pDone.map((p) => <Row key={p.id} icon={<Chk on tone="var(--pos)" />} title={p.text} muted chevron={false} sub={`${p.person ? `${p.person} · ` : ''}${p.done_on ?? ''}`} onClick={() => void toggleDone(p)} />)}</Group>}
          </>
        )
      )}

      <Sheet open={Boolean(sd)} title={sd?.id ? 'Editar cosa' : 'Nueva cosa'} onClose={() => setSd(null)}>
        {sd && (
          <form className="grid gap-4" onSubmit={(e) => { e.preventDefault(); void saveStuff() }}>
            <Segmented label="Tipo" value={sd.kind} onChange={(k) => setSd({ ...sd, kind: k })} options={[{ id: 'placed', label: 'La dejé en…' }, { id: 'lent', label: 'La presté a…' }]} />
            <label className="grid gap-2 text-sm">Qué es<input autoFocus className="field" value={sd.name} maxLength={120} onChange={(e) => setSd({ ...sd, name: e.target.value })} placeholder="Cable de guitarra, llaves del estudio…" /></label>
            {sd.kind === 'placed' ? <label className="grid gap-2 text-sm">Dónde está<input className="field" value={sd.place} maxLength={200} onChange={(e) => setSd({ ...sd, place: e.target.value })} placeholder="Cajón del escritorio, mochila negra…" /></label> : (
              <>
                <label className="grid gap-2 text-sm">A quién se lo presté<input className="field" value={sd.person} maxLength={120} onChange={(e) => setSd({ ...sd, person: e.target.value })} placeholder="Marcos" /></label>
                <label className="grid gap-2 text-sm">Pedirlo de vuelta el (opcional)<input type="date" className="field" value={sd.remind} onChange={(e) => setSd({ ...sd, remind: e.target.value })} /></label>
              </>
            )}
            {err && <p role="alert" className="text-sm" style={{ color: 'var(--neg)' }}>{err}</p>}
            <div className="flex items-center gap-3">
              <button className="btn btn-primary">Guardar</button>
              {sd.id && <button type="button" className="btn btn-ghost ml-auto" style={{ color: confirm ? 'var(--neg)' : undefined }} onClick={() => { const i = stuff.rows.find((x) => x.id === sd.id)!; if (confirm) void removeStuff(i); else setConfirm(true) }}><Trash2 size={16} aria-hidden /> {confirm ? '¿Seguro?' : 'Quitar'}</button>}
            </div>
          </form>
        )}
      </Sheet>

      <Sheet open={Boolean(pd)} title={pd?.id ? 'Editar promesa' : 'Nueva promesa'} onClose={() => setPd(null)}>
        {pd && (
          <form className="grid gap-4" onSubmit={(e) => { e.preventDefault(); void savePromise() }}>
            <label className="grid gap-2 text-sm">Qué prometiste<input autoFocus className="field" value={pd.text} maxLength={300} onChange={(e) => setPd({ ...pd, text: e.target.value })} placeholder="Mandar la cotización del sitio" /></label>
            <label className="grid gap-2 text-sm">A quién<input className="field" value={pd.person} maxLength={120} onChange={(e) => setPd({ ...pd, person: e.target.value })} placeholder="Marcos" /></label>
            <label className="grid gap-2 text-sm">Para cuándo (opcional)
              <div className="flex gap-2"><input type="date" className="field" value={pd.due} onChange={(e) => setPd({ ...pd, due: e.target.value })} />{pd.due && <button type="button" className="btn btn-ghost shrink-0" onClick={() => setPd({ ...pd, due: '' })}>Quitar</button>}</div>
            </label>
            {err && <p role="alert" className="text-sm" style={{ color: 'var(--neg)' }}>{err}</p>}
            <div className="flex items-center gap-3">
              <button className="btn btn-primary">Guardar</button>
              {pd.id && <button type="button" className="btn btn-ghost ml-auto" style={{ color: confirm ? 'var(--neg)' : undefined }} onClick={async () => { const p = promises.rows.find((x) => x.id === pd.id)!; if (confirm) { await syncReminder(p.event_id, null); await promises.remove(p.id); setPd(null); setConfirm(false) } else setConfirm(true) }}><Trash2 size={16} aria-hidden /> {confirm ? '¿Seguro?' : 'Quitar'}</button>}
            </div>
          </form>
        )}
      </Sheet>
    </div>
  )
}
