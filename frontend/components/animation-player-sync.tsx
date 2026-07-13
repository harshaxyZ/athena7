"use client"

import { useEffect, useRef, useState } from "react"
import {
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  Pause,
  Play,
  RotateCcw,
  Volume2,
  VolumeX,
} from "lucide-react"
import type { AnimationData, Beat } from "@/lib/athena-api"

// Extend Window for sandboxed iframe bridge
declare global {
  interface Window {
    setAnimationTime?: (t: number) => void
  }
}

type AnimationPlayerSyncProps = {
  code: string
  topic: string
  caption: string
  duration?: number
  beats?: Beat[]
  part?: number
  total_parts?: number
  onPartEnd?: () => void
  autoPlay?: boolean
}

export function AnimationPlayerSync({
  code,
  topic,
  caption,
  duration = 14,
  beats = [],
  part = 1,
  total_parts = 1,
  onPartEnd,
  autoPlay = true,
}: AnimationPlayerSyncProps) {
  const [isPlaying, setIsPlaying] = useState(autoPlay)
  const [currentTime, setCurrentTime] = useState(0)
  const [showSubtitles, setShowSubtitles] = useState(true)
  const [isMuted, setIsMuted] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [currentSubtitle, setCurrentSubtitle] = useState("")
  const [renderKey, setRenderKey] = useState(0)
  const [speed, setSpeed] = useState(1)
  const [iframeReady, setIframeReady] = useState(false)

  const containerRef = useRef<HTMLDivElement>(null)
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const audioRef = useRef<HTMLAudioElement>(null)
  const animationFrameRef = useRef<number | undefined>(undefined)
  const startTimeRef = useRef<number>(Date.now() - currentTime * 1000)

  const safeCode = code.replace(/<\/script/gi, "<\\/script")
  const sandboxDocument = `<!doctype html><html><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src https://cdn.jsdelivr.net 'unsafe-inline'; style-src 'unsafe-inline';"><style>*{box-sizing:border-box}html,body,#stage{margin:0;width:100%;height:100%;overflow:hidden;background:#0f0f1e}canvas{width:100%;height:100%;display:block}</style></head><body><div id="stage"><canvas id="board" width="1600" height="900"></canvas></div><script src="https://cdn.jsdelivr.net/npm/roughjs@4.6.6/bundled/rough.js"></script><script src="https://cdn.jsdelivr.net/npm/animejs@3.2.2/lib/anime.min.js"></script><script src="https://cdn.jsdelivr.net/npm/gsap@3.13.0/dist/gsap.min.js"></script><script src="https://cdn.jsdelivr.net/npm/p5@1.11.8/lib/p5.min.js"></script><script src="https://cdn.jsdelivr.net/npm/fabric@6.7.1/dist/index.min.js"></script><script src="https://cdn.jsdelivr.net/npm/paper@0.12.18/dist/paper-full.min.js"></script><script>window.animationTime=0;window.setAnimationTime=function(t){window.animationTime=t};const board=document.getElementById('board'),ctx=board.getContext('2d'),stage=document.getElementById('stage'),rc=rough.canvas(board);try{${safeCode}\nparent.postMessage({type:'athena-ready'},'*')}catch(error){ctx.fillStyle='#a78bfa';ctx.font='bold 32px Inter,sans-serif';ctx.fillText('Animation error: '+error.message,80,100);parent.postMessage({type:'athena-error',message:error.message},'*')}</script></body></html>`

  // Listen for iframe messages
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.type === "athena-ready") setIframeReady(true)
    }
    window.addEventListener("message", handler)
    return () => window.removeEventListener("message", handler)
  }, [])

  // Subtitle sync
  useEffect(() => {
    if (!beats.length) {
      setCurrentSubtitle(caption)
      return
    }
    const active = beats.findLast((b) => b.time <= currentTime)
    setCurrentSubtitle(active?.subtitle ?? caption)
  }, [currentTime, beats, caption])

  // Animation loop
  useEffect(() => {
    if (!isPlaying) return

    startTimeRef.current = Date.now() - currentTime * 1000

    const tick = () => {
      const elapsed = ((Date.now() - startTimeRef.current) / 1000) * speed
      const clamped = Math.min(elapsed, duration)
      setCurrentTime(clamped)

      if (iframeRef.current?.contentWindow) {
        try { iframeRef.current.contentWindow.setAnimationTime?.(clamped) } catch { /* ignore */ }
      }

      if (clamped >= duration) {
        setIsPlaying(false)
        onPartEnd?.()
      } else {
        animationFrameRef.current = requestAnimationFrame(tick)
      }
    }

    animationFrameRef.current = requestAnimationFrame(tick)
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying, speed, duration])

  const handlePlayPause = () => {
    if (!isPlaying) startTimeRef.current = Date.now() - currentTime * 1000
    setIsPlaying(!isPlaying)
  }

  const handleReplay = () => {
    setCurrentTime(0)
    setRenderKey((k) => k + 1)
    setIsPlaying(true)
    setIframeReady(false)
  }

  const handleSkip = (delta: number) => {
    const next = Math.max(0, Math.min(currentTime + delta, duration))
    setCurrentTime(next)
    startTimeRef.current = Date.now() - (next / speed) * 1000
  }

  const handleSeek = (e: React.MouseEvent<HTMLButtonElement>) => {
    const frac = e.nativeEvent.offsetX / e.currentTarget.clientWidth
    const next = frac * duration
    setCurrentTime(next)
    startTimeRef.current = Date.now() - (next / speed) * 1000
  }

  const progressPercent = (currentTime / duration) * 100
  const timeLabel = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`

  return (
    <div
      ref={containerRef}
      className={`relative flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-[0_8px_60px_rgba(0,0,0,0.4)] transition-all duration-300 ${
        isFullscreen ? "fixed inset-0 z-50 rounded-none" : ""
      }`}
    >
      {/* Top bar */}
      <div className="flex items-center justify-between border-b border-border/60 bg-card/80 px-4 py-2.5 backdrop-blur-sm">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="size-2 rounded-full bg-foreground" />
          <p className="truncate text-sm font-semibold">{topic}</p>
          {total_parts > 1 && (
            <span className="shrink-0 rounded-full border border-border bg-accent px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              {part}/{total_parts}
            </span>
          )}
        </div>
        <button
          className="flex size-7 items-center justify-center rounded-lg text-muted-foreground transition-all hover:bg-accent hover:text-foreground hover:scale-110"
          onClick={() => setIsFullscreen(!isFullscreen)}
          aria-label={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
        >
          {isFullscreen ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
        </button>
      </div>

      {/* Canvas */}
      <div className="relative aspect-video w-full overflow-hidden bg-[#0a0a0a]">
        {!iframeReady && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#0a0a0a] z-10">
            <div className="flex flex-col items-center gap-3">
              <svg className="size-12 text-white" fill="none" viewBox="0 0 64 64">
                <rect x="8" y="8" width="48" height="48" rx="6" stroke="currentColor" strokeWidth="1.5" transform="rotate(45 32 32)" opacity="0.15" />
                <rect className="athena-loader-path" x="8" y="8" width="48" height="48" rx="6" stroke="currentColor" strokeLinecap="round" strokeWidth="2.5" transform="rotate(45 32 32)" pathLength="100" />
              </svg>
              <p className="text-xs text-muted-foreground">Loading scene...</p>
            </div>
          </div>
        )}

        <iframe
          key={renderKey}
          ref={iframeRef}
          title={`Animation: ${topic}`}
          sandbox="allow-scripts"
          srcDoc={sandboxDocument}
          className="absolute inset-0 size-full border-0"
        />

        {/* Subtitle overlay */}
        {showSubtitles && currentSubtitle && (
          <div className="absolute inset-x-4 bottom-4 mx-auto max-w-2xl rounded-xl bg-black/75 px-5 py-3 text-center text-sm leading-relaxed text-white backdrop-blur-sm shadow-xl">
            {currentSubtitle}
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="bg-card/95 px-4 py-3 backdrop-blur-sm">
        {/* Seek bar */}
        <div className="mb-2.5 flex items-center gap-2 text-xs text-muted-foreground font-mono">
          <span>{timeLabel(currentTime)}</span>
          <button
            className="h-2 flex-1 overflow-hidden rounded-full bg-muted/30 text-left cursor-pointer"
            aria-label="Seek animation"
            onClick={handleSeek}
          >
            <span
              className="block h-full rounded-full bg-foreground transition-[width] duration-100"
              style={{ width: `${progressPercent}%` }}
            />
          </button>
          <span>{timeLabel(duration)}</span>
        </div>

        {/* Beat markers */}
        {beats.length > 0 && (
          <div className="mb-2 flex gap-1">
            {beats.map((beat, i) => (
              <button
                key={i}
                onClick={() => {
                  setCurrentTime(beat.time)
                  startTimeRef.current = Date.now() - (beat.time / speed) * 1000
                }}
                className={`h-1.5 flex-1 rounded-full transition-all duration-200 ${
                  beat.time <= currentTime
                    ? "bg-foreground"
                    : "bg-muted/30 hover:bg-muted/60"
                }`}
                title={beat.action}
              />
            ))}
          </div>
        )}

        {/* Buttons row */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-0.5">
            <button className="player-button" onClick={handleReplay} aria-label="Replay">
              <RotateCcw className="size-4" />
            </button>
            <button className="player-button" onClick={() => handleSkip(-5)} aria-label="Back 5 seconds">
              <ChevronLeft className="size-4" />
            </button>
            <button
              className="flex size-9 items-center justify-center rounded-xl bg-foreground text-background shadow-[0_2px_12px_rgba(0,0,0,0.4)] transition-all hover:opacity-80 hover:scale-110 active:scale-95"
              onClick={handlePlayPause}
              aria-label={isPlaying ? "Pause" : "Play"}
            >
              {isPlaying ? <Pause className="size-4" /> : <Play className="size-4" />}
            </button>
            <button className="player-button" onClick={() => handleSkip(5)} aria-label="Forward 5 seconds">
              <ChevronRight className="size-4" />
            </button>
            <button
              className={`player-button ${isMuted ? "bg-accent text-foreground" : ""}`}
              onClick={() => setIsMuted(!isMuted)}
              aria-label={isMuted ? "Unmute" : "Mute"}
            >
              {isMuted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
            </button>
          </div>

          <div className="flex items-center gap-1">
            <button
              className={`flex h-8 items-center gap-1 rounded-lg px-2 text-xs font-bold transition-all ${
                showSubtitles ? "bg-accent text-foreground" : "text-muted-foreground hover:bg-accent"
              }`}
              onClick={() => setShowSubtitles(!showSubtitles)}
            >
              CC
            </button>
            <button
              className="flex h-8 items-center rounded-lg px-2 font-mono text-xs font-bold text-muted-foreground transition-all hover:bg-accent hover:text-foreground"
              onClick={() => setSpeed(speed >= 2 ? 0.5 : Math.round((speed + 0.5) * 10) / 10)}
            >
              {speed}x
            </button>
          </div>
        </div>
      </div>

      {/* Hidden audio */}
      <audio ref={audioRef} className="hidden" muted={isMuted} crossOrigin="anonymous" />
    </div>
  )
}
