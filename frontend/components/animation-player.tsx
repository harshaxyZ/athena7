"use client"

import { useEffect, useRef, useState } from "react"
import { gsap } from "gsap"
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
  { label: "The hidden world", caption: "Travel inside a leaf, where sunlight begins a remarkable energy transfer." },
  { label: "Capturing light", caption: "Chlorophyll absorbs light and excites electrons inside the chloroplast." },
  { label: "Making energy", caption: "Water and carbon dioxide are transformed into glucose and oxygen." },
]

export function AnimationPlayer() {
  const sceneRef = useRef<HTMLDivElement>(null)
  const timelineRef = useRef<gsap.core.Timeline | null>(null)
  const [playing, setPlaying] = useState(true)
  const [expanded, setExpanded] = useState(false)
  const [captions, setCaptions] = useState(true)
  const [speed, setSpeed] = useState(1)
  const [scene, setScene] = useState(0)

  useEffect(() => {
    const context = gsap.context(() => {
      const timeline = gsap.timeline({ repeat: -1, repeatDelay: 0.4 })
      timeline
        .fromTo("[data-sun]", { scale: 0.75, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.8, ease: "back.out(1.6)" })
        .fromTo("[data-ray]", { strokeDashoffset: 160 }, { strokeDashoffset: 0, duration: 1.1, stagger: 0.08, ease: "power2.out" }, "<0.15")
        .fromTo("[data-leaf]", { scale: 0.7, rotate: -8, opacity: 0 }, { scale: 1, rotate: 0, opacity: 1, duration: 1, ease: "back.out(1.4)" }, "<0.2")
        .fromTo("[data-cell]", { scale: 0, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.65, stagger: 0.08, ease: "back.out(2)" })
        .to("[data-particle]", { motionPath: undefined, x: 210, y: -72, duration: 2.2, stagger: 0.18, ease: "sine.inOut", repeat: 1, yoyo: true })
        .to("[data-leaf]", { rotate: 1.5, transformOrigin: "50% 100%", duration: 1.2, yoyo: true, repeat: 1, ease: "sine.inOut" }, "<")
        .call(() => setScene((value) => (value + 1) % scenes.length))
      timelineRef.current = timeline
    }, sceneRef)
    return () => context.revert()
  }, [])

  useEffect(() => {
    timelineRef.current?.timeScale(speed)
  }, [speed])

  const togglePlayback = () => {
    const timeline = timelineRef.current
    if (!timeline) return
    if (playing) timeline.pause()
    else timeline.resume()
    setPlaying(!playing)
  }

  const replay = () => {
    timelineRef.current?.restart()
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
              <p className="truncate text-sm font-medium">Photosynthesis: from light to life</p>
              <p className="text-xs text-muted-foreground">Scene {scene + 1} of {scenes.length} · {scenes[scene].label}</p>
            </div>
          </div>
          <button className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground" onClick={() => setExpanded(!expanded)} aria-label={expanded ? "Close fullscreen" : "Open fullscreen"}>
            {expanded ? <X /> : <Maximize2 />}
          </button>
        </div>

        <div ref={sceneRef} className="relative aspect-video min-h-0 w-full overflow-hidden bg-[#f3f2ed] text-[#121212]">
          <div className="absolute inset-x-0 top-0 flex items-center justify-between p-4 md:p-6">
            <div className="rounded-full border border-black/10 bg-[#f3f2ed] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] md:text-xs">Inside a leaf</div>
            <div className="flex items-center gap-2 text-[10px] font-medium uppercase tracking-wider text-black/60 md:text-xs"><Gauge className="size-4" /> 60 fps</div>
          </div>

          <svg className="absolute inset-0 size-full" viewBox="0 0 960 540" role="img" aria-label="Animated photosynthesis scene">
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

          {captions && <div className="absolute inset-x-4 bottom-4 mx-auto max-w-2xl rounded-xl bg-[#121212] px-4 py-3 text-center text-sm leading-relaxed text-[#f3f2ed] shadow-xl md:bottom-6 md:text-base">{scenes[scene].caption}</div>}
        </div>

        <div className="flex flex-col gap-2 bg-card px-3 py-3 md:px-4">
          <div className="h-1 overflow-hidden rounded-full bg-muted"><div className="h-full w-[38%] rounded-full bg-primary" /></div>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1">
              <button className="player-button" onClick={replay} aria-label="Replay"><RotateCcw /></button>
              <button className="player-button hidden sm:flex" aria-label="Back five seconds"><SkipBack /></button>
              <button className="player-button bg-primary text-primary-foreground hover:bg-primary/90" onClick={togglePlayback} aria-label={playing ? "Pause" : "Play"}>{playing ? <Pause /> : <Play />}</button>
              <button className="player-button hidden sm:flex" aria-label="Forward five seconds"><SkipForward /></button>
              <button className="player-button" aria-label="Volume"><Volume2 /></button>
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
