"use client"

import { useEffect, useRef, useState } from "react"
import { ChevronLeft, ChevronRight, Maximize2, Minimize2, Pause, Play, RotateCcw, Volume2, VolumeX } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { AnimationData, Beat } from "@/lib/athena-api"

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

  const containerRef = useRef<HTMLDivElement>(null)
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const audioRef = useRef<HTMLAudioElement>(null)
  const animationFrameRef = useRef<number>()

  const safeCode = code.replace(/<\/script/gi, "<\\/script")
  const sandboxDocument = `<!doctype html><html><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src https://cdn.jsdelivr.net 'unsafe-inline'; style-src 'unsafe-inline';"><style>*{box-sizing:border-box}html,body,#stage{margin:0;width:100%;height:100%;overflow:hidden;background:#10131c}canvas{width:100%;height:100%;display:block}</style></head><body><div id="stage"><canvas id="board" width="1600" height="900"></canvas></div><script src="https://cdn.jsdelivr.net/npm/roughjs@4.6.6/bundled/rough.js"></script><script src="https://cdn.jsdelivr.net/npm/animejs@3.2.2/lib/anime.min.js"></script><script src="https://cdn.jsdelivr.net/npm/gsap@3.13.0/dist/gsap.min.js"></script><script src="https://cdn.jsdelivr.net/npm/p5@1.11.8/lib/p5.min.js"></script><script src="https://cdn.jsdelivr.net/npm/fabric@6.7.1/dist/index.min.js"></script><script src="https://cdn.jsdelivr.net/npm/paper@0.12.18/dist/paper-full.min.js"></script><script>window.animationTime=${0};window.setAnimationTime=function(t){window.animationTime=t};const board=document.getElementById('board'),ctx=board.getContext('2d'),stage=document.getElementById('stage'),rc=rough.canvas(board);try{${safeCode}\nparent.postMessage({type:'athena-ready'},'*')}catch(error){ctx.fillStyle='#fff';ctx.font='28px sans-serif';ctx.fillText('Animation error: '+error.message,80,100);parent.postMessage({type:'athena-error',message:error.message},'*')}</script></body></html>`

  // Subtitle sync
  useEffect(() => {
    if (!beats.length) return
    const active = beats.find((b) => b.time <= currentTime && (!beats[beats.indexOf(b) + 1] || beats[beats.indexOf(b) + 1].time > currentTime))
    setCurrentSubtitle(active?.subtitle ?? "")
  }, [currentTime, beats])

  // Animation loop with beat synchronization
  useEffect(() => {
    if (!isPlaying) return

    const startTime = Date.now() - currentTime * 1000
    let lastUpdateTime = currentTime

    const tick = () => {
      const elapsed = (Date.now() - startTime) / 1000
      setCurrentTime(Math.min(elapsed, duration))

      // Update iframe time
      if (iframeRef.current?.contentWindow) {
        iframeRef.current.contentWindow.setAnimationTime?.(elapsed)
      }

      // Sync audio
      if (audioRef.current && Math.abs(audioRef.current.currentTime - elapsed) > 0.1) {
        audioRef.current.currentTime = elapsed
      }

      if (elapsed >= duration) {
        setIsPlaying(false)
        onPartEnd?.()
      } else {
        animationFrameRef.current = requestAnimationFrame(tick)
      }

      lastUpdateTime = elapsed
    }

    animationFrameRef.current = requestAnimationFrame(tick)
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current)
    }
  }, [isPlaying, currentTime, duration, onPartEnd])

  const handlePlayPause = () => setIsPlaying(!isPlaying)
  const handleReplay = () => {
    setCurrentTime(0)
    setIsPlaying(true)
  }
  const handleSkip = (delta: number) => {
    setCurrentTime(Math.max(0, Math.min(currentTime + delta, duration)))
  }

  const progressPercent = (currentTime / duration) * 100

  return (
    <div ref={containerRef} className={`relative flex flex-col rounded-2xl border border-muted overflow-hidden ${isFullscreen ? "fixed inset-0 z-50" : ""}`}>
      {/* Canvas/Video area */}
      <div className="relative flex-1 bg-background">
        <iframe
          key={renderKey}
          ref={iframeRef}
          title={`Animation: ${topic}`}
          sandbox={{ allow: ["scripts"] }}
          srcDoc={sandboxDocument}
          className="absolute inset-0 size-full border-0"
        />

        {/* Subtitle overlay */}
        {showSubtitles && currentSubtitle && (
          <div className="absolute inset-x-4 bottom-16 mx-auto max-w-2xl rounded-lg bg-black/70 px-4 py-2 text-center text-sm text-white backdrop-blur">
            {currentSubtitle}
          </div>
        )}

        {/* Beat markers */}
        {beats.length > 0 && (
          <div className="absolute inset-x-4 bottom-4 flex gap-1">
            {beats.map((beat, i) => (
              <button
                key={i}
                onClick={() => setCurrentTime(beat.time)}
                className={`h-2 flex-1 rounded-full transition-colors ${
                  beat.time <= currentTime ? "bg-primary" : "bg-muted/40 hover:bg-muted/60"
                }`}
                title={`${beat.action} (${beat.time.toFixed(1)}s)`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Control bar */}
      <div className="border-t border-muted bg-muted/30 p-4 backdrop-blur">
        {/* Progress bar */}
        <div className="mb-3 flex items-center gap-2 text-xs text-muted-foreground">
          <span>{Math.floor(currentTime / 60)}:{String(Math.floor(currentTime % 60)).padStart(2, "0")}</span>
          <div className="h-1 flex-1 rounded-full bg-muted/40">
            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progressPercent}%` }} />
          </div>
          <span>{Math.floor(duration / 60)}:{String(Math.floor(duration % 60)).padStart(2, "0")}</span>
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1">
            <Button size="sm" variant="ghost" onClick={handlePlayPause} className="h-8 w-8 p-0">
              {isPlaying ? <Pause className="size-4" /> : <Play className="size-4" />}
            </Button>
            <Button size="sm" variant="ghost" onClick={handleReplay} className="h-8 w-8 p-0">
              <RotateCcw className="size-4" />
            </Button>
            <Button size="sm" variant="ghost" onClick={() => handleSkip(-5)} className="h-8 w-8 p-0">
              <ChevronLeft className="size-4" />
            </Button>
            <Button size="sm" variant="ghost" onClick={() => handleSkip(5)} className="h-8 w-8 p-0">
              <ChevronRight className="size-4" />
            </Button>
          </div>

          <div className="text-xs font-medium text-muted-foreground">
            {part && total_parts && total_parts > 1 ? `Part ${part}/${total_parts}` : "S-tier animation"}
          </div>

          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowSubtitles(!showSubtitles)}
              className={`h-8 w-8 p-0 ${showSubtitles ? "text-primary" : "text-muted-foreground"}`}
            >
              <span className="text-xs font-bold">CC</span>
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setIsMuted(!isMuted)} className="h-8 w-8 p-0">
              {isMuted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="h-8 w-8 p-0"
            >
              {isFullscreen ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
            </Button>
          </div>
        </div>
      </div>

      {/* Hidden audio element for TTS */}
      <audio ref={audioRef} className="hidden" muted={isMuted} crossOrigin="anonymous" />
    </div>
  )
}
