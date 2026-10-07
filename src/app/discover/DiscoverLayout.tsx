import { ChevronLeft } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { SegNav, TabOutlet } from '../../components/ui'

type Sub = { to: string; label: string }
const GROUPS: { id: string; label: string; match: string[]; to: string; subs: Sub[] }[] = [
  { id: 'aprender', label: 'Aprender', match: ['aprender', 'video'], to: '/app/descubrir/aprender', subs: [] },
  { id: 'guardar', label: 'Guardar', match: ['links', 'inspiracion', 'portafolio'], to: '/app/descubrir/links', subs: [{ to: '/app/descubrir/links', label: 'Links' }, { to: '/app/descubrir/inspiracion', label: 'Inspiración' }, { to: '/app/descubrir/portafolio', label: 'Portafolio' }] },
]

/** Descubrir: una pantalla de inicio y tres grupos. Los grupos con varias secciones muestran un segundo nivel. */
export default function DiscoverLayout() {
  const { pathname } = useLocation()
  const seg = pathname.replace(/^.*\/app\/descubrir\/?/, '').split('/')[0]
  const group = GROUPS.find((g) => g.match.includes(seg))

  return (
    <div>
      {group && (
        <>
          <Link to="/app/descubrir" className="mb-3 inline-flex min-h-11 items-center gap-1 text-sm" style={{ color: 'var(--ink-soft)' }}><ChevronLeft size={16} aria-hidden /> Descubrir</Link>
          <SegNav label="Grupos de Descubrir" className="!mb-3" tabs={GROUPS.map((g) => ({ to: g.to, label: g.label, active: g.id === group.id }))} />
          {group.subs.length > 1 && <div className="mb-6"><SegNav label={group.label} className="!mb-0 seg-sub" tabs={group.subs.map((s) => ({ to: s.to, label: s.label }))} /></div>}
        </>
      )}
      <TabOutlet />
    </div>
  )
}
