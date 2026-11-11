import { getSettings, patchSettings } from './settings'
import { supabase } from './supabase'

/** Respaldo: baja tus datos a un archivo en tu equipo. No incluye la bóveda (ya está cifrada aparte) ni las notas de voz. */
export const BACKUP_TABLES = [
  'fin_accounts', 'fin_transactions', 'fin_transfers', 'fin_budgets', 'fin_goal_moves', 'fin_areas', 'fin_categories', 'savings_goals', 'savings_plans', 'subscriptions', 'loans', 'loan_payments',
  'projects', 'payments', 'quotes', 'quote_packages', 'quote_extras', 'quote_page', 'deliveries',
  'songs', 'setlists', 'practice_logs', 'sermons', 'faith_notes',
  'habits', 'habit_logs', 'routines', 'routine_steps', 'routine_runs', 'if_then', 'stuff', 'promises', 'renewals', 'exit_lists', 'day_checkins', 'rewards', 'reward_claims', 'focus_sessions',
  'schedule_blocks', 'events', 'tasks', 'inbox_items', 'recipes', 'pantry_items', 'shopping_items', 'places', 'trips', 'links', 'videos', 'video_notes', 'inspirations',
  'workouts', 'workout_items', 'workout_logs', 'body_metrics', 'health_days', 'training_partners', 'settings',
] as const

export type Backup = { app: 'monterroso-world'; at: string; counts: Record<string, number>; skipped: string[]; data: Record<string, unknown[]> }

export async function buildBackup(): Promise<Backup> {
  const data: Record<string, unknown[]> = {}, counts: Record<string, number> = {}, skipped: string[] = []
  for (const t of BACKUP_TABLES) {
    const { data: rows, error } = await supabase.from(t).select('*')
    if (error || !rows) { skipped.push(t); continue }
    data[t] = rows; counts[t] = rows.length
  }
  return { app: 'monterroso-world', at: new Date().toISOString(), counts, skipped, data }
}
export const backupName = (d = new Date()) => `monterroso-world-respaldo-${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}.json`
export const totalRows = (b: Pick<Backup, 'counts'>) => Object.values(b.counts).reduce((a, n) => a + n, 0)

export async function downloadBackup(): Promise<Backup> {
  const b = await buildBackup()
  const blob = new Blob([JSON.stringify(b, null, 2)], { type: 'application/json' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob); a.download = backupName(); a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 4000)
  await patchSettings({ lastBackup: b.at } as never)
  return b
}
export const lastBackup = async (): Promise<string | null> => { const v = ((await getSettings()) as { lastBackup?: unknown }).lastBackup; return typeof v === 'string' ? v : null }
