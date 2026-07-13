"use client"

import { useEffect, useState } from "react"
import useSWR from "swr"
import {
  ArrowUp,
  Atom,
  BookOpen,
  ChevronDown,
  Clock3,
  Copy,
  FileText,
  FlaskConical,
  History,
  Languages,
  Menu,
  MessageSquarePlus,
  Paperclip,
  PanelLeftClose,
  Search,
  Settings,
  Sparkles,
  WandSparkles,
  X,
} from "lucide-react"
import { AnimationPlayer } from "@/components/animation-player"
import { AthenaLogo } from "@/components/athena-logo"
import { getBackendHealth } from "@/lib/athena-api"

const chats = [
  { title: "How photosynthesis works", time: "Now" },
  { title: "Fourier transform, visually", time: "2h" },
  { title: "Inside a lithium-ion battery", time: "Yesterday" },
  { title: "Why monsoons form", time: "Mon" },
]

const prompts = [
  { icon: Atom, label: "Quantum entanglement", detail: "Follow two particles across space" },
  { icon: FlaskConical, label: "CRISPR gene editing", detail: "Step inside a living cell" },
  { icon: BookOpen, label: "The Indian monsoon", detail: "Fly with the seasonal winds" },
]

export function AthenaWorkspace() {
  const { data: backend, error: backendError, isLoading: backendLoading } = useSWR(
    "athena-backend-health",
    getBackendHealth,
    { refreshInterval: 10_000, shouldRetryOnError: true },
  )
  const [sidebar, setSidebar] = useState(true)
  const [mobileMenu, setMobileMenu] = useState(false)
  const [model, setModel] = useState("GLM 5.2")
  const [input, setInput] = useState("")
  const [started, setStarted] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [generationStep, setGenerationStep] = useState(0)
  const [secondsLeft, setSecondsLeft] = useState(30)
  const [elapsed, setElapsed] = useState(0)

  const generationSteps = [
    "Reading your question",
    "Planning the visual story",
    "Building scene 1 of 3",
    "Synchronizing narration",
    "Finishing the animation",
  ]

  useEffect(() => {
    if (!generating) return
    const startedAt = performance.now()
    const interval = window.setInterval(() => {
      const nextElapsed = Math.floor((performance.now() - startedAt) / 1000)
      setElapsed(nextElapsed)
      setSecondsLeft(Math.max(0, 30 - nextElapsed))
      setGenerationStep(Math.min(generationSteps.length - 1, Math.floor(nextElapsed / 2)))
      if (nextElapsed >= 9) {
        setGenerating(false)
        window.clearInterval(interval)
      }
    }, 250)
    return () => window.clearInterval(interval)
  }, [generating, generationSteps.length])

  const submit = () => {
    if (!input.trim()) return
    setStarted(true)
    setGenerating(true)
    setGenerationStep(0)
    setSecondsLeft(30)
    setElapsed(0)
    setInput("")
  }

  const SidebarContent = () => (
    <div className="flex h-full flex-col bg-sidebar p-3 text-sidebar-foreground">
      <div className="flex items-center justify-between px-1 py-1">
        <div className="flex items-center gap-2.5"><AthenaLogo /><span className="text-sm font-semibold tracking-tight">Athena</span></div>
        <button className="icon-button" onClick={() => { setSidebar(false); setMobileMenu(false) }} aria-label="Close sidebar"><PanelLeftClose /></button>
      </div>
      <button className="mt-4 flex w-full items-center gap-2 rounded-xl bg-primary px-3 py-2.5 text-sm font-medium text-primary-foreground transition-transform active:scale-[.98]">
        <MessageSquarePlus /> New conversation
      </button>
      <div className="mt-5 flex items-center justify-between px-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Recent</p>
        <button className="text-muted-foreground hover:text-foreground" aria-label="Search chats"><Search className="size-4" /></button>
      </div>
      <nav className="mt-2 flex flex-col gap-1">
        {chats.map((chat, index) => (
          <button key={chat.title} className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors ${index === 0 ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"}`}>
            <History className="size-4 shrink-0" />
            <span className="min-w-0 flex-1 truncate text-sm">{chat.title}</span>
            <span className="text-[10px] opacity-50">{chat.time}</span>
          </button>
        ))}
      </nav>
      <div className="mt-auto flex flex-col gap-1 border-t border-sidebar-border pt-3">
        <button className="sidebar-link"><Languages /> Languages <span className="ml-auto text-[10px] text-muted-foreground">EN</span></button>
        <button className="sidebar-link"><Settings /> Settings</button>
        <button className="mt-2 flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-sidebar-accent">
          <span className="flex size-8 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">H</span>
          <span className="text-left"><span className="block text-sm font-medium">Harsh</span><span className="block text-[11px] text-muted-foreground">Learning workspace</span></span>
        </button>
      </div>
    </div>
  )

  return (
    <main className="flex h-dvh overflow-hidden bg-background text-foreground">
      {sidebar && <aside className="hidden w-64 shrink-0 border-r border-sidebar-border lg:block"><SidebarContent /></aside>}
      {mobileMenu && <><button className="fixed inset-0 z-40 bg-foreground/30 lg:hidden" onClick={() => setMobileMenu(false)} aria-label="Close navigation" /><aside className="fixed inset-y-0 left-0 z-50 w-[min(84vw,20rem)] border-r border-sidebar-border lg:hidden"><SidebarContent /></aside></>}

      <section className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-border px-3 md:px-5">
          <div className="flex min-w-0 items-center gap-2">
            {!sidebar && <button className="icon-button hidden lg:flex" onClick={() => setSidebar(true)} aria-label="Open sidebar"><Menu /></button>}
            <button className="icon-button lg:hidden" onClick={() => setMobileMenu(true)} aria-label="Open navigation"><Menu /></button>
            <div className="min-w-0"><p className="truncate text-sm font-medium">Photosynthesis, visually</p><p className="hidden text-[11px] text-muted-foreground sm:block">Interactive learning session</p></div>
          </div>
          <div className="flex items-center gap-1.5 md:gap-2">
            <div
              className="hidden items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-[11px] sm:flex"
              title={backendError ? "FastAPI on port 8000 is unreachable" : backend ? `${backend.service} v${backend.version}` : "Checking FastAPI on port 8000"}
              role="status"
            >
              <span className={`size-2 rounded-full ${backend ? "bg-primary" : backendError ? "bg-destructive" : "animate-pulse bg-muted-foreground"}`} />
              <span className="font-medium">{backend ? "Backend live" : backendError ? "Backend offline" : backendLoading ? "Connecting" : "Checking"}</span>
              <span className="hidden text-muted-foreground md:inline">:8000</span>
            </div>
            <div className="hidden items-center gap-3 rounded-xl border border-border bg-card px-3 py-1.5 lg:flex">
              <div><p className="text-[9px] uppercase tracking-wider text-muted-foreground">Tokens</p><p className="font-mono text-xs">2,482</p></div>
              <div className="h-5 w-px bg-border" />
              <div><p className="text-[9px] uppercase tracking-wider text-muted-foreground">Cost</p><p className="font-mono text-xs">$0.004 · ₹0.33</p></div>
              <div className="h-5 w-px bg-border" />
              <div><p className="text-[9px] uppercase tracking-wider text-muted-foreground">Render</p><p className="font-mono text-xs">18s / min</p></div>
            </div>
            <label className="relative">
              <span className="sr-only">Choose model</span>
              <select value={model} onChange={(event) => setModel(event.target.value)} className="h-9 appearance-none rounded-xl border border-border bg-card pl-3 pr-8 text-xs font-medium outline-none transition-colors hover:bg-accent focus:ring-2 focus:ring-ring">
                <option>GLM 5.2</option><option>Gemini 2.5 Flash</option><option>Mistral Small 3.1</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            </label>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {!started ? (
            <div className="mx-auto flex min-h-full max-w-4xl flex-col justify-center px-4 py-10 md:px-8">
              <div className="mb-8 flex max-w-2xl flex-col gap-4">
                <span className="flex size-12 items-center justify-center rounded-2xl border border-border bg-card shadow-sm"><AthenaLogo /></span>
                <div><p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Learn beyond words</p><h1 className="max-w-2xl text-balance text-3xl font-semibold tracking-[-0.04em] md:text-5xl">See difficult ideas come alive.</h1></div>
                <p className="max-w-xl text-pretty text-sm leading-relaxed text-muted-foreground md:text-base">Ask a question or share your study material. Athena turns explanations into narrated, interactive visual stories.</p>
              </div>
              <div className="grid gap-2 md:grid-cols-3">
                {prompts.map(({ icon: Icon, label, detail }) => <button key={label} onClick={() => setInput(`Teach me ${label.toLowerCase()} with a cinematic animation`)} className="group flex items-start gap-3 rounded-2xl border border-border bg-card p-4 text-left transition-all hover:-translate-y-0.5 hover:border-foreground/25 hover:shadow-lg"><span className="rounded-xl bg-accent p-2"><Icon className="size-4" /></span><span><span className="block text-sm font-medium">{label}</span><span className="mt-1 block text-xs leading-relaxed text-muted-foreground">{detail}</span></span></button>)}
              </div>
            </div>
          ) : (
            <div className="mx-auto flex max-w-5xl flex-col gap-8 px-3 py-6 md:px-8 md:py-10">
              <div className="ml-auto max-w-[85%] rounded-2xl rounded-br-md bg-primary px-4 py-3 text-sm leading-relaxed text-primary-foreground">Teach me photosynthesis with a cinematic animation. Take me inside the leaf.</div>
              <article className="flex max-w-3xl gap-3"><span className="mt-1 flex size-7 shrink-0 items-center justify-center rounded-full border border-border"><AthenaLogo className="size-4" /></span><div className="flex flex-col gap-4"><div><p className="text-xs font-medium text-muted-foreground">Athena</p><h2 className="mt-2 text-xl font-semibold tracking-tight">Let&apos;s travel inside a leaf.</h2><p className="mt-3 text-sm leading-7 text-muted-foreground">Plants do something extraordinary: they capture light and store it as chemical energy. I&apos;ve built a short visual journey through the chloroplast so you can watch every part of the process unfold.</p></div><div className="flex items-center gap-1"><button className="message-action"><Copy /> Copy</button><button className="message-action"><WandSparkles /> Animate</button></div></div></article>
              {generating ? (
                <section className="overflow-hidden rounded-2xl border border-border bg-card">
                  <div className="aspect-video bg-[#f3f2ed] p-5 text-[#121212] md:p-8">
                    <div className="flex h-full flex-col justify-between">
                      <div className="flex items-center justify-between"><span className="rounded-full border border-black/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[.16em]">Creating visual story</span><span className="font-mono text-xs text-black/55">{elapsed}s</span></div>
                      <div className="mx-auto flex max-w-md flex-col items-center gap-5 text-center">
                        <span className="relative flex size-16 items-center justify-center rounded-full border border-black/10"><Sparkles className="size-6" /><span className="absolute inset-0 animate-ping rounded-full border border-black/10" /></span>
                        <div><h3 className="text-balance text-xl font-semibold tracking-tight md:text-3xl">{generationSteps[generationStep]}</h3><p className="mt-2 text-sm text-black/55">Designing a smooth, narrated journey through the science.</p></div>
                      </div>
                      <div><div className="mb-2 flex items-center justify-between text-[10px] font-medium uppercase tracking-wider text-black/50"><span>Scene {Math.min(3, generationStep + 1)} of 3</span><span>Ready in about {secondsLeft}s</span></div><div className="h-1.5 overflow-hidden rounded-full bg-black/10"><div className="h-full rounded-full bg-[#121212] transition-[width] duration-500" style={{ width: `${Math.min(96, 10 + elapsed * 9)}%` }} /></div></div>
                    </div>
                  </div>
                </section>
              ) : (
                <>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground"><Sparkles className="size-4" /><span>Athena created 3 scenes in {Math.max(elapsed, 9)} seconds</span></div>
                  <AnimationPlayer />
                  <div className="grid grid-cols-2 gap-2 text-xs md:grid-cols-4"><div className="metric-card"><span>Model</span><strong>{model}</strong></div><div className="metric-card"><span>Generation</span><strong>{Math.max(elapsed, 9)} seconds</strong></div><div className="metric-card"><span>Duration</span><strong>1m 06s</strong></div><div className="metric-card"><span>Cost</span><strong>$0.004 · ₹0.33</strong></div></div>
                </>
              )}
            </div>
          )}
        </div>

        <footer className="shrink-0 bg-background px-3 pb-3 pt-2 md:px-6 md:pb-5">
          <div className="mx-auto max-w-4xl rounded-2xl border border-border bg-card p-2 shadow-[0_12px_48px_rgba(0,0,0,.12)] focus-within:ring-2 focus-within:ring-ring/30">
            <textarea value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing && event.keyCode !== 229) { event.preventDefault(); submit() } }} className="max-h-40 min-h-14 w-full resize-none bg-transparent px-3 py-2 text-sm leading-relaxed outline-none placeholder:text-muted-foreground" placeholder="Ask anything, or describe what you want to see..." />
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1"><button className="composer-button" aria-label="Attach study material"><Paperclip /></button><button className="composer-button" onClick={() => setInput("Animate how a lithium-ion battery stores and releases energy, with a microscopic view") } aria-label="Insert animation stress test"><WandSparkles /></button><span className="hidden items-center gap-1 rounded-lg px-2 text-[11px] text-muted-foreground sm:flex"><FileText className="size-3.5" /> PDF, DOCX, PPTX</span></div>
              <div className="flex items-center gap-2"><span className="hidden items-center gap-1 text-[10px] text-muted-foreground md:flex"><Clock3 className="size-3" /> Visuals usually ready in under 30s</span><button onClick={submit} disabled={!input.trim()} className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground transition-transform hover:scale-[1.03] disabled:opacity-30" aria-label="Send"><ArrowUp /></button></div>
            </div>
          </div>
          <p className="mt-2 text-center text-[10px] text-muted-foreground">Athena can make mistakes. Check important facts.</p>
        </footer>
      </section>
    </main>
  )
}
