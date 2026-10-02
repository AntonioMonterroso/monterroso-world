import { Settings } from 'lucide-react'
import { Group, PageHeader, Row } from '../components/ui'
import { centerGroups, centers } from '../lib/modules'

const toneColor = { dev: 'var(--dev)', music: 'var(--music)', personal: 'var(--personal)' } as const

export default function More() {
  return (
    <div>
      <PageHeader title="Todo" sub="Todo Monterroso World, ordenado por lo que necesitas hacer." />
      {centerGroups.map((g, i) => (
        <Group key={i} title={g.label} className={i === 0 ? '!mt-0' : ''}>
          {g.ids.map((id) => {
            const c = centers.find((x) => x.id === id)!
            return <Row key={id} icon={<c.icon size={17} aria-hidden />} tone={toneColor[c.tone]} title={c.label} sub={c.blurb} to={id === 'hoy' ? '/app' : `/app/${id}`} />
          })}
        </Group>
      ))}
      <Group>
        <Row icon={<Settings size={17} aria-hidden />} tone="var(--ink-soft)" title="Ajustes" to="/app/ajustes" />
      </Group>
    </div>
  )
}
