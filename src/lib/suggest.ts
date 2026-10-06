/** Qué conviene hacer ahora. Reglas simples y explicables: cada sugerencia dice por qué aparece. */
export type Tone = 'urgent' | 'now' | 'soon' | 'calm'
export type Suggestion = { id: string; title: string; reason: string; to: string; tone: Tone; score: number }

export type SuggestInput = {
  nowMin: number
  current?: { title: string; endMin: number } | null
  next?: { title: string; startMin: number } | null
  priorities: { open: number; total: number }
  overdue: { id: string; title: string; minsLate: number }[]
  followUps: { id: string; title: string; recipient?: string | null }[]
  toSend: { id: string; title: string; recipient?: string | null }[]
  habitsPending: { id: string; name: string }[]
  routine?: { id: string; name: string; started: boolean } | null
  inbox: number
  /** Día suave: se muestran menos cosas y solo lo que de verdad pesa. */
  lowEnergy?: boolean
  /** Lista de salida que corresponde a lo que viene (ensayo, iglesia…), con los minutos que faltan. */
  exitList?: { id: string; name: string; mins: number } | null
  /** Promesas a otras personas que vencen hoy o ya vencieron. */
  promises?: { id: string; text: string; person?: string | null; overdue: boolean }[]
  /** Cosas prestadas que ya toca pedir de vuelta. */
  chase?: { id: string; name: string; person?: string | null }[]
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`
const late = (m: number) => (m < 60 ? `${m} min` : `${Math.floor(m / 60)} h`)

export function suggest(i: SuggestInput, limit = 3): Suggestion[] {
  const out: Suggestion[] = []
  const push = (s: Suggestion) => out.push(s)
  const soft = Boolean(i.lowEnergy)
  if (soft) push({ id: 'soft-day', title: 'Hoy basta con una cosa pequeña', reason: 'Tu energía está baja: elige lo más fácil y listo', to: '/app/mente/enfoque', tone: 'calm', score: 95 })

  for (const o of i.overdue.slice(0, 3)) {
    push({ id: `ov-${o.id}`, title: o.title, reason: `Pasó hace ${late(o.minsLate)} y sigue sin confirmar`, to: `/app/planear/agenda?e=${o.id}`, tone: 'urgent', score: 90 - Math.min(o.minsLate, 600) / 20 })
  }

  if (i.next && !i.current) {
    const mins = i.next.startMin - i.nowMin
    if (mins <= 20) push({ id: 'next-block', title: `Prepárate: ${i.next.title}`, reason: mins <= 0 ? 'Empieza ahora' : `Empieza en ${mins} min`, to: '/app/planear', tone: 'now', score: 85 - mins / 2 })
  }
  if (i.current && i.current.endMin - i.nowMin <= 10) {
    push({ id: 'closing', title: `Cierra: ${i.current.title}`, reason: `Termina en ${Math.max(0, i.current.endMin - i.nowMin)} min. Anota dónde quedaste`, to: '/app/mente/enfoque', tone: 'soon', score: 62 })
  }

  if (i.routine && i.routine.started === false) push({ id: `rt-${i.routine.id}`, title: i.routine.name, reason: 'Es su hora y aún no la empiezas', to: `/app/mente/rutinas/${i.routine.id}/hacer`, tone: 'now', score: 80 })
  else if (i.routine?.started) push({ id: `rt-${i.routine.id}`, title: `Termina ${i.routine.name}`, reason: 'La dejaste a medias', to: `/app/mente/rutinas/${i.routine.id}/hacer`, tone: 'soon', score: 66 })

  if (i.priorities.total < 3 && i.nowMin < 14 * 60) {
    push({ id: 'pick-priorities', title: 'Elige tus prioridades de hoy', reason: i.priorities.total === 0 ? 'Aún no tienes ninguna' : `Tienes ${i.priorities.total} de 3`, to: '/app', tone: 'now', score: 74 })
  } else if (i.priorities.open > 0) {
    push({ id: 'do-priorities', title: `Avanza una prioridad`, reason: `Te ${i.priorities.open === 1 ? 'falta' : 'faltan'} ${plural(i.priorities.open, 'prioridad', 'prioridades')} hoy`, to: '/app', tone: i.nowMin >= 17 * 60 ? 'now' : 'soon', score: i.nowMin >= 17 * 60 ? 68 : 58 })
  }

  if (i.exitList && i.exitList.mins <= 45 && i.exitList.mins >= -5) push({ id: `exit-${i.exitList.id}`, title: `Revisa tu lista: ${i.exitList.name}`, reason: i.exitList.mins <= 0 ? 'Ya toca salir: ¿llevas todo?' : `Sales en ${i.exitList.mins} min. ¿Llevas todo?`, to: `/app/mente/salida?lista=${i.exitList.id}`, tone: 'now', score: 78 })

  for (const p of (i.promises ?? []).slice(0, 2)) push({ id: `pr-${p.id}`, title: p.text, reason: `${p.person ? `Se lo prometiste a ${p.person}` : 'Es una promesa'} · ${p.overdue ? 'ya venció' : 'es para hoy'}`, to: '/app/mente/cosas', tone: p.overdue ? 'urgent' : 'now', score: p.overdue ? 84 : 76 })
  if ((i.chase ?? []).length > 0) push({ id: 'chase', title: i.chase!.length === 1 ? `Pide de vuelta: ${i.chase![0].name}` : `Tienes ${i.chase!.length} cosas prestadas por pedir`, reason: i.chase![0].person ? `Con ${i.chase![0].person}` : 'Llevan tiempo fuera', to: '/app/mente/cosas', tone: 'soon', score: 54 })

  for (const f of i.followUps.slice(0, 2)) push({ id: `fu-${f.id}`, title: `Dar seguimiento: ${f.title}`, reason: f.recipient ? `${f.recipient} no ha respondido` : 'Sin respuesta', to: '/app/envios', tone: 'now', score: 72 })
  if (i.toSend.length > 0) push({ id: 'to-send', title: i.toSend.length === 1 ? `Enviar: ${i.toSend[0].title}` : `Tienes ${i.toSend.length} cosas por enviar`, reason: i.toSend[0].recipient ? `Para ${i.toSend[0].recipient}` : 'Mandarlo hoy lo quita de tu cabeza', to: '/app/envios', tone: 'soon', score: 55 })

  if (i.inbox > 0 && !soft) push({ id: 'inbox', title: `Ordena tus capturas`, reason: `${plural(i.inbox, 'idea', 'ideas')} sin decidir dónde van`, to: '/app', tone: 'calm', score: 40 })

  if (i.habitsPending.length > 0 && !soft) {
    const evening = i.nowMin >= 19 * 60
    push({ id: 'habit', title: i.habitsPending.length === 1 ? i.habitsPending[0].name : `${i.habitsPending.length} hábitos de hoy`, reason: evening ? 'Aún estás a tiempo de hoy' : 'Un hábito pequeño ahora suma', to: '/app/mente', tone: evening ? 'soon' : 'calm', score: evening ? 52 : 38 })
  }

  if (out.length === 0) push({ id: 'free', title: 'Todo al día', reason: i.next ? `Sigue ${i.next.title} a las ${String(Math.floor(i.next.startMin / 60)).padStart(2, '0')}:${String(i.next.startMin % 60).padStart(2, '0')}` : 'Buen momento para descansar o avanzar algo tuyo', to: '/app/mente/enfoque', tone: 'calm', score: 1 })

  return out.sort((a, b) => b.score - a.score).slice(0, soft ? Math.min(limit, 2) : limit)
}
