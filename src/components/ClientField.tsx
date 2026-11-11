import { ChevronDown, Plus } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { clientKey } from '../lib/clients'
import { useTable } from '../lib/table'

/** Nombres de clientes que ya existen (de tus trabajos y propuestas), sin repetir. */
export function useClientNames(): string[] {
  const projects = useTable<{ id: string; client: string | null }>('projects', { col: 'created_at', asc: false })
  const quotes = useTable<{ id: string; client_name: string | null }>('quotes', { col: 'created_at', asc: false })
  return useMemo(() => {
    const seen = new Map<string, string>()
    for (const n of [...projects.rows.map((p) => p.client), ...quotes.rows.map((q) => q.client_name)]) {
      const name = (n ?? '').trim()
      if (name && !seen.has(clientKey(name))) seen.set(clientKey(name), name)
    }
    return [...seen.values()].sort((a, b) => a.localeCompare(b, 'es'))
  }, [projects.rows, quotes.rows])
}

/** Cliente: un desplegable con los que ya existen. Escribes para filtrar y, si no está, lo creas ahí mismo. */
export default function ClientField({ value, onChange, label = 'Cliente', required = false }: { value: string; onChange: (v: string) => void; label?: string; required?: boolean }) {
  const names = useClientNames()
  const [open, setOpen] = useState(false)
  const [i, setI] = useState(0)
  const box = useRef<HTMLDivElement>(null)
  const q = clientKey(value)
  const exact = names.some((n) => clientKey(n) === q)
  const shown = useMemo(() => names.filter((n) => !q || clientKey(n).includes(q)).slice(0, 8), [names, q])
  const canCreate = value.trim().length > 0 && !exact
  const rows = [...shown.map((n) => ({ n, create: false })), ...(canCreate ? [{ n: value.trim(), create: true }] : [])]

  useEffect(() => {
    const out = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', out)
    return () => document.removeEventListener('mousedown', out)
  }, [])
  useEffect(() => setI(0), [value])

  const pick = (n: string) => { onChange(n); setOpen(false) }

  return (
    <div ref={box} className="relative grid gap-2 text-sm">
      <label htmlFor="client-field">{label}</label>
      <div className="relative">
        <input id="client-field" className="field pr-12" value={value} maxLength={200} required={required} autoComplete="off" role="combobox" aria-expanded={open} aria-controls="client-list" aria-autocomplete="list"
          placeholder={names.length ? 'Elige uno o escribe un cliente nuevo' : 'Escribe el nombre del cliente'}
          onChange={(e) => { onChange(e.target.value); setOpen(true) }} onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') { e.preventDefault(); setOpen(true); setI((n) => Math.min(n + 1, rows.length - 1)) }
            else if (e.key === 'ArrowUp') { e.preventDefault(); setI((n) => Math.max(n - 1, 0)) }
            else if (e.key === 'Enter' && open && rows[i]) { e.preventDefault(); pick(rows[i].n) }
            else if (e.key === 'Escape') setOpen(false)
          }} />
        <button type="button" className="absolute top-0 right-0 grid size-[52px] place-items-center" aria-label="Ver clientes" onClick={() => setOpen((v) => !v)}><ChevronDown size={18} aria-hidden style={{ transform: open ? 'rotate(180deg)' : undefined, transition: 'transform .2s' }} /></button>
      </div>
      {open && rows.length > 0 && (
        <ul id="client-list" role="listbox" className="absolute top-full right-0 left-0 z-30 mt-1 max-h-64 overflow-auto rounded-2xl p-1" style={{ background: 'var(--superficie-2)', boxShadow: 'var(--sombra-2)', border: '1px solid var(--borde)' }}>
          {rows.map((r, n) => (
            <li key={(r.create ? '+' : '') + r.n} role="option" aria-selected={n === i}>
              <button type="button" className="flex min-h-12 w-full items-center gap-2 rounded-xl px-3 text-left" style={{ background: n === i ? 'var(--marca-suave)' : 'transparent', fontWeight: r.create ? 700 : 400 }} onMouseEnter={() => setI(n)} onClick={() => pick(r.n)}>
                {r.create ? <><Plus size={16} aria-hidden /> Crear «{r.n}»</> : r.n}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
