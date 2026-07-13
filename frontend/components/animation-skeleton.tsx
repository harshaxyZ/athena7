"use client"

import { Loader2 } from "lucide-react"

type AnimationSkeletonProps = {
  part?: number
  total_parts?: number
  message?: string
}

export function AnimationSkeleton({ part = 1, total_parts = 1, message = "Generating animation..." }: AnimationSkeletonProps) {
  return (
    <div className="relative flex h-96 w-full flex-col items-center justify-center rounded-2xl border border-muted bg-gradient-to-br from-muted/40 to-background">
      {/* Animated background shimmer */}
      <div className="absolute inset-0 overflow-hidden rounded-2xl">
        <div className="absolute inset-0 animate-pulse bg-gradient-to-r from-transparent via-muted/20 to-transparent" />
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center gap-4">
        {/* Loader with progress ring */}
        <div className="relative">
          <Loader2 className="size-12 animate-spin text-primary" />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-xs font-semibold text-muted-foreground">{part}/{total_parts}</span>
          </div>
        </div>

        {/* Status text */}
        <div className="text-center">
          <p className="text-sm font-semibold text-foreground">{message}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {total_parts > 1 ? `Part ${part} of ${total_parts}` : "Almost there"}
          </p>
        </div>

        {/* Progress indication */}
        <div className="w-32 space-y-2">
          <div className="h-1 w-full overflow-hidden rounded-full bg-muted/40">
            <div
              className="h-full bg-gradient-to-r from-primary via-accent to-primary bg-[length:200%_100%] animate-pulse"
              style={{
                animation: "gradient-flow 2s ease-in-out infinite",
              }}
            />
          </div>
          {total_parts > 1 && (
            <div className="flex gap-1">
              {Array.from({ length: total_parts }).map((_, i) => (
                <div
                  key={i}
                  className={`h-1.5 flex-1 rounded-full transition-colors ${
                    i < part ? "bg-primary" : "bg-muted/40"
                  }`}
                />
              ))}
            </div>
          )}
        </div>

        {/* Helpful message */}
        <p className="mt-4 max-w-sm text-center text-xs text-muted-foreground/60">
          {total_parts > 1
            ? `Generating part ${part}. Subsequent parts are being prepared in the background.`
            : "The AI is choreographing your animation with precise timing and effects."}
        </p>
      </div>

      <style>{`
        @keyframes gradient-flow {
          0%, 100% { background-position: 200% 0; }
          50% { background-position: -200% 0; }
        }
      `}</style>
    </div>
  )
}
