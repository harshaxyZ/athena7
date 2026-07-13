"use client"

import { ThemeProvider } from "@/lib/theme-provider"

export function ThemeProviderWrapper({ children }: { children: React.ReactNode }) {
  return <ThemeProvider>{children}</ThemeProvider>
}
