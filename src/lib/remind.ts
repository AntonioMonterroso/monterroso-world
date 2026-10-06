import { supabase } from './supabase'

/** Un recordatorio normal (con push) para una fecha. Si ya había uno, se reemplaza; sin fecha, se quita. Devuelve el id nuevo. */
export async function syncReminder(oldId: string | null, spec: { title: string; action: string; date: string | null } | null): Promise<string | null> {
  if (oldId) await supabase.from('events').delete().eq('id', oldId)
  if (!spec || !spec.date) return null
  const { data } = await supabase.from('events').insert({
    type: 'reminder', kind: 'other', title: spec.title, action: spec.action, start_date: spec.date, start_min: 9 * 60,
    repeat: 'none', interval_n: 1, weekdays: [], exceptions: [], alerts: [0], persistent: false, checklist: [],
  }).select('id').single()
  return (data?.id as string | undefined) ?? null
}
