import { cn } from "@/lib/utils"

export function AthenaLogo({ className }: { className?: string }) {
  return (
    <svg
      aria-label="Athena"
      className={cn("size-7", className)}
      fill="none"
      viewBox="0 0 32 32"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="athena-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#7c5cfc" />
          <stop offset="100%" stopColor="#a78bfa" />
        </linearGradient>
      </defs>
      <circle cx="16" cy="16" r="14" fill="url(#athena-grad)" opacity="0.12" />
      <path
        d="M16 4 L28 26 L4 26 Z"
        stroke="url(#athena-grad)"
        strokeLinejoin="round"
        strokeWidth="1.8"
        fill="none"
      />
      <path
        d="M11.5 20.5 h9"
        stroke="url(#athena-grad)"
        strokeLinecap="round"
        strokeWidth="1.8"
      />
      <circle cx="16" cy="14" r="1.5" fill="url(#athena-grad)" opacity="0.7" />
    </svg>
  )
}

export function AthenaLoader({ className }: { className?: string }) {
  return (
    <span className={cn("relative block size-16", className)} role="status" aria-label="Athena is creating">
      <svg className="size-full" fill="none" viewBox="0 0 64 64" aria-hidden="true">
        <defs>
          <linearGradient id="loader-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#7c5cfc" />
            <stop offset="100%" stopColor="#a78bfa" />
          </linearGradient>
        </defs>
        <path d="M32 7 57 54H7L32 7Z" stroke="#7c5cfc" strokeLinejoin="round" strokeWidth="1.5" opacity="0.15" />
        <path
          className="athena-loader-path"
          d="M32 7 57 54H7L32 7Z"
          pathLength="100"
          stroke="url(#loader-grad)"
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
