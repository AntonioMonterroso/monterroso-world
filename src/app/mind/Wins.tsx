import { Gift, Plus, Sparkles, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import Sheet from '../../components/Sheet'
import { Group, PageHeader, Row, Stat } from '../../components/ui'
import { useProgress, type Reward } from '../../lib/progress'
import { dayNum, isoFromNum } from '../../lib/recur'
import { canClaim, pointsToGo, weekXp } from '../../lib/xp'
import { localISO } from '../../lib/time'
import { weekReview } from '../../lib/weekreview'
import { useTable } from '../../lib/table'
import type { Checkin } from '../../lib/rhythm'
import { Empty, ErrorBar, toNum } from '../money/shared'

const SUGGESTED = [{ name: 'Un helado', cost: 60 }, { name: 'Una tarde libre sin culpa', cost: 250 }, { name: 'Un capítulo de mi serie', cost: 40 }, { name: 'Algo pequeño para mi instrumento', cost: 600 }]

/** Logros: puntos suaves por lo que haces y premios que tú decides. Nunca se pierden puntos por un mal día. */
export default function Wins() {
  const p = useProgress()
  const today = localISO()
  const [d, setD] = useState<{ id?: string; name: string; cost: string } | null>(null)
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')
  const [confirm, setConfirm] = useState(false)
  const week = useMemo(() => Array.from({ length: 7 }, (_, i) => isoFromNum(dayNum(today) - 6 + i)), [today])
  const t = p.byDay.get(today)
  const cks = useTable<Checkin>('day_checkins', { col: 'day', asc: false })
  const review = useMemo(() => weekReview(p.byDay, week, Array.from({ length: 7 }, (_, i) => isoFromNum(dayNum(today) - 13 + i)), Object.fromEntries(cks.rows.map((c) => [c.day, c.energy]))), [p.byDay, week, today, cks.rows])
  const max = Math.max(1, ...week.map((x) => p.byDay.get(x)?.total ?? 0))

  const save = async () => {
    if (!d) return
    const cost = Math.round(toNum(d.cost))
    if (!d.name.trim()) return setErr('¿Cuál es el premio?')
    if (!(cost >= 1)) return setErr('Ponle un costo en puntos (1 o más).')
    if (d.id) await p.rewards.update(d.id, { name: d.name.trim(), cost }); else await p.rewards.add({ name: d.name.trim(), cost, active: true })
    setD(null); setErr(''); setConfirm(false)
  }
  const claim = async (r: Reward) => {
    if (!canClaim(p.bal, r.cost)) return
    await p.claims.add({ reward_id: r.id, name: r.name, cost: r.cost, day: today })
    setMsg(`¡A disfrutarlo! “${r.name}” canjeado por ${r.cost} puntos.`); setTimeout(() => setMsg(''), 5000)
  }

  return (
    <div>
      <PageHeader eyebrow="Mente y cuerpo" title="Logros" sub="Sumas puntos por lo que ya haces. Nunca restan por un mal día; solo canjeas premios que tú elegiste." action={<button className="btn btn-primary" onClick={() => { setErr(''); setConfirm(false); setD({ name: '', cost: '100' }) }}><Plus size={18} aria-hidden /> Premio</button>} />
      <ErrorBar msg={p.rewards.error || p.claims.error} onClose={p.rewards.clearError} />
      {msg && <p role="status" className="mb-3 text-sm" style={{ color: 'var(--pos)' }}>{msg}</p>}

      {p.loading ? null : (
        <>
          <div className="goal" data-evening="false" data-done="false">
            <div className="goal-ring" aria-hidden>
              <svg viewBox="0 0 72 72" width="72" height="72"><circle cx="36" cy="36" r="30" fill="none" stroke="var(--surface-3)" strokeWidth="7" /><circle cx="36" cy="36" r="30" fill="none" stroke="var(--accent)" strokeWidth="7" strokeLinecap="round" strokeDasharray={2 * Math.PI * 30} strokeDashoffset={2 * Math.PI * 30 * (1 - p.level.pct / 100)} transform="rotate(-90 36 36)" style={{ transition: 'stroke-dashoffset 700ms var(--ease-out)' }} /></svg>
              <span>{p.level.level}</span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="eyebrow flex items-center gap-1.5"><Sparkles size={14} aria-hidden /> Nivel {p.level.level}</p>
              <p className="mt-0.5 text-lg font-semibold tracking-tight">{p.earned} puntos en total</p>
              <p className="text-sm" style={{ color: 'var(--ink-soft)' }}>Te faltan {p.level.need - p.level.into} para el nivel {p.level.level + 1}.</p>
              <p className="mt-1 text-sm" style={{ color: 'var(--accent)' }}>Puedes canjear: <strong>{p.bal}</strong> puntos</p>
            </div>
          </div>

          <div className="stats mt-4">
            <Stat label="Hoy" value={`+${t?.total ?? 0}`} tone={t?.total ? 'pos' : undefined} />
            <Stat label="Esta semana" value={`+${weekXp(p.byDay, week)}`} />
          </div>
          <div className="mt-3 flex items-end justify-between gap-1.5 rounded-[var(--r-card)] p-4" style={{ background: 'var(--surface)', boxShadow: 'inset 0 0 0 1px var(--sep)' }} role="img" aria-label={`Puntos de los últimos 7 días: ${week.map((x) => p.byDay.get(x)?.total ?? 0).join(', ')}`}>
            {week.map((x) => { const v = p.byDay.get(x)?.total ?? 0; return <div key={x} className="grid flex-1 justify-items-center gap-1.5"><div className="w-full rounded-md" style={{ height: Math.max(4, (v / max) * 56), background: x === today ? 'var(--accent)' : 'var(--surface-3)', transition: 'height 500ms var(--ease-out)' }} /><span className="text-[11px]" style={{ color: 'var(--ink-faint)' }}>{new Date(x + 'T12:00:00').toLocaleDateString('es', { weekday: 'narrow' }).toUpperCase()}</span></div> })}
          </div>

          <Group title="Tu semana" footer="Sin culpa: aquí solo se cuenta lo que sí pasó.">
            <li className="row"><p className="row-hit text-sm" style={{ color: 'var(--ink-soft)' }}>{review.message}</p></li>
            <Row tone="var(--accent)" title={`${review.points} puntos`} sub={review.prevPoints > 0 ? `Semana anterior: ${review.prevPoints}` : 'Sin datos de la semana anterior'} value={`${review.activeDays}/7 días`} valueTone="soft" chevron={false} />
            {review.focusMin > 0 && <Row tone="var(--sky)" title="Enfoque" sub="Minutos con la cabeza en una sola cosa" value={review.focusMin >= 60 ? `${Math.floor(review.focusMin / 60)} h ${review.focusMin % 60} min` : `${review.focusMin} min`} valueTone="soft" chevron={false} />}
            {review.best && <Row tone="var(--pos)" title="Tu mejor día" sub={new Date(review.best.day + 'T12:00').toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long' })} value={`+${review.best.total}`} valueTone="pos" chevron={false} />}
            {review.top.map((x) => <Row key={x.label} tone="var(--ink-faint)" title={x.label} sub="Lo que más repetiste" value={`${x.n}`} valueTone="soft" chevron={false} />)}
            {review.avgEnergy != null && <Row tone="var(--clay)" title="Energía promedio" sub="De 1 a 5, según tus registros" value={`${review.avgEnergy}`} valueTone="soft" chevron={false} />}
          </Group>
          {t && t.parts.length > 0 && <Group title="Lo que sumaste hoy">{t.parts.map((x) => <Row key={x.label} tone="var(--pos)" title={x.label} sub={x.label === 'Minutos de enfoque' ? `${x.n} min` : `${x.n} ${x.n === 1 ? 'vez' : 'veces'}`} value={`+${x.pts}`} valueTone="pos" chevron={false} />)}</Group>}

          <Group title="Tus premios" footer="Los premios los defines tú: pequeños y reales. Canjear gasta puntos, pero tu nivel nunca baja.">
            {p.rewards.rows.filter((r) => r.active).length === 0 ? <li className="row"><p className="row-hit text-sm" style={{ color: 'var(--ink-faint)' }}>Aún no has puesto ninguno.</p></li> : p.rewards.rows.filter((r) => r.active).map((r) => {
              const ok = canClaim(p.bal, r.cost)
              return <Row key={r.id} icon={<Gift size={16} aria-hidden />} tone={ok ? 'var(--accent)' : 'var(--ink-faint)'} title={r.name} chevron={false}
                sub={ok ? `${r.cost} puntos · ¡ya te alcanza!` : `${r.cost} puntos · te faltan ${pointsToGo(p.bal, r.cost)}`}
                onClick={() => { setErr(''); setConfirm(false); setD({ id: r.id, name: r.name, cost: String(r.cost) }) }}
                trailing={<button className="btn btn-tint !min-h-10" disabled={!ok} onClick={() => void claim(r)}>Canjear</button>} />
            })}
          </Group>
          {p.rewards.rows.length === 0 && <><Empty title="Elige tus premios" text="Algo que sí te motive y puedas darte sin culpa." /><Group title="Ideas">{SUGGESTED.map((s) => <Row key={s.name} icon={<Gift size={16} aria-hidden />} tone="var(--accent)" title={s.name} sub={`${s.cost} puntos`} onClick={() => { setErr(''); setD({ name: s.name, cost: String(s.cost) }) }} />)}</Group></>}

          {p.claims.rows.length > 0 && <Group title="Canjeados">{p.claims.rows.slice(0, 5).map((c) => <Row key={c.id} title={c.name} muted sub={c.day} value={`−${c.cost}`} valueTone="soft" chevron={false} />)}</Group>}
        </>
      )}

      <Sheet open={Boolean(d)} title={d?.id ? 'Editar premio' : 'Nuevo premio'} onClose={() => setD(null)}>
        {d && (
          <form className="grid gap-4" onSubmit={(e) => { e.preventDefault(); void save() }}>
            <label className="grid gap-2 text-sm">Premio<input autoFocus className="field" value={d.name} maxLength={120} onChange={(e) => setD({ ...d, name: e.target.value })} placeholder="Una tarde libre sin culpa" /></label>
            <label className="grid gap-2 text-sm">Cuesta (puntos)<input className="field" inputMode="numeric" value={d.cost} onChange={(e) => setD({ ...d, cost: e.target.value.replace(/\D/g, '') })} /></label>
            <p className="text-xs" style={{ color: 'var(--ink-faint)' }}>Referencia: un día normal suma entre 30 y 80 puntos. 100 puntos son un par de días buenos.</p>
            {err && <p role="alert" className="text-sm" style={{ color: 'var(--neg)' }}>{err}</p>}
            <div className="flex items-center gap-3">
              <button className="btn btn-primary">Guardar</button>
              {d.id && <button type="button" className="btn btn-ghost ml-auto" style={{ color: confirm ? 'var(--neg)' : undefined }} onClick={async () => { if (confirm) { await p.rewards.remove(d.id!); setD(null); setConfirm(false) } else setConfirm(true) }}><Trash2 size={16} aria-hidden /> {confirm ? '¿Seguro?' : 'Quitar'}</button>}
            </div>
          </form>
        )}
      </Sheet>
    </div>
  )
}
