import { Check, ExternalLink, Loader2, MapPin, Plus, Star, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import Sheet from '../../components/Sheet'
import { PLACE_CATEGORIES, mapsSearchUrl, type Place, type Trip } from '../../lib/inspire'
import { useTable } from '../../lib/table'
import { localISO } from '../../lib/time'
import { Empty, ErrorBar, chip } from '../money/shared'
import { PageHeader } from '../../components/ui'

type PDraft = { id?: string; name: string; category: string; status: 'want' | 'visited'; address: string; url: string; notes: string; rating: number; visited_on: string; trip_id: string }
type TDraft = { id?: string; name: string; start_date: string; end_date: string; notes: string }
const blankP = (trip = ''): PDraft => ({ name: '', category: 'Restaurante', status: 'want', address: '', url: '', notes: '', rating: 0, visited_on: '', trip_id: trip })
const blankT = (): TDraft => ({ name: '', start_date: '', end_date: '', notes: '' })

export default function Places() {
  const places = useTable<Place>('places', { col: 'created_at', asc: false })
  const trips = useTable<Trip>('trips', { col: 'created_at', asc: false })
  const [status, setStatus] = useState<'all' | 'want' | 'visited'>('all')
  const [cat, setCat] = useState('')
  const [trip, setTrip] = useState('')
  const [p, setP] = useState<PDraft | null>(null)
  const [t, setT] = useState<TDraft | null>(null)
  const [err, setErr] = useState('')
  const [confirm, setConfirm] = useState(false)
  const [sp, setSp] = useSearchParams()
  useEffect(() => { if (sp.get('nuevo')) { setP(blankP()); setSp({}, { replace: true }) } }, [sp, setSp])

  const cats = useMemo(() => [...new Set(places.rows.map((x) => x.category))].sort((a, b) => a.localeCompare(b, 'es')), [places.rows])
  const list = useMemo(() => places.rows.filter((x) => (status === 'all' || x.status === status) && (!cat || x.category === cat) && (!trip || x.trip_id === trip)), [places.rows, status, cat, trip])

  const saveP = async () => {
    if (!p) return
    if (!p.name.trim()) return setErr('Ponle un nombre al lugar.')
    if (p.url.trim() && !/^https?:\/\//i.test(p.url.trim())) return setErr('El enlace debe empezar con https://')
    const visited = p.status === 'visited'
    const v = { name: p.name.trim(), category: p.category.trim() || 'Otro', status: p.status, address: p.address.trim() || null, url: p.url.trim() || null, notes: p.notes.trim() || null, rating: visited && p.rating ? p.rating : null, visited_on: visited ? p.visited_on || localISO() : null, trip_id: p.trip_id || null }
    if (p.id) await places.update(p.id, v); else await places.add({ ...v })
    setP(null); setErr(''); setConfirm(false)
  }
  const saveT = async () => {
    if (!t) return
    if (!t.name.trim()) return setErr('Ponle un nombre al viaje o salida.')
    if (t.start_date && t.end_date && t.end_date < t.start_date) return setErr('La fecha final no puede ser antes de la inicial.')
    const v = { name: t.name.trim(), start_date: t.start_date || null, end_date: t.end_date || null, notes: t.notes.trim() || null }
    if (t.id) await trips.update(t.id, v); else await trips.add({ ...v })
    setT(null); setErr(''); setConfirm(false)
  }

  const markVisited = (x: Place) => places.update(x.id, { status: 'visited', visited_on: localISO() })

  return (
    <div>
      <PageHeader eyebrow="Salir y comprar" title="Lugares" action={<button className="btn btn-primary" onClick={() => { setErr(''); setP(blankP(trip)) }}><Plus size={18} aria-hidden /> Lugar</button>} />
      <ErrorBar msg={places.error || trips.error} onClose={places.clearError} />

      <section className="mt-6" aria-labelledby="viajes">
        <div className="flex items-center justify-between"><h2 id="viajes" className="font-display text-2xl">Viajes y salidas</h2><button className="min-h-11 text-sm underline" style={{ color: 'var(--ink-soft)' }} onClick={() => { setErr(''); setT(blankT()) }}>+ Nuevo</button></div>
        {trips.rows.length === 0 ? <p className="mt-2 text-sm" style={{ color: 'var(--ink-soft)' }}>Agrupa lugares por viaje o salida (un fin de semana, una gira, un cumpleaños).</p> : (
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Viaje">
            <button aria-pressed={!trip} onClick={() => setTrip('')} className="min-h-11 shrink-0 rounded-full border px-4 text-sm" style={chip(!trip)}>Todos</button>
            {trips.rows.map((x) => <span key={x.id} className="flex shrink-0 items-center"><button aria-pressed={trip === x.id} onClick={() => setTrip(trip === x.id ? '' : x.id)} className="min-h-11 rounded-l-full border px-4 text-sm" style={chip(trip === x.id)}>{x.name}{x.start_date && <span style={{ opacity: 0.7 }}> · {x.start_date.slice(5)}</span>}</button><button className="min-h-11 rounded-r-full border border-l-0 px-3 text-xs" style={{ borderColor: 'var(--line)', color: 'var(--ink-faint)' }} aria-label={`Editar ${x.name}`} onClick={() => { setErr(''); setT({ id: x.id, name: x.name, start_date: x.start_date ?? '', end_date: x.end_date ?? '', notes: x.notes ?? '' }) }}>✎</button></span>)}
          </div>
        )}
      </section>

      <div className="mt-5 flex flex-wrap gap-2" role="group" aria-label="Estado">
        {([['all', 'Todos'], ['want', 'Por visitar'], ['visited', 'Visitados']] as const).map(([v, l]) => <button key={v} aria-pressed={status === v} onClick={() => setStatus(v)} className="min-h-11 rounded-full border px-4 text-sm" style={chip(status === v)}>{l}</button>)}
      </div>
      {cats.length > 1 && <div className="mt-2 flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Categoría">{cats.map((c) => <button key={c} aria-pressed={cat === c} onClick={() => setCat(cat === c ? '' : c)} className="min-h-11 shrink-0 rounded-full border px-3 text-sm" style={chip(cat === c, 'var(--sky)')}>{c}</button>)}</div>}

      {places.loading ? <div className="grid h-40 place-items-center"><Loader2 className="animate-spin" aria-label="Cargando" /></div> : places.rows.length === 0 ? (
        <Empty title="Lugares que quieres conocer" text="Cafés, estudios de música, iglesias, restaurantes. Guárdalos con su dirección, abre el mapa con un toque y marca los que ya visitaste." action="Agregar el primero" onAction={() => setP(blankP())} />
      ) : (
        <ul className="mt-5 grid gap-2">
          {list.map((x) => (
            <li key={x.id} className="rounded-xl border" style={{ background: 'var(--surface)', borderColor: 'var(--line-soft)' }}>
              <div className="flex items-center gap-1">
                <button className="min-w-0 flex-1 px-4 py-3 text-left" onClick={() => { setErr(''); setConfirm(false); setP({ id: x.id, name: x.name, category: x.category, status: x.status, address: x.address ?? '', url: x.url ?? '', notes: x.notes ?? '', rating: x.rating ?? 0, visited_on: x.visited_on ?? '', trip_id: x.trip_id ?? '' }) }}>
                  <span className="block truncate font-semibold">{x.name}</span>
                  <span className="block truncate text-xs" style={{ color: 'var(--ink-faint)' }}>{x.category}{x.trip_id && trips.rows.find((y) => y.id === x.trip_id) ? ` · ${trips.rows.find((y) => y.id === x.trip_id)!.name}` : ''}{x.status === 'visited' && x.rating ? ` · ${'★'.repeat(x.rating)}` : ''}{x.address ? ` · ${x.address}` : ''}</span>
                </button>
                {(x.address || x.url) && <a className="grid size-11 shrink-0 place-items-center" href={x.address ? mapsSearchUrl(x.address) : x.url!} target="_blank" rel="noopener noreferrer" aria-label={x.address ? `Abrir ${x.name} en Mapas` : `Abrir enlace de ${x.name}`}>{x.address ? <MapPin size={18} aria-hidden style={{ color: 'var(--sky)' }} /> : <ExternalLink size={16} aria-hidden />}</a>}
                {x.status === 'want' && <button className="grid size-11 shrink-0 place-items-center" onClick={() => markVisited(x)} aria-label={`Marcar ${x.name} como visitado`}><Check size={18} aria-hidden style={{ color: 'var(--pos)' }} /></button>}
              </div>
            </li>
          ))}
          {list.length === 0 && <li className="text-sm" style={{ color: 'var(--ink-soft)' }}>Nada coincide.</li>}
        </ul>
      )}

      <Sheet open={Boolean(p)} title={p?.id ? 'Editar lugar' : 'Nuevo lugar'} onClose={() => setP(null)}>
        {p && (
          <form className="grid gap-4" onSubmit={(e) => { e.preventDefault(); void saveP() }}>
            <label className="grid gap-2 text-sm">Nombre<input className="field" value={p.name} onChange={(e) => setP({ ...p, name: e.target.value })} maxLength={200} autoFocus /></label>
            <label className="grid gap-2 text-sm">Categoría<input className="field" list="pcats" value={p.category} onChange={(e) => setP({ ...p, category: e.target.value })} maxLength={60} /><datalist id="pcats">{PLACE_CATEGORIES.map((c) => <option key={c} value={c} />)}</datalist></label>
            <label className="grid gap-2 text-sm">Dirección o zona<input className="field" value={p.address} onChange={(e) => setP({ ...p, address: e.target.value })} maxLength={300} placeholder="Calle y colonia, o enlace de Mapas" /></label>
            <label className="grid gap-2 text-sm">Enlace (opcional)<input className="field" inputMode="url" value={p.url} onChange={(e) => setP({ ...p, url: e.target.value })} maxLength={1000} placeholder="https://" /></label>
            {trips.rows.length > 0 && <label className="grid gap-2 text-sm">Viaje o salida<select className="field" value={p.trip_id} onChange={(e) => setP({ ...p, trip_id: e.target.value })}><option value="">Ninguno</option>{trips.rows.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></label>}
            <div className="flex gap-2" role="group" aria-label="Estado">{([['want', 'Por visitar'], ['visited', 'Ya fui']] as const).map(([v, l]) => <button key={v} type="button" aria-pressed={p.status === v} onClick={() => setP({ ...p, status: v })} className="min-h-11 rounded-full border px-4 text-sm" style={chip(p.status === v)}>{l}</button>)}</div>
            {p.status === 'visited' && (
              <div className="grid gap-3">
                <div className="flex items-center gap-1" role="group" aria-label="Calificación">{[1, 2, 3, 4, 5].map((n) => <button key={n} type="button" aria-label={`${n} estrellas`} aria-pressed={p.rating >= n} onClick={() => setP({ ...p, rating: p.rating === n ? 0 : n })} className="grid size-11 place-items-center"><Star size={22} aria-hidden fill={p.rating >= n ? 'var(--personal)' : 'none'} style={{ color: p.rating >= n ? 'var(--personal)' : 'var(--ink-faint)' }} /></button>)}</div>
                <label className="grid gap-2 text-sm">Cuándo fuiste<input type="date" className="field" value={p.visited_on || localISO()} max={localISO()} onChange={(e) => setP({ ...p, visited_on: e.target.value })} /></label>
              </div>
            )}
            <label className="grid gap-2 text-sm">Notas<textarea className="field py-3" rows={2} value={p.notes} onChange={(e) => setP({ ...p, notes: e.target.value })} maxLength={1000} /></label>
            {err && <p role="alert" className="text-sm" style={{ color: 'var(--neg)' }}>{err}</p>}
            <div className="flex items-center gap-3">
              <button className="btn btn-primary">Guardar</button>
              {p.id && <button type="button" className="btn btn-ghost ml-auto" style={{ color: confirm ? 'var(--neg)' : undefined }} onClick={async () => { if (confirm) { await places.remove(p.id!); setP(null); setConfirm(false) } else setConfirm(true) }}><Trash2 size={16} aria-hidden /> {confirm ? '¿Seguro?' : 'Eliminar'}</button>}
            </div>
          </form>
        )}
      </Sheet>

      <Sheet open={Boolean(t)} title={t?.id ? 'Editar viaje o salida' : 'Nuevo viaje o salida'} onClose={() => setT(null)}>
        {t && (
          <form className="grid gap-4" onSubmit={(e) => { e.preventDefault(); void saveT() }}>
            <label className="grid gap-2 text-sm">Nombre<input className="field" value={t.name} onChange={(e) => setT({ ...t, name: e.target.value })} maxLength={120} placeholder="Fin de semana en…" autoFocus /></label>
            <div className="grid grid-cols-2 gap-3">
              <label className="grid gap-2 text-sm">Desde<input type="date" className="field" value={t.start_date} onChange={(e) => setT({ ...t, start_date: e.target.value })} /></label>
              <label className="grid gap-2 text-sm">Hasta<input type="date" className="field" value={t.end_date} onChange={(e) => setT({ ...t, end_date: e.target.value })} /></label>
            </div>
            <label className="grid gap-2 text-sm">Notas<textarea className="field py-3" rows={2} value={t.notes} onChange={(e) => setT({ ...t, notes: e.target.value })} maxLength={1000} /></label>
            {err && <p role="alert" className="text-sm" style={{ color: 'var(--neg)' }}>{err}</p>}
            <div className="flex items-center gap-3">
              <button className="btn btn-primary">Guardar</button>
              {t.id && <button type="button" className="btn btn-ghost ml-auto" style={{ color: confirm ? 'var(--neg)' : undefined }} onClick={async () => { if (confirm) { await trips.remove(t.id!); setT(null); setTrip(''); setConfirm(false) } else setConfirm(true) }}><Trash2 size={16} aria-hidden /> {confirm ? '¿Seguro? Los lugares se quedan' : 'Eliminar'}</button>}
            </div>
          </form>
        )}
      </Sheet>
    </div>
  )
}
