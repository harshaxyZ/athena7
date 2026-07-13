"use client"

import { useEffect, useRef, useState } from "react"
import { gsap } from "gsap"
import { CinematicPhotosynthesis } from "@/components/cinematic-photosynthesis"
import { createNarration } from "@/lib/athena-api"
import {
  Captions,
  Expand,
  Gauge,
  Maximize2,
  Pause,
  Play,
  RotateCcw,
  SkipBack,
  SkipForward,
  Volume2,
  X,
} from "lucide-react"

const scenes = [
  { at: 0, label: "A leaf wakes", caption: "Every leaf is a living solar factory, quietly reaching toward the light." },
  { at: 5.8, label: "The ingredients arrive", caption: "Sunlight streams in, water rises through the veins, and carbon dioxide drifts through tiny pores." },
  { at: 11.8, label: "Inside the chloroplast", caption: "Deep inside each cell, chloroplasts gather the incoming light." },
  { at: 18, label: "Energy in motion", caption: "Chlorophyll excites electrons, splitting water and releasing fresh oxygen." },
  { at: 24, label: "Sunlight becomes food", caption: "The captured energy assembles carbon into glucose: stored sunlight that can fuel life." },
]

const narrationScript = scenes.map((item) => item.caption).join(" ")

type AnimationPlayerProps = {
  code: string
  topic: string
  caption: string
  duration?: number
}

export function AnimationPlayer({ code, topic, caption, duration = 14 }: AnimationPlayerProps) {
  const sceneRef = useRef<HTMLDivElement>(null)
  const timelineRef = useRef<gsap.core.Timeline | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [playing, setPlaying] = useState(true)
  const [muted, setMuted] = useState(false)
  const [progress, setProgress] = useState(0)
  const [expanded, setExpanded] = useState(false)
  const [captions, setCaptions] = useState(true)
  const [speed, setSpeed] = useState(1)
  const [scene, setScene] = useState(0)
  const [renderKey, setRenderKey] = useState(0)
  const safeCode = code.replace(/<\/script/gi, "<\\/script")
  const sandboxDocument = `<!doctype html><html><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src https://cdn.jsdelivr.net 'unsafe-inline'; style-src 'unsafe-inline';"><style>*{box-sizing:border-box}html,body,#stage{margin:0;width:100%;height:100%;overflow:hidden;background:#10131c}canvas{width:100%;height:100%;display:block}</style></head><body><div id="stage"><canvas id="board" width="1600" height="900"></canvas></div><script src="https://cdn.jsdelivr.net/npm/roughjs@4.6.6/bundled/rough.js"></script><script src="https://cdn.jsdelivr.net/npm/animejs@3.2.2/lib/anime.min.js"></script><script src="https://cdn.jsdelivr.net/npm/gsap@3.13.0/dist/gsap.min.js"></script><script src="https://cdn.jsdelivr.net/npm/p5@1.11.8/lib/p5.min.js"></script><script src="https://cdn.jsdelivr.net/npm/fabric@6.7.1/dist/index.min.js"></script><script src="https://cdn.jsdelivr.net/npm/paper@0.12.18/dist/paper-full.min.js"></script><script>const board=document.getElementById('board'),ctx=board.getContext('2d'),stage=document.getElementById('stage'),rc=rough.canvas(board);try{${safeCode}\nparent.postMessage({type:'athena-ready'},'*')}catch(error){ctx.fillStyle='#fff';ctx.font='28px sans-serif';ctx.fillText('Animation error: '+error.message,80,100);parent.postMessage({type:'athena-error',message:error.message},'*')}</script></body></html>`

  useEffect(() => {
    const context = gsap.context(() => {
      const timeline = gsap.timeline({ repeat: -1, repeatDelay: 1.2 })
      timeline
        .fromTo("[data-sun]", { scale: 0.25, opacity: 0 }, { scale: 1, opacity: 1, duration: 1.25, ease: "back.out(1.45)", transformOrigin: "50% 50%" })
        .fromTo("[data-cloud]", { x: -70, opacity: 0 }, { x: 0, opacity: 0.55, duration: 2.2, ease: "power2.out" }, "<")
        .fromTo("[data-leaf]", { y: 100, scale: 0.72, rotate: -11, opacity: 0 }, { y: 0, scale: 1, rotate: 0, opacity: 1, duration: 1.65, ease: "back.out(1.35)", transformOrigin: "50% 100%" }, "<0.35")
        .to("[data-leaf]", { rotate: 1.5, scaleY: 1.018, duration: 1.25, yoyo: true, repeat: 3, ease: "sine.inOut", transformOrigin: "50% 100%" })
        .call(() => setScene(1), [], 5.8)
        .fromTo("[data-ray]", { strokeDasharray: 250, strokeDashoffset: 250 }, { strokeDashoffset: 0, duration: 1.8, stagger: 0.12, ease: "power2.out" }, 5.8)
        .fromTo("[data-droplet]", { y: 100, scale: 0.2, opacity: 0 }, { y: -105, x: 115, scale: 1, opacity: 1, duration: 3.8, stagger: 0.28, ease: "power1.inOut" }, 6.1)
        .fromTo("[data-molecule]", { x: 100, opacity: 0, scale: 0.4 }, { x: -150, y: 90, opacity: 1, scale: 1, duration: 3.4, stagger: 0.24, ease: "sine.inOut" }, 6.3)
        .call(() => setScene(2), [], 11.8)
        .to("[data-shot='world']", { scale: 2.7, x: -530, y: -250, opacity: 0, duration: 1.8, ease: "power3.inOut", transformOrigin: "58% 51%" }, 11.4)
        .fromTo("[data-shot='inside']", { opacity: 0, scale: 1.22 }, { opacity: 1, scale: 1, duration: 1.8, ease: "power3.out", transformOrigin: "50% 50%" }, 11.8)
        .fromTo("[data-chloroplast]", { scale: 0.55, rotate: -6 }, { scale: 1, rotate: 0, duration: 2, ease: "back.out(1.25)", transformOrigin: "50% 50%" }, 12)
        .fromTo("[data-granum]", { scaleY: 0, opacity: 0 }, { scaleY: 1, opacity: 1, duration: 0.9, stagger: 0.11, ease: "back.out(1.8)", transformOrigin: "50% 50%" }, 13)
        .call(() => setScene(3), [], 18)
        .fromTo("[data-photon]", { x: -140, y: -80, opacity: 0 }, { x: 260, y: 170, opacity: 1, duration: 2.3, stagger: 0.15, ease: "power2.in" }, 17.5)
        .fromTo("[data-electron]", { scale: 0, opacity: 0 }, { scale: 1.4, opacity: 1, x: 115, duration: 1.7, stagger: 0.16, yoyo: true, repeat: 1, ease: "sine.inOut", transformOrigin: "50% 50%" }, 19)
        .fromTo("[data-bubble]", { y: 70, scale: 0, opacity: 0 }, { y: -165, x: 45, scale: 1, opacity: 0.85, duration: 3.4, stagger: 0.18, ease: "power1.out" }, 19.3)
        .call(() => setScene(4), [], 24)
        .to("[data-shot='inside']", { opacity: 0, scale: 1.35, duration: 1.3, ease: "power3.in" }, 23.7)
        .fromTo("[data-shot='finale']", { opacity: 0, scale: 0.88 }, { opacity: 1, scale: 1, duration: 1.5, ease: "power3.out", transformOrigin: "50% 50%" }, 24)
        .fromTo("[data-atom]", { scale: 0, rotate: -120, opacity: 0 }, { scale: 1, rotate: 0, opacity: 1, duration: 0.85, stagger: 0.12, ease: "back.out(1.9)", transformOrigin: "50% 50%" }, 24.5)
        .fromTo("[data-glucose]", { rotate: -8 }, { rotate: 4, duration: 1.1, yoyo: true, repeat: 1, ease: "sine.inOut", transformOrigin: "50% 50%" }, 25.5)
        .to("[data-product-label]", { opacity: 1, y: -8, duration: 0.9, ease: "power2.out" }, 26)
        .fromTo("[data-sparkle]", { scale: 0, rotate: -90, opacity: 0 }, { scale: 1, rotate: 45, opacity: 1, duration: 0.75, stagger: 0.13, yoyo: true, repeat: 2, ease: "back.out(2)", transformOrigin: "50% 50%" }, 26.2)
      timeline.eventCallback("onUpdate", () => {
        const value = timeline.progress()
        setProgress(value)
        const audio = audioRef.current
        if (audio && !audio.paused && Math.abs(audio.currentTime - timeline.time()) > 0.12) {
          timeline.time(Math.min(audio.currentTime, timeline.duration()), false)
        }
      })
      timeline.eventCallback("onRepeat", () => {
        setScene(0)
        if (audioRef.current) audioRef.current.currentTime = 0
      })
      timelineRef.current = timeline
    }, sceneRef)
    return () => context.revert()
  }, [])

  useEffect(() => {
    let objectUrl = ""
    createNarration(caption)
      .then((url) => {
        objectUrl = url
        const audio = new Audio(url)
        audio.preload = "auto"
        audio.playbackRate = speed
        audio.muted = muted
        audioRef.current = audio
        if (playing) void audio.play().catch(() => undefined)
      })
      .catch(() => undefined)
    return () => {
      audioRef.current?.pause()
      audioRef.current = null
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [])

  useEffect(() => {
    timelineRef.current?.timeScale(speed)
    if (audioRef.current) audioRef.current.playbackRate = speed
  }, [speed])

  useEffect(() => {
    if (audioRef.current) audioRef.current.muted = muted
  }, [muted])

  const togglePlayback = () => {
    const timeline = timelineRef.current
    if (!timeline) return
    if (playing) {
      timeline.pause()
      audioRef.current?.pause()
    } else {
      timeline.resume()
      if (audioRef.current) {
        audioRef.current.currentTime = timeline.time()
        void audioRef.current.play().catch(() => undefined)
      }
    }
    setPlaying(!playing)
  }

  const replay = () => {
    setRenderKey((value) => value + 1)
    timelineRef.current?.restart()
    if (audioRef.current) {
      audioRef.current.currentTime = 0
      void audioRef.current.play().catch(() => undefined)
    }
    setScene(0)
    setPlaying(true)
  }

  return (
    <div className={expanded ? "fixed inset-0 z-50 flex bg-background p-3 md:p-8" : "w-full"}>
      <section className="flex w-full flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex size-7 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">{scene + 1}</span>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{topic}</p>
              <p className="text-xs text-muted-foreground">AI-generated canvas animation · {duration}s</p>
            </div>
          </div>
          <button className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground" onClick={() => setExpanded(!expanded)} aria-label={expanded ? "Close fullscreen" : "Open fullscreen"}>
            {expanded ? <X /> : <Maximize2 />}
          </button>
        </div>

        <div ref={sceneRef} className="relative aspect-video min-h-0 w-full overflow-hidden bg-[#f3f2ed] text-[#121212]">
          <div className="absolute inset-x-0 top-0 flex items-center justify-between p-4 md:p-6">
            <div className="rounded-full border border-black/10 bg-[#f3f2ed] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] md:text-xs">AI visual story</div>
            <div className="flex items-center gap-2 text-[10px] font-medium uppercase tracking-wider text-black/60 md:text-xs"><Gauge className="size-4" /> 60 fps</div>
          </div>

          <iframe key={renderKey} title={`Animation: ${topic}`} sandbox="allow-scripts" srcDoc={sandboxDocument} className="absolute inset-0 size-full border-0" />
          <div className="hidden"><CinematicPhotosynthesis />
          <svg viewBox="0 0 960 540" aria-hidden="true">
            <circle data-sun cx="125" cy="130" r="50" fill="#ff6b4a" />
            {[0, 1, 2, 3].map((ray) => (
              <path key={ray} data-ray d={`M ${180 + ray * 4} ${145 + ray * 21} C 300 ${130 + ray * 30}, 340 ${175 + ray * 35}, 425 ${190 + ray * 38}`} fill="none" stroke="#ff6b4a" strokeDasharray="160" strokeDashoffset="160" strokeLinecap="round" strokeWidth="5" opacity={0.9 - ray * 0.12} />
            ))}
            <g data-leaf>
              <path d="M450 430C385 310 430 175 620 105c54 144 9 296-170 325Z" fill="#20a878" />
              <path d="M448 430c49-84 98-155 172-254" fill="none" stroke="#121212" strokeLinecap="round" strokeWidth="9" />
              <path d="m492 352 95-12M522 300l-48-20M554 248l68-5M581 204l-32-16" fill="none" stroke="#121212" strokeLinecap="round" strokeWidth="5" opacity=".45" />
            </g>
            <g>
              {[0, 1, 2, 3, 4].map((cell) => (
                <g key={cell} data-cell style={{ transformOrigin: `${535 + cell * 45}px ${315 - (cell % 2) * 42}px` }}>
                  <circle cx={535 + cell * 45} cy={315 - (cell % 2) * 42} r="24" fill="#f3f2ed" opacity=".9" />
                  <circle cx={535 + cell * 45} cy={315 - (cell % 2) * 42} r="10" fill="#121212" opacity=".75" />
                </g>
              ))}
            </g>
            {[0, 1, 2].map((particle) => <circle key={particle} data-particle cx={190 - particle * 24} cy={385 + particle * 18} r={9 - particle} fill="#1485cc" />)}
            <g transform="translate(735 178)">
              <rect width="170" height="188" rx="28" fill="#121212" />
              <text x="24" y="42" fill="#f3f2ed" fontSize="14" fontWeight="600">LIGHT ENERGY</text>
              <text x="24" y="82" fill="#20a878" fontSize="34" fontWeight="700">CO₂ + H₂O</text>
              <path d="M24 106h122" stroke="#f3f2ed" opacity=".24" />
              <text x="24" y="145" fill="#f3f2ed" fontSize="27" fontWeight="700">GLUCOSE</text>
              <text x="24" y="169" fill="#f3f2ed" fontSize="13" opacity=".6">+ breathable oxygen</text>
            </g>
          </svg>

          </div>
          {captions && <div className="absolute inset-x-4 bottom-4 mx-auto max-w-2xl rounded-xl bg-[#121212]/90 px-4 py-3 text-center text-sm leading-relaxed text-[#f3f2ed] shadow-xl backdrop-blur md:bottom-6 md:text-base">{caption}</div>}
        </div>

        <div className="flex flex-col gap-2 bg-card px-3 py-3 md:px-4">
          <button
            className="h-2 overflow-hidden rounded-full bg-muted text-left"
            aria-label="Seek animation"
            onClick={(event) => {
              const fraction = event.nativeEvent.offsetX / event.currentTarget.clientWidth
              timelineRef.current?.progress(fraction)
              if (audioRef.current) audioRef.current.currentTime = fraction * timelineRef.current!.duration()
            }}
          >
            <span className="block h-full rounded-full bg-primary transition-[width] duration-100" style={{ width: `${progress * 100}%` }} />
          </button>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1">
              <button className="player-button" onClick={replay} aria-label="Replay"><RotateCcw /></button>
              <button className="player-button hidden sm:flex" aria-label="Back five seconds"><SkipBack /></button>
              <button className="player-button bg-primary text-primary-foreground hover:bg-primary/90" onClick={togglePlayback} aria-label={playing ? "Pause" : "Play"}>{playing ? <Pause /> : <Play />}</button>
              <button className="player-button hidden sm:flex" aria-label="Forward five seconds"><SkipForward /></button>
              <button className={`player-button ${muted ? "bg-accent" : ""}`} onClick={() => setMuted(!muted)} aria-label={muted ? "Unmute narration" : "Mute narration"}><Volume2 /></button>
            </div>
            <div className="flex items-center gap-1">
              <button className={`player-button ${captions ? "bg-accent text-foreground" : ""}`} onClick={() => setCaptions(!captions)} aria-label="Toggle captions"><Captions /></button>
              <button className="flex h-9 items-center gap-1.5 rounded-lg px-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground" onClick={() => setSpeed(speed === 2 ? 0.5 : speed + 0.5)}>{speed}x</button>
              <button className="player-button" onClick={() => setExpanded(!expanded)} aria-label="Fullscreen"><Expand /></button>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
