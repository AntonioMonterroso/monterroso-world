import { Loader2, Printer } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { fetchQuote, type SharedQuote } from '../../lib/quoteData'
import { DEFAULT_PAGE, isToken, type PageData } from '../../lib/quotes'
import QuoteDocument from './QuoteDocument'

/** Propuesta compartida con un enlace secreto: solo lectura, lista para imprimir o guardar como PDF. */
export default function QuotePublic() {
  const { token = '' } = useParams()
  const [q, setQ] = useState<SharedQuote | null>(null)
  const [state, setState] = useState<'loading' | 'ok' | 'fail'>('loading')

  useEffect(() => {
    if (!isToken(token)) { setState('fail'); return }
    void fetchQuote(token).then((d) => { setQ(d); setState(d ? 'ok' : 'fail') })
  }, [token])
  useEffect(() => { if (q) document.title = `${q.number} · ${q.title}`; return () => { document.title = 'Monterroso World | Desarrollador web y músico' } }, [q])

  if (state === 'loading') return <main className="grid min-h-dvh place-items-center" style={{ background: '#e9e6df' }}><Loader2 className="animate-spin" aria-label="Cargando" /></main>
  if (state === 'fail' || !q) return <main className="grid min-h-dvh place-items-center px-6 text-center" style={{ background: 'var(--bg)' }}><div><h1 className="font-display text-3xl">Este enlace no está disponible</h1><p className="mt-2" style={{ color: 'var(--ink-soft)' }}>Puede que haya vencido o que ya no se comparta. Pide uno nuevo a quien te lo envió.</p></div></main>

  const page: PageData = { ...DEFAULT_PAGE, ...q.page }
  return (
    <main className="min-h-dvh px-3 py-6 print:p-0" style={{ background: '#e9e6df' }}>
      <div className="no-print mx-auto mb-4 flex max-w-[820px] justify-end"><button className="btn btn-primary" onClick={() => window.print()}><Printer size={16} aria-hidden /> Imprimir o guardar PDF</button></div>
      <QuoteDocument q={{ ...q, client_contact: q.client_contact ?? null }} page={page} />
    </main>
  )
}
