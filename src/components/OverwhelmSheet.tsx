import { ArrowRight, Wind } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Sheet from './Sheet'

type Props = { open: boolean; onClose: () => void; priorities: string[]; dump: (lines: string[]) => Promise<void> }

/** Tres pasos cortos para cuando todo pesa: respirar, soltar lo que tienes en la cabeza y elegir UNA cosa de 2 minutos. */
export default function OverwhelmSheet({ open, onClose, priorities, dump }: Props) {
  const nav = useNavigate()
  const [step, setStep] = useState(0)
  const [text, setText] = useState('')
  const [lines, setLines] = useState<string[]>([])
  const [pick, setPick] = useState('')
  const [custom, setCustom] = useState('')
  const [busy, setBusy] = useState(false)

  const close = () => { setStep(0); setText(''); setLines([]); setPick(''); setCustom(''); onClose() }
  const release = async () => {
    const l = text.split('\n').map((x) => x.trim()).filter(Boolean)
    setBusy(true)
    if (l.length) await dump(l)
    setBusy(false); setLines(l); setStep(2)
  }
  const options = [...new Set([...priorities, ...lines])].slice(0, 6)
  const chosen = custom.trim() || pick
  const go = () => { if (!chosen) return; const t = encodeURIComponent(chosen); close(); nav(`/app/mente/enfoque?tarea=${t}&min=2&auto=1`) }

  return (
    <Sheet open={open} title="Estoy abrumado" onClose={close}>
      <ol className="mb-4 flex gap-1.5" aria-label={`Paso ${step + 1} de 3`}>{[0, 1, 2].map((i) => <li key={i} className="h-1 flex-1 rounded-full" style={{ background: i <= step ? 'var(--accent)' : 'var(--surface-3)', transition: 'background-color 300ms var(--ease-out)' }} />)}</ol>

      {step === 0 && (
        <div className="grid justify-items-center gap-4 py-2 text-center">
          <div className="breath" aria-hidden><Wind size={26} /></div>
          <p className="text-lg font-semibold tracking-tight">Respira conmigo</p>
          <p className="max-w-xs text-sm" style={{ color: 'var(--ink-soft)' }}>Inhala mientras crece el círculo, suelta el aire mientras se achica. Tres veces. No hay nada urgente en este minuto.</p>
          <button className="btn btn-primary" onClick={() => setStep(1)}>Ya respiré <ArrowRight size={16} aria-hidden /></button>
        </div>
      )}

      {step === 1 && (
        <div className="grid gap-3">
          <p className="text-lg font-semibold tracking-tight">Suelta todo lo que tienes en la cabeza</p>
          <p className="text-sm" style={{ color: 'var(--ink-soft)' }}>Una cosa por línea, sin ordenar. Se guarda en tu captura rápida para decidir después.</p>
          <label className="sr-only" htmlFor="dump">Lo que tengo en la cabeza</label>
          <textarea id="dump" autoFocus className="field py-3" rows={6} value={text} onChange={(e) => setText(e.target.value)} placeholder={'Responder a Marcos\nPagar el hosting\nEnsayo del viernes…'} />
          <div className="flex items-center gap-3">
            <button className="btn btn-primary" disabled={busy} onClick={release}>{text.trim() ? 'Soltarlo' : 'Seguir sin escribir'} <ArrowRight size={16} aria-hidden /></button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="grid gap-3">
          <p className="text-lg font-semibold tracking-tight">Elige UNA sola cosa</p>
          <p className="text-sm" style={{ color: 'var(--ink-soft)' }}>Lo demás ya está guardado y no se va a perder. Haz esta cosa solo 2 minutos; si quieres seguir, sigues.</p>
          <div className="grid gap-2" role="radiogroup" aria-label="Qué hacer ahora">
            {options.map((o) => <button key={o} type="button" role="radio" aria-checked={pick === o && !custom.trim()} onClick={() => { setPick(o); setCustom('') }} className="pick">{o}</button>)}
          </div>
          <label className="grid gap-1.5 text-sm">O escribe otra<input className="field" value={custom} onChange={(e) => setCustom(e.target.value)} maxLength={200} placeholder="La cosa más pequeña que se te ocurra" /></label>
          <button className="btn btn-primary w-fit" disabled={!chosen} onClick={go}>2 minutos y ya <ArrowRight size={16} aria-hidden /></button>
        </div>
      )}
    </Sheet>
  )
}
