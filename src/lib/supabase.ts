import { createClient } from '@supabase/supabase-js'
import { installMockApi } from '../dev/mockApi'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

// Solo desarrollo: con `mw_mock` en localStorage se usa un servidor falso en memoria
if (import.meta.env.DEV && localStorage.getItem('mw_mock')) installMockApi()

export const configured = Boolean(url && key)

// La llave anon es pública por diseño; la seguridad real son las políticas RLS.
export const supabase = createClient(url ?? 'http://localhost', key ?? 'missing', {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
})
