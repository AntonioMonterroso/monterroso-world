import { Fragment } from 'react'
import { parseSheet, prefersFlats, transposeChord } from '../../lib/chords'

const sizes = { md: { text: '1rem', chord: '.85rem', gap: 6 }, lg: { text: '1.5rem', chord: '1.15rem', gap: 8 }, xl: { text: '2.1rem', chord: '1.6rem', gap: 10 } }

export default function ChordSheet({ content, semis = 0, targetKey, size = 'md', showNotes = true }: { content: string; semis?: number; targetKey?: string | null; size?: keyof typeof sizes; showNotes?: boolean }) {
  const flats = prefersFlats(targetKey)
  const s = sizes[size]
  const lines = parseSheet(content)
  if (!content.trim()) return <p style={{ color: 'var(--ink-faint)' }}>Todavía no hay letra ni acordes.</p>
  return (
    <div className="sheet" style={{ fontSize: s.text, lineHeight: 1.25 }}>
      {lines.map((l, i) => {
        if (l.type === 'blank') return <div key={i} style={{ height: '.9em' }} />
        if (l.type === 'section') return <h3 key={i} className="mt-5 mb-1 font-display" style={{ color: 'var(--accent)', fontSize: '1.15em' }}>{l.text}</h3>
        if (l.type === 'note') return showNotes ? <p key={i} className="my-1 rounded-md px-2 py-0.5" style={{ background: 'color-mix(in oklab, var(--music) 12%, transparent)', color: 'var(--music)', fontSize: '.8em', width: 'fit-content' }}>{l.text}</p> : <Fragment key={i} />
        return (
          <div key={i} className="flex flex-wrap" style={{ marginTop: s.gap }}>
            {l.segments.map((seg, j) => (
              <span key={j} className="inline-flex flex-col" style={{ whiteSpace: 'pre' }}>
                <span style={{ color: 'var(--sky)', fontWeight: 600, fontSize: s.chord, minHeight: '1.2em', paddingRight: seg.chord ? '.5em' : 0 }}>{seg.chord ? transposeChord(seg.chord, semis, flats) : ' '}</span>
                <span>{seg.text || (seg.chord ? ' ' : '')}</span>
              </span>
            ))}
          </div>
        )
      })}
    </div>
  )
}
