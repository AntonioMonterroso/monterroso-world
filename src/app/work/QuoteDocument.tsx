import { PERIOD_LABEL, STATUS_LABEL, lineOn, lineTotal, paymentPlan, totalsOf, type Body, type IvaMode, type Line, type PageData, type Status } from '../../lib/quotes'
import { money } from '../../lib/projects'

const base = import.meta.env.BASE_URL
export type DocQuote = { title: string; client_name: string; client_contact: string | null; status: Status; lines: Line[]; iva: IvaMode; upfront_pct: number; valid_until: string | null; body: Body; created_at?: string }

const fmt = (iso?: string | null) => (iso ? new Date(iso.slice(0, 10) + 'T12:00:00').toLocaleDateString('es', { day: 'numeric', month: 'long', year: 'numeric' }) : '')
const IVA_NOTE: Record<IvaMode, string> = {
  none: 'Precios expresados en quetzales. Si requiere factura con IVA, se agrega el 12% al total.',
  included: 'Precios expresados en quetzales, con IVA incluido.',
  added: 'Precios expresados en quetzales. A los montos se les suma el IVA (12%).',
}

/** La propuesta como documento formal: se ve igual en pantalla, en el enlace compartido y al imprimir o guardar como PDF. */
export default function QuoteDocument({ q, page }: { q: DocQuote; page: PageData }) {
  const on = q.lines.filter(lineOn)
  const off = q.lines.filter((l) => !lineOn(l))
  const t = totalsOf(q.lines, q.iva)
  const plan = paymentPlan(t.once.total, q.upfront_pct)
  const showIva = q.iva !== 'none'
  const rows: [string, string, typeof t.once][] = [['Pago único', 'una vez', t.once], ['Mensualidad', 'al mes', t.month], ['Anual', 'al año', t.year]]
  const b = q.body

  return (
    <article className="qd" aria-label={`Propuesta: ${q.title}`}>
      <header className="qd-head">
        <div className="qd-brand"><img src={`${base}brand/am-logo-black.png`} alt="" width={64} height={52} /><div><strong>{page.brand}</strong><span>WhatsApp {page.phone_display}</span></div></div>
        <div className="qd-meta"><strong>Fecha</strong><span>{fmt(q.created_at) || fmt(new Date().toISOString())}</span>{q.valid_until && <span>Vigente hasta el {fmt(q.valid_until)}</span>}</div>
      </header>

      <p className="qd-kicker">Propuesta de servicios</p>
      <h1 className="qd-title">{q.title}</h1>
      {q.client_name && <p className="qd-for">Para: <strong>{q.client_name}</strong>{q.client_contact ? ` · ${q.client_contact}` : ''}</p>}
      {b.intro && <p className="qd-p">{b.intro}</p>}

      {b.sections.map((s, i) => s.title || s.items.length ? (
        <section key={i} className="qd-sec"><h2>{s.title}</h2><ul>{s.items.map((it, j) => <li key={j}>{it}</li>)}</ul></section>
      ) : null)}

      <section className="qd-sec">
        <h2>Inversión</h2>
        <table className="qd-table">
          <thead><tr><th>Concepto</th><th className="r">Cant.</th><th className="r">Precio</th><th className="r">Subtotal</th></tr></thead>
          <tbody>
            {on.map((l) => (
              <tr key={l.id}><td><strong>{l.label}</strong>{l.detail && <span className="qd-sm">{l.detail}</span>}<span className="qd-sm">{PERIOD_LABEL[l.period]}{l.optional ? ' · opcional incluido' : ''}</span></td><td className="r">{l.qty}</td><td className="r">{money(l.unit)}</td><td className="r">{money(lineTotal(l))}</td></tr>
            ))}
            {on.length === 0 && <tr><td colSpan={4} className="qd-sm">Sin conceptos todavía.</td></tr>}
          </tbody>
        </table>
        <table className="qd-table qd-total">
          <tbody>
            {rows.filter(([, , a]) => a.total > 0).map(([label, per, a]) => (
              <tr key={label}><td>{label} <span className="qd-sm">({per})</span>{showIva && <span className="qd-sm">Base {money(a.base)} · IVA {money(a.iva)}</span>}</td><td className="r"><strong>{money(a.total)}</strong></td></tr>
            ))}
          </tbody>
        </table>
        {off.length > 0 && (
          <div className="qd-opt"><strong>Opcionales (no incluidos en el total):</strong> {off.map((l) => `${l.label} · ${money(lineTotal(l))} ${PERIOD_LABEL[l.period]}`).join(' · ')}</div>
        )}
        {plan.length > 0 && (
          <div className="qd-plan"><strong>Estructura de pagos del pago único:</strong> {plan.map((p) => `${p.pct}% (${money(p.amount)}) ${p.label.toLowerCase()}`).join(' · ')}.</div>
        )}
      </section>

      {b.exclusions.length > 0 && <section className="qd-sec"><h2>Qué no incluye</h2><ul>{b.exclusions.map((x, i) => <li key={i}>{x}</li>)}</ul></section>}
      {b.support && <section className="qd-sec"><h2>Soporte y garantía</h2><p className="qd-p">{b.support}</p></section>}
      {b.process.length > 0 && <section className="qd-sec"><h2>Cómo trabajamos</h2><ol>{b.process.map((s, i) => <li key={i}><strong>{s.title}.</strong> {s.text}</li>)}</ol></section>}
      <section className="qd-sec">
        <h2>Condiciones</h2>
        <ul>
          {b.conditions.map((x, i) => <li key={i}>{x}</li>)}
          <li>{IVA_NOTE[q.iva]}</li>
          {q.valid_until && <li>Esta propuesta es válida hasta el {fmt(q.valid_until)}.</li>}
        </ul>
      </section>
      {b.notes && <section className="qd-sec"><h2>Notas</h2><p className="qd-p">{b.notes}</p></section>}

      <footer className="qd-sign">
        <div><span className="line" /><p>{page.brand}</p><small>Proveedor</small></div>
        <div><span className="line" /><p>{q.client_name || 'Cliente'}</p><small>Aceptado por el cliente · {STATUS_LABEL[q.status] === 'Aceptada' ? 'aceptada' : 'fecha y firma'}</small></div>
      </footer>
    </article>
  )
}
