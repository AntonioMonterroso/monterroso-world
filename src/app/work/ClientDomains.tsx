import { Globe, Plus, Server } from 'lucide-react'
import { useState } from 'react'
import Sheet from '../../components/Sheet'
import { Group, Row } from '../../components/ui'
import type { Domain } from '../../lib/clientNotes'
import { money } from '../../lib/projects'
import { daysUntil, nextDue, type Renewal } from '../../lib/renewals'
import { useTable } from '../../lib/table'
import { localISO } from '../../lib/time'
import { toNum } from '../money/shared'

const amt = (v: string) => { const x = toNum(v.replace(/[q\s]/gi, '')); return x > 0 ? Math.round(x * 100) / 100 : 0 }
const fmt = (d: string) => new Date(`${d}T12:00:00`).toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' })

/** Dominio y hosting del cliente: cuándo vence (en Renovaciones), lo que te cuesta y lo que le cobras. 30 días antes te sugiere cobrarlo. */
export default function ClientDomains({ client, domains, setDomains, onCharge }: { client: string; domains: Domain[]; setDomains: (d: Domain[]) => void; onCharge: (amount: number, note: string) => void }) {
  const renewals = useTable<Renewal>('renewals', { col: 'next_due', asc: true })
  const today = localISO()
  const [form, setForm] = useState<null | { kind: 'dominio' | 'hosting'; label: string; due: string; cost: string; charge: string }>(null)
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  const add = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form || busy) return
    if (!form.label.trim()) return setErr(form.kind === 'dominio' ? 'Escribe el dominio, por ejemplo imperio.com.' : 'Escribe el plan o el proveedor.')
    if (!form.due) return setErr('Pon la fecha en que vence.')
    setBusy(true); setErr('')
    const charge = amt(form.charge)
    const r = await renewals.add({ name: `${form.kind === 'dominio' ? 'Dominio' : 'Hosting'} ${form.label.trim()} · ${client}`, every_n: 1, unit: 'year', next_due: form.due, lead_days: 30, note: charge ? `Cobrarle ${money(charge)} a ${client}` : null, event_id: null })
    setDomains([...domains, { id: Math.random().toString(36).slice(2, 10), label: form.label.trim(), kind: form.kind, cost: amt(form.cost), charge, renewalId: r?.id ?? null }])
    setBusy(false); setForm(null)
  }
  const renewed = async (r: Renewal) => { await renewals.update(r.id, { next_due: nextDue(r, today) }) }
  const remove = async (d: Domain) => { if (d.renewalId) await renewals.remove(d.renewalId); setDomains(domains.filter((x) => x.id !== d.id)) }
  const [confirmDel, setConfirmDel] = useState<string | null>(null)

  return (
    <>
      <Group title="Dominio y hosting" aside={<button className="btn btn-sec btn-chico" onClick={() => { setErr(''); setForm({ kind: 'dominio', label: '', due: '', cost: '', charge: '' }) }}><Plus size={15} aria-hidden /> Agregar</button>} footer="La fecha queda en Agenda › Vencimientos. Un mes antes te sugiero cobrarle la renovación.">
        {domains.length === 0 ? <Row title="Nada todavía" sub="Agrega su dominio o su hosting para no olvidar renovarlo ni cobrarlo" chevron={false} /> : domains.map((d) => {
          const r = renewals.rows.find((x) => x.id === d.renewalId)
          const days = r ? daysUntil(r, today) : null
          const soon = days !== null && days <= 30
          return (
            <li key={d.id} className="row"><div className="grid w-full gap-2 px-4 py-3">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 shrink-0" style={{ color: soon ? 'var(--aviso)' : 'var(--ink-soft)' }}>{d.kind === 'dominio' ? <Globe size={16} aria-hidden /> : <Server size={16} aria-hidden />}</span>
                <span className="min-w-0 flex-1"><span className="block font-semibold break-words">{d.label}</span>
                  <span className="block text-sm" style={{ color: soon ? 'var(--aviso-texto)' : 'var(--ink-soft)' }}>{[r ? (days! < 0 ? `venció el ${fmt(r.next_due)}` : `vence el ${fmt(r.next_due)}${soon ? ` · en ${days} ${days === 1 ? 'día' : 'días'}` : ''}`) : 'sin fecha', d.charge ? `le cobras ${money(d.charge)}` : null, d.cost ? `te cuesta ${money(d.cost)}` : null].filter(Boolean).join(' · ')}</span></span>
              </div>
              <div className="flex flex-wrap items-center gap-2 pl-7">
                {soon && d.charge > 0 && <button className="btn btn-primary btn-chico" onClick={() => onCharge(d.charge, `Renovación ${d.kind} ${d.label}`)}>Cobrar renovación</button>}
                {soon && r && <button className="btn btn-sec btn-chico" onClick={() => void renewed(r)}>Ya lo renové</button>}
                {confirmDel === d.id ? <><button className="btn btn-ghost btn-chico" onClick={() => void remove(d)}>Sí, quitar</button><button className="btn btn-ghost btn-chico" onClick={() => setConfirmDel(null)}>No</button></> : <button className="min-h-11 px-2 text-sm underline" style={{ color: 'var(--ink-soft)' }} onClick={() => setConfirmDel(d.id)}>Quitar</button>}
              </div>
            </div></li>
          )
        })}
      </Group>
      <Sheet open={Boolean(form)} title="Dominio u hosting" onClose={() => setForm(null)}>
        {form && (
          <form className="grid gap-4" onSubmit={add}>
            <div className="flex gap-2" role="group" aria-label="Tipo">{(['dominio', 'hosting'] as const).map((k) => <button key={k} type="button" className="chip-btn" aria-pressed={form.kind === k} onClick={() => setForm({ ...form, kind: k })}>{k === 'dominio' ? 'Dominio' : 'Hosting'}</button>)}</div>
            <label className="grid gap-2 text-sm">{form.kind === 'dominio' ? 'Dominio' : 'Plan o proveedor'}<input className="field" value={form.label} maxLength={120} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder={form.kind === 'dominio' ? 'imperiostore.com' : 'Hostinger básico'} autoFocus /></label>
            <label className="grid gap-2 text-sm">Vence el<input type="date" className="field" value={form.due} onChange={(e) => setForm({ ...form, due: e.target.value })} /></label>
            <div className="grid grid-cols-2 gap-3">
              <label className="grid gap-2 text-sm">Te cuesta al año<input className="field" inputMode="decimal" value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value })} placeholder="Q 0.00" /></label>
              <label className="grid gap-2 text-sm">Le cobras<input className="field" inputMode="decimal" value={form.charge} onChange={(e) => setForm({ ...form, charge: e.target.value })} placeholder="Q 0.00" /></label>
            </div>
            {err && <p role="alert" className="text-sm" style={{ color: 'var(--aviso-texto)' }}>{err}</p>}
            <div className="flex flex-wrap gap-2"><button className="btn btn-primary" disabled={busy}>Guardar</button><button type="button" className="btn btn-ghost" onClick={() => setForm(null)}>Cancelar</button></div>
          </form>
        )}
      </Sheet>
    </>
  )
}
