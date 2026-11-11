/** Categorías que parecen la misma: «Comida» y «comidas», «Super» y «Súper», «Gasolina» y «Gasolina carro». */
const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim()
const stem = (s: string) => s.split(' ').map((w) => w.replace(/(es|s)$/, '')).join(' ')

function lev(a: string, b: string): number {
  const d = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    let prev = d[0]; d[0] = i
    for (let j = 1; j <= b.length; j++) { const t = d[j]; d[j] = Math.min(d[j] + 1, d[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1)); prev = t }
  }
  return d[b.length]
}

export function looksSame(a: string, b: string): boolean {
  const x = stem(norm(a)), y = stem(norm(b))
  if (!x || !y || x === y) return Boolean(x) && x === y
  const [s, l] = x.length <= y.length ? [x, y] : [y, x]
  if (s.length >= 4 && (l.startsWith(`${s} `) || l.endsWith(` ${s}`))) return true
  return Math.min(x.length, y.length) >= 5 && lev(x, y) <= 1
}

/** Pares parecidos; el primero de cada par es el que más se usa (al que conviene juntar el otro). */
export function similarPairs(names: string[], uses: (n: string) => number): [string, string][] {
  const out: [string, string][] = []
  for (let i = 0; i < names.length; i++) for (let j = i + 1; j < names.length; j++) {
    if (!looksSame(names[i], names[j])) continue
    out.push(uses(names[i]) >= uses(names[j]) ? [names[i], names[j]] : [names[j], names[i]])
  }
  return out
}
