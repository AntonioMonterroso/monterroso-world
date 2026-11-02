import { syncReminder } from '../../lib/remind'
import { localISO } from '../../lib/time'
import { money, type Project, type useProjects } from '../../lib/projects'

/** Guarda un trabajo y deja puesto (o quita) el aviso mensual del día de cobro. Lo usan Trabajos y la ficha del cliente. */
export async function saveProject(db: ReturnType<typeof useProjects>, id: string, patch: Partial<Omit<Project, 'id'>>) {
  const cur = db.projects.find((x) => x.id === id)
  const mf = Number(patch.monthly_fee ?? 0)
  let reminder_event_id = cur?.reminder_event_id ?? null
  if (mf > 0 && patch.billing_day) {
    const t = new Date(), day = patch.billing_day
    const first = new Date(t.getFullYear(), t.getMonth() + (t.getDate() > day ? 1 : 0), day)
    reminder_event_id = await syncReminder(reminder_event_id, { title: `Cobrar mensualidad: ${patch.title ?? cur?.title}`, action: `${money(mf)} de ${patch.client || patch.title || 'tu cliente'}`, date: localISO(first), monthly: true, minute: 9 * 60 })
  } else reminder_event_id = await syncReminder(reminder_event_id, null)
  await db.update(id, { ...patch, reminder_event_id })
}
export function removeProject(db: ReturnType<typeof useProjects>, id: string) {
  void syncReminder(db.projects.find((x) => x.id === id)?.reminder_event_id ?? null, null)
  db.remove(id)
}
