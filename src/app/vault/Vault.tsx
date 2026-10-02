import { Loader2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useAuth } from '../../lib/auth'
import { supabase } from '../../lib/supabase'
import { unlockVault, useVaultKey } from '../../lib/vaultSession'
import type { DataKey, VaultMeta } from '../../lib/vault'
import { RecoveryScreen, Setup, Unlock } from './Gate'
import Items from './Items'

export default function Vault() {
  const { session } = useAuth()
  const dk = useVaultKey()
  const [meta, setMeta] = useState<VaultMeta | null | undefined>(undefined)
  const [code, setCode] = useState<string | null>(null)
  const [pending, setPending] = useState<DataKey | null>(null)
  const [err, setErr] = useState('')

  useEffect(() => {
    supabase.from('vault_meta').select('*').maybeSingle().then(({ data, error }) => {
      if (error) { setErr('No pude revisar la bóveda. Revisa tu conexión.'); setMeta(null); return }
      setMeta((data as VaultMeta | null) ?? null)
    })
  }, [])

  if (meta === undefined) return <div className="grid h-48 place-items-center"><Loader2 className="animate-spin" aria-label="Cargando" /></div>

  // El código de recuperación nuevo se muestra antes de entrar
  if (code) return <RecoveryScreen code={code} onDone={() => { setCode(null); if (pending) { unlockVault(pending); setPending(null) } }} />

  if (!meta) return (
    <div>
      {err && <p role="alert" className="mb-4 text-sm" style={{ color: 'var(--neg)' }}>{err}</p>}
      <Setup onCreated={(m, c, k) => { setMeta(m); setCode(c); setPending(k) }} />
    </div>
  )

  if (!dk) return <Unlock meta={meta} onMetaChanged={(m, c) => { setMeta(m); if (c) setCode(c) }} />

  return <Items dk={dk} meta={meta} onMeta={(m) => setMeta(m)} userName={session?.user.email ?? 'Monterroso'} />
}
