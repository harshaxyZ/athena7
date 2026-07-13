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
        d="M4.5 7.25c4.4 0 8.23 1.22 11.5 3.66 3.27-2.44 7.1-3.66 11.5-3.66v16.2c-4.28 0-8.11 1.1-11.5 3.3-3.39-2.2-7.22-3.3-11.5-3.3V7.25Z"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
      <path d="M16 10.91v15.84" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="m12.15 15.15 6.7 3.85-6.7 3.85v-7.7Z"
        fill="currentColor"
        stroke="currentColor"
        strokeLinejoin="round"
      />
    </svg>
  )
}
