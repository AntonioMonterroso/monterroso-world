/** Genera una imagen cuadrada con un versículo o frase, y la comparte (o la descarga). */
export async function shareQuote(text: string, reference?: string | null) {
  const S = 1080
  const c = document.createElement('canvas')
  c.width = c.height = S
  const g = c.getContext('2d')!
  const bg = g.createLinearGradient(0, 0, S, S)
  bg.addColorStop(0, '#17315c'); bg.addColorStop(1, '#0b1730')
  g.fillStyle = bg; g.fillRect(0, 0, S, S)
  g.strokeStyle = 'rgba(217,199,160,.35)'; g.lineWidth = 3; g.strokeRect(48, 48, S - 96, S - 96)

  g.fillStyle = '#f1ebdd'
  g.textAlign = 'center'
  let size = 72
  const maxW = S - 220
  const wrap = (): string[] => {
    g.font = `500 ${size}px Fraunces, Georgia, serif`
    const lines: string[] = []
    let line = ''
    for (const w of text.split(/\s+/)) {
      const t = line ? `${line} ${w}` : w
      if (g.measureText(t).width > maxW && line) { lines.push(line); line = w } else line = t
    }
    if (line) lines.push(line)
    return lines
  }
  let lines = wrap()
  while (lines.length * size * 1.3 > S - 440 && size > 34) { size -= 4; lines = wrap() }
  const h = lines.length * size * 1.3
  let y = (S - h) / 2 + size * 0.9
  for (const l of lines) { g.fillText(l, S / 2, y); y += size * 1.3 }

  if (reference) {
    g.fillStyle = '#d9c7a0'
    g.font = '600 44px "Instrument Sans", sans-serif'
    g.fillText(reference, S / 2, y + 40)
  }
  g.fillStyle = 'rgba(241,235,221,.55)'
  g.font = '400 30px "Instrument Sans", sans-serif'
  g.fillText('Monterroso World', S / 2, S - 90)

  const blob: Blob | null = await new Promise((r) => c.toBlob(r, 'image/png'))
  if (!blob) return
  const file = new File([blob], 'frase.png', { type: 'image/png' })
  if (navigator.canShare?.({ files: [file] })) {
    try { await navigator.share({ files: [file] }); return } catch { /* cancelado */ }
  }
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = 'frase.png'
  a.click()
  URL.revokeObjectURL(a.href)
}
