import { Plus, Trash2, Zap } from 'lucide-react'
import { useState } from 'react'
import Sheet from '../../components/Sheet'
import { Group, PageHeader, Row, Switch } from '../../components/ui'
import { BLOCK_KINDS, EXAMPLES, TRIGGERS, describe, type Rule, type TriggerKind } from '../../lib/ifthen'
import { fmtMin, toMin } from '../../lib/time'
import { syncReminder } from '../../lib/remind'
import { useTable } from '../../lib/table'
import { Empty, ErrorBar } from '../money/shared'

type D = { id?: string; trigger_kind: TriggerKind; time: string; block_kind: string; action: string }
const blank = (e?: (typeof EXAMPLES)[number]): D => ({ trigger_kind: e?.trigger_kind ?? 'open_morning', time: fmtMin(e?.time_min ?? 8 * 60), block_kind: e?.block_kind ?? 'work', action: e?.action ?? '' })

/** Si pasa X, entonces hago Y: atar una acción pequeña a un momento concreto ayuda a que sí suceda. */
export default function Rules() {
  const db = useTable<Rule>('if_then', { col: 'created_at', asc: true })
  const [d, setD] = useState<D | null>(null)
  const [confirm, setConfirm] = useState(false)
  const [err, setErr] = useState('')

  const save = async () => {
    if (!d) return
    if (!d.action.trim()) return setErr('¿Qué vas a hacer?')
    const old = db.rows.find((r) => r.id === d.id)
    const timed = d.trigger_kind === 'time'
    const minute = timed ? toMin(d.time) : null
    // Las reglas por hora crean un recordatorio diario (con push); las demás viven en Hoy
    const event_id = await syncReminder(old?.event_id ?? null, timed ? { title: `Si son las ${d.time}: ${d.action.trim()}`, action: d.action.trim(), date: new Date().toLocaleDateString('en-CA'), daily: true, minute: minute ?? 0 } : null)
    const v = { trigger_kind: d.trigger_kind, time_min: minute, block_kind: d.trigger_kind.startsWith('block') ? d.block_kind : null, action: d.action.trim(), event_id }
    if (old) await db.update(old.id, v); else await db.add({ ...v, active: true, last_done: null })
    setD(null); setErr(''); setConfirm(false)
  }
  const toggle = async (r: Rule, on: boolean) => {
    if (r.event_id && !on) { await syncReminder(r.event_id, null); await db.update(r.id, { active: false, event_id: null }) }
    else if (r.trigger_kind === 'time' && on) {
      const event_id = await syncReminder(null, { title: `Si son las ${fmtMin(r.time_min ?? 0)}: ${r.action}`, action: r.action, date: new Date().toLocaleDateString('en-CA'), daily: true, minute: r.time_min ?? 0 })
      await db.update(r.id, { active: true, event_id })
    } else await db.update(r.id, { active: on })
  }
  const remove = async (r: Rule) => { await syncReminder(r.event_id, null); await db.remove(r.id); setD(null); setConfirm(false) }

  return (
    <div>
      <PageHeader eyebrow="Mente y cuerpo" title="Si pasa… entonces…" sub="Une una acción pequeña a un momento. “Si termina mi bloque de trabajo, entonces me levanto a estirar.” Aparece en Hoy justo cuando toca." action={<button className="btn btn-primary" onClick={() => { setErr(''); setConfirm(false); setD(blank()) }}><Plus size={18} aria-hidden /> Regla</button>} />
      <ErrorBar msg={db.error} onClose={db.clearError} />
      {db.loading ? null : db.rows.length === 0 ? (
        <>
          <Empty title="Todavía no tienes ninguna" text="Empieza con una de estas y ajústala, o crea la tuya." />
          <Group title="Ideas para empezar">{EXAMPLES.map((e, i) => <Row key={i} icon={<Zap size={16} aria-hidden />} tone="var(--accent)" title={e.action} sub={describe({ trigger_kind: e.trigger_kind, time_min: e.time_min ?? null, block_kind: e.block_kind ?? null })} onClick={() => { setErr(''); setD(blank(e)) }} />)}</Group>
        </>
      ) : (
        <Group title="Tus reglas" footer="Cuando toca, la regla aparece en Hoy y se marca como hecha por ese día. Las que son por hora también te llegan como aviso.">
          {db.rows.map((r) => <Row key={r.id} icon={<Zap size={16} aria-hidden />} tone={r.active ? 'var(--accent)' : 'var(--ink-faint)'} muted={!r.active} title={`${describe(r)}, entonces ${r.action.charAt(0).toLowerCase()}${r.action.slice(1)}`} chevron={false}
            onClick={() => { setErr(''); setConfirm(false); setD({ id: r.id, trigger_kind: r.trigger_kind, time: fmtMin(r.time_min ?? 8 * 60), block_kind: r.block_kind ?? 'work', action: r.action }) }}
            trailing={<Switch checked={r.active} label={`Regla activa: ${r.action}`} onChange={(v) => void toggle(r, v)} />} />)}
        </Group>
      )}

      <Sheet open={Boolean(d)} title={d?.id ? 'Editar regla' : 'Nueva regla'} onClose={() => setD(null)}>
        {d && (
          <form className="grid gap-4" onSubmit={(e) => { e.preventDefault(); void save() }}>
            <label className="grid gap-2 text-sm">Si…<select className="field" value={d.trigger_kind} onChange={(e) => setD({ ...d, trigger_kind: e.target.value as TriggerKind })}>{TRIGGERS.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}</select></label>
            {d.trigger_kind === 'time' && <label className="grid gap-2 text-sm">Hora<input type="time" className="field" value={d.time} onChange={(e) => setD({ ...d, time: e.target.value })} /></label>}
            {d.trigger_kind.startsWith('block') && <label className="grid gap-2 text-sm">Tipo de bloque<select className="field" value={d.block_kind} onChange={(e) => setD({ ...d, block_kind: e.target.value })}>{Object.entries(BLOCK_KINDS).map(([k, l]) => <option key={k} value={k}>{k === 'other' ? 'Cualquiera' : l.replace('de ', '').replace(/^./, (c) => c.toUpperCase())}</option>)}</select></label>}
            <label className="grid gap-2 text-sm">Entonces…<input autoFocus className="field" value={d.action} maxLength={200} onChange={(e) => setD({ ...d, action: e.target.value })} placeholder="Tomo agua y estiro 2 minutos" /></label>
            <p className="text-xs" style={{ color: 'var(--ink-faint)' }}>{describe({ trigger_kind: d.trigger_kind, time_min: toMin(d.time), block_kind: d.block_kind })}, entonces {d.action || '…'}</p>
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
