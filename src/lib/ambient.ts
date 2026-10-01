// Sonido ambiente generado en el dispositivo (sin archivos): ruido marrón y lluvia.
export type AmbientKind = 'off' | 'brown' | 'rain'

let ctx: AudioContext | null = null
let nodes: AudioNode[] = []
let gain: GainNode | null = null

function noiseBuffer(c: AudioContext, brown: boolean) {
  const len = c.sampleRate * 4
  const buf = c.createBuffer(1, len, c.sampleRate)
  const d = buf.getChannelData(0)
  let last = 0
  for (let i = 0; i < len; i++) {
    const w = Math.random() * 2 - 1
    if (brown) { last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5 } else d[i] = w
  }
  return buf
}

export function stopAmbient() {
  nodes.forEach((n) => { try { (n as AudioScheduledSourceNode).stop?.() } catch { /* ya detenido */ } n.disconnect() })
  nodes = []
  gain = null
  ctx?.close().catch(() => {})
  ctx = null
}

export function startAmbient(kind: AmbientKind, volume = 0.5) {
  stopAmbient()
  if (kind === 'off') return
  const c = new AudioContext()
  ctx = c
  const src = c.createBufferSource()
  src.buffer = noiseBuffer(c, kind === 'brown')
  src.loop = true
  const g = c.createGain()
  g.gain.value = volume * (kind === 'brown' ? 0.6 : 0.35)
  gain = g
  nodes = [src, g]
  if (kind === 'rain') {
    const hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 900
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 7000
    src.connect(hp).connect(lp).connect(g)
    nodes.push(hp, lp)
  } else src.connect(g)
  g.connect(c.destination)
  src.start()
}

export function setAmbientVolume(v: number, kind: AmbientKind) {
  if (gain) gain.gain.value = v * (kind === 'brown' ? 0.6 : 0.35)
}

/** Campanita suave al terminar. */
export function chime() {
  try {
    const c = new AudioContext()
    ;[880, 1320].forEach((f, i) => {
      const o = c.createOscillator(), g = c.createGain()
      o.frequency.value = f
      const t = c.currentTime + i * 0.18
      g.gain.setValueAtTime(0.0001, t)
      g.gain.exponentialRampToValueAtTime(0.3, t + 0.02)
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.9)
      o.connect(g).connect(c.destination)
      o.start(t); o.stop(t + 1)
    })
    setTimeout(() => c.close().catch(() => {}), 1800)
  } catch { /* sin audio */ }
}
