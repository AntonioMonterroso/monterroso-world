import { useEffect, useMemo, useState } from 'react'
import Sheet from '../../components/Sheet'
import { importSong, type Imported } from '../../lib/chordpro'

/** Pegar una canción con acordes (ChordPro o acordes arriba de la letra): muestra lo que entendió y solo crea al confirmar. */
export default function ImportSong({ open, onClose, onCreate }: { open: boolean; onClose: () => void; onCreate: (s: Imported) => Promise<void> }) {
  const [raw, setRaw] = useState('')
  const [title, setTitle] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  useEffect(() => { if (open) { setRaw(''); setTitle(''); setErr(''); setBusy(false) } }, [open])
  const parsed = useMemo(() => importSong(raw), [raw])
  useEffect(() => { setTitle(parsed.title) }, [parsed.title])
  const chords = (parsed.content.match(/\[[^\]]+\]/g) ?? []).length
  const ok = raw.trim().length > 0 && title.trim().length > 0

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!ok || busy) return
    setBusy(true); setErr('')
    try { await onCreate({ ...parsed, title: title.trim() }) } catch { setErr('No se pudo crear. Intenta otra vez.'); setBusy(false) }
  }

  return (
    <Sheet open={open} title="Pegar canción con acordes" onClose={onClose}>
      <form className="grid gap-4" onSubmit={submit}>
        <label className="grid gap-2 text-sm">Pega la letra con los acordes
          <textarea className="field min-h-48 font-mono text-sm" value={raw} onChange={(e) => setRaw(e.target.value)} maxLength={30000} placeholder={'{title: Mi canción}\n[G]Letra con [C]acordes\n\no acordes arriba:\nG       C\nLetra con acordes'} />
        </label>
        {raw.trim() && (
          <>
            <label className="grid gap-2 text-sm">Título<input className="field" value={title} maxLength={200} onChange={(e) => setTitle(e.target.value)} placeholder="¿Cómo se llama?" /></label>
            <p className="text-sm" aria-live="polite">Entendí <strong>{chords} {chords === 1 ? 'acorde' : 'acordes'}</strong>{parsed.key ? ` · tono ${parsed.key}` : ''}{parsed.bpm ? ` · ${parsed.bpm} bpm` : ''}{parsed.artist ? ` · ${parsed.artist}` : ''}.</p>
            <pre className="max-h-48 overflow-auto rounded-2xl p-3 text-xs whitespace-pre-wrap" style={{ background: 'var(--surface-2)' }}>{parsed.content.slice(0, 1200)}</pre>
          </>
        )}
        {err && <p role="alert" className="text-sm" style={{ color: 'var(--aviso-texto)' }}>{err}</p>}
        <div className="flex flex-wrap gap-2"><button className="btn btn-primary" disabled={!ok || busy}>{busy ? 'Creando…' : 'Crear canción'}</button><button type="button" className="btn btn-ghost" onClick={onClose}>Cancelar</button></div>
      </form>
    </Sheet>
  )
}
