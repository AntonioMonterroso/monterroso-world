import { Check, Loader2, Minus, Phone } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchPricing, type Pricing } from '../../lib/quoteData'
import { DEFAULT_PAGE, PERIOD_LABEL, pickTotals, waLink, type Extra, type PageData, type Pkg } from '../../lib/quotes'
import { money } from '../../lib/projects'

const base = import.meta.env.BASE_URL

/** Precios públicos: paquetes cerrados, un armador de total y la opción "a tu medida". No requiere sesión. */
export default function PricingPage({ preview }: { preview?: { page: PageData; packages: Pkg[]; extras: Extra[] } }) {
  const [data, setData] = useState<Pricing | null>(null)
  const [state, setState] = useState<'loading' | 'ok' | 'fail'>(preview ? 'ok' : 'loading')
  const [chosen, setChosen] = useState<string>('')
  const [picked, setPicked] = useState<string[]>([])

  useEffect(() => { if (preview) return; void fetchPricing().then((d) => { setData(d); setState(d ? 'ok' : 'fail') }) }, [preview])
  useEffect(() => { document.title = `${(preview?.page ?? data?.page as Partial<PageData> | undefined)?.brand ?? DEFAULT_PAGE.brand} · Precios`; return () => { document.title = 'Monterroso World | Desarrollador web y músico' } }, [data, preview])

  const page: PageData = { ...DEFAULT_PAGE, ...((preview?.page ?? data?.page) as Partial<PageData>) }
  const pkgs = (preview?.packages ?? data?.packages ?? []).filter((p) => p.published !== false)
  const extras = (preview?.extras ?? data?.extras ?? []).filter((e) => e.published !== false)
  const closed = pkgs.filter((p) => p.kind === 'closed')
  const custom = pkgs.filter((p) => p.kind === 'custom')
  useEffect(() => { if (!chosen && closed[0]) setChosen((closed.find((p) => p.recommended) ?? closed[0]).id) }, [closed, chosen])

  const pkg = closed.find((p) => p.id === chosen)
  const sel = extras.filter((e) => picked.includes(e.id))
  const t = useMemo(() => pickTotals({ pkg, extras: sel }), [pkg, sel])
  const wa = (text: string) => waLink(page.phone, `${page.whatsapp_text}. ${text}`)

  if (state === 'loading') return <main className="pr grid min-h-dvh place-items-center"><Loader2 className="animate-spin" aria-label="Cargando" /></main>
  if (state === 'fail') return <main className="pr grid min-h-dvh place-items-center px-6 text-center"><p>No pude cargar los precios ahora mismo. Escríbeme por WhatsApp al {page.phone_display} y te los comparto.</p></main>

  return (
    <main className="pr">
      <div className="pr-wrap">
        <header className="pr-top">
          <Link to="/" className="pr-brand"><img src={`${base}brand/am-logo-white.png`} alt="" width={44} height={36} /><span>{page.brand}</span></Link>
          <a className="pr-call" href={wa('')} target="_blank" rel="noreferrer"><Phone size={16} aria-hidden /> {page.phone_display}</a>
        </header>

        <p className="pr-k">{page.kicker}</p>
        <h1 className="pr-h1">{page.headline}</h1>
        <p className="pr-sub">{page.sub}</p>

        <section aria-label="Paquetes" className="pr-grid">
          {closed.map((p) => (
            <article key={p.id} className={`pr-card ${p.recommended ? 'hl' : ''}`}>
              {p.recommended && <span className="pr-pill">Recomendado</span>}
              <h2 className="pr-h2">{p.name}</h2>
              {p.tagline && <p className="pr-mut">{p.tagline}</p>}
              <p className="pr-price">{money(p.monthly_fee)} <small>al mes</small></p>
              {p.setup_fee > 0 && <p className="pr-mut">Activación única: {money(p.setup_fee)}</p>}
              <ul className="pr-list">{p.features.map((f, i) => <li key={i} className={f.included ? '' : 'no'}>{f.included ? <Check size={15} aria-hidden /> : <Minus size={15} aria-hidden />}{f.text}</li>)}</ul>
              <a className="pr-btn" href={wa(`Me interesa «${p.name}».`)} target="_blank" rel="noreferrer">Quiero este paquete</a>
            </article>
          ))}
          {custom.map((p) => (
            <article key={p.id} className="pr-card">
              <h2 className="pr-h2">{p.name || page.customTitle}</h2>
              <p className="pr-mut">{p.tagline || page.customText}</p>
              <p className="pr-price pr-price-sm">{p.price_note ?? 'A tu medida'}</p>
              <ul className="pr-list">{p.features.map((f, i) => <li key={i} className={f.included ? '' : 'no'}>{f.included ? <Check size={15} aria-hidden /> : <Minus size={15} aria-hidden />}{f.text}</li>)}</ul>
              <a className="pr-btn ghost" href={wa(`Quiero cotizar un programa a mi medida: `)} target="_blank" rel="noreferrer">Cuéntame tu idea</a>
            </article>
          ))}
        </section>

        {closed.length > 0 && (
          <section aria-labelledby="arma" className="pr-block">
            <h2 id="arma" className="pr-h2">Arma tu total</h2>
            <div className="pr-pick" role="radiogroup" aria-label="Paquete">
              {closed.map((p) => <button key={p.id} type="button" role="radio" aria-checked={chosen === p.id} className={`pr-chip ${chosen === p.id ? 'on' : ''}`} onClick={() => setChosen(p.id)}>{p.name}</button>)}
            </div>
            {extras.length > 0 && (
              <div className="pr-extras">
                {extras.map((e) => (
                  <label key={e.id} className="pr-extra"><input type="checkbox" checked={picked.includes(e.id)} onChange={() => setPicked((l) => (l.includes(e.id) ? l.filter((x) => x !== e.id) : [...l, e.id]))} />
                    <span><strong>{e.name}</strong> · {e.approx ? '≈ ' : ''}{money(e.amount)} {PERIOD_LABEL[e.period]}{e.detail && <small>{e.detail}</small>}</span>
                  </label>
                ))}
              </div>
            )}
            <table className="pr-table"><tbody>
              <tr><td>Activación (una sola vez)</td><td className="r">{money(t.once)}</td></tr>
              <tr><td>Mensualidad</td><td className="r"><b>{money(t.month)}</b> / mes</td></tr>
              {t.year > 0 && <tr><td>Anual (pagado al proveedor)</td><td className="r">{money(t.year)} / año</td></tr>}
            </tbody></table>
            <a className="pr-btn" href={wa(`Quiero «${pkg?.name ?? ''}»${sel.length ? ` con ${sel.map((e) => e.name).join(', ')}` : ''}. Total: activación ${money(t.once)} y ${money(t.month)} al mes.`)} target="_blank" rel="noreferrer">Pedirlo por WhatsApp</a>
          </section>
        )}

        <section className="pr-note"><b>{page.monthlyTitle}:</b> {page.monthlyText}</section>

        {page.steps.length > 0 && (
          <section aria-labelledby="proc" className="pr-block">
            <h2 id="proc" className="pr-h2">Así trabajamos</h2>
            <ol className="pr-steps">{page.steps.map((s, i) => <li key={i}><b>{s.title}.</b> {s.text}</li>)}</ol>
          </section>
        )}

        {page.faq.length > 0 && (
          <section aria-labelledby="faq" className="pr-block">
            <h2 id="faq" className="pr-h2">Preguntas frecuentes</h2>
            {page.faq.map((f, i) => <details key={i} className="pr-faq"><summary>{f.q}</summary><p>{f.a}</p></details>)}
          </section>
        )}

        <footer className="pr-foot">
          <p>{page.footer}</p>
          <p>Vigencia de estos precios: {page.validity_days} días desde que los consultas. WhatsApp <a href={wa('')} target="_blank" rel="noreferrer">{page.phone_display}</a>.</p>
        </footer>
      </div>
    </main>
  )
}
