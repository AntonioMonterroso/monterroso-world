import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import Sheet from './Sheet'
import Metronome from '../app/music/Metronome'
import { SegNav, TabOutlet, type NavTab } from './ui'
import { sectionOf } from '../lib/sections'

const starts = (path: string, p: string) => path === p || path.startsWith(p + '/')

/** Navegación de segundo nivel de cada sección: las mismas pestañas en todas sus pantallas, vengan de la ruta que vengan. */
export default function SectionLayout() {
  const { pathname } = useLocation()
  const path = pathname.replace(/\/$/, '')
  const { section, view } = sectionOf(pathname)
  const [metro, setMetro] = useState(false)
  const [bpm, setBpm] = useState(100)
  const tabs: NavTab[] = section.views.map((v) => ({ to: v.to, label: v.label, icon: v.icon, group: v.group, hint: v.hint, active: v === view }))
  // Tercer nivel (por ejemplo Ejercicio: Rutinas, Historial…): la sub más específica que coincide; si ninguna, la marcada como fallback
  const subs = view?.subs
  const hit = subs ? [...subs].filter((x) => x.end ? path === x.to : starts(path, x.to)).sort((a, b) => b.to.length - a.to.length)[0] ?? subs.find((x) => x.fallback) ?? subs[0] : null
  return (
    <div className={section.area ? `area-${section.area}` : undefined}>
      {tabs.length > 1 && <SegNav label={section.label} tabs={tabs} className="no-print" />}
      {section.id === 'musica' && <div className="no-print mb-3 flex justify-end"><button type="button" className="chip-btn" onClick={() => setMetro(true)}>Metrónomo</button></div>}
      {subs && <SegNav label={view!.label} tabs={subs.map((x) => ({ to: x.to, label: x.label, end: x.end, active: x === hit }))} className="seg-sub !mb-4 no-print" />}
      <TabOutlet tabs={section.views.map((v) => ({ to: v.to }))} />
      <Sheet open={metro} title="Metrónomo" onClose={() => setMetro(false)}><Metronome bpm={bpm} onBpm={setBpm} /></Sheet>
    </div>
  )
}
