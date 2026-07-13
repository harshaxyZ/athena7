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
      <path
        d="M16 3.75 28.25 26.5H3.75L16 3.75Z"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="2"
      />
      <path
        d="M11.2 21.25h9.6"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="2"
      />
    </svg>
  )
}

export function AthenaLoader({ className }: { className?: string }) {
  return (
    <span className={cn("relative block size-16", className)} role="status" aria-label="Athena is creating">
      <svg className="size-full" fill="none" viewBox="0 0 64 64" aria-hidden="true">
        <path d="M32 7 57 54H7L32 7Z" stroke="currentColor" strokeLinejoin="round" strokeWidth="2" opacity="0.18" />
        <path className="athena-loader-path" d="M32 7 57 54H7L32 7Z" pathLength="100" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" />
      </svg>
    </span>
  )
}
