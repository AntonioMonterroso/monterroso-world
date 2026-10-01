import { Search } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { centers } from '../lib/modules'

type Item = { label: string; hint: string; run: () => void }

export default function Palette({ open, onClose, onLock, onSignOut }: { open: boolean; onClose: () => void; onLock: () => void; onSignOut: () => void }) {
  const nav = useNavigate()
  const [q, setQ] = useState('')
  const [i, setI] = useState(0)
  const input = useRef<HTMLInputElement>(null)

  const items = useMemo<Item[]>(() => {
    const all: Item[] = [
      ...centers.map((c) => ({ label: c.label, hint: c.blurb, run: () => nav(c.id === 'hoy' ? '/app' : `/app/${c.id}`) })),
      ...centers.flatMap((c) => c.modules.map((m) => ({ label: m.name, hint: c.label, run: () => nav(m.to ?? (c.id === 'hoy' ? '/app' : `/app/${c.id}`)) }))),
      { label: 'Ajustes', hint: 'Cuenta y PIN', run: () => nav('/app/ajustes') },
      { label: 'Bloquear ahora', hint: 'Pedir PIN', run: onLock },
      { label: 'Cerrar sesión', hint: 'Salir de este dispositivo', run: onSignOut },
    ]
    const t = q.trim().toLowerCase()
    return (t ? all.filter((x) => x.label.toLowerCase().includes(t) || x.hint.toLowerCase().includes(t)) : all).slice(0, 8)
  }, [q, nav, onLock, onSignOut])

  useEffect(() => {
    if (open) { setQ(''); setI(0); setTimeout(() => input.current?.focus(), 30) }
  }, [open])
  useEffect(() => setI(0), [q])

  if (!open) return null
  const go = (it?: Item) => { if (it) { onClose(); it.run() } }

  return (
    <div className="fixed inset-0 z-50 grid place-items-start justify-items-center px-4 pt-[12vh]" style={{ background: 'rgba(5,10,24,.65)' }} onMouseDown={onClose}>
      <div role="dialog" aria-modal="true" aria-label="Buscar y ejecutar" className="w-full max-w-lg overflow-hidden rounded-2xl border" style={{ background: 'var(--surface)', borderColor: 'var(--line)' }} onMouseDown={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key === 'Escape') onClose()
          if (e.key === 'ArrowDown') { e.preventDefault(); setI((n) => Math.min(n + 1, items.length - 1)) }
          if (e.key === 'ArrowUp') { e.preventDefault(); setI((n) => Math.max(n - 1, 0)) }
          if (e.key === 'Enter') go(items[i])
        }}>
        <div className="flex items-center gap-3 border-b px-4" style={{ borderColor: 'var(--line-soft)' }}>
          <Search size={18} aria-hidden style={{ color: 'var(--ink-faint)' }} />
          <input ref={input} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Busca un módulo o una acción" aria-label="Buscar" className="h-14 w-full bg-transparent outline-none" style={{ fontSize: 16, color: 'var(--ink)' }} />
        </div>
        <ul role="listbox" className="max-h-[50vh] overflow-auto p-2">
          {items.length === 0 && <li className="px-3 py-6 text-center text-sm" style={{ color: 'var(--ink-soft)' }}>Nada coincide.</li>}
          {items.map((it, n) => (
            <li key={it.label + it.hint} role="option" aria-selected={n === i}>
              <button className="flex min-h-11 w-full items-center justify-between rounded-lg px-3 text-left" style={{ background: n === i ? 'var(--surface-2)' : 'transparent' }} onMouseEnter={() => setI(n)} onClick={() => go(it)}>
                <span>{it.label}</span>
                <span className="text-xs" style={{ color: 'var(--ink-faint)' }}>{it.hint}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
