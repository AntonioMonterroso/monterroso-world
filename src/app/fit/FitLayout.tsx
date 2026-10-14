import { Activity, Dumbbell, HeartPulse, Users } from 'lucide-react'
import { SegNav, TabOutlet } from '../../components/ui'

const tabs = [
  { to: '/app/ejercicio', label: 'Rutinas', end: true, icon: Dumbbell },
  { to: '/app/ejercicio/historial', label: 'Historial', icon: Activity },
  { to: '/app/ejercicio/cuerpo', label: 'Cuerpo', icon: HeartPulse },
  { to: '/app/ejercicio/companeros', label: 'Compañeros', icon: Users },
]

export default function FitLayout() {
  return (
    <div>
      <SegNav label="Ejercicio" tabs={tabs} />
      <TabOutlet tabs={tabs} />
    </div>
  )
}
