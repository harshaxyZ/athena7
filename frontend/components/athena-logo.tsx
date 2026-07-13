"use client"

import { cn } from "@/lib/utils"

/**
 * Athena logo — a clean geometric mark.
 * Two concentric squares rotated 45 degrees (diamond) with a centre dot.
 * Pure currentColor so it inherits white in dark mode, black in light.
 */
export function AthenaLogo({ className }: { className?: string }) {
  return (
    <svg
      aria-label="Athena"
      className={cn("size-7", className)}
      fill="none"
      viewBox="0 0 32 32"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* outer diamond */}
      <rect
        x="4" y="4" width="24" height="24"
        rx="3"
        stroke="currentColor"
        strokeWidth="1.5"
        transform="rotate(45 16 16)"
        fill="none"
      />
      {/* inner diamond — slightly smaller, same centre */}
      <rect
        x="8.5" y="8.5" width="15" height="15"
        rx="2"
        stroke="currentColor"
        strokeWidth="1"
        transform="rotate(45 16 16)"
        fill="currentColor"
        fillOpacity="0.08"
      />
      {/* centre dot */}
      <circle cx="16" cy="16" r="2" fill="currentColor" />
    </svg>
  )
}

export function AthenaLoader({ className }: { className?: string }) {
  return (
    <span
      className={cn("relative block size-16", className)}
      role="status"
      aria-label="Athena is creating"
    >
      <svg className="size-full" fill="none" viewBox="0 0 64 64" aria-hidden="true">
        {/* ghost diamond */}
        <rect
          x="8" y="8" width="48" height="48"
          rx="6"
          stroke="currentColor"
          strokeWidth="1.5"
          transform="rotate(45 32 32)"
          opacity="0.12"
        />
        {/* animated trace */}
        <rect
          className="athena-loader-path"
          x="8" y="8" width="48" height="48"
          rx="6"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          transform="rotate(45 32 32)"
          pathLength="100"
        />
        {/* pulsing centre */}
        <circle cx="32" cy="32" r="4" fill="currentColor" opacity="0.7">
          <animate attributeName="opacity" values="0.3;0.8;0.3" dur="1.6s" repeatCount="indefinite" />
          <animate attributeName="r" values="3;5;3" dur="1.6s" repeatCount="indefinite" />
        </circle>
      </svg>
    </span>
  )
}
