import { Calendar, CalendarDays, Clock } from 'lucide-react'
import { SegNav, TabOutlet } from '../../components/ui'

const tabs = [
  { to: '/app/planear', label: 'Horario', end: true, icon: Clock },
  { to: '/app/planear/agenda', label: 'Agenda', icon: CalendarDays },
  { to: '/app/planear/calendario', label: 'Calendario', icon: Calendar },
]

export default function PlanLayout() {
  return (
    <div>
      <SegNav label="Planear" tabs={tabs} />
      <TabOutlet tabs={tabs} />
    </div>
  )
}
