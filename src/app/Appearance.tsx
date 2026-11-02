import { ChevronLeft, Shuffle } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { PageHeader, Switch } from '../components/ui'
import { PALETTES, readLocal, saveAppearance, surprise, type Appearance, type Mode } from '../lib/appearance'
import { localISO } from '../lib/time'

const MODES: { id: Mode; label: string }[] = [{ id: 'claro', label: 'Claro' }, { id: 'oscuro', label: 'Oscuro' }, { id: 'auto', label: 'Automático' }]

/** Apariencia: claro, oscuro o seguir al teléfono, y una paleta. El color de las tres áreas no cambia. */
export default function AppearancePage() {
  const [a, setA] = useState<Appearance>(() => readLocal())
  useEffect(() => { setA(readLocal()) }, [])
  const set = (patch: Partial<Appearance>) => { const next = { ...a, ...patch }; setA(next); saveAppearance(next) }
  const swatch = (h: number, s: number, name: string) => name === 'Grafito' ? '#f5f5f7' : `hsl(${h} ${s}% 66%)`

  return (
    <div>
      <Link to="/app/ajustes" className="mb-3 inline-flex min-h-11 items-center gap-1 text-sm" style={{ color: 'var(--ink-soft)' }}><ChevronLeft size={16} aria-hidden /> Ajustes</Link>
      <PageHeader eyebrow="Ajustes" title="Apariencia" sub="Elige cómo se ve. Los colores de Trabajo, Música y Personal nunca cambian, para ubicarte de un vistazo." />

      <section aria-label="Vista previa" className="mt-2 grid gap-2 rounded-[28px] p-3" style={{ background: 'var(--fondo)', boxShadow: 'inset 0 0 0 2px var(--borde)' }}>
        <div className="grid gap-2 rounded-[22px] p-3" style={{ background: 'var(--marca-suave)' }}>
          <p className="etq">Ahora te conviene</p>
          <p className="font-display text-xl">Barbería Imperio tiene un cobro por hacer</p>
          <span className="btn btn-primary !min-h-10 w-fit">Cobrado</span>
        </div>
        <div className="flex gap-2"><span className="chip-btn" style={{ background: 'var(--web-suave)', color: 'var(--web-texto)' }}>Trabajo</span><span className="chip-btn" style={{ background: 'var(--musica-suave)', color: 'var(--musica-texto)' }}>Música</span><span className="chip-btn" style={{ background: 'var(--personal-suave)', color: 'var(--personal-texto)' }}>Personal</span></div>
      </section>

      <p className="etq mt-6">Modo</p>
      <div role="group" aria-label="Modo" className="mt-2 flex gap-1 rounded-full p-1" style={{ background: 'var(--superficie-2)' }}>
        {MODES.map((m) => <button key={m.id} type="button" aria-pressed={a.mode === m.id} onClick={() => set({ mode: m.id })} className="min-h-11 flex-1 rounded-full text-sm font-semibold" style={{ background: a.mode === m.id ? 'var(--superficie)' : 'transparent', color: a.mode === m.id ? 'var(--tinta)' : 'var(--tinta-suave)', boxShadow: a.mode === m.id ? 'var(--sombra-1)' : undefined }}>{m.label}</button>)}
      </div>

      <p className="etq mt-6">Paleta · {a.palette}</p>
      <div role="group" aria-label="Paleta" className="mt-2 flex flex-wrap gap-3">
        {PALETTES.map((p) => (
          <button key={p.name} type="button" aria-pressed={a.palette === p.name} aria-label={p.name} onClick={() => set({ palette: p.name, h: p.h, s: p.s, daily: false })} className="grid justify-items-center gap-1 text-xs" style={{ fontWeight: a.palette === p.name ? 700 : 400 }}>
            <span className="size-11 rounded-full" style={{ background: swatch(p.h, p.s, p.name), boxShadow: a.palette === p.name ? '0 0 0 3px var(--fondo), 0 0 0 5px var(--tinta)' : 'inset 0 0 0 1px var(--borde)' }} />{p.name}
          </button>
        ))}
      </div>

      <button type="button" className="btn btn-primary mt-6 w-full !min-h-14" onClick={() => set({ ...surprise(Math.random() * 100000), daily: false })}><Shuffle size={18} aria-hidden /> Sorpréndeme</button>
      <div className="mt-3 flex items-center justify-between rounded-2xl p-3" style={{ background: 'var(--superficie)' }}>
        <span className="text-sm font-semibold">Una paleta nueva cada día</span>
        <Switch checked={a.daily} label="Una paleta nueva cada día" onChange={(v) => set(v ? { daily: true, day: localISO(), ...surprise(Math.floor(Date.now() / 86_400_000)) } : { daily: false })} />
      </div>
    </div>
  )
}
