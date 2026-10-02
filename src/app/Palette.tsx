import { Loader2, Search } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { loadIndex, searchHits, type Hit } from '../lib/searchIndex'
import { supabase } from '../lib/supabase'
import { centers } from '../lib/modules'
import { decryptItem } from '../lib/vault'
import { useVaultKey } from '../lib/vaultSession'

type Item = { id: string; title: string; sub?: string; type: string; run: () => void }

export default function Palette({ open, onClose, onLock, onSignOut }: { open: boolean; onClose: () => void; onLock: () => void; onSignOut: () => void }) {
  const nav = useNavigate()
  const dk = useVaultKey()
  const [q, setQ] = useState('')
  const [i, setI] = useState(0)
  const [index, setIndex] = useState<Hit[]>([])
  const [loading, setLoading] = useState(false)
  const input = useRef<HTMLInputElement>(null)

  // Atajos y acciones (siempre disponibles)
  const statics = useMemo<Item[]>(() => [
    ...centers.map((c) => ({ id: `c-${c.id}`, title: c.label, sub: c.blurb, type: 'Ir a', run: () => nav(c.id === 'hoy' ? '/app' : `/app/${c.id}`) })),
    ...centers.flatMap((c) => c.modules.map((m) => ({ id: `m-${c.id}-${m.name}`, title: m.name, sub: c.label, type: 'Módulo', run: () => nav(m.to ?? (c.id === 'hoy' ? '/app' : `/app/${c.id}`)) }))),
    { id: 'a-ajustes', title: 'Ajustes', sub: 'Cuenta, PIN y avisos', type: 'Acción', run: () => nav('/app/ajustes') },
    { id: 'a-lock', title: 'Bloquear ahora', sub: 'Pedir PIN', type: 'Acción', run: onLock },
    { id: 'a-out', title: 'Cerrar sesión', sub: 'Salir de este dispositivo', type: 'Acción', run: onSignOut },
  ], [nav, onLock, onSignOut])

  // Al abrir: trae tus datos para buscar (y los títulos de la bóveda si está desbloqueada)
  useEffect(() => {
    if (!open) return
    setQ(''); setI(0)
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
    if (!t) return statics.filter((s) => s.type === 'Ir a' || s.type === 'Acción').slice(0, 9)
    const dynamic: Item[] = index.map((h) => ({ id: `${h.type}-${h.id}`, title: h.title, sub: h.sub, type: h.type, run: () => nav(h.to) }))
    return searchHits([...dynamic, ...statics], t, 12)
  }, [q, index, statics, nav])

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
          <input ref={input} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Busca canciones, trabajos, notas, módulos…" aria-label="Buscar" className="h-14 w-full bg-transparent outline-none" style={{ fontSize: 16, color: 'var(--ink)' }} autoComplete="off" />
        </div>
        <ul role="listbox" className="max-h-[55vh] overflow-auto p-2">
          {results.length === 0 && <li className="px-3 py-6 text-center text-sm" style={{ color: 'var(--ink-soft)' }}>{loading ? 'Buscando en tus datos…' : 'Nada coincide.'}</li>}
          {results.map((it, n) => (
            <li key={it.id} role="option" aria-selected={n === i}>
              <button className="flex min-h-12 w-full items-center justify-between gap-3 rounded-lg px-3 text-left" style={{ background: n === i ? 'var(--surface-2)' : 'transparent' }} onMouseEnter={() => setI(n)} onClick={() => go(it)}>
                <span className="min-w-0"><span className="block truncate">{it.title}</span>{it.sub && <span className="block truncate text-xs" style={{ color: 'var(--ink-faint)' }}>{it.sub}</span>}</span>
                <span className="shrink-0 rounded-full px-2 py-0.5 text-xs" style={{ background: 'var(--surface-2)', color: it.type === 'Bóveda' ? 'var(--neg)' : 'var(--sky)' }}>{it.type}</span>
              </button>
            </li>
          ))}
          {q.trim() && !dk && <li className="px-3 pt-2 pb-1 text-xs" style={{ color: 'var(--ink-faint)' }}>La bóveda solo aparece aquí cuando está desbloqueada.</li>}
        </ul>
      </div>
    </div>
  )
}
