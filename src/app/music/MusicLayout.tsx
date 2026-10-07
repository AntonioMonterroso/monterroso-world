import { SegNav, TabOutlet } from '../../components/ui'

const tabs = [
    { to: '/app/musica', label: 'Canciones', end: true },
    { to: '/app/musica/setlists', label: 'Setlists' },
    { to: '/app/musica/practica', label: 'Práctica' },
    { to: '/app/musica/ideas', label: 'Ideas' },
]

export default function MusicLayout() {
  return (
    <div>
      <SegNav label="Música" tabs={tabs} className="no-print" />
      <TabOutlet tabs={tabs} />
    </div>
  )
}
