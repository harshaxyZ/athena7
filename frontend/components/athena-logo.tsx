"use client"

import { cn } from "@/lib/utils"

/**
 * Athena logo — a premium minimalist "A" mark.
 * Clean, geometric, scales beautifully at any size.
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
      {/* Left diagonal stroke of A */}
      <line x1="6" y1="26" x2="16" y2="6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      
      {/* Right diagonal stroke of A */}
      <line x1="26" y1="26" x2="16" y2="6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      
      {/* Horizontal crossbar of A */}
      <line x1="10" y1="18" x2="22" y2="18" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
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
        {/* Left diagonal A */}
        <line className="athena-loader-path" x1="12" y1="52" x2="32" y2="12" stroke="currentColor" strokeWidth="4.4" strokeLinecap="round" pathLength="100" opacity="0.3" />
        
        {/* Right diagonal A */}
        <line className="athena-loader-path" x1="52" y1="52" x2="32" y2="12" stroke="currentColor" strokeWidth="4.4" strokeLinecap="round" pathLength="100" opacity="0.3" />
        
        {/* Horizontal crossbar - animated */}
        <line 
          className="athena-loader-path"
          x1="20" y1="36" x2="44" y2="36" 
          stroke="currentColor" 
          strokeWidth="4.4" 
          strokeLinecap="round" 
          pathLength="100"
        />
      </svg>
    </span>
  )
}
