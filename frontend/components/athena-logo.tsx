"use client"

import { useId } from "react"
import { cn } from "@/lib/utils"

export function AthenaLogo({ className }: { className?: string }) {
  const id = useId().replace(/:/g, "")
  const gradId = `ag-${id}`
  return (
    <svg
      aria-label="Athena"
      className={cn("size-7", className)}
      fill="none"
      viewBox="0 0 32 32"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#7c5cfc" />
          <stop offset="100%" stopColor="#c4b5fd" />
        </linearGradient>
      </defs>
      {/* outer glow ring */}
      <circle cx="16" cy="16" r="14" fill={`url(#${gradId})`} opacity="0.18" />
      {/* triangle */}
      <path
        d="M16 5 L27.5 26.5 L4.5 26.5 Z"
        stroke={`url(#${gradId})`}
        strokeLinejoin="round"
        strokeWidth="2"
        fill={`url(#${gradId})`}
        fillOpacity="0.12"
      />
      {/* crossbar */}
      <path
        d="M11 21 h10"
        stroke={`url(#${gradId})`}
        strokeLinecap="round"
        strokeWidth="2"
      />
      {/* apex dot */}
      <circle cx="16" cy="14.5" r="1.8" fill={`url(#${gradId})`} />
    </svg>
  )
}

export function AthenaLoader({ className }: { className?: string }) {
  const id = useId().replace(/:/g, "")
  const gradId = `lg-${id}`
  return (
    <span className={cn("relative block size-16", className)} role="status" aria-label="Athena is creating">
      <svg className="size-full" fill="none" viewBox="0 0 64 64" aria-hidden="true">
        <defs>
          <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#7c5cfc" />
            <stop offset="100%" stopColor="#c4b5fd" />
          </linearGradient>
        </defs>
        <path d="M32 7 57 54H7L32 7Z" stroke="#7c5cfc" strokeLinejoin="round" strokeWidth="1.5" opacity="0.15" />
        <path
          className="athena-loader-path"
          d="M32 7 57 54H7L32 7Z"
          pathLength="100"
          stroke={`url(#${gradId})`}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2.5"
        />
        <circle cx="32" cy="32" r="4" fill="#7c5cfc" opacity="0.6">
          <animate attributeName="opacity" values="0.3;0.8;0.3" dur="1.6s" repeatCount="indefinite" />
          <animate attributeName="r" values="3;5;3" dur="1.6s" repeatCount="indefinite" />
        </circle>
      </svg>
    </span>
  )
}
