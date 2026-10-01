import { useEffect, useRef, useState } from 'react'

/** Campo que guarda al salir de él, para no escribir en la base en cada tecla. */
export default function Field({ value, onCommit, multiline, ...rest }: { value: string; onCommit: (v: string) => void; multiline?: boolean } & Record<string, unknown>) {
  const [v, setV] = useState(value)
  const latest = useRef(value)
  useEffect(() => { setV(value); latest.current = value }, [value])
  const common = {
    value: v,
    onChange: (e: { target: { value: string } }) => { latest.current = e.target.value; setV(e.target.value) },
    onBlur: () => { if (latest.current !== value) onCommit(latest.current) },
    className: 'field',
    ...rest,
  }
  return multiline ? <textarea {...(common as object)} className="field py-3" /> : <input {...(common as object)} />
}
