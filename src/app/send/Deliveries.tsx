import { AlarmClock, Check, Loader2, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import Sheet from '../../components/Sheet'
import { CHANNELS, KINDS, STATUSES, addDays, daysSince, followUpDue, isOpen, isWaiting, nextStep, statusLabel, type Delivery, type DeliveryChannel, type DeliveryKind, type DeliveryStatus } from '../../lib/deliveries'
import { supabase } from '../../lib/supabase'
import { useTable } from '../../lib/table'
import { localISO } from '../../lib/time'
import { Empty, ErrorBar, chip } from '../money/shared'

type Draft = { id?: string; title: string; recipient: string; kind: DeliveryKind; channel: DeliveryChannel; status: DeliveryStatus; followDays: number; notes: string }
const blank = (): Draft => ({ title: '', recipient: '', kind: 'quote', channel: 'email', status: 'to_send', followDays: 3, notes: '' })
const FOLLOW = [{ n: 0, label: 'Sin seguimiento' }, { n: 2, label: '2 días' }, { n: 3, label: '3 días' }, { n: 7, label: '1 semana' }, { n: 14, label: '2 semanas' }]

export default function Deliveries() {
  const db = useTable<Delivery>('deliveries', { col: 'created_at', asc: false })
  const [draft, setDraft] = useState<Draft | null>(null)
  const [confirm, setConfirm] = useState(false)
  const [msg, setMsg] = useState('')
  const today = localISO()

  /** El seguimiento es un recordatorio normal: usa los avisos push que ya tienes. */
  const syncReminder = async (d: Delivery, follow: string | null): Promise<string | null> => {
    if (d.event_id) await supabase.from('events').delete().eq('id', d.event_id)
    if (!follow) return null
    const { data } = await supabase.from('events').insert({
      type: 'reminder', kind: 'work', title: `Dar seguimiento: ${d.title}`, action: `Escríbele a ${d.recipient || 'quien corresponda'} por ${CHANNELS[d.channel].toLowerCase()} y pregunta si lo vio.`,
      start_date: follow, start_min: 9 * 60, repeat: 'none', interval_n: 1, weekdays: [], exceptions: [], alerts: [0], persistent: false, checklist: [],
    }).select('id').single()
    return (data?.id as string | undefined) ?? null
  }

  const advance = async (d: Delivery, to: DeliveryStatus, followDays?: number) => {
    const patch: Partial<Delivery> = { status: to }
    if (to === 'sent') {
      patch.sent_at = new Date().toISOString()
      const days = followDays ?? 3
      patch.follow_up_date = days > 0 ? addDays(today, days) : null
      patch.event_id = await syncReminder(d, patch.follow_up_date)
    } else if (to === 'replied' || to === 'paid' || to === 'closed') {
      if (d.event_id) await supabase.from('events').delete().eq('id', d.event_id)
      patch.event_id = null; patch.follow_up_date = null
    }
    await db.update(d.id, patch)
    if (to === 'sent') setMsg(patch.follow_up_date ? `Anotado. Te aviso el ${patch.follow_up_date} para dar seguimiento.` : 'Anotado como enviado.')
  }

  const snooze = async (d: Delivery, days: number) => {
    const follow = addDays(today, days)
    const event_id = await syncReminder(d, follow)
    await db.update(d.id, { follow_up_date: follow, event_id })
    setMsg(`Seguimiento movido al ${follow}.`)
  }

  const save = async () => {
    if (!draft || !draft.title.trim()) return
    const v = { title: draft.title.trim(), recipient: draft.recipient.trim() || null, kind: draft.kind, channel: draft.channel, notes: draft.notes.trim() || null }
    if (draft.id) await db.update(draft.id, v)
    else {
      const row = await db.add({ ...v, status: 'to_send', sent_at: null, follow_up_date: null, event_id: null, project_id: null, created_at: undefined as never })
      if (row && draft.status === 'sent') await advance(row, 'sent', draft.followDays)
    }
    setDraft(null)
  }
  const remove = async (d: Delivery) => {
    if (d.event_id) await supabase.from('events').delete().eq('id', d.event_id)
    await db.remove(d.id)
  }

  const toSend = db.rows.filter((d) => d.status === 'to_send')
  const waiting = db.rows.filter(isWaiting).sort((a, b) => (a.follow_up_date ?? '9').localeCompare(b.follow_up_date ?? '9'))
  const closed = db.rows.filter((d) => !isOpen(d))

  const Card = ({ d }: { d: Delivery }) => {
    const step = nextStep(d.status)
    const due = followUpDue(d, today)
    const waited = daysSince(d.sent_at, today)
    return (
      <li className="rounded-xl border p-4" style={{ background: 'var(--surface)', borderColor: due ? 'var(--accent)' : 'var(--line-soft)' }}>
        <button className="block w-full text-left" onClick={() => { setConfirm(false); setDraft({ id: d.id, title: d.title, recipient: d.recipient ?? '', kind: d.kind, channel: d.channel, status: d.status, followDays: 0, notes: d.notes ?? '' }) }}>
          <span className="flex items-start justify-between gap-3">
            <span className="min-w-0"><span className="block truncate font-semibold">{d.title}</span><span className="block truncate text-sm" style={{ color: 'var(--ink-soft)' }}>{[d.recipient && `Para ${d.recipient}`, KINDS[d.kind], CHANNELS[d.channel]].filter(Boolean).join(' · ')}</span></span>
            <span className="shrink-0 rounded-full border px-2 py-0.5 text-xs" style={{ borderColor: 'var(--line)', color: 'var(--ink-soft)' }}>{statusLabel(d.status)}</span>
          </span>
          {isWaiting(d) && <span className="mt-2 block text-xs" style={{ color: due ? 'var(--accent)' : 'var(--ink-faint)' }}>{waited === 0 ? 'Enviado hoy' : `Enviado hace ${waited} ${waited === 1 ? 'día' : 'días'}`}{d.follow_up_date && ` · seguimiento ${due ? 'hoy o ya pasó' : d.follow_up_date}`}</span>}
          {d.notes && <span className="mt-1 line-clamp-2 block text-xs" style={{ color: 'var(--ink-faint)' }}>{d.notes}</span>}
        </button>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {step && <button className="btn btn-primary" onClick={() => void advance(d, step.to)}><Check size={16} aria-hidden /> {step.label}</button>}
          {isWaiting(d) && <><button className="btn btn-ghost" onClick={() => void advance(d, 'paid')}>Pagado</button><button className="btn btn-ghost" onClick={() => void snooze(d, 3)}><AlarmClock size={16} aria-hidden /> +3 días</button></>}
          {isWaiting(d) && <button className="btn btn-ghost" onClick={() => void advance(d, 'closed')}>Cerrar</button>}
        </div>
      </li>
    )
  }

  if (db.loading) return <div className="grid h-48 place-items-center"><Loader2 className="animate-spin" aria-label="Cargando" /></div>

  return (
    <div>
      <div className="flex items-end justify-between gap-3">
        <div><p className="eyebrow">Trabajo</p><h1 className="mt-2 font-display text-4xl">Envíos y seguimiento</h1><p className="mt-1 max-w-md text-sm" style={{ color: 'var(--ink-soft)' }}>Cotizaciones, propuestas, archivos, canciones: lo que mandaste, a quién y si ya respondieron. Te aviso cuándo darle seguimiento.</p></div>
        <button className="btn btn-primary shrink-0" onClick={() => { setConfirm(false); setDraft(blank()) }}><Plus size={18} aria-hidden /> Envío</button>
      </div>
      <ErrorBar msg={db.error} onClose={db.clearError} />
      {msg && <p role="status" className="mt-3 text-sm" style={{ color: 'var(--sky)' }}>{msg}</p>}

      {db.rows.length === 0 ? <Empty title="Nada enviado todavía" text="Anota lo que tienes que mandar o lo que ya mandaste. Cuando pase el tiempo que elijas sin respuesta, te lo recuerdo." action="Anotar el primero" onAction={() => setDraft(blank())} /> : (
        <>
          {toSend.length > 0 && <section className="mt-8"><h2 className="font-display text-2xl">Por enviar <span className="text-base" style={{ color: 'var(--ink-faint)' }}>{toSend.length}</span></h2><ul className="mt-3 grid gap-3">{toSend.map((d) => <Card key={d.id} d={d} />)}</ul></section>}
          {waiting.length > 0 && <section className="mt-8"><h2 className="font-display text-2xl">Esperando respuesta <span className="text-base" style={{ color: 'var(--ink-faint)' }}>{waiting.length}</span></h2><ul className="mt-3 grid gap-3">{waiting.map((d) => <Card key={d.id} d={d} />)}</ul></section>}
          {closed.length > 0 && <details className="mt-8"><summary className="min-h-11 cursor-pointer font-display text-2xl">Cerrados <span className="text-base" style={{ color: 'var(--ink-faint)' }}>{closed.length}</span></summary><ul className="mt-3 grid gap-3">{closed.map((d) => <Card key={d.id} d={d} />)}</ul></details>}
        </>
      )}

      <Sheet open={Boolean(draft)} title={draft?.id ? 'Editar envío' : 'Nuevo envío'} onClose={() => setDraft(null)}>
        {draft && (
          <form className="grid gap-4" onSubmit={(e) => { e.preventDefault(); void save() }}>
            <label className="grid gap-2 text-sm">Qué envías<input className="field" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} maxLength={200} placeholder="Cotización del sitio web" autoFocus /></label>
            <label className="grid gap-2 text-sm">Para quién<input className="field" value={draft.recipient} onChange={(e) => setDraft({ ...draft, recipient: e.target.value })} maxLength={200} placeholder="Nombre, banda, cliente…" /></label>
            <fieldset><legend className="mb-2 text-sm">Tipo</legend><div className="flex flex-wrap gap-2">{(Object.keys(KINDS) as DeliveryKind[]).map((k) => <button type="button" key={k} aria-pressed={draft.kind === k} onClick={() => setDraft({ ...draft, kind: k })} className="min-h-11 rounded-full border px-4 text-sm" style={chip(draft.kind === k)}>{KINDS[k]}</button>)}</div></fieldset>
            <fieldset><legend className="mb-2 text-sm">Por dónde</legend><div className="flex flex-wrap gap-2">{(Object.keys(CHANNELS) as DeliveryChannel[]).map((k) => <button type="button" key={k} aria-pressed={draft.channel === k} onClick={() => setDraft({ ...draft, channel: k })} className="min-h-11 rounded-full border px-4 text-sm" style={chip(draft.channel === k)}>{CHANNELS[k]}</button>)}</div></fieldset>
            {!draft.id && (
              <>
                <label className="flex min-h-11 items-center gap-3 text-sm"><input type="checkbox" className="size-5" checked={draft.status === 'sent'} onChange={(e) => setDraft({ ...draft, status: e.target.checked ? 'sent' : 'to_send' })} /> Ya lo envié</label>
                {draft.status === 'sent' && <fieldset><legend className="mb-2 text-sm">Darle seguimiento en</legend><div className="flex flex-wrap gap-2">{FOLLOW.map((f) => <button type="button" key={f.n} aria-pressed={draft.followDays === f.n} onClick={() => setDraft({ ...draft, followDays: f.n })} className="min-h-11 rounded-full border px-4 text-sm" style={chip(draft.followDays === f.n)}>{f.label}</button>)}</div></fieldset>}
              </>
            )}
            {draft.id && <fieldset><legend className="mb-2 text-sm">Estado</legend><div className="flex flex-wrap gap-2">{STATUSES.map((s) => <button type="button" key={s.id} aria-pressed={draft.status === s.id} onClick={async () => { await advance(db.rows.find((x) => x.id === draft.id)!, s.id); setDraft({ ...draft, status: s.id }) }} className="min-h-11 rounded-full border px-4 text-sm" style={chip(draft.status === s.id)}>{s.label}</button>)}</div></fieldset>}
            <label className="grid gap-2 text-sm">Notas (opcional)<textarea className="field py-3" rows={2} value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} maxLength={1000} /></label>
            <div className="flex items-center gap-3">
              <button className="btn btn-primary">Guardar</button>
              {draft.id && <button type="button" className="btn btn-ghost ml-auto" style={{ color: confirm ? '#e8a393' : undefined }} onClick={async () => { if (confirm) { await remove(db.rows.find((x) => x.id === draft.id)!); setDraft(null) } else setConfirm(true) }}><Trash2 size={16} aria-hidden /> {confirm ? '¿Seguro?' : 'Eliminar'}</button>}
            </div>
          </form>
        )}
      </Sheet>
    </div>
  )
}
