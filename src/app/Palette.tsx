import { Loader2, Search } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { loadIndex, searchHits, type Hit } from '../lib/searchIndex'
import { supabase } from '../lib/supabase'
import { sections } from '../lib/sections'
import { entender } from '../lib/anotar'
import { localISO } from '../lib/time'
import { decryptItem } from '../lib/vault'
import { useVaultKey } from '../lib/vaultSession'
import { parseMonthQuery } from '../lib/searchDates'
import { money } from '../lib/projects'
import { clientKey } from '../lib/clients'

/** Filtros por tipo: cada uno junta los tipos del índice que le tocan. */
const FILTERS: { id: string; label: string; types: string[] }[] = [
  { id: 'todo', label: 'Todo', types: [] },
  { id: 'dinero', label: 'Dinero', types: ['Movimiento', 'Préstamo', 'Suscripción', 'Meta', 'Pago'] },
  { id: 'trabajo', label: 'Trabajo', types: ['Trabajo', 'Envío', 'Propuesta'] },
  { id: 'musica', label: 'Música y púlpito', types: ['Canción', 'Setlist', 'Prédica', 'Nota de fe', 'Nota de voz'] },
  { id: 'agenda', label: 'Agenda', types: ['Evento', 'Prioridad'] },
  { id: 'personal', label: 'Personal', types: ['Receta', 'Rutina', 'Rutina diaria', 'Hábito', 'Compañero', 'Por comprar', 'Lugar', 'Video', 'Link', 'Inspiración', 'Captura', 'Bóveda'] },
]

type Item = { id: string; title: string; sub?: string; type: string; run: () => void }

export default function Palette({ open, onClose, onLock, onSignOut }: { open: boolean; onClose: () => void; onLock: () => void; onSignOut: () => void }) {
  const nav = useNavigate()
  const dk = useVaultKey()
  const [q, setQ] = useState('')
  const [i, setI] = useState(0)
  const [index, setIndex] = useState<Hit[]>([])
  const [loading, setLoading] = useState(false)
  const input = useRef<HTMLInputElement>(null)
  const [filter, setFilter] = useState('todo')
  // «pagos de octubre», «gastos de septiembre»: se buscan en la base por fecha
  const mq = useMemo(() => parseMonthQuery(q, localISO()), [q])
  const [monthHits, setMonthHits] = useState<{ total: number; rows: Item[] } | null>(null)
  useEffect(() => {
    if (!mq) { setMonthHits(null); return }
    let alive = true
    const [y, m] = mq.month.split('-').map(Number)
    const from = `${mq.month}-01`, to = `${mq.month}-${String(new Date(y, m, 0).getDate()).padStart(2, '0')}`
    const rest = clientKey(mq.rest)
    const fmtD = (d: string) => new Date(`${d.slice(0, 10)}T12:00:00`).toLocaleDateString('es', { day: 'numeric', month: 'short' })
    ;(async () => {
      let rows: Item[] = [], total = 0
      if (mq.what === 'pagos') {
        const [{ data: pays }, { data: projs }] = await Promise.all([
          supabase.from('payments').select('id,amount,paid_at,project_id').gte('paid_at', from).lte('paid_at', to).order('paid_at', { ascending: false }),
          supabase.from('projects').select('id,title,client'),
        ])
        const pr = new Map(((projs ?? []) as { id: string; title: string; client: string | null }[]).map((p) => [p.id, p]))
        const list = ((pays ?? []) as { id: string; amount: number; paid_at: string; project_id: string }[]).map((x) => ({ x, p: pr.get(x.project_id) })).filter(({ p }) => !rest || clientKey(`${p?.client ?? ''} ${p?.title ?? ''}`).includes(rest))
        total = list.reduce((a, { x }) => a + Number(x.amount), 0)
        rows = list.map(({ x, p }) => ({ id: `pay-${x.id}`, title: `${p?.client || p?.title || 'Pago'} · ${money(Number(x.amount))}`, sub: `${fmtD(x.paid_at)}${p?.client ? ` · ${p.title}` : ''}`, type: 'Pago', run: () => nav(`/app/trabajo/recibo/${x.id}`) }))
      } else if (mq.what === 'eventos') {
        const { data } = await supabase.from('events').select('id,title,start_date').eq('active', true).gte('start_date', from).lte('start_date', to).order('start_date')
        rows = ((data ?? []) as { id: string; title: string; start_date: string }[]).filter((e) => !rest || clientKey(e.title).includes(rest)).map((e) => ({ id: `ev-${e.id}`, title: e.title, sub: fmtD(e.start_date), type: 'Evento', run: () => nav(`/app/planear/agenda?e=${e.id}`) }))
        total = rows.length
      } else {
        let qb = supabase.from('fin_transactions').select('id,kind,amount,category,note,tx_date').gte('tx_date', from).lte('tx_date', to).order('tx_date', { ascending: false })
        if (mq.what === 'gastos') qb = qb.eq('kind', 'expense')
        if (mq.what === 'ingresos') qb = qb.eq('kind', 'income')
        const { data } = await qb
        const list = ((data ?? []) as { id: string; kind: string; amount: number; category: string; note: string | null; tx_date: string }[]).filter((t) => !rest || clientKey(`${t.category} ${t.note ?? ''}`).includes(rest))
        total = list.reduce((a, t) => a + (t.kind === 'expense' && mq.what === 'movimientos' ? -1 : 1) * Number(t.amount), 0)
        rows = list.map((t) => ({ id: `tx-${t.id}`, title: `${t.category} · ${t.kind === 'expense' ? '−' : '+'}${money(Number(t.amount))}`, sub: `${fmtD(t.tx_date)}${t.note ? ` · ${t.note}` : ''}`, type: 'Movimiento', run: () => nav('/app/dinero/movimientos') }))
      }
      if (alive) setMonthHits({ total, rows })
    })()
    return () => { alive = false }
  }, [mq, nav])

  // Atajos y acciones (siempre disponibles)
  const statics = useMemo<Item[]>(() => [
    ...sections.map((x) => ({ id: `c-${x.id}`, title: x.label, sub: x.blurb, type: 'Ir a', run: () => nav(x.to) })),
    ...sections.flatMap((x) => x.views.map((v) => ({ id: `m-${x.id}-${v.to}`, title: v.label, sub: x.label, type: 'Módulo', run: () => nav(v.to) }))),
    { id: 'a-areas', title: 'Áreas', sub: 'Trabajo, Música y Personal', type: 'Ir a', run: () => nav('/app/areas') },
    { id: 'a-pendientes', title: 'Pendientes', sub: 'Lo que anotaste y lo que pide atención', type: 'Ir a', run: () => nav('/app/pendientes') },
    { id: 'a-ajustes', title: 'Ajustes', sub: 'Cuenta, PIN y avisos', type: 'Acción', run: () => nav('/app/ajustes') },
    { id: 'a-lock', title: 'Bloquear ahora', sub: 'Pedir PIN', type: 'Acción', run: onLock },
    { id: 'a-out', title: 'Cerrar sesión', sub: 'Salir de este dispositivo', type: 'Acción', run: onSignOut },
  ], [nav, onLock, onSignOut])

  // Al abrir: trae tus datos para buscar (y los títulos de la bóveda si está desbloqueada)
  useEffect(() => {
    if (!open) return
    setQ(''); setI(0); setFilter('todo')
    setTimeout(() => input.current?.focus(), 30)
    let alive = true
    setLoading(true)
    ;(async () => {
      const base = await loadIndex()
      let vault: Hit[] = []
      if (dk) {
        const { data } = await supabase.from('vault_items').select('id,category,ciphertext,iv').limit(400)
        const out = await Promise.all((data ?? []).map(async (r): Promise<Hit | null> => {
          try { const p = await decryptItem(dk, r.id as string, { ciphertext: r.ciphertext as string, iv: r.iv as string }); return { id: String(r.id), type: 'Bóveda', title: p.title, sub: p.url, to: `/app/boveda?abrir=${r.id}` } } catch { return null }
        }))
        vault = out.filter((x): x is Hit => x !== null)
      }
      if (alive) { setIndex([...base, ...vault]); setLoading(false) }
    })()
    return () => { alive = false }
  }, [open, dk])

  const results = useMemo<Item[]>(() => {
    const t = q.trim()
    if (mq && monthHits) {
      const head: Item = { id: 'mq-head', title: `${mq.label}${mq.rest ? ` · ${mq.rest}` : ''}: ${mq.what === 'eventos' ? `${monthHits.total} ${monthHits.total === 1 ? 'evento' : 'eventos'}` : money(monthHits.total)}`, sub: monthHits.rows.length ? `${monthHits.rows.length} en total` : 'No encontré nada en ese mes', type: 'Resumen', run: () => nav(mq.what === 'eventos' ? '/app/planear/agenda' : mq.what === 'pagos' ? '/app/dinero/entra' : '/app/dinero/movimientos') }
      return [head, ...monthHits.rows.slice(0, 30)]
    }
    const allowed = FILTERS.find((f) => f.id === filter)?.types ?? []
    if (!t && allowed.length) return index.filter((h) => allowed.includes(h.type)).slice(0, 30).map((h) => ({ id: `${h.type}-${h.id}`, title: h.title, sub: h.sub, type: h.type, run: () => nav(h.to) }))
    if (!t) return statics.filter((s) => s.type === 'Ir a' || s.type === 'Acción').slice(0, 9)
    const dynamic: Item[] = index.map((h) => ({ id: `${h.type}-${h.id}`, title: h.title, sub: h.sub, type: h.type, run: () => nav(h.to) }))
    // Órdenes: «gasto 45 almuerzo», «cobrar barbería», «nueva canción»… (las mismas reglas que ＋ Anotar)
    const orders: Item[] = []
    const asNote = (text: string) => { const e = entender(text, { today: localISO(), clients: [], learned: {} }); return e }
    const g = t.match(/^(?:gasto|gast[eé])\s+(\d+(?:[.,]\d+)?)\s+(.+)$/i)
    const c = t.match(/^cobr(?:ar|é|e)\s+(?:a\s+)?(.+)$/i)
    const text = g ? `Q ${g[1]} ${g[2]}` : c ? `cobré ${c[1]}` : /^(?:ingreso|\+)/i.test(t) ? t.replace(/^ingreso\s+/i, '+Q ') : t
    const e = asNote(text)
    const nt = t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    const paid = /\b(pago|pagaron|recibi)\b/.test(nt) && /\d/.test(t)
    if (g || c || paid || e.kind !== 'bandeja') orders.push({ id: 'o-anotar', title: `Anotar: ${t}`, sub: c || paid ? 'Pago de cliente · se confirma al guardar' : e.label, type: 'Orden', run: () => window.dispatchEvent(new CustomEvent('mw-anotar', { detail: { text } })) })
    if (/^nueva canci[oó]n|^canci[oó]n nueva/i.test(t)) orders.push({ id: 'o-cancion', title: 'Nueva canción', sub: 'Música › Canciones', type: 'Orden', run: () => nav('/app/musica') })
    if (/^nuevo evento|^evento nuevo/i.test(t)) orders.push({ id: 'o-evento', title: 'Nuevo evento', sub: 'Agenda', type: 'Orden', run: () => nav('/app/planear/agenda') })
    if (allowed.length) return searchHits(dynamic.filter((d) => allowed.includes(d.type)), t, 30)
    return [...orders, ...searchHits([...dynamic, ...statics], t, 12)]
  }, [q, index, statics, nav, filter, mq, monthHits])

  useEffect(() => setI(0), [q])

  if (!open) return null
  const go = (it?: Item) => { if (it) { onClose(); it.run() } }

  return (
    <div className="safe-top fixed inset-0 z-50 grid place-items-start justify-items-center px-4 pt-[12vh]" style={{ background: 'rgba(5,10,24,.65)' }} onMouseDown={onClose}>
      <div role="dialog" aria-modal="true" aria-label="Buscar" className="w-full max-w-lg overflow-hidden rounded-2xl border" style={{ background: 'var(--surface)', borderColor: 'var(--line)' }} onMouseDown={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key === 'Escape') onClose()
          if (e.key === 'ArrowDown') { e.preventDefault(); setI((n) => Math.min(n + 1, results.length - 1)) }
          if (e.key === 'ArrowUp') { e.preventDefault(); setI((n) => Math.max(n - 1, 0)) }
          if (e.key === 'Enter') go(results[i])
        }}>
        <div className="flex items-center gap-3 border-b px-4" style={{ borderColor: 'var(--line-soft)' }}>
          {loading ? <Loader2 size={18} className="animate-spin" aria-hidden style={{ color: 'var(--ink-faint)' }} /> : <Search size={18} aria-hidden style={{ color: 'var(--ink-faint)' }} />}
          <input ref={input} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Busca canciones, trabajos… o «pagos de octubre»" aria-label="Buscar" className="h-14 w-full bg-transparent outline-none" style={{ fontSize: 16, color: 'var(--ink)' }} autoComplete="off" />
        </div>
        {!mq && <div className="flex flex-wrap gap-1.5 border-b px-3 py-2" style={{ borderColor: 'var(--line-soft)' }} role="group" aria-label="Filtrar por tipo">
          {FILTERS.map((f) => <button key={f.id} type="button" className="min-h-9 rounded-full px-3 text-xs font-semibold" aria-pressed={filter === f.id} onClick={() => { setFilter(f.id); input.current?.focus() }} style={{ background: filter === f.id ? 'var(--tinta)' : 'var(--surface-2)', color: filter === f.id ? 'var(--fondo)' : 'var(--ink-soft)' }}>{f.label}</button>)}
        </div>}
        <ul role="listbox" className="max-h-[55vh] overflow-auto p-2">
          {results.length === 0 && <li className="px-3 py-6 text-center text-sm" style={{ color: 'var(--ink-soft)' }}>{loading ? 'Buscando en tus datos…' : 'Nada coincide.'}</li>}
          {results.map((it, n) => (
            <li key={it.id} role="option" aria-selected={n === i}>
              <button className="flex min-h-12 w-full items-center justify-between gap-3 rounded-lg px-3 text-left" style={{ background: n === i ? 'var(--surface-2)' : 'transparent' }} onMouseEnter={() => setI(n)} onClick={() => go(it)}>
                <span className="min-w-0"><span className="block truncate">{it.title}</span>{it.sub && <span className="block truncate text-xs" style={{ color: 'var(--ink-faint)' }}>{it.sub}</span>}</span>
                <span className="shrink-0 rounded-full px-2 py-0.5 text-xs" style={{ background: 'var(--surface-2)', color: it.type === 'Bóveda' ? 'var(--aviso)' : 'var(--sky)' }}>{it.type}</span>
              </button>
            </li>
          ))}
          {q.trim() && !dk && <li className="px-3 pt-2 pb-1 text-xs" style={{ color: 'var(--ink-faint)' }}>La bóveda solo aparece aquí cuando está desbloqueada.</li>}
        </ul>
      </div>
    </div>
  )
}
