import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

/** Atiende los botones "Hecho" y "Posponer 10 min" de una notificación (llegan como ?act=…&e=…&d=…). */
export default function NotificationActions() {
  const { search, pathname } = useLocation()
  const nav = useNavigate()
  const [msg, setMsg] = useState('')

  useEffect(() => {
    const q = new URLSearchParams(search)
    const act = q.get('act'), e = q.get('e'), d = q.get('d')
    if (!act || !e || !d) return
    nav(pathname, { replace: true })
    ;(async () => {
      if (act === 'done') {
        const { error } = await supabase.from('occurrence_state').upsert({ event_id: e, occ_date: d, done: true }, { onConflict: 'event_id,occ_date' })
        setMsg(error ? 'No pude marcarlo como hecho.' : 'Marcado como hecho.')
      } else if (act === 'snooze') {
        const until = new Date(Date.now() + 10 * 60_000).toISOString()
        const { error } = await supabase.from('occurrence_state').upsert({ event_id: e, occ_date: d, snoozed_until: until }, { onConflict: 'event_id,occ_date' })
        setMsg(error ? 'No pude posponerlo.' : 'Te lo recuerdo en 10 minutos.')
      }
      setTimeout(() => setMsg(''), 3500)
    })()
  }, [search, pathname, nav])

  if (!msg) return null
  return <div role="status" className="fixed bottom-24 left-1/2 z-50 -translate-x-1/2 rounded-full px-5 py-3 text-sm md:bottom-8" style={{ background: 'var(--surface-2)', border: '1px solid var(--line)' }}>{msg}</div>
}
