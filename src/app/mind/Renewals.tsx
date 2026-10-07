import { CalendarClock, Check, Plus, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import Sheet from '../../components/Sheet'
import { Group, PageHeader, Row } from '../../components/ui'
import { SEEDS, UNIT_LABEL, daysUntil, every, nextDue, remindDate, sortRenewals, stateOf, whenLabel, type Renewal, type Unit } from '../../lib/renewals'
import { syncReminder } from '../../lib/remind'
import { useTable } from '../../lib/table'
import { localISO } from '../../lib/time'
import { Empty, ErrorBar } from '../money/shared'

type D = { id?: string; name: string; every_n: string; unit: Unit; next_due: string; lead: string; note: string }
const blank = (name = ''): D => ({ name, every_n: '1', unit: 'year', next_due: localISO(), lead: '14', note: '' })
const LEADS = [{ d: 3, l: '3 días' }, { d: 7, l: '1 semana' }, { d: 14, l: '2 semanas' }, { d: 30, l: '1 mes' }]

/** Vencimientos: lo que se renueva solo y se olvida. Avisa con tiempo y, al renovar, programa el siguiente. */
export default function Renewals() {
  const db = useTable<Renewal>('renewals', { col: 'next_due', asc: true })
  const today = localISO()
  const [d, setD] = useState<D | null>(null)
  const [confirm, setConfirm] = useState(false)
  const [err, setErr] = useState('')
  const [msg, setMsg] = useState('')
  const list = useMemo(() => sortRenewals(db.rows), [db.rows])
  const note = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 4500) }

  const reminderFor = (r: Pick<Renewal, 'name' | 'next_due' | 'lead_days'>) => ({ title: `Se vence: ${r.name}`, action: `Vence el ${r.next_due}. Renuévalo o resuélvelo con tiempo.`, date: remindDate(r, today) })

  const save = async () => {
    if (!d) return
    const n = Math.round(Number(d.every_n))
    if (!d.name.trim()) return setErr('¿Qué se vence?')
    if (!(n >= 1 && n <= 60)) return setErr('Cada cuánto debe ser un número entre 1 y 60.')
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d.next_due)) return setErr('Elige la fecha del próximo vencimiento.')
    const old = db.rows.find((r) => r.id === d.id)
    const v = { name: d.name.trim(), every_n: n, unit: d.unit, next_due: d.next_due, lead_days: Math.round(Number(d.lead)), note: d.note.trim() || null }
    const event_id = await syncReminder(old?.event_id ?? null, reminderFor(v))
    if (old) await db.update(old.id, { ...v, event_id }); else await db.add({ ...v, event_id })
    setD(null); setErr(''); setConfirm(false)
  }

  const renew = async (r: Renewal) => {
    const next = nextDue(r, today)
    const event_id = await syncReminder(r.event_id, reminderFor({ ...r, next_due: next }))
    await db.update(r.id, { next_due: next, event_id })
    note(`Listo. ${r.name} vuelve a vencer el ${next}.`)
  }
  const remove = async (r: Renewal) => { await syncReminder(r.event_id, null); await db.remove(r.id); setD(null); setConfirm(false) }

  const soon = list.filter((r) => stateOf(r, today) !== 'later')
  const later = list.filter((r) => stateOf(r, today) === 'later')
  const row = (r: Renewal) => {
    const s = stateOf(r, today), dd = daysUntil(r, today)
    return <Row key={r.id} icon={<CalendarClock size={16} aria-hidden />} tone={s === 'overdue' ? 'var(--neg)' : s === 'soon' ? 'var(--accent)' : 'var(--ink-faint)'} title={r.name} chevron={false}
      sub={<><span style={{ color: s === 'overdue' ? 'var(--neg)' : s === 'soon' ? 'var(--accent)' : undefined }}>{whenLabel(dd)}</span> · {every(r)}</>}
      onClick={() => { setErr(''); setConfirm(false); setD({ id: r.id, name: r.name, every_n: String(r.every_n), unit: r.unit, next_due: r.next_due, lead: String(r.lead_days), note: r.note ?? '' }) }}
      trailing={s !== 'later' ? <button className="btn btn-tint !min-h-10" onClick={() => void renew(r)} aria-label={`${r.name} ya renovado`}><Check size={15} aria-hidden /> Hecho</button> : undefined} />
  }

  return (
    <div>
      <PageHeader eyebrow="Mente y cuerpo" title="Vencimientos" sub="Lo que se renueva y se olvida: dominio, seguro, cuerdas, revisión del carro. Anótalo una vez y te aviso con tiempo." action={<button className="btn btn-primary" onClick={() => { setErr(''); setConfirm(false); setD(blank()) }}><Plus size={18} aria-hidden /> Nuevo</button>} />
      <ErrorBar msg={db.error} onClose={db.clearError} />
      {msg && <p role="status" className="mb-3 text-sm" style={{ color: 'var(--pos)' }}>{msg}</p>}

      {db.loading ? null : list.length === 0 ? (
        <>
          <Empty title="¿Qué se te suele vencer?" text="Elige uno para empezar y ajusta la fecha, o crea el tuyo." action="Crear uno" onAction={() => setD(blank())} />
          <div className="mt-4 flex flex-wrap justify-center gap-2">{SEEDS.map((s) => <button key={s} className="btn btn-ghost !min-h-10" onClick={() => { setErr(''); setD(blank(s)) }}>{s}</button>)}</div>
        </>
      ) : (
        <>
          {soon.length > 0 && <Group className="!mt-2" title="Atender ya" aside={soon.length}>{soon.map(row)}</Group>}
          {later.length > 0 && <Group title="Más adelante">{later.map(row)}</Group>}
        </>
      )}

      <Sheet open={Boolean(d)} title={d?.id ? 'Editar vencimiento' : 'Nuevo vencimiento'} onClose={() => setD(null)}>
        {d && (
          <form className="grid gap-4" onSubmit={(e) => { e.preventDefault(); void save() }}>
            <label className="grid gap-2 text-sm">Qué se vence<input autoFocus className="field" value={d.name} maxLength={120} onChange={(e) => setD({ ...d, name: e.target.value })} placeholder="Seguro del carro" /></label>
            <div className="grid grid-cols-[5rem_1fr] gap-3">
              <label className="grid gap-2 text-sm">Cada<input className="field" inputMode="numeric" value={d.every_n} onChange={(e) => setD({ ...d, every_n: e.target.value.replace(/\D/g, '') })} /></label>
              <label className="grid gap-2 text-sm">&nbsp;<select className="field" value={d.unit} onChange={(e) => setD({ ...d, unit: e.target.value as Unit })}>{(Object.keys(UNIT_LABEL) as Unit[]).map((u) => <option key={u} value={u}>{UNIT_LABEL[u][1]}</option>)}</select></label>
            </div>
            <label className="grid gap-2 text-sm">Próximo vencimiento<input type="date" className="field" value={d.next_due} onChange={(e) => setD({ ...d, next_due: e.target.value })} /></label>
            <fieldset><legend className="mb-2 text-sm">Avisarme con</legend>
              <div className="flex flex-wrap gap-2">{LEADS.map((l) => <button key={l.d} type="button" aria-pressed={d.lead === String(l.d)} onClick={() => setD({ ...d, lead: String(l.d) })} className="min-h-11 rounded-full px-4 text-sm" style={{ background: d.lead === String(l.d) ? 'color-mix(in oklab, var(--accent) 20%, transparent)' : 'var(--surface-2)', color: d.lead === String(l.d) ? 'var(--accent)' : 'var(--ink-soft)' }}>{l.l}</button>)}</div>
            </fieldset>
            <label className="grid gap-2 text-sm">Nota (opcional)<input className="field" value={d.note} maxLength={300} onChange={(e) => setD({ ...d, note: e.target.value })} placeholder="Póliza 12345, llamar a Seguros X" /></label>
            {err && <p role="alert" className="text-sm" style={{ color: 'var(--neg)' }}>{err}</p>}
            <div className="flex items-center gap-3">
              <button className="btn btn-primary">Guardar</button>
              {d.id && <button type="button" className="btn btn-ghost ml-auto" style={{ color: confirm ? 'var(--neg)' : undefined }} onClick={() => { const r = db.rows.find((x) => x.id === d.id)!; if (confirm) void remove(r); else setConfirm(true) }}><Trash2 size={16} aria-hidden /> {confirm ? '¿Seguro?' : 'Quitar'}</button>}
            </div>
          </form>
        )}
      </Sheet>
    </div>
  )
}
