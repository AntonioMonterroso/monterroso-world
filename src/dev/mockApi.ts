// Solo desarrollo: imita lo mínimo de PostgREST en memoria para probar la interfaz sin sesión real.
type Row = Record<string, unknown>
const db: Record<string, Row[]> = { schedule_blocks: [], settings: [], tasks: [], inbox_items: [], events: [], occurrence_state: [], projects: [], payments: [], songs: [], setlists: [], practice_logs: [] }
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
      const items: Row[] = (Array.isArray(body) ? body : [body]).map((b: Row) => ({ id: crypto.randomUUID(), active: true, exceptions: [], checklist: [], alerts: [], weekdays: [], amount: 0, song_ids: [], instruments: [], capo: 0, content: '', done: false, processed: false, notes: null, created_at: new Date().toISOString(), ...b }))
      if (m[1] === 'settings') { rows.length = 0 }
      if (m[1] === 'occurrence_state') { for (const it of items) { const i = rows.findIndex((r) => r.event_id === it.event_id && r.occ_date === it.occ_date); if (i >= 0) rows.splice(i, 1) } }
      rows.push(...items)
      return out(items)
    }
    if (method === 'PATCH') { const hit = rows.filter(match); hit.forEach((r) => Object.assign(r, body)); return out(hit) }
    if (method === 'DELETE') { db[m[1]] = db[m[1]].filter((r) => !match(r)); return json([]) }
    return real(input, init)
  }
}
