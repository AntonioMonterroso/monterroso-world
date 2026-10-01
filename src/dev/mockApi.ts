// Solo desarrollo: imita lo mínimo de PostgREST en memoria para probar la interfaz sin sesión real.
type Row = Record<string, unknown>
const db: Record<string, Row[]> = { schedule_blocks: [], settings: [], tasks: [], inbox_items: [], events: [], occurrence_state: [], projects: [], payments: [], songs: [], setlists: [], practice_logs: [], sermons: [], sermon_phases: [], sermon_slides: [], faith_notes: [], fin_transactions: [], fin_budgets: [], savings_goals: [], subscriptions: [], loans: [], loan_payments: [], workouts: [], workout_items: [], training_partners: [], workout_logs: [], body_metrics: [], health_days: [], share_links: [], habits: [], habit_logs: [], focus_sessions: [], vault_meta: [], vault_items: [], videos: [], video_notes: [], links: [], boards: [], inspirations: [], trips: [], places: [], shopping_items: [], voice_notes: [], song_shares: [], routines: [], routine_steps: [], routine_runs: [] }
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

export function installMockApi() {
  const real = window.fetch.bind(window)
  window.fetch = async (input, init) => {
    const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url)
    const m = url.pathname.match(/\/rest\/v1\/(\w+)/)
    if (!m || !(m[1] in db)) return real(input, init)
    const rows = db[m[1]]
    const method = (init?.method ?? 'GET').toUpperCase()
    const headers = new Headers(init?.headers)
    const single = (headers.get('Accept') ?? '').includes('vnd.pgrst.object')
    const match = (r: Row) => [...url.searchParams].every(([k, v]) => !v.startsWith('eq.') || String(r[k]) === v.slice(3))
    const out = (list: Row[]) => (single ? (list[0] ? json(list[0]) : json({ message: 'no rows' }, 406)) : json(list))
    const body = init?.body ? JSON.parse(String(init.body)) : null

    if (method === 'GET') {
      let list = rows.filter(match)
      const order = url.searchParams.get('order')
      if (order) { const [col, dir] = order.split('.'); list = [...list].sort((a, b) => (Number(a[col]) - Number(b[col]) || String(a[col]).localeCompare(String(b[col]))) * (dir === 'desc' ? -1 : 1)) }
      const lim = url.searchParams.get('limit'); if (lim) list = list.slice(0, Number(lim))
      return out(list)
    }
    if (method === 'POST') {
      const items: Row[] = (Array.isArray(body) ? body : [body]).map((b: Row) => ({ id: crypto.randomUUID(), active: true, exceptions: [], checklist: [], alerts: [], weekdays: [], amount: 0, days: [0,1,2,3,4,5,6], archived: false, done_steps: [], completed: false, include_notes: true, duration_sec: 1, size_bytes: 1, tags: [], priority: 2, rating: null, favorite: false, portfolio: false, review_step: 0, at_sec: 0, start_sec: 0, source: 'manual', entries: [], sets: 3, reps: '10', revoked: false, can_log: true, workout_ids: [], water_glasses: 0, song_ids: [], live_token: 'abcdef0123456789abcdef0123456789abcd', status: 'draft', instruments: [], capo: 0, content: '', done: false, processed: false, notes: null, created_at: new Date().toISOString(), ...b }))
      if (m[1] === 'settings') { rows.length = 0 }
      if (m[1] === 'routine_runs') { for (const it of items) { const i = rows.findIndex((r) => r.routine_id === it.routine_id && r.day === it.day); if (i >= 0) rows.splice(i, 1) } }
      if (m[1] === 'habit_logs') { for (const it of items) { const i = rows.findIndex((r) => r.habit_id === it.habit_id && r.day === it.day); if (i >= 0) rows.splice(i, 1) } }
      if (m[1] === 'health_days') { for (const it of items) { const i = rows.findIndex((r) => r.day === it.day); if (i >= 0) rows.splice(i, 1) } }
      if (m[1] === 'occurrence_state') { for (const it of items) { const i = rows.findIndex((r) => r.event_id === it.event_id && r.occ_date === it.occ_date); if (i >= 0) rows.splice(i, 1) } }
      rows.push(...items)
      return out(items)
    }
    if (method === 'PATCH') { const hit = rows.filter(match); hit.forEach((r) => Object.assign(r, body)); return out(hit) }
    if (method === 'DELETE') { db[m[1]] = db[m[1]].filter((r) => !match(r)); return json([]) }
    return real(input, init)
  }
}
