import { getSettings, patchSettings } from './settings'

/** «Por dónde ibas»: una línea para retomar sin perder el hilo. Es discreta: caduca sola y nunca avisa. */
export type ResumeNote = { text: string; at: string; from?: string }
export const RESUME_TTL_H = 36

export const isFresh = (n: ResumeNote | undefined | null, now = Date.now()) => Boolean(n?.text.trim()) && now - new Date(n!.at).getTime() < RESUME_TTL_H * 3_600_000

export async function loadResume(): Promise<ResumeNote | null> {
  const s = (await getSettings()) as { resume?: ResumeNote }
  return isFresh(s.resume) ? s.resume! : null
}
export const saveResume = (text: string, from?: string) => patchSettings({ resume: { text: text.trim().slice(0, 200), at: new Date().toISOString(), from } } as never)
export const clearResume = () => patchSettings({ resume: null } as never)
