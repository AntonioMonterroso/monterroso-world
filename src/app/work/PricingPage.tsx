import { ArrowUpRight, Check, Loader2, Minus, Phone } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { fetchPricing, type Pricing } from '../../lib/quoteData'
import { DEFAULT_PAGE, PERIOD_LABEL, linesFromPick, totalsOf, waLink, type Extra, type PageData, type Pkg } from '../../lib/quotes'
import { money } from '../../lib/projects'
import { profile } from '../../lib/profile'

const base = import.meta.env.BASE_URL
const FONTS = 'https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,700&family=Instrument+Sans:wght@500;600;700&family=JetBrains+Mono:wght@400;500&display=swap'

/** Las mismas tipografías que la página del estudio, cargadas solo en esta página. */
function useStudioFonts() {
  useEffect(() => {
    const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = FONTS; document.head.appendChild(l)
    return () => { l.remove() }
  }, [])
}

/** Un número que sube o baja con suavidad cuando cambias de opción (sin movimiento si lo prefieres así). */
function useCount(target: number) {
  const [v, setV] = useState(target)
  const from = useRef(target)
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { setV(target); from.current = target; return }
    const a = from.current, start = performance.now(); let raf = 0
    const tick = (t: number) => { const p = Math.min(1, (t - start) / 420); const val = a + (target - a) * (1 - Math.pow(1 - p, 3)); setV(val); from.current = val; if (p < 1) raf = requestAnimationFrame(tick) }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target])
  return v
}
const Num = ({ n }: { n: number }) => <>{money(useCount(n))}</>

/** Precios públicos: eliges qué necesitas, ajustas y ves tu total al instante. No requiere sesión. */
export default function PricingPage({ preview }: { preview?: { page: PageData; packages: Pkg[]; extras: Extra[] } }) {
  useStudioFonts()
  const [data, setData] = useState<Pricing | null>(null)
  const [state, setState] = useState<'loading' | 'ok' | 'fail'>(preview ? 'ok' : 'loading')
  const [chosen, setChosen] = useState('')
  const [picked, setPicked] = useState<string[]>([])
  const [invoice, setInvoice] = useState(false)

  useEffect(() => { if (preview) return; void fetchPricing().then((d) => { setData(d); setState(d ? 'ok' : 'fail') }) }, [preview])
  const page: PageData = { ...DEFAULT_PAGE, ...((preview?.page ?? data?.page) as Partial<PageData>) }
  useEffect(() => { document.title = `Precios · ${page.brand}`; return () => { document.title = 'Monterroso World | Desarrollador web y músico' } }, [page.brand])

  const all = (preview?.packages ?? data?.packages ?? []).filter((p) => p.published !== false)
  const extras = (preview?.extras ?? data?.extras ?? []).filter((e) => e.published !== false)
  useEffect(() => { if (!chosen && all[0]) setChosen((all.find((p) => p.recommended) ?? all[0]).id) }, [all, chosen])

  const pkg = all.find((p) => p.id === chosen)
  const sel = extras.filter((e) => picked.includes(e.id))
  const lines = useMemo(() => linesFromPick({ pkg: pkg?.kind === 'closed' ? pkg : undefined, extras: sel }), [pkg, sel])
  const t = useMemo(() => totalsOf(lines, invoice ? 'added' : 'none'), [lines, invoice])
  const isCustom = pkg?.kind === 'custom'
  const wa = (text: string) => waLink(page.phone, `${page.whatsapp_text}. ${text}`.trim())
  const message = isCustom
    ? `Quiero cotizar «${pkg?.name}». Te cuento mi idea: `
    : `Quiero «${pkg?.name ?? ''}»${sel.length ? ` con ${sel.map((e) => e.name).join(' y ')}` : ''}. Activación ${money(t.once.total)} y ${money(t.month.total)} al mes${t.year.total > 0 ? `, más ${money(t.year.total)} al año` : ''}${invoice ? ', con factura (IVA)' : ''}.`

  if (state === 'loading') return <main className="pr grid min-h-dvh place-items-center"><Loader2 className="animate-spin" aria-label="Cargando" /></main>
  if (state === 'fail') return <main className="pr grid min-h-dvh place-items-center px-6 text-center"><p>No pude cargar los precios ahora mismo. Escríbeme por WhatsApp al {page.phone_display} y te los comparto.</p></main>

  return (
    <main className="pr">
      <div className="pr-wrap">
        <header className="pr-top">
          <a href={profile.site} className="pr-brand"><img src={`${base}brand/am-logo-white.png`} alt="" width={40} height={32} /><span>{page.brand}</span></a>
          <a className="pr-call" href={wa('')} target="_blank" rel="noreferrer"><Phone size={15} aria-hidden /> {page.phone_display}</a>
        </header>

        <section className="pr-hero">
          <p className="pr-k">{page.kicker}</p>
          <h1 className="pr-h1">{page.headline}</h1>
          <p className="pr-sub">{page.sub}</p>
        </section>

        <div className="pr-cols">
          <div className="pr-steps-col">
            {/* 1 · Qué necesitas */}
            <section aria-labelledby="s1">
              <h2 id="s1" className="pr-step"><span>01</span> ¿Qué necesitas?</h2>
              <div className="pr-opts" role="radiogroup" aria-label="Paquete">
                {all.map((p) => {
                  const on = chosen === p.id
                  const yes = p.features.filter((f) => f.included)
                  const no = p.features.filter((f) => !f.included)
                  return (
                    <div key={p.id} className={`pr-opt ${on ? 'on' : ''}`}>
                      <button type="button" role="radio" aria-checked={on} className="pr-opt-hit" onClick={() => setChosen(p.id)}>
                        <span className="pr-radio" aria-hidden>{on && <Check size={13} />}</span>
                        <span className="pr-opt-main">
                          <span className="pr-opt-name">{p.name}{p.recommended && <em>Recomendado</em>}</span>
                          {p.tagline && <span className="pr-opt-tag">{p.tagline}</span>}
                        </span>
                        <span className="pr-opt-price">
                          {p.kind === 'custom' ? <b className="pr-sm">{p.price_note ?? 'A tu medida'}</b> : <><b>{money(p.monthly_fee)}</b><small>al mes</small></>}
                          {p.kind === 'closed' && p.setup_fee > 0 && <small>+ {money(p.setup_fee)} de activación</small>}
                        </span>
                      </button>
                      {on && yes.length > 0 && (
                        <div className="pr-opt-body">
                          <ul>{yes.slice(0, 5).map((f, i) => <li key={i}><Check size={14} aria-hidden />{f.text}</li>)}</ul>
                          {(yes.length > 5 || no.length > 0) && (
                            <details><summary>Ver todo lo que incluye</summary>
                              <ul>{yes.slice(5).map((f, i) => <li key={i}><Check size={14} aria-hidden />{f.text}</li>)}{no.map((f, i) => <li key={`n${i}`} className="no"><Minus size={14} aria-hidden />{f.text}</li>)}</ul>
                            </details>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </section>

            {/* 2 · Ajusta */}
            {!isCustom && (
              <section aria-labelledby="s2">
                <h2 id="s2" className="pr-step"><span>02</span> Ajusta a tu gusto</h2>
                <div className="pr-toggles">
                  {extras.map((e) => {
                    const on = picked.includes(e.id)
                    return (
                      <button key={e.id} type="button" role="switch" aria-checked={on} className={`pr-tog ${on ? 'on' : ''}`} onClick={() => setPicked((l) => (l.includes(e.id) ? l.filter((x) => x !== e.id) : [...l, e.id]))}>
                        <span className="pr-sw" aria-hidden><i /></span>
                        <span className="pr-tog-main"><b>{e.name}</b>{e.detail && <small>{e.detail}</small>}</span>
                        <span className="pr-tog-price">{e.approx ? '≈ ' : ''}{money(e.amount)}<small>{PERIOD_LABEL[e.period]}</small></span>
                      </button>
                    )
                  })}
                  <button type="button" role="switch" aria-checked={invoice} className={`pr-tog ${invoice ? 'on' : ''}`} onClick={() => setInvoice((v) => !v)}>
                    <span className="pr-sw" aria-hidden><i /></span>
                    <span className="pr-tog-main"><b>Necesito factura con IVA</b><small>Si la necesitas, se suma el 12% a cada monto. Si no, el precio es el de arriba.</small></span>
                    <span className="pr-tog-price">+12%</span>
                  </button>
                </div>
              </section>
            )}

            <section className="pr-note"><b>{page.monthlyTitle}.</b> {page.monthlyText}</section>
          </div>

          {/* 3 · Tu total, como un recibo */}
          <aside className="pr-aside" aria-label="Tu resumen">
            <div className="pr-receipt">
              <p className="pr-rk"><span>03</span> Tu resumen</p>
              <p className="pr-rname">{pkg?.name ?? '—'}</p>
              {isCustom ? (
                <>
                  <p className="pr-rcustom">Este paquete se cotiza según lo que necesites. Cuéntame tu idea y te preparo una propuesta formal por escrito.</p>
                  <a className="pr-btn" href={wa(message)} target="_blank" rel="noreferrer">Cuéntame tu idea <ArrowUpRight size={16} aria-hidden /></a>
                </>
              ) : (
                <>
                  <dl className="pr-rows">
                    {lines.map((l) => <div key={l.id}><dt>{l.label.replace(/ · .*/, '')}<small>{PERIOD_LABEL[l.period]}</small></dt><dd>{money(l.unit)}</dd></div>)}
                    {invoice && <div><dt>IVA 12%<small>sobre cada monto</small></dt><dd>{money(t.once.iva + t.month.iva + t.year.iva)}</dd></div>}
                  </dl>
                  <div className="pr-totals">
                    <div><span>Para empezar</span><strong><Num n={t.once.total} /></strong></div>
                    <div><span>Cada mes</span><strong><Num n={t.month.total} /></strong></div>
                    {t.year.total > 0 && <div><span>Cada año</span><strong><Num n={t.year.total} /></strong></div>}
                  </div>
                  <a className="pr-btn" href={wa(message)} target="_blank" rel="noreferrer">Pedirlo por WhatsApp <ArrowUpRight size={16} aria-hidden /></a>
                  <p className="pr-fine">Sin compromiso. Mínimo de 3 meses. {page.validity_days} días de vigencia.</p>
                </>
              )}
            </div>
          </aside>
        </div>

        {page.steps.length > 0 && (
          <section aria-labelledby="proc" className="pr-sec">
            <h2 id="proc" className="pr-h2">Así trabajamos</h2>
            <ol className="pr-proc">{page.steps.map((s, i) => <li key={i}><span>{String(i + 1).padStart(2, '0')}</span><b>{s.title}</b><p>{s.text}</p></li>)}</ol>
          </section>
        )}

        {page.faq.length > 0 && (
          <section aria-labelledby="faq" className="pr-sec">
            <h2 id="faq" className="pr-h2">Preguntas frecuentes</h2>
            <div className="pr-faqs">{page.faq.map((f, i) => <details key={i} className="pr-faq"><summary>{f.q}</summary><p>{f.a}</p></details>)}</div>
          </section>
        )}

        <footer className="pr-foot">
          <p>{page.footer}</p>
          <p>WhatsApp <a href={wa('')} target="_blank" rel="noreferrer">{page.phone_display}</a> · <a href={profile.site}>Volver al estudio</a></p>
        </footer>
      </div>

      {/* En el teléfono, el total siempre a la vista */}
      <div className="pr-bar" aria-hidden={isCustom}>
        {!isCustom ? <><span><small>Para empezar</small><b><Num n={t.once.total} /></b></span><span><small>Cada mes</small><b><Num n={t.month.total} /></b></span></> : <span><small>{pkg?.name}</small><b className="pr-sm">A tu medida</b></span>}
        <a className="pr-btn" href={wa(message)} target="_blank" rel="noreferrer">{isCustom ? 'Escribir' : 'Pedirlo'}</a>
      </div>
    </main>
  )
}
