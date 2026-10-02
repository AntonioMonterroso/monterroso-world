import VoiceNotes from '../../components/VoiceNotes'
import { PageHeader } from '../../components/ui'

export default function Ideas() {
  return (
    <div>
      <p className="eyebrow">Música</p>
      <PageHeader title="Ideas de voz" />
      <VoiceNotes />
    </div>
  )
}
