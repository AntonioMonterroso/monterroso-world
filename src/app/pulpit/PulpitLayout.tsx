import { SegNav, TabOutlet } from '../../components/ui'

const tabs = [
    { to: '/app/pulpito', label: 'Prédicas', end: true },
    { to: '/app/pulpito/notas', label: 'Notas de fe' },
]

export default function PulpitLayout() {
  return (
    <div>
      <SegNav label="Púlpito" tabs={tabs} />
      <TabOutlet tabs={tabs} />
    </div>
  )
}
