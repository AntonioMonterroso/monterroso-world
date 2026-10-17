import { Briefcase, FileText, Globe2 } from 'lucide-react'
import { SegNav, TabOutlet } from '../../components/ui'

const tabs = [
  { to: '/app/trabajo', label: 'Trabajos', end: true, icon: Briefcase },
  { to: '/app/trabajo/propuestas', label: 'Propuestas', icon: FileText },
  { to: '/app/trabajo/precios', label: 'Precios públicos', icon: Globe2 },
]

export default function WorkLayout() {
  return (
    <div>
      <SegNav label="Trabajo" tabs={tabs} />
      <TabOutlet tabs={tabs} />
    </div>
  )
}
