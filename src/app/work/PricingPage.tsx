import { ArrowRight, ArrowUpRight, Check, CalendarCheck2, Loader2, MessageCircle, Search, TrendingUp } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { fetchPricing, type Pricing } from '../../lib/quoteData'
import { DEFAULT_PAGE, GOALS, IVA_RATE, PERIOD_LABEL, linesFromPick, payOptions, recommendPkg, totalsOf, waLink, type Extra, type Goal, type PageData, type PayMode, type Pkg } from '../../lib/quotes'
import { money } from '../../lib/projects'
import { profile } from '../../lib/profile'

const base = import.meta.env.BASE_URL
const FONTS = 'https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,600;12..96,700&family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,700&display=swap'
const BUSINESS = ['Barbería o salón', 'Restaurante o cafetería', 'Tienda o comercio', 'Servicios profesionales', 'Iglesia u organización', 'Otro']
const TINTS = ['butter', 'sage', 'blush', 'lilac'] as const

function useFonts() {
  useEffect(() => {
    const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = FONTS; document.head.appendChild(l)
    return () => { l.remove() }
  }, [])
}
/** «Tu negocio, *ordenado* y fácil…»: lo que va entre asteres se resalta con marcador. */
const Marked = ({ text }: { text: string }) => <>{text.split(/\*(.+?)\*/g).map((t, i) => (i % 2 ? <mark key={i}>{t}</mark> : <span key={i}>{t}</span>))}</>

/** Precios públicos pensados como una conversación: primero lo que cambia para ti, luego una propuesta a tu medida, y la inversión solo cuando la quieres ver. */
export default function PricingPage({ preview }: { preview?: { page: PageData; packages: Pkg[]; extras: Extra[] } }) {
  useFonts()
  const [data, setData] = useState<Pricing | null>(null)
  const [state, setState] = useState<'loading' | 'ok' | 'fail'>(preview ? 'ok' : 'loading')
  // propuesta guiada
  const [step, setStep] = useState(1)
  const [biz, setBiz] = useState('')
  const [goals, setGoals] = useState<Goal[]>([])
  const [name, setName] = useState('')
  const [forced, setForced] = useState('')
  const [invoice, setInvoice] = useState(false)
  const [modes, setModes] = useState<Record<string, PayMode>>({})
  const [mode, setMode] = useState<PayMode | undefined>(undefined)

  useEffect(() => { if (preview) return; void fetchPricing().then((d) => { setData(d); setState(d ? 'ok' : 'fail') }) }, [preview])
  const page: PageData = { ...DEFAULT_PAGE, ...((preview?.page ?? data?.page) as Partial<PageData>) }
  useEffect(() => { document.title = `${page.brand} · Cuéntame tu negocio`; return () => { document.title = 'Monterroso World | Desarrollador web y músico' } }, [page.brand])

  const pkgs = (preview?.packages ?? data?.packages ?? []).filter((p) => p.published !== false).sort((a, b) => a.position - b.position)
  const extras = (preview?.extras ?? data?.extras ?? []).filter((e) => e.published !== false)
  const rec = forced ? pkgs.find((p) => p.id === forced) : recommendPkg(goals, pkgs)
  const wantDomain = goals.includes('domain')
  const dom = extras.find((e) => /dominio/i.test(e.name))
  const lines = useMemo(() => linesFromPick({ pkg: rec?.kind === 'closed' ? rec : undefined, extras: wantDomain && dom ? [dom] : [], mode }), [rec, wantDomain, dom, mode])
  const t = useMemo(() => totalsOf(lines, invoice ? 'added' : 'none'), [lines, invoice])

  const wa = (text: string) => waLink(page.phone, text)
  const proposalMsg = `Hola, soy ${name.trim() || '(tu nombre)'}.${biz ? ` Mi negocio es: ${biz}.` : ''}${goals.length ? ` Quiero: ${GOALS.filter((g) => goals.includes(g.id)).map((g) => g.label.toLowerCase()).join('; ')}.` : ''}${rec ? ` Me interesa «${rec.name}».` : ''} ¿Me envías la propuesta?`
  const go = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' })
  const fromExample = (sector: string) => { setBiz(sector); setForced(''); setStep(2); setTimeout(() => go('propuesta'), 30) }
  const ask = (id: string) => { setForced(id); setMode(undefined); setStep(3); setTimeout(() => go('propuesta'), 30) }
  const mul = invoice ? 1 + IVA_RATE : 1
  const closed = pkgs.filter((p) => p.kind === 'closed')
  const toggleGoal = (g: Goal) => setGoals((l) => (l.includes(g) ? l.filter((x) => x !== g) : [...l, g]))

  if (state === 'loading') return <main className="pp grid min-h-dvh place-items-center"><Loader2 className="animate-spin" aria-label="Cargando" /></main>
  if (state === 'fail') return <main className="pp grid min-h-dvh place-items-center px-6 text-center"><p>No pude cargar la página ahora mismo. Escríbeme por WhatsApp al {page.phone_display} y conversamos.</p></main>

  return (
    <main className="pp">
      <header className="pp-nav">
        <div className="pp-wrap pp-nav-in">
          <a href={profile.site} className="pp-brand"><img src={`${base}brand/am-logo-black.png`} alt="" width={38} height={31} /><span>{page.brand}</span></a>
          <nav className="pp-links" aria-label="Secciones"><button type="button" onClick={() => go('ejemplos')}>Ejemplos</button><button type="button" onClick={() => go('propuesta')}>Mi propuesta</button><button type="button" onClick={() => go('precios')}>Precios</button><button type="button" onClick={() => go('dudas')}>Preguntas</button></nav>
          <a className="pp-btn pp-btn-sm" href={wa(page.whatsapp_text)} target="_blank" rel="noreferrer"><MessageCircle size={16} aria-hidden /> Escríbeme</a>
        </div>
      </header>

      {/* Hero: el resultado, no el precio */}
      <section className="pp-wrap pp-hero">
        <div>
          <p className="pp-eyebrow">{page.kicker}</p>
          <h1 className="pp-h1"><Marked text={page.headline} /></h1>
          <p className="pp-lead">{page.sub}</p>
          <div className="pp-cta-row">
            <button type="button" className="pp-btn" onClick={() => { setStep(1); go('propuesta') }}>{page.heroCta} <ArrowRight size={18} aria-hidden /></button>
            <a className="pp-link" href={`${profile.site}#trabajos`}>Ver proyectos reales <ArrowUpRight size={15} aria-hidden /></a>
          </div>
          <ul className="pp-trust"><li><Check size={15} aria-hidden /> Sin compromiso</li><li><Check size={15} aria-hidden /> Te respondo el mismo día</li><li><Check size={15} aria-hidden /> Hecho en Guatemala</li></ul>
        </div>
        <div className="pp-visual" aria-hidden>
          <div className="pp-card pp-c1 t-butter"><CalendarCheck2 size={20} /><div><b>Nueva cita confirmada</b><span>Hoy, 4:30 pm · Corte y barba</span></div></div>
          <div className="pp-card pp-c2 t-sage"><Search size={20} /><div><b>Te encontraron en internet</b><span>12 personas esta semana</span></div></div>
          <div className="pp-card pp-c3 t-blush"><TrendingUp size={20} /><div><b>Ventas de hoy</b><span>Todo sumado, sin calculadora</span></div></div>
        </div>
      </section>

      {/* Lo que duele */}
      <section className="pp-band">
        <div className="pp-wrap">
          <h2 className="pp-h2">{page.painsTitle}</h2>
          <div className="pp-grid3">{page.pains.map((p, i) => <article key={i} className={`pp-tile t-${TINTS[i % 4]}`}><h3>{p.title}</h3><p>{p.text}</p></article>)}</div>
        </div>
      </section>

      {/* Lo que cambia */}
      <section className="pp-wrap pp-sec">
        <h2 className="pp-h2">{page.outcomesTitle}</h2>
        <ul className="pp-outs">{page.outcomes.map((o, i) => <li key={i}><span className="pp-tick"><Check size={16} aria-hidden /></span><div><h3>{o.title}</h3><p>{o.text}</p></div></li>)}</ul>
      </section>

      {/* Ejemplos: problemas que ya resolvemos */}
      {page.examples.length > 0 && (
        <section id="ejemplos" className="pp-band alt">
          <div className="pp-wrap">
            <h2 className="pp-h2">{page.examplesTitle}</h2>
            <p className="pp-lead sm">{page.examplesSub}</p>
            <div className="pp-ex">
              {page.examples.map((e, i) => (
                <article key={i} className="pp-exc">
                  <span className={`pp-sector t-${TINTS[i % 4]}`}>{e.sector}</span>
                  <p className="pp-ex-l">Antes</p><p>{e.problem}</p>
                  <p className="pp-ex-l ok">Con un sistema</p><p>{e.solution}</p>
                  <button type="button" className="pp-link" onClick={() => fromExample(e.sector)}>Quiero algo así <ArrowRight size={15} aria-hidden /></button>
                </article>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* La propuesta guiada */}
      <section id="propuesta" className="pp-wrap pp-sec pp-prop-wrap">
        <div className="pp-prop">
          <div className="pp-prop-head">
            <p className="pp-eyebrow">Una propuesta para ti</p>
            <h2 className="pp-h2">Cuéntame de tu negocio y te propongo algo.</h2>
            <ol className="pp-dots" aria-label={`Paso ${step} de 3`}>{[1, 2, 3].map((n) => <li key={n} className={n <= step ? 'on' : ''} />)}</ol>
          </div>

          {step === 1 && (
            <div className="pp-step">
              <h3>¿A qué se dedica tu negocio?</h3>
              <div className="pp-chips" role="group" aria-label="Tipo de negocio">{BUSINESS.map((b) => <button key={b} type="button" aria-pressed={biz === b} className={`pp-chip ${biz === b ? 'on' : ''}`} onClick={() => setBiz(b)}>{b}</button>)}</div>
              <div className="pp-actions"><button type="button" className="pp-btn" onClick={() => { setForced(''); setStep(2) }}>Continuar <ArrowRight size={16} aria-hidden /></button><button type="button" className="pp-link" onClick={() => { setForced(''); setStep(2) }}>Saltar</button></div>
            </div>
          )}

          {step === 2 && (
            <div className="pp-step">
              <h3>¿Qué te gustaría lograr? <small>Elige todo lo que quieras.</small></h3>
              <div className="pp-chips col" role="group" aria-label="Lo que quieres lograr">{GOALS.map((g) => <button key={g.id} type="button" aria-pressed={goals.includes(g.id)} className={`pp-chip ${goals.includes(g.id) ? 'on' : ''}`} onClick={() => toggleGoal(g.id)}>{goals.includes(g.id) && <Check size={14} aria-hidden />}{g.label}</button>)}</div>
              <div className="pp-actions"><button type="button" className="pp-btn" onClick={() => setStep(3)}>Ver mi propuesta <ArrowRight size={16} aria-hidden /></button><button type="button" className="pp-link" onClick={() => setStep(1)}>Atrás</button></div>
            </div>
          )}

          {step === 3 && rec && (
            <div className="pp-step pp-result">
              <label className="pp-name"><span>¿Cómo te llamo? <em>(opcional)</em></span><input value={name} onChange={(e) => setName(e.target.value)} maxLength={60} placeholder="Tu nombre" /></label>
              <p className="pp-eyebrow">{name.trim() ? `${name.trim()}, esto te propongo` : 'Esto te propongo'}</p>
              <h3 className="pp-rec">{rec.name}</h3>
              {rec.tagline && <p className="pp-lead sm">{rec.tagline}</p>}
              {goals.length > 0 && !forced && (
                <div className="pp-why"><b>Por qué te lo propongo</b><ul>{GOALS.filter((g) => goals.includes(g.id)).slice(0, 3).map((g) => <li key={g.id}>{g.why}</li>)}</ul></div>
              )}
              <div className="pp-incl"><b>Lo que incluye</b><ul>{rec.features.filter((f) => f.included).slice(0, 7).map((f, i) => <li key={i}><Check size={15} aria-hidden />{f.text}</li>)}</ul></div>

              <details className="pp-invest">
                <summary>Ver la inversión</summary>
                {rec.kind === 'custom' ? (
                  <p>{rec.price_note ?? 'Se cotiza'}: primero conozco tu caso y te preparo una propuesta formal por escrito. Hasta entonces no pagas nada.</p>
                ) : (
                  <>
                    {payOptions(rec).length > 1 && (
                      <div className="pp-modes" role="radiogroup" aria-label="Cómo prefieres pagar">
                        {payOptions(rec).map((o) => <button key={o.mode} type="button" role="radio" aria-checked={(mode ?? payOptions(rec)[0].mode) === o.mode} className={`pp-mode ${(mode ?? payOptions(rec)[0].mode) === o.mode ? 'on' : ''}`} onClick={() => setMode(o.mode)}>{o.mode === 'once' ? 'Pago único' : 'Mensualidad'}</button>)}
                      </div>
                    )}
                    <dl>
                      {lines.map((l) => <div key={l.id}><dt>{l.label.replace(/ · .*/, '')} <small>{PERIOD_LABEL[l.period]}</small></dt><dd>{money(l.unit)}</dd></div>)}
                      {invoice && <div><dt>IVA 12%</dt><dd>{money(t.once.iva + t.month.iva + t.year.iva)}</dd></div>}
                    </dl>
                    <label className="pp-check"><input type="checkbox" checked={invoice} onChange={(e) => setInvoice(e.target.checked)} /> Necesito factura con IVA (+12%)</label>
                    <p className="pp-fine">Puedes empezar cuando estés listo y ajustar lo que necesites. Mínimo de 3 meses con mensualidad.</p>
                  </>
                )}
              </details>

              <div className="pp-actions">
                <a className="pp-btn" href={wa(proposalMsg)} target="_blank" rel="noreferrer"><MessageCircle size={17} aria-hidden /> Quiero que me envíes esta propuesta</a>
                <button type="button" className="pp-link" onClick={() => { setForced(''); setStep(1) }}>Cambiar mis respuestas</button>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Precios, claros y a la mano para quien los busca */}
      {closed.length > 0 && (
        <section id="precios" className="pp-wrap pp-sec">
          <div className="pp-prices-head">
            <div><h2 className="pp-h2">{page.pricesTitle}</h2><p className="pp-lead sm">{page.pricesSub}</p></div>
            <label className="pp-iva"><input type="checkbox" checked={invoice} onChange={(e) => setInvoice(e.target.checked)} /> Necesito factura (IVA +12%)</label>
          </div>
          <div className="pp-pgrid">
            {closed.map((p, i) => {
              const opts = payOptions(p)
              const cur = opts.find((o) => o.mode === modes[p.id]) ?? opts[0]
              const show = p.show_price !== false
              const msg = `Hola, me interesa «${p.name}»${show ? (cur.mode === 'once' ? ` en pago único (${money(cur.once * mul)})` : ` con mensualidad (${money(cur.monthly * mul)} al mes y ${money(cur.setup * mul)} de activación)`) : ''}${invoice ? ', con factura' : ''}.`
              const yes = p.features.filter((f) => f.included)
              return (
                <article key={p.id} className={`pp-pc ${p.recommended ? 'rec' : ''}`}>
                  {p.recommended && <span className="pp-badge">La más elegida</span>}
                  {p.category && <span className={`pp-sector t-${TINTS[i % 4]}`}>{p.category}</span>}
                  <h3>{p.name}</h3>
                  {p.tagline && <p className="pp-path-tag">{p.tagline}</p>}
                  {show ? (
                    <div className="pp-pricebox">
                      {opts.length > 1 && <div className="pp-modes" role="radiogroup" aria-label={`Cómo pagar ${p.name}`}>{opts.map((o) => <button key={o.mode} type="button" role="radio" aria-checked={cur.mode === o.mode} className={`pp-mode ${cur.mode === o.mode ? 'on' : ''}`} onClick={() => setModes((m) => ({ ...m, [p.id]: o.mode }))}>{o.mode === 'once' ? 'Pago único' : 'Mensualidad'}</button>)}</div>}
                      {cur.mode === 'once'
                        ? <p className="pp-price"><b>{money(cur.once * mul)}</b> <small>pago único</small></p>
                        : <><p className="pp-price"><b>{money(cur.monthly * mul)}</b> <small>al mes</small></p>{cur.setup > 0 && <p className="pp-price-sub">+ {money(cur.setup * mul)} de activación, una sola vez</p>}</>}
                    </div>
                  ) : <p className="pp-price-sub">El precio depende de tu caso. Te preparo una propuesta.</p>}
                  <ul>{yes.slice(0, 5).map((f, j) => <li key={j}><Check size={14} aria-hidden />{f.text}</li>)}</ul>
                  {yes.length > 5 && <details className="pp-more"><summary>Ver todo lo que incluye</summary><ul>{yes.slice(5).map((f, j) => <li key={j}><Check size={14} aria-hidden />{f.text}</li>)}</ul></details>}
                  <a className="pp-btn" href={wa(msg)} target="_blank" rel="noreferrer">{show ? 'Pedir este proyecto' : 'Pedir propuesta'}</a>
                  <button type="button" className="pp-link" onClick={() => ask(p.id)}>Que me lo propongan <ArrowRight size={15} aria-hidden /></button>
                </article>
              )
            })}
          </div>
          {extras.length > 0 && <div className="pp-extras"><b>Extras:</b> {extras.map((e) => `${e.name} ${e.approx ? '≈ ' : ''}${money(e.amount * mul)} ${PERIOD_LABEL[e.period]}`).join(' · ')}</div>}
          <p className="pp-fine">{page.footer}</p>
        </section>
      )}

      {/* Cómo trabajamos */}
      {page.steps.length > 0 && (
        <section className="pp-band">
          <div className="pp-wrap">
            <h2 className="pp-h2">Así trabajamos juntos</h2>
            <ol className="pp-proc">{page.steps.map((s, i) => <li key={i} className={`t-${TINTS[i % 4]}`}><span>{i + 1}</span><b>{s.title}</b><p>{s.text}</p></li>)}</ol>
            <p className="pp-note"><b>{page.monthlyTitle}.</b> {page.monthlyText}</p>
          </div>
        </section>
      )}

      {/* Dudas, con la inversión a la vista solo para quien la busca */}
      <section id="dudas" className="pp-wrap pp-sec">
        <h2 className="pp-h2">Preguntas frecuentes</h2>
        <div className="pp-faqs">
          {page.faq.map((f, i) => <details key={i} className="pp-faq"><summary>{f.q}</summary><p>{f.a}</p></details>)}
          {pkgs.some((p) => p.kind === 'closed') && (
            <details className="pp-faq"><summary>¿Cuánto cuesta?</summary>
              <div className="pp-prices">
                {pkgs.filter((p) => p.kind === 'closed').map((p) => <p key={p.id}><b>{p.name}:</b> activación {money(p.setup_fee)} y {money(p.monthly_fee)} al mes.</p>)}
                {extras.map((e) => <p key={e.id}><b>{e.name}:</b> {e.approx ? '≈ ' : ''}{money(e.amount)} {PERIOD_LABEL[e.period]}.</p>)}
                <p className="pp-fine">{page.footer}</p>
              </div>
            </details>
          )}
        </div>
      </section>

      <section className="pp-final">
        <div className="pp-wrap">
          <h2 className="pp-h2">¿Hablamos?</h2>
          <p className="pp-lead sm">Cuéntame qué necesitas. Te respondo el mismo día y, si te sirve, te preparo una propuesta.</p>
          <a className="pp-btn" href={wa(page.whatsapp_text)} target="_blank" rel="noreferrer"><MessageCircle size={18} aria-hidden /> Escribir por WhatsApp · {page.phone_display}</a>
        </div>
      </section>

      <footer className="pp-wrap pp-foot">
        <p><a href={profile.site}>{page.brand}</a> · Guatemala · Vigencia de estos precios: {page.validity_days} días.</p>
      </footer>

      <div className="pp-bar"><a className="pp-btn" href={wa(page.whatsapp_text)} target="_blank" rel="noreferrer"><MessageCircle size={17} aria-hidden /> Cuéntame tu negocio</a></div>
    </main>
  )
}
