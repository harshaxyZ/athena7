"use client"

import { useEffect, useState } from "react"

type AnimationSkeletonProps = {
  part?: number
  total_parts?: number
  message?: string
}

const steps = [
  "Crafting the scene layout",
  "Drawing visual elements",
  "Choreographing animations",
  "Syncing narration beats",
  "Polishing final frames",
]

export function AnimationSkeleton({ part = 1, total_parts = 1, message }: AnimationSkeletonProps) {
  const [stepIndex, setStepIndex] = useState(0)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const stepTimer = setInterval(() => {
      setStepIndex((i) => (i + 1) % steps.length)
    }, 2800)
    return () => clearInterval(stepTimer)
  }, [])

  useEffect(() => {
    let frame: number
    let start: number | null = null
    const DURATION = 28000

    const tick = (timestamp: number) => {
      if (!start) start = timestamp
      const pct = Math.min(((timestamp - start) / DURATION) * 90, 90)
      setProgress(pct)
      if (pct < 90) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [])

  return (
    <div className="relative flex h-[28rem] w-full flex-col items-center justify-center overflow-hidden rounded-2xl border border-border bg-card">
      {/* Ambient glow background */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/6 blur-3xl" />
        <div className="absolute left-1/4 top-1/4 h-32 w-32 rounded-full bg-violet-500/4 blur-2xl" />
        <div className="absolute right-1/4 bottom-1/4 h-32 w-32 rounded-full bg-primary/4 blur-2xl" />
      </div>

      {/* Shimmer scan line */}
      <div className="shimmer absolute inset-0 rounded-2xl" />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center gap-6 px-8 text-center">
        {/* Animated triangle loader */}
        <div className="relative">
          <svg className="size-16" fill="none" viewBox="0 0 64 64">
            <defs>
              <linearGradient id="sk-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#7c5cfc" />
                <stop offset="100%" stopColor="#a78bfa" />
              </linearGradient>
            </defs>
            <path d="M32 7 57 54H7L32 7Z" stroke="#7c5cfc" strokeLinejoin="round" strokeWidth="1.5" opacity="0.15" />
            <path
              className="athena-loader-path"
              d="M32 7 57 54H7L32 7Z"
              pathLength="100"
              stroke="url(#sk-grad)"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2.5"
            />
          </svg>

          {/* Orbiting dot */}
          <span className="orbit absolute left-1/2 top-1/2 -ml-1 -mt-1 size-2 rounded-full bg-primary" />
        </div>

        {/* Step message */}
        <div className="flex flex-col items-center gap-2">
          <p className="text-sm font-bold text-foreground">
            {message || steps[stepIndex]}
          </p>
          <p className="text-xs text-muted-foreground">
            {total_parts > 1 ? `Part ${part} of ${total_parts}` : "Almost there — this takes 10–30s"}
          </p>
        </div>

        {/* Progress bar */}
        <div className="w-48 space-y-3">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted/30">
            <div
              className="h-full rounded-full bg-gradient-to-r from-primary via-violet-400 to-primary transition-all duration-700 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Part dots */}
          {total_parts > 1 && (
            <div className="flex justify-center gap-1.5">
              {Array.from({ length: total_parts }).map((_, i) => (
                <span
                  key={i}
                  className={`h-1.5 w-6 rounded-full transition-all duration-500 ${
                    i < part
                      ? "bg-primary shadow-[0_0_8px_rgba(124,92,252,0.6)]"
                      : "bg-muted/30"
                  }`}
                />
              ))}
            </div>
          )}
        </div>

        {/* Floating canvas preview lines (decorative) */}
        <div className="flex items-center gap-3 opacity-30">
          {[60, 40, 72, 36, 56].map((w, i) => (
            <span
              key={i}
              className="h-1 rounded-full bg-muted-foreground"
              style={{
                width: `${w}px`,
                animationDelay: `${i * 0.4}s`,
                animation: "pulse 2s ease-in-out infinite",
              }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
