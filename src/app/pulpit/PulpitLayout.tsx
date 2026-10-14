import { BookOpen, StickyNote } from 'lucide-react'
import { SegNav, TabOutlet } from '../../components/ui'

const tabs = [
  { to: '/app/pulpito', label: 'Prédicas', end: true, icon: BookOpen },
  { to: '/app/pulpito/notas', label: 'Notas de fe', icon: StickyNote },
]

export default function PulpitLayout() {
  return (
    <div>
      <SegNav label="Púlpito" tabs={tabs} />
      <TabOutlet tabs={tabs} />
    </div>
  )
}
