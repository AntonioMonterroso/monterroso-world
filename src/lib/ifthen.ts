export type TriggerKind = 'time' | 'block_start' | 'block_end' | 'open_morning' | 'open_night'
export type Rule = { id: string; trigger_kind: TriggerKind; time_min: number | null; block_kind: string | null; action: string; event_id: string | null; active: boolean; last_done: string | null }
export type BlockLite = { kind: string; title: string; start_min: number; end_min: number }

export const TRIGGERS: { id: TriggerKind; label: string }[] = [
  { id: 'open_morning', label: 'Al empezar la mañana' },
  { id: 'time', label: 'A cierta hora' },
  { id: 'block_start', label: 'Cuando empiece un bloque' },
  { id: 'block_end', label: 'Cuando termine un bloque' },
  { id: 'open_night', label: 'Al terminar el día' },
]
export const BLOCK_KINDS: Record<string, string> = { work: 'de trabajo', code: 'de código', rehearsal: 'de ensayo', church: 'de iglesia', study: 'de estudio', exercise: 'de ejercicio', rest: 'de descanso', meeting: 'de reunión', other: 'cualquiera' }
const WINDOW = 90   // minutos que una regla de hora sigue visible
const AFTER = 30    // minutos tras empezar o terminar un bloque

const fmt = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`

/** «Si … entonces …» en una sola frase. */
export function describe(r: Pick<Rule, 'trigger_kind' | 'time_min' | 'block_kind'>): string {
  switch (r.trigger_kind) {
    case 'time': return `Si son las ${fmt(r.time_min ?? 0)}`
    case 'block_start': return `Si empieza un bloque ${BLOCK_KINDS[r.block_kind ?? 'other'] ?? ''}`.trim()
    case 'block_end': return `Si termina un bloque ${BLOCK_KINDS[r.block_kind ?? 'other'] ?? ''}`.trim()
    case 'open_morning': return 'Si es la mañana y abro la app'
    case 'open_night': return 'Si ya terminó mi día'
  }
}

const matches = (r: Rule, b: BlockLite) => r.block_kind === 'other' || r.block_kind === b.kind

/** Reglas que tocan ahora y todavía no hiciste hoy. */
export function dueRules(rules: Rule[], ctx: { nowMin: number; hour: number; today: string; blocks: BlockLite[] }): { rule: Rule; why: string }[] {
  const out: { rule: Rule; why: string }[] = []
  for (const r of rules) {
    if (!r.active || r.last_done === ctx.today) continue
    if (r.trigger_kind === 'time' && r.time_min != null && ctx.nowMin >= r.time_min && ctx.nowMin < r.time_min + WINDOW) out.push({ rule: r, why: `Son las ${fmt(r.time_min)}` })
    else if (r.trigger_kind === 'open_morning' && ctx.hour >= 5 && ctx.hour < 12) out.push({ rule: r, why: 'Es la mañana' })
    else if (r.trigger_kind === 'open_night' && ctx.hour >= 20) out.push({ rule: r, why: 'Ya cerraste el día' })
    else if (r.trigger_kind === 'block_start') { const b = ctx.blocks.find((x) => matches(r, x) && ctx.nowMin >= x.start_min && ctx.nowMin < x.start_min + AFTER); if (b) out.push({ rule: r, why: `Empezó “${b.title}”` }) }
    else if (r.trigger_kind === 'block_end') { const b = ctx.blocks.find((x) => matches(r, x) && ctx.nowMin >= x.end_min && ctx.nowMin < x.end_min + AFTER); if (b) out.push({ rule: r, why: `Terminó “${b.title}”` }) }
  }
  return out
}

export const EXAMPLES: { trigger_kind: TriggerKind; time_min?: number; block_kind?: string; action: string }[] = [
  { trigger_kind: 'open_morning', action: 'Tomar agua y elegir mis 3 prioridades' },
  { trigger_kind: 'block_end', block_kind: 'work', action: 'Levantarme y estirar 2 minutos' },
  { trigger_kind: 'block_start', block_kind: 'rehearsal', action: 'Afinar y calentar manos' },
  { trigger_kind: 'open_night', action: 'Dejar listo el instrumento y la ropa de mañana' },
]
