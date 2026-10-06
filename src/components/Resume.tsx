import { Bookmark, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { clearResume, loadResume, saveResume, type ResumeNote } from '../lib/resume'

/** Al cerrar una ronda sin terminar: una línea opcional para acordarte por dónde ibas. */
export function ResumeField({ task }: { task: string }) {
  const [v, setV] = useState('')
  const [saved, setSaved] = useState(false)
  const save = async () => { if (!v.trim()) return; await saveResume(v, task); setSaved(true) }
  return (
    <form className="mt-5 grid gap-1.5" onSubmit={(e) => { e.preventDefault(); void save() }}>
      <label htmlFor="resume-in" className="text-sm" style={{ color: 'var(--ink-soft)' }}>¿Por dónde ibas? <span style={{ color: 'var(--ink-faint)' }}>(opcional)</span></label>
      <div className="flex gap-2">
        <input id="resume-in" className="field" value={v} maxLength={200} onChange={(e) => { setV(e.target.value); setSaved(false) }} placeholder="Me faltaba conectar el formulario" />
        <button className="btn btn-ghost shrink-0" disabled={!v.trim() || saved}>{saved ? 'Anotado' : 'Anotar'}</button>
      </div>
      {saved && <p role="status" className="text-xs" style={{ color: 'var(--ink-faint)' }}>Te lo muestro discretamente cuando vuelvas a Hoy.</p>}
    </form>
  )
}

/** Nota tenue en Hoy: un solo renglón, sin colores fuertes ni avisos. Se puede retomar o descartar con un toque. */
export function ResumeHint() {
  const [n, setN] = useState<ResumeNote | null>(null)
  useEffect(() => { loadResume().then(setN) }, [])
  if (!n) return null
  const drop = () => { setN(null); void clearResume() }
  return (
    <div className="resume" role="note">
      <Bookmark size={14} aria-hidden />
      <span className="min-w-0 flex-1 truncate">Ibas por: <em>{n.text}</em></span>
      <Link to={`/app/mente/enfoque?tarea=${encodeURIComponent(n.from || n.text)}`} onClick={drop} className="resume-act">Retomar</Link>
      <button className="resume-x" onClick={drop} aria-label="Descartar la nota"><X size={14} aria-hidden /></button>
    </div>
  )
}
