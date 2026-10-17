import { Copy, Link2, Link2Off, Plus, Printer, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import Sheet from '../../components/Sheet'
import { Group, PageHeader, Row, Segmented, Switch } from '../../components/ui'
import { useCatalog } from '../../lib/quoteData'
import { PERIOD_LABEL, STATUS_LABEL, TEMPLATE_LABEL, addDays, bodyFor, isExpired, linesFromPick, newToken, nextNumber, paymentPlan, totalsOf, uid, type Body, type Line, type Period, type Quote, type Section, type Status, type Template } from '../../lib/quotes'
import { currentMonth, money, useProjects } from '../../lib/projects'
import { useTable } from '../../lib/table'
import { localISO } from '../../lib/time'
import { Empty, ErrorBar, toNum } from '../money/shared'
import QuoteDocument from './QuoteDocument'

const base = import.meta.env.BASE_URL
const link = (t: string) => `${location.origin}${base}cotizacion/${t}`
const STATUS_TONE: Record<Status, string> = { draft: 'var(--ink-faint)', sent: 'var(--sky)', accepted: 'var(--pos)', rejected: 'var(--neg)' }
const TEMPLATES: { id: Template; hint: string }[] = [
  { id: 'citas', hint: 'Citas en línea, panel y recordatorios, como el de la barbería.' },
  { id: 'web', hint: 'Una página profesional con tus servicios y contacto.' },
  { id: 'programa', hint: 'Módulos, capacitación y soporte para un programa propio, al estilo de un sistema contable.' },
  { id: 'custom', hint: 'Empiezas de cero y escribes todo tú.' },
]
type Tab = 'datos' | 'precios' | 'contenido' | 'vista'
const inputNum = (v: string) => v.replace(',', '.')

/** Propuestas por cliente: se arman con tus precios, se ven como documento formal y se comparten con un enlace o en PDF. */
export default function Quotes() {
  const db = useTable<Quote>('quotes', { col: 'created_at', asc: false })
  const cat = useCatalog()
  const work = useProjects()
  const [pick, setPick] = useState(false)
  const [d, setD] = useState<Quote | null>(null)
  const [tab, setTab] = useState<Tab>('datos')
  const [err, setErr] = useState('')
  const [msg, setMsg] = useState('')
  const [dirty, setDirty] = useState(false)
  const today = localISO()

  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 4500) }
  const set = (patch: Partial<Quote>) => { setD((x) => (x ? { ...x, ...patch } : x)); setDirty(true) }
  const setBody = (patch: Partial<Body>) => setD((x) => { if (!x) return x; setDirty(true); return { ...x, body: { ...x.body, ...patch } } })
  const setLine = (id: string, patch: Partial<Line>) => set({ lines: (d?.lines ?? []).map((l) => (l.id === id ? { ...l, ...patch } : l)) })

  const create = async (t: Template, withPkg?: string) => {
    const pkg = cat.pkgs.rows.find((p) => p.id === withPkg)
    const q = await db.add({
      number: nextNumber(db.rows.map((r) => r.number), new Date().getFullYear()), title: t === 'custom' ? 'Propuesta de servicios' : TEMPLATE_LABEL[t], client_name: '', client_contact: null, template: t, status: 'draft',
      lines: pkg ? linesFromPick({ pkg, extras: [] }) : [], iva: 'none', upfront_pct: 70, valid_until: addDays(today, cat.page.validity_days), body: bodyFor(t), shared: false, share_token: null, project_id: null,
    } as never)
    setPick(false)
    if (q) { setTab('datos'); setErr(''); setDirty(false); setD(q) }
  }

  const open = (q: Quote) => { setTab('datos'); setErr(''); setDirty(false); setD({ ...q, body: { ...bodyFor('custom'), ...q.body } }) }
  const save = async () => {
    if (!d) return
    if (!d.title.trim()) { setTab('datos'); return setErr('Ponle un título a la propuesta.') }
    await db.update(d.id, { title: d.title.trim(), client_name: d.client_name.trim(), client_contact: d.client_contact?.trim() || null, status: d.status, lines: d.lines, iva: d.iva, upfront_pct: d.upfront_pct, valid_until: d.valid_until || null, body: d.body } as never)
    setDirty(false); setErr(''); flash('Guardado.')
  }
  const close = async () => { if (dirty && d) await save(); setD(null) }

  const share = async (on: boolean) => {
    if (!d) return
    const token = d.share_token || newToken()
    await db.update(d.id, { shared: on, share_token: token } as never)
    setD({ ...d, shared: on, share_token: token })
  }
  const printDoc = async () => { if (!d) return; if (dirty) await save(); window.open(`${base}app/trabajo/propuestas/${d.id}/documento`, '_blank') }
  const copy = async (t: string) => { try { await navigator.clipboard.writeText(link(t)); flash('Enlace copiado.') } catch { flash(link(t)) } }

  // Aceptada → crea el trabajo con instalación y mensualidad, listo para cobrar y apartar ahorro
  const makeWork = async () => {
    if (!d) return
    await save()
    const t = totalsOf(d.lines, d.iva)
    const recurring = t.month.total > 0
    const now = new Date()
    const p = await work.add({
      title: d.title.trim(), client: d.client_name.trim() || null, status: 'active', month: currentMonth(), due_date: null, currency: 'GTQ', site_url: null,
      notes: `Viene de la propuesta ${d.number}.${t.year.total > 0 ? ` Además: ${money(t.year.total)} al año (se paga aparte).` : ''}`, checklist: [],
      amount: recurring ? 0 : t.once.total, setup_fee: recurring ? t.once.total : 0, monthly_fee: recurring ? t.month.total : 0,
      billing_day: recurring ? Math.min(28, now.getDate()) : null, monthly_start: recurring ? currentMonth() : null, monthly_end: null, account_id: null,
    })
    if (!p) return setErr('No se pudo crear el trabajo.')
    await db.update(d.id, { project_id: p.id, status: 'accepted' } as never)
    setD({ ...d, project_id: p.id, status: 'accepted' })
    flash('Trabajo creado en Trabajo → Trabajos, con su instalación y mensualidad.')
  }

  const totals = useMemo(() => (d ? totalsOf(d.lines, d.iva) : null), [d])
  const plan = useMemo(() => (d && totals ? paymentPlan(totals.once.total, d.upfront_pct) : []), [d, totals])
  const addFromCatalog = (kind: 'pkg' | 'extra', id: string) => {
    if (!d) return
    if (kind === 'pkg') { const p = cat.pkgs.rows.find((x) => x.id === id); if (p) set({ lines: [...d.lines, ...linesFromPick({ pkg: p, extras: [] })] }) }
    else { const e = cat.extras.rows.find((x) => x.id === id); if (e) set({ lines: [...d.lines, ...linesFromPick({ extras: [e] })] }) }
  }

  const totalLabel = (q: Quote) => { const t = totalsOf(q.lines, q.iva); return [t.once.total > 0 && money(t.once.total), t.month.total > 0 && `${money(t.month.total)}/mes`].filter(Boolean).join(' + ') || 'Sin precios' }

  return (
    <div>
      <PageHeader eyebrow="Trabajo" title="Propuestas" sub="Cotizaciones para tus clientes, con tus precios. Las compartes con un enlace o las guardas en PDF." action={<button className="btn btn-primary" onClick={() => setPick(true)}><Plus size={18} aria-hidden /> Nueva</button>} />
      <ErrorBar msg={db.error || cat.error} onClose={db.clearError} />
      {msg && !d && <p role="status" className="mb-3 text-sm" style={{ color: 'var(--pos)' }}>{msg}</p>}

      {db.rows.length === 0 && !db.loading ? (
        <Empty title="Aún no tienes propuestas" text="Elige un tipo de servicio, ajusta los precios y listo: te queda un documento formal con tu logo." action="Crear la primera" onAction={() => setPick(true)} />
      ) : (
        (['draft', 'sent', 'accepted', 'rejected'] as Status[]).filter((s) => db.rows.some((q) => q.status === s)).map((s) => (
          <Group key={s} title={STATUS_LABEL[s]} aside={db.rows.filter((q) => q.status === s).length}>
            {db.rows.filter((q) => q.status === s).map((q) => (
              <Row key={q.id} tone={STATUS_TONE[q.status]} title={`${q.client_name || 'Sin cliente'} · ${q.title}`}
                sub={<>{q.number}{q.valid_until ? (isExpired(q.valid_until, today) && q.status !== 'accepted' ? <span style={{ color: 'var(--neg)' }}> · venció el {q.valid_until}</span> : ` · vence el ${q.valid_until}`) : ''}{q.shared ? ' · compartida' : ''}</>}
                value={totalLabel(q)} valueTone="soft" onClick={() => open(q)} />
            ))}
          </Group>
        ))
      )}

      {/* Elegir tipo */}
      <Sheet open={pick} title="¿Qué vas a cotizar?" onClose={() => setPick(false)}>
        <div className="grid gap-3">
          {TEMPLATES.map((t) => (
            <button key={t.id} type="button" className="rounded-2xl p-4 text-left" style={{ background: 'var(--surface-2)' }} onClick={() => void create(t.id, t.id === 'citas' ? cat.pkgs.rows.find((p) => p.recommended)?.id : t.id === 'web' ? cat.pkgs.rows.find((p) => p.kind === 'closed')?.id : undefined)}>
              <strong>{TEMPLATE_LABEL[t.id]}</strong><br /><span className="text-sm" style={{ color: 'var(--ink-faint)' }}>{t.hint}</span>
            </button>
          ))}
        </div>
      </Sheet>

      {/* Editor */}
      <Sheet open={Boolean(d)} title={d ? d.number : ''} onClose={() => void close()}>
        {d && totals && (
          <div className="grid gap-4">
            <Segmented label="Sección" value={tab} onChange={setTab} options={[{ id: 'datos', label: 'Datos' }, { id: 'precios', label: 'Precios' }, { id: 'contenido', label: 'Contenido' }, { id: 'vista', label: 'Vista previa' }]} />

            {tab === 'datos' && (
              <div className="grid gap-4">
                <label className="grid gap-2 text-sm">Título<input className="field" value={d.title} maxLength={200} onChange={(e) => set({ title: e.target.value })} /></label>
                <label className="grid gap-2 text-sm">Cliente<input className="field" value={d.client_name} maxLength={200} onChange={(e) => set({ client_name: e.target.value })} placeholder="Nombre del negocio o la persona" /></label>
                <label className="grid gap-2 text-sm">Contacto (opcional)<input className="field" value={d.client_contact ?? ''} maxLength={200} onChange={(e) => set({ client_contact: e.target.value })} placeholder="Teléfono o correo" /></label>
                <label className="grid gap-2 text-sm">Vigente hasta<input type="date" className="field" value={d.valid_until ?? ''} onChange={(e) => set({ valid_until: e.target.value || null })} /></label>
                <fieldset>
                  <legend className="mb-2 text-sm">Estado</legend>
                  <div className="flex flex-wrap gap-2">{(Object.keys(STATUS_LABEL) as Status[]).map((s) => <button key={s} type="button" aria-pressed={d.status === s} onClick={() => set({ status: s })} className="min-h-11 rounded-full px-4 text-sm" style={{ background: d.status === s ? `color-mix(in oklab, ${STATUS_TONE[s]} 20%, transparent)` : 'var(--surface-2)', color: d.status === s ? STATUS_TONE[s] : 'var(--ink-soft)', boxShadow: d.status === s ? `inset 0 0 0 1.5px ${STATUS_TONE[s]}` : 'none' }}>{STATUS_LABEL[s]}</button>)}</div>
                </fieldset>
                {d.status === 'accepted' && !d.project_id && (
                  <div className="rounded-2xl p-4 text-sm" style={{ background: 'color-mix(in oklab, var(--pos) 10%, var(--surface-2))' }}>
                    <p><strong>¡Aceptada!</strong> Puedo crear el trabajo con estos precios: la instalación y la mensualidad quedan listas para cobrar, y de cada cobro puedes apartar para tu ahorro.</p>
                    <button type="button" className="btn btn-primary mt-3" onClick={() => void makeWork()}>Crear el trabajo</button>
                  </div>
                )}
                {d.project_id && <p className="text-sm" style={{ color: 'var(--pos)' }}>Ya tiene su trabajo creado en Trabajo → Trabajos.</p>}
              </div>
            )}

            {tab === 'precios' && (
              <div className="grid gap-4">
                {d.lines.length === 0 && <p className="text-sm" style={{ color: 'var(--ink-faint)' }}>Agrega los conceptos que vas a cobrar.</p>}
                {d.lines.map((l) => (
                  <div key={l.id} className="grid gap-2 rounded-2xl p-3" style={{ background: 'var(--surface-2)' }}>
                    <input className="field" aria-label="Concepto" value={l.label} maxLength={160} onChange={(e) => setLine(l.id, { label: e.target.value })} placeholder="Concepto" />
                    <input className="field" aria-label="Detalle" value={l.detail ?? ''} maxLength={240} onChange={(e) => setLine(l.id, { detail: e.target.value })} placeholder="Detalle (opcional)" />
                    <div className="grid grid-cols-3 gap-2">
                      <input className="field" inputMode="numeric" aria-label="Cantidad" value={String(l.qty)} onChange={(e) => setLine(l.id, { qty: Number(e.target.value.replace(/\D/g, '')) || 0 })} />
                      <input className="field" inputMode="decimal" aria-label="Precio" value={String(l.unit || '')} onChange={(e) => setLine(l.id, { unit: toNum(inputNum(e.target.value)) || 0 })} placeholder="0.00" />
                      <select className="field" aria-label="Cada cuánto" value={l.period} onChange={(e) => setLine(l.id, { period: e.target.value as Period })}>{(Object.keys(PERIOD_LABEL) as Period[]).map((k) => <option key={k} value={k}>{PERIOD_LABEL[k]}</option>)}</select>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-sm">
                      <label className="flex min-h-11 items-center gap-2"><Switch checked={Boolean(l.optional)} onChange={(v) => setLine(l.id, { optional: v, on: v ? false : undefined })} label="Es opcional" /> Opcional</label>
                      {l.optional && <label className="flex min-h-11 items-center gap-2"><Switch checked={Boolean(l.on)} onChange={(v) => setLine(l.id, { on: v })} label="Incluir en el total" /> Incluir</label>}
                      <span className="ml-auto font-semibold">{money((l.qty || 0) * (l.unit || 0))}</span>
                      <button type="button" className="grid size-11 place-items-center" aria-label="Quitar concepto" onClick={() => set({ lines: d.lines.filter((x) => x.id !== l.id) })}><Trash2 size={16} aria-hidden /></button>
                    </div>
                  </div>
                ))}
                <div className="flex flex-wrap gap-2">
                  <button type="button" className="btn btn-ghost" onClick={() => set({ lines: [...d.lines, { id: uid(), label: '', qty: 1, unit: 0, period: 'once' }] })}><Plus size={16} aria-hidden /> Concepto</button>
                  {cat.pkgs.rows.filter((p) => p.kind === 'closed').map((p) => <button key={p.id} type="button" className="min-h-11 rounded-full px-3 text-sm" style={{ background: 'var(--surface-2)', color: 'var(--ink-soft)' }} onClick={() => addFromCatalog('pkg', p.id)}>+ {p.name}</button>)}
                  {cat.extras.rows.map((x) => <button key={x.id} type="button" className="min-h-11 rounded-full px-3 text-sm" style={{ background: 'var(--surface-2)', color: 'var(--ink-soft)' }} onClick={() => addFromCatalog('extra', x.id)}>+ {x.name}</button>)}
                </div>

                <fieldset>
                  <legend className="mb-2 text-sm">IVA (solo si el cliente lo requiere)</legend>
                  <div className="flex flex-wrap gap-2">{([['none', 'Sin IVA'], ['included', 'Precios con IVA incluido'], ['added', 'Agregar 12% de IVA']] as const).map(([v, l]) => <button key={v} type="button" aria-pressed={d.iva === v} onClick={() => set({ iva: v })} className="min-h-11 rounded-full px-4 text-sm" style={{ background: d.iva === v ? 'color-mix(in oklab, var(--accent) 20%, transparent)' : 'var(--surface-2)', color: d.iva === v ? 'var(--accent)' : 'var(--ink-soft)', boxShadow: d.iva === v ? 'inset 0 0 0 1.5px var(--accent)' : 'none' }}>{l}</button>)}</div>
                </fieldset>
                <fieldset>
                  <legend className="mb-2 text-sm">Pago único: cuánto al confirmar</legend>
                  <div className="flex flex-wrap gap-2">{[50, 70, 75, 100].map((n) => <button key={n} type="button" aria-pressed={d.upfront_pct === n} onClick={() => set({ upfront_pct: n })} className="min-h-11 rounded-full px-4 text-sm" style={{ background: d.upfront_pct === n ? 'color-mix(in oklab, var(--accent) 20%, transparent)' : 'var(--surface-2)', color: d.upfront_pct === n ? 'var(--accent)' : 'var(--ink-soft)' }}>{n}%{n < 100 ? ` / ${100 - n}%` : ''}</button>)}</div>
                </fieldset>

                <div className="rounded-2xl p-4 text-sm" style={{ background: 'var(--surface-2)' }}>
                  {totals.once.total > 0 && <p>Pago único: <strong>{money(totals.once.total)}</strong>{d.iva !== 'none' ? ` (IVA ${money(totals.once.iva)})` : ''}</p>}
                  {totals.month.total > 0 && <p>Mensualidad: <strong>{money(totals.month.total)}</strong></p>}
                  {totals.year.total > 0 && <p>Anual: <strong>{money(totals.year.total)}</strong></p>}
                  {plan.length > 1 && <p className="mt-1" style={{ color: 'var(--ink-faint)' }}>{plan.map((p) => `${money(p.amount)} ${p.label.toLowerCase()}`).join(' · ')}</p>}
                  {totals.once.total + totals.month.total + totals.year.total === 0 && <p style={{ color: 'var(--ink-faint)' }}>Todavía sin precios.</p>}
                </div>
              </div>
            )}

            {tab === 'contenido' && (
              <div className="grid gap-4">
                <label className="grid gap-2 text-sm">Introducción<textarea className="field py-3" rows={4} value={d.body.intro} maxLength={1500} onChange={(e) => setBody({ intro: e.target.value })} /></label>
                {d.body.sections.map((s: Section, i) => (
                  <div key={i} className="grid gap-2 rounded-2xl p-3" style={{ background: 'var(--surface-2)' }}>
                    <input className="field" aria-label={`Título de la sección ${i + 1}`} value={s.title} maxLength={120} onChange={(e) => setBody({ sections: d.body.sections.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)) })} />
                    <textarea className="field py-2" rows={4} aria-label={`Puntos de la sección ${i + 1}`} value={s.items.join('\n')} onChange={(e) => setBody({ sections: d.body.sections.map((x, j) => (j === i ? { ...x, items: e.target.value.split('\n').slice(0, 40) } : x)) })} />
                    <button type="button" className="min-h-11 justify-self-start text-xs underline" style={{ color: 'var(--ink-faint)' }} onClick={() => setBody({ sections: d.body.sections.filter((_, j) => j !== i) })}>Quitar sección</button>
                  </div>
                ))}
                <button type="button" className="btn btn-ghost w-fit" onClick={() => setBody({ sections: [...d.body.sections, { title: '', items: [] }] })}><Plus size={16} aria-hidden /> Sección</button>
                <label className="grid gap-2 text-sm">Qué no incluye (una línea por cosa)<textarea className="field py-3" rows={3} value={d.body.exclusions.join('\n')} onChange={(e) => setBody({ exclusions: e.target.value.split('\n').slice(0, 30) })} /></label>
                <label className="grid gap-2 text-sm">Soporte y garantía<textarea className="field py-3" rows={4} value={d.body.support} maxLength={1500} onChange={(e) => setBody({ support: e.target.value })} /></label>
                <label className="grid gap-2 text-sm">Condiciones (una por línea)<textarea className="field py-3" rows={3} value={d.body.conditions.join('\n')} onChange={(e) => setBody({ conditions: e.target.value.split('\n').slice(0, 30) })} /></label>
                <label className="grid gap-2 text-sm">Notas<textarea className="field py-3" rows={3} value={d.body.notes} maxLength={1500} onChange={(e) => setBody({ notes: e.target.value })} /></label>
              </div>
            )}

            {tab === 'vista' && (
              <div className="grid gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <button type="button" className="btn btn-primary" onClick={() => void printDoc()}><Printer size={16} aria-hidden /> Imprimir o guardar PDF</button>
                  {d.shared && d.share_token
                    ? <>
                        <button type="button" className="btn btn-ghost" onClick={() => void copy(d.share_token!)}><Copy size={16} aria-hidden /> Copiar enlace</button>
                        <button type="button" className="btn btn-ghost" onClick={() => void share(false)}><Link2Off size={16} aria-hidden /> Dejar de compartir</button>
                      </>
                    : <button type="button" className="btn btn-ghost" onClick={() => void share(true)}><Link2 size={16} aria-hidden /> Compartir con un enlace</button>}
                </div>
                {d.shared && d.share_token && <p className="break-all text-xs" style={{ color: 'var(--ink-faint)' }}>{link(d.share_token)} · cualquiera con el enlace puede verla; nadie más.</p>}
                {dirty && <p className="text-xs" style={{ color: 'var(--accent)' }}>Tienes cambios sin guardar: el enlace compartido muestra lo último guardado.</p>}
                <div style={{ background: '#e9e6df', padding: '12px', borderRadius: 12, overflow: 'auto' }}><QuoteDocument q={d} page={cat.page} /></div>
              </div>
            )}

            {err && <p role="alert" className="text-sm" style={{ color: 'var(--neg)' }}>{err}</p>}
            {msg && <p role="status" className="text-sm" style={{ color: 'var(--pos)' }}>{msg}</p>}
            <div className="flex flex-wrap items-center gap-3 no-print">
              <button type="button" className="btn btn-primary" onClick={() => void save()}>Guardar</button>
              <button type="button" className="btn btn-ghost ml-auto" style={{ color: 'var(--neg)' }} onClick={async () => { if (window.confirm('¿Eliminar esta propuesta?')) { await db.remove(d.id); setD(null) } }}><Trash2 size={16} aria-hidden /> Eliminar</button>
            </div>
          </div>
        )}
      </Sheet>
    </div>
  )
}
