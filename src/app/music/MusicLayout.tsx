import { Lightbulb, ListMusic, Music, Activity } from 'lucide-react'
import { SegNav, TabOutlet } from '../../components/ui'

const tabs = [
  { to: '/app/musica', label: 'Canciones', end: true, icon: Music },
  { to: '/app/musica/setlists', label: 'Setlists', icon: ListMusic },
  { to: '/app/musica/practica', label: 'Práctica', icon: Activity },
  { to: '/app/musica/ideas', label: 'Ideas', icon: Lightbulb },
]

export default function MusicLayout() {
  return (
    <div>
      <SegNav label="Música" tabs={tabs} className="no-print" />
      <TabOutlet tabs={tabs} />
    </div>
  )
}
