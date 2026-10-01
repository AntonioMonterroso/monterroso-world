import { useEffect, useRef, useState } from 'react'

export type PlayerHandle = { time: () => number; seek: (sec: number) => void }

type YTPlayer = { getCurrentTime: () => number; seekTo: (s: number, allow: boolean) => void; playVideo: () => void; destroy: () => void }
type YTApi = { Player: new (el: HTMLElement, opts: Record<string, unknown>) => YTPlayer }
declare global { interface Window { YT?: YTApi; onYouTubeIframeAPIReady?: () => void } }

let apiPromise: Promise<YTApi> | null = null
function loadApi(): Promise<YTApi> {
  if (window.YT?.Player) return Promise.resolve(window.YT)
  apiPromise ??= new Promise<YTApi>((resolve, reject) => {
    const prev = window.onYouTubeIframeAPIReady
    window.onYouTubeIframeAPIReady = () => { prev?.(); if (window.YT) resolve(window.YT) }
    const s = document.createElement('script')
    s.src = 'https://www.youtube.com/iframe_api'
    s.onerror = () => { apiPromise = null; reject(new Error('api')) }
    document.head.appendChild(s)
    setTimeout(() => { if (!window.YT?.Player) { apiPromise = null; reject(new Error('timeout')) } }, 8000)
  })
  return apiPromise
}

/** Reproductor de YouTube (sin cookies) que permite leer el minuto actual para tomar notas. */
export default function YouTubePlayer({ videoId, start, handle }: { videoId: string; start: number; handle: React.MutableRefObject<PlayerHandle | null> }) {
  const host = useRef<HTMLDivElement>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let player: YTPlayer | null = null
    let alive = true
    setFailed(false)
    loadApi().then((YT) => {
      if (!alive || !host.current) return
      const mount = document.createElement('div')
      host.current.replaceChildren(mount)
      player = new YT.Player(mount, { videoId, host: 'https://www.youtube-nocookie.com', width: '100%', height: '100%', playerVars: { rel: 0, modestbranding: 1, playsinline: 1, start } })
      handle.current = { time: () => player?.getCurrentTime() ?? 0, seek: (s) => { player?.seekTo(s, true); player?.playVideo() } }
    }).catch(() => { if (alive) setFailed(true) })
    return () => { alive = false; handle.current = null; try { player?.destroy() } catch { /* ya destruido */ } }
  }, [videoId, start, handle])

  if (failed) {
    return <iframe title="Video" className="size-full" src={`https://www.youtube-nocookie.com/embed/${videoId}?rel=0&modestbranding=1&playsinline=1${start ? `&start=${start}` : ''}`} allow="fullscreen; encrypted-media; picture-in-picture" allowFullScreen referrerPolicy="no-referrer" />
  }
  return <div ref={host} className="size-full" />
}
