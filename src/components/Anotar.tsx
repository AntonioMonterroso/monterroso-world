import { useEffect, useRef, useState } from 'react'
import Sheet from './Sheet'
import { useInbox } from '../lib/data'

/** ＋ Anotar: escribes lo que sea sin decidir dónde va; queda en Pendientes para clasificarlo después. */
export default function Anotar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const inbox = useInbox()
  const [text, setText] = useState('')
  const [msg, setMsg] = useState('')
  const field = useRef<HTMLTextAreaElement>(null)
  useEffect(() => { if (open) { setMsg(''); setTimeout(() => field.current?.focus(), 80) } }, [open])

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    const t = text.trim()
    if (!t) return
    await inbox.add(t)
    setText('')
    setMsg('Anotado. Lo ves en Pendientes.')
    onClose()
  }
  return (
    <Sheet open={open} title="Anotar" onClose={onClose}>
      <form className="grid gap-4" onSubmit={save}>
        <label className="grid gap-2 text-sm">Lo que se te ocurra
          <textarea ref={field} className="field min-h-28" value={text} maxLength={2000} onChange={(e) => setText(e.target.value)} placeholder="Una idea, un gasto, un recordatorio, algo que prometiste…"
            onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) void save(e as unknown as React.FormEvent) }} />
        </label>
        <p className="text-xs" style={{ color: 'var(--ink-soft)' }}>No tienes que decidir dónde va. Después lo clasificas desde Pendientes.</p>
        {msg && <p role="status" className="text-sm">{msg}</p>}
        <button className="btn btn-primary" disabled={!text.trim()}>Guardar</button>
      </form>
    </Sheet>
  )
}
