import { AlarmClock, Check, Loader2, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import Sheet from '../../components/Sheet'
import { CHANNELS, KINDS, STATUSES, addDays, daysSince, followUpDue, isOpen, isWaiting, nextStep, statusLabel, type Delivery, type DeliveryChannel, type DeliveryKind, type DeliveryStatus } from '../../lib/deliveries'
import { supabase } from '../../lib/supabase'
import { useTable } from '../../lib/table'
import { localISO } from '../../lib/time'
import { Group, PageHeader, Row } from '../../components/ui'
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
    const open = () => { setConfirm(false); setDraft({ id: d.id, title: d.title, recipient: d.recipient ?? '', kind: d.kind, channel: d.channel, status: d.status, followDays: 0, notes: d.notes ?? '' }) }
    const meta = [d.recipient && `Para ${d.recipient}`, KINDS[d.kind], CHANNELS[d.channel]].filter(Boolean).join(' · ')
    return (
      <Row title={d.title} tone={due ? 'var(--accent)' : isWaiting(d) ? 'var(--sky)' : 'var(--ink-faint)'} onClick={open}
        sub={<>{meta}{isWaiting(d) && <span style={{ color: due ? 'var(--accent)' : undefined }}> · {waited === 0 ? 'enviado hoy' : `hace ${waited} ${waited === 1 ? 'día' : 'días'}`}{d.follow_up_date && (due ? ' · dar seguimiento' : ` · seguimiento ${d.follow_up_date}`)}</span>}</>}
        value={statusLabel(d.status)} valueTone="soft">
        {(step || isWaiting(d)) && (
          <div className="flex flex-wrap items-center gap-2 px-4 pb-3 pl-[3.75rem]">
            {step && <button className="btn btn-tint !min-h-10" onClick={() => void advance(d, step.to)}><Check size={15} aria-hidden /> {step.label}</button>}
            {isWaiting(d) && <><button className="btn btn-ghost !min-h-10" onClick={() => void advance(d, 'paid')}>Pagado</button><button className="btn btn-ghost !min-h-10" onClick={() => void snooze(d, 3)}><AlarmClock size={15} aria-hidden /> +3 días</button><button className="btn btn-ghost !min-h-10" onClick={() => void advance(d, 'closed')}>Cerrar</button></>}
          </div>
        )}
      </Row>
    )
  }

  if (db.loading) return <div className="grid h-48 place-items-center"><Loader2 className="animate-spin" aria-label="Cargando" /></div>

  return (
    <div>
      <PageHeader eyebrow="Trabajo" title="Envíos y seguimiento" sub="Cotizaciones, propuestas, archivos, canciones: lo que mandaste, a quién y si ya respondieron." action={<button className="btn btn-primary" onClick={() => { setConfirm(false); setDraft(blank()) }}><Plus size={18} aria-hidden /> Nuevo</button>} />
      <ErrorBar msg={db.error} onClose={db.clearError} />
      {msg && <p role="status" className="mb-3 text-sm" style={{ color: 'var(--sky)' }}>{msg}</p>}

      {db.rows.length === 0 ? <Empty title="Nada enviado todavía" text="Anota lo que tienes que mandar o lo que ya mandaste. Cuando pase el tiempo que elijas sin respuesta, te lo recuerdo." action="Anotar el primero" onAction={() => setDraft(blank())} /> : (
        <>
          {toSend.length > 0 && <Group className="!mt-0" title="Por enviar" aside={toSend.length}>{toSend.map((d) => <Card key={d.id} d={d} />)}</Group>}
          {waiting.length > 0 && <Group title="Esperando respuesta" aside={waiting.length}>{waiting.map((d) => <Card key={d.id} d={d} />)}</Group>}
          {closed.length > 0 && <details className="mt-6"><summary className="group-head cursor-pointer select-none"><h3>Cerrados · {closed.length}</h3></summary><Group className="!mt-0">{closed.map((d) => <Card key={d.id} d={d} />)}</Group></details>}
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
