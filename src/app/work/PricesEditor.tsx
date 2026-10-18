import { ArrowDown, ArrowUp, ExternalLink, Link2, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import Sheet from '../../components/Sheet'
import { Group, PageHeader, Row, Switch } from '../../components/ui'
import { useCatalog } from '../../lib/quoteData'
import { PERIOD_LABEL, type Extra, type Faq, type Feature, type PageData, type Period, type Pkg, type Step } from '../../lib/quotes'
import { money } from '../../lib/projects'
import { Empty, ErrorBar, toNum } from '../money/shared'

const base = import.meta.env.BASE_URL
const publicUrl = () => `${location.origin}${base}precios`

type PD = { id?: string; name: string; tagline: string; kind: 'closed' | 'custom'; setup: string; monthly: string; note: string; recommended: boolean; published: boolean; features: string }
type ED = { id?: string; name: string; detail: string; amount: string; period: Period; approx: boolean; published: boolean }
const featText = (f: Feature[]) => f.map((x) => (x.included ? x.text : `no: ${x.text}`)).join('\n')
const parseFeat = (t: string): Feature[] => t.split('\n').map((l) => l.trim()).filter(Boolean).slice(0, 60).map((l) => (/^no:\s*/i.test(l) ? { text: l.replace(/^no:\s*/i, ''), included: false } : { text: l, included: true }))


function Pairs({ legend, addLabel, rows, onChange }: { legend: string; addLabel: string; rows: Step[]; onChange: (r: Step[]) => void }) {
  return (
    <fieldset className="grid gap-2">
      <legend className="mb-1 text-sm font-semibold">{legend}</legend>
      {rows.map((s, i) => (
        <div key={i} className="grid gap-2 rounded-xl p-3" style={{ background: 'var(--surface-2)' }}>
          <input className="field" aria-label={`Título ${i + 1}`} value={s.title} maxLength={90} onChange={(ev) => onChange(rows.map((x, j) => (j === i ? { ...x, title: ev.target.value } : x)))} />
          <textarea className="field py-2" rows={2} aria-label={`Texto ${i + 1}`} value={s.text} maxLength={300} onChange={(ev) => onChange(rows.map((x, j) => (j === i ? { ...x, text: ev.target.value } : x)))} />
          <button type="button" className="min-h-11 justify-self-start text-xs underline" style={{ color: 'var(--ink-faint)' }} onClick={() => onChange(rows.filter((_, j) => j !== i))}>Quitar</button>
        </div>
      ))}
      <button type="button" className="btn btn-ghost w-fit" onClick={() => onChange([...rows, { title: '', text: '' }])}><Plus size={16} aria-hidden /> {addLabel}</button>
    </fieldset>
  )
}

/** Editor de lo que se muestra en tu página pública de precios. */
export default function PricesEditor() {
  const c = useCatalog()
  const [p, setP] = useState<PD | null>(null)
  const [e, setE] = useState<ED | null>(null)
  const [pg, setPg] = useState<PageData | null>(null)
  const [err, setErr] = useState('')
  const [copied, setCopied] = useState(false)

  const openPkg = (x?: Pkg) => { setErr(''); setP({ id: x?.id, name: x?.name ?? '', tagline: x?.tagline ?? '', kind: x?.kind ?? 'closed', setup: x ? String(x.setup_fee || '') : '', monthly: x ? String(x.monthly_fee || '') : '', note: x?.price_note ?? '', recommended: x?.recommended ?? false, published: x?.published ?? true, features: featText(x?.features ?? []) }) }
  const savePkg = async () => {
    if (!p) return
    if (!p.name.trim()) return setErr('Ponle un nombre al paquete.')
    const setup = toNum(p.setup || '0'), monthly = toNum(p.monthly || '0')
    if (!(setup >= 0) || !(monthly >= 0)) return setErr('Los precios no son válidos.')
    const v = { name: p.name.trim(), tagline: p.tagline.trim() || null, kind: p.kind, setup_fee: p.kind === 'custom' ? 0 : setup, monthly_fee: p.kind === 'custom' ? 0 : monthly, price_note: p.note.trim() || null, features: parseFeat(p.features), recommended: p.recommended, published: p.published }
    if (p.recommended) for (const o of c.pkgs.rows) if (o.recommended && o.id !== p.id) await c.pkgs.update(o.id, { recommended: false })
    if (p.id) await c.pkgs.update(p.id, v); else await c.pkgs.add({ ...v, position: (c.pkgs.rows.at(-1)?.position ?? 0) + 1 })
    setP(null)
  }
  const swap = async (list: { id: string; position: number }[], t: 'quote_packages' | 'quote_extras', id: string, dir: -1 | 1) => {
    const i = list.findIndex((x) => x.id === id), j = i + dir
    if (i < 0 || j < 0 || j >= list.length) return
    const tbl = t === 'quote_packages' ? c.pkgs : c.extras
    await tbl.update(list[i].id, { position: list[j].position } as never)
    await tbl.update(list[j].id, { position: list[i].position } as never)
  }

  const openExtra = (x?: Extra) => { setErr(''); setE({ id: x?.id, name: x?.name ?? '', detail: x?.detail ?? '', amount: x ? String(x.amount) : '', period: x?.period ?? 'once', approx: x?.approx ?? false, published: x?.published ?? true }) }
  const saveExtra = async () => {
    if (!e) return
    const n = toNum(e.amount || '0')
    if (!e.name.trim()) return setErr('Ponle un nombre al extra.')
    if (!(n >= 0)) return setErr('El monto no es válido.')
    const v = { name: e.name.trim(), detail: e.detail.trim() || null, amount: n, period: e.period, approx: e.approx, published: e.published }
    if (e.id) await c.extras.update(e.id, v); else await c.extras.add({ ...v, position: (c.extras.rows.at(-1)?.position ?? 0) + 1 })
    setE(null)
  }
  const savePage = async () => { if (!pg) return; await c.savePage({ ...pg, validity_days: Math.max(1, Math.round(Number(pg.validity_days) || 15)), phone: pg.phone.replace(/\D/g, '') }); setPg(null) }
  const copy = async () => { try { await navigator.clipboard.writeText(publicUrl()); setCopied(true); setTimeout(() => setCopied(false), 2500) } catch { /* sin permiso */ } }

  const list = <T extends { id: string; position: number }>(rows: T[]) => rows

  return (
    <div>
      <PageHeader eyebrow="Trabajo" title="Precios públicos" sub="Lo que muestras a tus clientes en tu página. Cambias un precio aquí y se actualiza en el enlace, sin volver a publicar." />
      <ErrorBar msg={c.error} />

      <div className="flex flex-wrap gap-2">
        <a className="btn btn-primary" href={`${base}precios`} target="_blank" rel="noreferrer"><ExternalLink size={16} aria-hidden /> Ver mi página</a>
        <button className="btn btn-ghost" onClick={() => void copy()}><Link2 size={16} aria-hidden /> {copied ? '¡Enlace copiado!' : 'Copiar enlace'}</button>
      </div>
      <p className="mt-2 break-all text-xs" style={{ color: 'var(--ink-faint)' }}>{publicUrl()}</p>

      <Group title="Paquetes" aside={<button className="underline" onClick={() => openPkg()}>Agregar</button>} footer="Los ocultos no aparecen en la página. El recomendado se destaca con borde dorado.">
        {c.pkgs.rows.length === 0 && !c.loading ? <li className="row"><p className="row-hit text-sm" style={{ color: 'var(--ink-faint)' }}>Preparando tus paquetes de ejemplo…</p></li> : list(c.pkgs.rows).map((x) => (
          <Row key={x.id} tone={x.recommended ? 'var(--brass)' : x.published ? 'var(--accent)' : 'var(--ink-faint)'} muted={!x.published} title={x.name} onClick={() => openPkg(x)}
            sub={x.kind === 'custom' ? `${x.price_note ?? 'A tu medida'}${x.published ? '' : ' · oculto'}` : `Activación ${money(x.setup_fee)} · ${money(x.monthly_fee)} al mes${x.recommended ? ' · recomendado' : ''}${x.published ? '' : ' · oculto'}`} />
        ))}
      </Group>

      <Group title="Extras" aside={<button className="underline" onClick={() => openExtra()}>Agregar</button>} footer="Cosas que se suman al paquete, como el dominio. Aparecen como casillas en «Arma tu total».">
        {c.extras.rows.length === 0 ? <li className="row"><p className="row-hit text-sm" style={{ color: 'var(--ink-faint)' }}>Sin extras todavía.</p></li> : c.extras.rows.map((x) => (
          <Row key={x.id} tone="var(--sky)" muted={!x.published} title={x.name} sub={`${x.approx ? '≈ ' : ''}${money(x.amount)} ${PERIOD_LABEL[x.period]}${x.published ? '' : ' · oculto'}`} onClick={() => openExtra(x)} />
        ))}
      </Group>

      <Group title="Textos de la página">
        <Row tone="var(--accent)" title="Título, contacto, proceso y preguntas" sub="Marca, titular, WhatsApp, vigencia, pasos y preguntas frecuentes" onClick={() => setPg({ ...c.page })} />
      </Group>

      {c.loading && c.pkgs.rows.length === 0 && <Empty title="Cargando…" text="Un momento." />}

      {/* Paquete */}
      <Sheet open={Boolean(p)} title={p?.id ? 'Editar paquete' : 'Nuevo paquete'} onClose={() => setP(null)}>
        {p && (
          <div className="grid gap-4">
            <label className="grid gap-2 text-sm">Nombre<input className="field" value={p.name} maxLength={120} onChange={(ev) => setP({ ...p, name: ev.target.value })} /></label>
            <label className="grid gap-2 text-sm">Frase corta<input className="field" value={p.tagline} maxLength={300} onChange={(ev) => setP({ ...p, tagline: ev.target.value })} /></label>
            <div className="flex gap-2" role="group" aria-label="Tipo de precio">{([['closed', 'Precio cerrado'], ['custom', 'A tu medida']] as const).map(([v, l]) => <button key={v} type="button" aria-pressed={p.kind === v} onClick={() => setP({ ...p, kind: v })} className="min-h-11 rounded-full px-4 text-sm" style={{ background: p.kind === v ? 'color-mix(in oklab, var(--accent) 20%, transparent)' : 'var(--surface-2)', color: p.kind === v ? 'var(--accent)' : 'var(--ink-soft)' }}>{l}</button>)}</div>
            {p.kind === 'closed' ? (
              <div className="grid grid-cols-2 gap-3">
                <label className="grid gap-2 text-sm">Activación (una vez)<input className="field" inputMode="decimal" value={p.setup} onChange={(ev) => setP({ ...p, setup: ev.target.value })} placeholder="0.00" /></label>
                <label className="grid gap-2 text-sm">Mensualidad<input className="field" inputMode="decimal" value={p.monthly} onChange={(ev) => setP({ ...p, monthly: ev.target.value })} placeholder="0.00" /></label>
              </div>
            ) : <label className="grid gap-2 text-sm">Texto del precio<input className="field" value={p.note} maxLength={200} onChange={(ev) => setP({ ...p, note: ev.target.value })} placeholder="Se cotiza según módulos" /></label>}
            <label className="grid gap-2 text-sm">Qué incluye, una línea por cosa
              <textarea className="field py-3" rows={8} value={p.features} onChange={(ev) => setP({ ...p, features: ev.target.value })} placeholder={'Diseño con tu logo\nno: Sin reservas en línea'} />
              <span className="text-xs" style={{ color: 'var(--ink-faint)' }}>Empieza una línea con «no:» para marcarla como NO incluida.</span>
            </label>
            <label className="flex items-center justify-between gap-3 text-sm"><span>Recomendado (se destaca)</span><Switch checked={p.recommended} onChange={(v) => setP({ ...p, recommended: v })} label="Recomendado" /></label>
            <label className="flex items-center justify-between gap-3 text-sm"><span>Visible en la página pública</span><Switch checked={p.published} onChange={(v) => setP({ ...p, published: v })} label="Visible" /></label>
            {err && <p role="alert" className="text-sm" style={{ color: 'var(--neg)' }}>{err}</p>}
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" className="btn btn-primary" onClick={() => void savePkg()}>Guardar</button>
              {p.id && <>
                <button type="button" className="grid size-11 place-items-center rounded-full" style={{ background: 'var(--surface-2)' }} aria-label="Subir" onClick={() => void swap(c.pkgs.rows, 'quote_packages', p.id!, -1)}><ArrowUp size={16} aria-hidden /></button>
                <button type="button" className="grid size-11 place-items-center rounded-full" style={{ background: 'var(--surface-2)' }} aria-label="Bajar" onClick={() => void swap(c.pkgs.rows, 'quote_packages', p.id!, 1)}><ArrowDown size={16} aria-hidden /></button>
                <button type="button" className="btn btn-ghost ml-auto" style={{ color: 'var(--neg)' }} onClick={async () => { await c.pkgs.remove(p.id!); setP(null) }}><Trash2 size={16} aria-hidden /> Eliminar</button>
              </>}
            </div>
          </div>
        )}
      </Sheet>

      {/* Extra */}
      <Sheet open={Boolean(e)} title={e?.id ? 'Editar extra' : 'Nuevo extra'} onClose={() => setE(null)}>
        {e && (
          <div className="grid gap-4">
            <label className="grid gap-2 text-sm">Nombre<input className="field" value={e.name} maxLength={120} onChange={(ev) => setE({ ...e, name: ev.target.value })} /></label>
            <label className="grid gap-2 text-sm">Detalle<textarea className="field py-3" rows={3} value={e.detail} maxLength={400} onChange={(ev) => setE({ ...e, detail: ev.target.value })} /></label>
            <div className="grid grid-cols-2 gap-3">
              <label className="grid gap-2 text-sm">Monto<input className="field" inputMode="decimal" value={e.amount} onChange={(ev) => setE({ ...e, amount: ev.target.value })} placeholder="0.00" /></label>
              <label className="grid gap-2 text-sm">Cada<select className="field" value={e.period} onChange={(ev) => setE({ ...e, period: ev.target.value as Period })}>{(Object.keys(PERIOD_LABEL) as Period[]).map((k) => <option key={k} value={k}>{PERIOD_LABEL[k]}</option>)}</select></label>
            </div>
            <label className="flex items-center justify-between gap-3 text-sm"><span>Es un monto aproximado (≈)</span><Switch checked={e.approx} onChange={(v) => setE({ ...e, approx: v })} label="Aproximado" /></label>
            <label className="flex items-center justify-between gap-3 text-sm"><span>Visible en la página pública</span><Switch checked={e.published} onChange={(v) => setE({ ...e, published: v })} label="Visible" /></label>
            {err && <p role="alert" className="text-sm" style={{ color: 'var(--neg)' }}>{err}</p>}
            <div className="flex items-center gap-3">
              <button type="button" className="btn btn-primary" onClick={() => void saveExtra()}>Guardar</button>
              {e.id && <button type="button" className="btn btn-ghost ml-auto" style={{ color: 'var(--neg)' }} onClick={async () => { await c.extras.remove(e.id!); setE(null) }}><Trash2 size={16} aria-hidden /> Eliminar</button>}
            </div>
          </div>
        )}
      </Sheet>

      {/* Textos de la página */}
      <Sheet open={Boolean(pg)} title="Textos de la página" onClose={() => setPg(null)}>
        {pg && (
          <div className="grid gap-4">
            <label className="grid gap-2 text-sm">Marca<input className="field" value={pg.brand} maxLength={80} onChange={(ev) => setPg({ ...pg, brand: ev.target.value })} /></label>
            <label className="grid gap-2 text-sm">Etiqueta pequeña<input className="field" value={pg.kicker} maxLength={80} onChange={(ev) => setPg({ ...pg, kicker: ev.target.value })} /></label>
            <label className="grid gap-2 text-sm">Titular
              <input className="field" value={pg.headline} maxLength={140} onChange={(ev) => setPg({ ...pg, headline: ev.target.value })} />
              <span className="text-xs" style={{ color: 'var(--ink-faint)' }}>Pon una palabra entre asteriscos para resaltarla: Tu negocio, *ordenado*.</span>
            </label>
            <label className="grid gap-2 text-sm">Texto del botón principal<input className="field" value={pg.heroCta} maxLength={60} onChange={(ev) => setPg({ ...pg, heroCta: ev.target.value })} /></label>
            <label className="grid gap-2 text-sm">Subtítulo<textarea className="field py-3" rows={3} value={pg.sub} maxLength={400} onChange={(ev) => setPg({ ...pg, sub: ev.target.value })} /></label>
            <div className="grid grid-cols-2 gap-3">
              <label className="grid gap-2 text-sm">WhatsApp (con 502)<input className="field" inputMode="tel" value={pg.phone} onChange={(ev) => setPg({ ...pg, phone: ev.target.value })} /></label>
              <label className="grid gap-2 text-sm">Cómo se ve el número<input className="field" value={pg.phone_display} onChange={(ev) => setPg({ ...pg, phone_display: ev.target.value })} /></label>
            </div>
            <label className="grid gap-2 text-sm">Mensaje inicial de WhatsApp<input className="field" value={pg.whatsapp_text} maxLength={200} onChange={(ev) => setPg({ ...pg, whatsapp_text: ev.target.value })} /></label>
            <label className="grid gap-2 text-sm">Título de la mensualidad<input className="field" value={pg.monthlyTitle} maxLength={80} onChange={(ev) => setPg({ ...pg, monthlyTitle: ev.target.value })} /></label>
            <label className="grid gap-2 text-sm">Qué cubre la mensualidad<textarea className="field py-3" rows={5} value={pg.monthlyText} maxLength={1200} onChange={(ev) => setPg({ ...pg, monthlyText: ev.target.value })} /></label>
            <label className="grid gap-2 text-sm">Vigencia (días)<input className="field" inputMode="numeric" value={String(pg.validity_days)} onChange={(ev) => setPg({ ...pg, validity_days: Number(ev.target.value.replace(/\D/g, '')) })} /></label>
            <label className="grid gap-2 text-sm">Nota al pie (IVA, dominio…)<textarea className="field py-3" rows={3} value={pg.footer} maxLength={600} onChange={(ev) => setPg({ ...pg, footer: ev.target.value })} /></label>

            <label className="grid gap-2 text-sm">Título de «lo que duele»<input className="field" value={pg.painsTitle} maxLength={90} onChange={(ev) => setPg({ ...pg, painsTitle: ev.target.value })} /></label>
            <Pairs legend="Lo que le pasa a tu cliente" addLabel="Agregar situación" rows={pg.pains} onChange={(r) => setPg({ ...pg, pains: r })} />
            <label className="grid gap-2 text-sm">Título de «lo que cambia»<input className="field" value={pg.outcomesTitle} maxLength={90} onChange={(ev) => setPg({ ...pg, outcomesTitle: ev.target.value })} /></label>
            <Pairs legend="Lo que cambia para él" addLabel="Agregar beneficio" rows={pg.outcomes} onChange={(r) => setPg({ ...pg, outcomes: r })} />

            <fieldset className="grid gap-2">
              <legend className="mb-1 text-sm font-semibold">Pasos del proceso</legend>
              {pg.steps.map((s: Step, i) => (
                <div key={i} className="grid gap-2 rounded-xl p-3" style={{ background: 'var(--surface-2)' }}>
                  <input className="field" aria-label={`Título del paso ${i + 1}`} value={s.title} maxLength={80} onChange={(ev) => setPg({ ...pg, steps: pg.steps.map((x, j) => (j === i ? { ...x, title: ev.target.value } : x)) })} />
                  <textarea className="field py-2" rows={2} aria-label={`Texto del paso ${i + 1}`} value={s.text} maxLength={300} onChange={(ev) => setPg({ ...pg, steps: pg.steps.map((x, j) => (j === i ? { ...x, text: ev.target.value } : x)) })} />
                  <button type="button" className="min-h-11 justify-self-start text-xs underline" style={{ color: 'var(--ink-faint)' }} onClick={() => setPg({ ...pg, steps: pg.steps.filter((_, j) => j !== i) })}>Quitar paso</button>
                </div>
              ))}
              <button type="button" className="btn btn-ghost w-fit" onClick={() => setPg({ ...pg, steps: [...pg.steps, { title: '', text: '' }] })}><Plus size={16} aria-hidden /> Agregar paso</button>
            </fieldset>

            <fieldset className="grid gap-2">
              <legend className="mb-1 text-sm font-semibold">Preguntas frecuentes</legend>
              {pg.faq.map((f: Faq, i) => (
                <div key={i} className="grid gap-2 rounded-xl p-3" style={{ background: 'var(--surface-2)' }}>
                  <input className="field" aria-label={`Pregunta ${i + 1}`} value={f.q} maxLength={160} onChange={(ev) => setPg({ ...pg, faq: pg.faq.map((x, j) => (j === i ? { ...x, q: ev.target.value } : x)) })} />
                  <textarea className="field py-2" rows={2} aria-label={`Respuesta ${i + 1}`} value={f.a} maxLength={500} onChange={(ev) => setPg({ ...pg, faq: pg.faq.map((x, j) => (j === i ? { ...x, a: ev.target.value } : x)) })} />
                  <button type="button" className="min-h-11 justify-self-start text-xs underline" style={{ color: 'var(--ink-faint)' }} onClick={() => setPg({ ...pg, faq: pg.faq.filter((_, j) => j !== i) })}>Quitar pregunta</button>
                </div>
              ))}
              <button type="button" className="btn btn-ghost w-fit" onClick={() => setPg({ ...pg, faq: [...pg.faq, { q: '', a: '' }] })}><Plus size={16} aria-hidden /> Agregar pregunta</button>
            </fieldset>
            <button type="button" className="btn btn-primary w-fit" onClick={() => void savePage()}>Guardar</button>
          </div>
        )}
      </Sheet>
    </div>
  )
}
