"use client"

import { useEffect, useState } from "react"

type AnimationSkeletonProps = {
  part?: number
  total_parts?: number
  message?: string
  status?: string
}

const steps = [
  "Crafting the scene layout",
  "Drawing visual elements",
  "Choreographing animations",
  "Syncing narration beats",
  "Polishing final frames",
]

export function AnimationSkeleton({ part = 1, total_parts = 1, message, status }: AnimationSkeletonProps) {
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
        <div className="absolute left-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-foreground/3 blur-3xl" />
      </div>

      {/* Shimmer scan line */}
      <div className="shimmer absolute inset-0 rounded-2xl" />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center gap-6 px-8 text-center">
        {/* Animated loader - single square */}
        <svg className="size-16" fill="none" viewBox="0 0 64 64">
          <rect x="8" y="8" width="48" height="48" rx="6" stroke="currentColor" strokeWidth="1.5" transform="rotate(45 32 32)" opacity="0.12" />
          <rect
            className="athena-loader-path"
            x="8" y="8" width="48" height="48"
            rx="6"
            stroke="currentColor"
            strokeLinecap="round"
            strokeWidth="2.5"
            transform="rotate(45 32 32)"
            pathLength="100"
          />
        </svg>

        {/* Step message */}
        <div className="flex flex-col items-center gap-2">
          <p className="text-sm font-bold text-foreground">
            {status || steps[stepIndex]}
          </p>
          {total_parts > 1 && (
            <p className="text-xs text-muted-foreground">
              Part {part} of {total_parts}
            </p>
          )}
        </div>

        {/* Progress bar */}
        <div className="w-48 space-y-3">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted/30">
            <div
              className="h-full rounded-full bg-foreground transition-all duration-700 ease-out"
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
                      ? "bg-foreground"
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
