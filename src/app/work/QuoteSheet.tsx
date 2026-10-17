import { ArrowLeft, Loader2, Printer } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { useCatalog } from '../../lib/quoteData'
import type { Quote } from '../../lib/quotes'
import { useTable } from '../../lib/table'
import QuoteDocument from './QuoteDocument'

/** La propuesta a pantalla completa, lista para imprimir o guardar como PDF (para ti, con sesión). */
export default function QuoteSheet() {
  const { id = '' } = useParams()
  const db = useTable<Quote>('quotes', { col: 'created_at', asc: false })
  const cat = useCatalog()
  const q = db.rows.find((x) => x.id === id)
  if (db.loading || cat.loading) return <main className="grid min-h-dvh place-items-center" style={{ background: '#e9e6df' }}><Loader2 className="animate-spin" aria-label="Cargando" /></main>
  if (!q) return <main className="grid min-h-dvh place-items-center px-6 text-center"><p>No encuentro esa propuesta. <Link className="underline" to="/app/trabajo/propuestas">Volver</Link></p></main>
  return (
    <main className="min-h-dvh px-3 py-6 print:p-0" style={{ background: '#e9e6df' }}>
      <div className="no-print mx-auto mb-4 flex max-w-[820px] items-center justify-between gap-3">
        <Link to="/app/trabajo/propuestas" className="inline-flex min-h-11 items-center gap-1 text-sm" style={{ color: '#333' }}><ArrowLeft size={16} aria-hidden /> Propuestas</Link>
        <button className="btn btn-primary" onClick={() => window.print()}><Printer size={16} aria-hidden /> Imprimir o guardar PDF</button>
      </div>
      <QuoteDocument q={q} page={cat.page} />
    </main>
  )
}
