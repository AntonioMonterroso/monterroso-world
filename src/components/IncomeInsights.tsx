import { Pencil } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Group, Row } from './ui'
import { clientName } from '../lib/clients'
import { money, type Payment, type Project } from '../lib/projects'
import { getSettings, patchSettings } from '../lib/settings'

/** Ingresos del mes por cliente (para ver si dependes de uno solo) y tu meta de ingreso mensual. */
export function byClient(projects: Project[], payments: Payment[], month: string): { name: string; total: number; pct: number }[] {
  const name = new Map(projects.map((p) => [p.id, clientName(p)]))
  const sums = new Map<string, number>()
  for (const x of payments) if (x.paid_at?.startsWith(month) && name.has(x.project_id)) sums.set(name.get(x.project_id)!, (sums.get(name.get(x.project_id)!) ?? 0) + Number(x.amount))
  const total = [...sums.values()].reduce((a, b) => a + b, 0)
  return [...sums.entries()].map(([n, t]) => ({ name: n, total: Math.round(t * 100) / 100, pct: total > 0 ? Math.round((t / total) * 100) : 0 })).sort((a, b) => b.total - a.total)
}

export default function IncomeInsights({ projects, payments, month, income }: { projects: Project[]; payments: Payment[]; month: string; income: number }) {
  const rows = useMemo(() => byClient(projects, payments, month), [projects, payments, month])
  const [goal, setGoal] = useState<number | null>(null)
  const [edit, setEdit] = useState<string | null>(null)
  useEffect(() => { void getSettings().then((s) => { const g = (s as { incomeGoal?: unknown }).incomeGoal; setGoal(typeof g === 'number' && g > 0 ? g : null) }) }, [])
  const saveGoal = () => { const n = Number((edit ?? '').replace(',', '.')); const v = n > 0 ? Math.round(n * 100) / 100 : null; setGoal(v); setEdit(null); void patchSettings({ incomeGoal: v } as never) }
  const pct = goal ? Math.min(100, Math.round((income / goal) * 100)) : 0
  const top = rows[0]

  return (
    <>
      <Group title="Meta de ingreso del mes" footer={goal ? (income >= goal ? '¡Llegaste a tu meta!' : `Te faltan ${money(goal - income)}.`) : 'Ponte una meta y ves cuánto te falta cada mes.'}>
        {edit !== null ? (
          <li className="row"><form className="row-hit" onSubmit={(e) => { e.preventDefault(); saveGoal() }}>
            <input className="row-input" inputMode="decimal" autoFocus value={edit} onChange={(e) => setEdit(e.target.value)} placeholder="Ej. 6000" aria-label="Meta de ingreso mensual" />
            <button className="btn btn-sec btn-chico">Guardar</button></form></li>
        ) : (
          <Row tone="var(--pos)" title={goal ? `${money(income)} de ${money(goal)}` : 'Poner mi meta'} sub={goal ? `${pct}% de tu meta` : undefined} chevron={false} onClick={() => setEdit(goal ? String(goal) : '')}
            trailing={goal ? <button className="grid size-11 place-items-center" aria-label="Cambiar la meta" onClick={() => setEdit(String(goal))}><Pencil size={15} aria-hidden /></button> : undefined}>
            {goal ? <div className="meter mx-4 mb-3 -mt-1" style={{ ['--meter' as string]: 'var(--pos)' }}><i style={{ width: `${pct}%` }} /></div> : null}
          </Row>
        )}
      </Group>
      {rows.length > 0 && (
        <Group title="Cobros por cliente" footer={top && top.pct >= 60 && rows.length > 1 ? `${top.name} es el ${top.pct}% de lo que cobraste: si un mes falla, se nota mucho.` : top && rows.length === 1 ? 'Este mes todo vino de un solo cliente.' : undefined}>
          {rows.map((r) => (
            <Row key={r.name} tone="var(--web)" title={r.name} value={money(r.total)} sub={`${r.pct}% del mes`} chevron={false}>
              <div className="meter mx-4 mb-3 -mt-1" style={{ ['--meter' as string]: 'var(--web)' }}><i style={{ width: `${r.pct}%` }} /></div>
            </Row>
          ))}
        </Group>
      )}
    </>
  )
}
