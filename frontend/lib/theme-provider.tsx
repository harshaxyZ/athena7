"use client"

import { createContext, useContext, useEffect, useState } from "react"

type Theme = "light" | "dark"

interface ThemeContextType {
  theme: Theme
  setTheme: (theme: Theme) => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("dark")
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    // Load saved theme from localStorage
    const saved = localStorage.getItem("athena-theme") as Theme | null
    const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches

    const initialTheme = saved || (systemDark ? "dark" : "light")
    setThemeState(initialTheme)
    applyTheme(initialTheme)
    setMounted(true)
  }, [])

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme)
    localStorage.setItem("athena-theme", newTheme)
    applyTheme(newTheme)
  }

  const applyTheme = (theme: Theme) => {
    const html = document.documentElement
    if (theme === "dark") {
      html.classList.add("dark")
    } else {
      html.classList.remove("dark")
    }
  }

  if (!mounted) {
    return <>{children}</>
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) {
    // Return default theme if not in context (server-side or outside provider)
    return {
      theme: "dark" as Theme,
      setTheme: () => {},
    }
  }
  return context
}
