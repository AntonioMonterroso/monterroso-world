import { useEffect, useRef, useState, type ReactNode } from 'react'
import Sheet from './Sheet'

/** Crear algo nuevo con confirmación: pide el nombre y solo guarda cuando tocas «Crear». Si cierras, no se crea nada. */
export default function NewItem({ open, title, label, placeholder, initial = '', confirm = 'Crear', hint, extra, extraValid = true, onCreate, onClose }: {
  open: boolean
  title: string
  label: string
  placeholder?: string
  /** Nombre ya escrito al abrir (por ejemplo, «Pierna (copia)»). */
  initial?: string
  confirm?: string
  hint?: string
  /** Campos adicionales (por ejemplo, el cliente). */
  extra?: ReactNode
  extraValid?: boolean
  onCreate: (name: string) => Promise<void> | void
  onClose: () => void
}) {
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const field = useRef<HTMLInputElement>(null)
  useEffect(() => { if (open) { setName(initial); setErr(''); setBusy(false); setTimeout(() => field.current?.focus(), 80) } }, [open, initial])
  const ok = name.trim().length > 0 && extraValid

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!ok || busy) return
    setBusy(true); setErr('')
    try { await onCreate(name.trim()) } catch { setErr('No se pudo crear. Intenta otra vez.'); setBusy(false) }
  }

  return (
    <Sheet open={open} title={title} onClose={onClose}>
      <form className="grid gap-4" onSubmit={submit}>
        <label className="grid gap-2 text-sm">{label}
          <input ref={field} className="field" value={name} maxLength={200} onChange={(e) => setName(e.target.value)} placeholder={placeholder} />
        </label>
        {extra}
        {hint && <p className="text-xs" style={{ color: 'var(--ink-soft)' }}>{hint}</p>}
        {err && <p role="alert" className="text-sm" style={{ color: 'var(--aviso-texto)' }}>{err}</p>}
        <div className="flex flex-wrap gap-2">
          <button className="btn btn-primary" disabled={!ok || busy}>{busy ? 'Creando…' : confirm}</button>
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancelar</button>
        </div>
      </form>
    </Sheet>
  )
}
