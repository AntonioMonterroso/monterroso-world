import { useEffect } from 'react'
import type { Account } from '../../lib/accounts'

/** Chips para elegir de/a qué cuenta va el dinero. Recuerda la última elegida. */
export const LAST_KEY = 'mw_acct'
export const lastAccount = () => { try { return localStorage.getItem(LAST_KEY) ?? '' } catch { return '' } }
export const rememberAccount = (id: string) => { try { if (id) localStorage.setItem(LAST_KEY, id) } catch { /* sin almacenamiento */ } }

export function AccountPick({ accounts, value, onChange, label, none = 'Sin cuenta' }: { accounts: Account[]; value: string; onChange: (id: string) => void; label: string; none?: string }) {
  // Si la cuenta recordada ya no existe (borrada o archivada), se limpia: si no, el guardado fallaba en silencio
  const stale = Boolean(value) && !accounts.some((a) => a.id === value)
  useEffect(() => { if (stale) onChange('') }, [stale, onChange])
  if (accounts.length === 0) return null
  return (
    <fieldset>
      <legend className="mb-2 text-sm">{label}</legend>
      <div className="flex flex-wrap gap-2">
        {accounts.map((a) => <button key={a.id} type="button" aria-pressed={value === a.id} onClick={() => onChange(a.id)} className="min-h-11 rounded-full px-4 text-sm" style={{ background: value === a.id ? `color-mix(in oklab, ${a.color} 22%, transparent)` : 'var(--surface-2)', color: value === a.id ? a.color : 'var(--ink-soft)', boxShadow: value === a.id ? `inset 0 0 0 1.5px ${a.color}` : 'none' }}>{a.name}</button>)}
        <button type="button" aria-pressed={!value} onClick={() => onChange('')} className="min-h-11 rounded-full px-4 text-sm" style={{ background: !value ? 'var(--surface-3)' : 'var(--surface-2)', color: 'var(--ink-faint)' }}>{none}</button>
      </div>
    </fieldset>
  )
}
