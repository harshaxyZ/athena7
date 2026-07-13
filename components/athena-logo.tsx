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
        d="M16 3.5 27 10v12L16 28.5 5 22V10L16 3.5Z"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="m9.25 12.2 6.75-4 6.75 4v7.6l-6.75 4-6.75-4v-7.6Z"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path d="m9.25 12.2 13.5 7.6M22.75 12.2 9.25 19.8M16 8.2v15.6" stroke="currentColor" strokeWidth="1.4" />
      <circle cx="16" cy="16" fill="currentColor" r="2.25" />
    </svg>
  )
}
