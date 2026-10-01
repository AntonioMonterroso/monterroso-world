import { supabase } from './supabase'

export type Church = { name: string; logo: string }
export type AppSettings = { tz?: string; quiet?: { start: number; end: number } | null; church?: Church }

export async function getSettings(): Promise<AppSettings> {
  const { data } = await supabase.from('settings').select('data').maybeSingle()
  return (data?.data ?? {}) as AppSettings
}

export async function patchSettings(patch: Partial<AppSettings>): Promise<void> {
  const cur = await getSettings()
  await supabase.from('settings').upsert({ data: { ...cur, ...patch } })
}
