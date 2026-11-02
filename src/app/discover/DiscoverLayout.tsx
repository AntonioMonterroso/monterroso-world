import { useLocation } from 'react-router-dom'
import { SegNav, TabOutlet } from '../../components/ui'

const SAVED = [
  { to: '/app/descubrir/aprender', label: 'Aprender', match: ['aprender', 'video'] },
  { to: '/app/descubrir/links', label: 'Links', match: ['links'] },
  { to: '/app/descubrir/inspiracion', label: 'Inspiración', match: ['inspiracion'] },
]

/** Guardado (antes Descubrir): lo que aprendes, enlaces e inspiración. El portafolio ahora vive en Trabajo. */
export default function DiscoverLayout() {
  const { pathname } = useLocation()
  const seg = pathname.replace(/^.*\/app\/descubrir\/?/, '').split('/')[0]
  const on = SAVED.find((s) => s.match.includes(seg))
  return (
    <div>
      {on && <SegNav label="Guardado" className="seg-sub !mb-4" tabs={SAVED.map((s) => ({ to: s.to, label: s.label, active: s === on }))} />}
      <TabOutlet />
    </div>
  )
}
