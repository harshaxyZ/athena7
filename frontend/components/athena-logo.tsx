"use client"

import { cn } from "@/lib/utils"

/**
 * Athena logo — an elegant owl head mark symbolizing wisdom and learning.
 * Minimalist, modern, works in both light and dark modes.
 */
export function AthenaLogo({ className }: { className?: string }) {
  return (
    <svg
      aria-label="Athena"
      className={cn("size-7", className)}
      fill="currentColor"
      viewBox="0 0 32 32"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Head circle - subtle background */}
      <circle cx="16" cy="14" r="9" fill="currentColor" opacity="0.06" />
      
      {/* Left eye */}
      <circle cx="11.5" cy="13" r="2.5" fill="currentColor" />
      <circle cx="12.2" cy="12.2" r="0.8" fill="currentColor" opacity="0.3" />
      
      {/* Right eye */}
      <circle cx="20.5" cy="13" r="2.5" fill="currentColor" />
      <circle cx="21.2" cy="12.2" r="0.8" fill="currentColor" opacity="0.3" />
      
      {/* Beak - small triangle */}
      <polygon points="16,18 15,16 17,16" fill="currentColor" opacity="0.7" />
      
      {/* Left wing arc */}
      <path d="M 8 14 Q 6 18 8 22" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" opacity="0.4" />
      
      {/* Right wing arc */}
      <path d="M 24 14 Q 26 18 24 22" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" opacity="0.4" />
      
      {/* Bottom knowledge glow */}
      <path d="M 13 23 Q 16 25 19 23" stroke="currentColor" strokeWidth="1" fill="none" strokeLinecap="round" opacity="0.25" />
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
