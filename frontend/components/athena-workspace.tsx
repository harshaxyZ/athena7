"use client"

import { useRef, useState } from "react"
import { motion } from "framer-motion"
import { streamChat, type AnimationData, type UsageSummary } from "@/lib/athena-api"
import {
  ArrowUp,
  ChevronDown,
  Clock,
  Copy,
  FileText,
  History,
  Languages,
  Menu,
  MessageSquarePlus,
  Paperclip,
  PanelLeftClose,
  Sparkles,
  Settings,
  Zap,
  WandSparkles,
  X,
} from "lucide-react"
import { AnimationPlayerSync } from "@/components/animation-player-sync"
import { AnimationSkeleton } from "@/components/animation-skeleton"
import { AthenaLogo } from "@/components/athena-logo"

const chats = [
  { title: "How photosynthesis works", time: "Now" },
  { title: "Fourier transform, visually", time: "2h" },
  { title: "Inside a lithium-ion battery", time: "Yesterday" },
  { title: "Why monsoons form", time: "Mon" },
]



const generationSteps = [
  "Reading your question",
  "Planning the visual story",
  "Choreographing animations",
  "Synchronising narration",
  "Finalising the scene",
]

export function AthenaWorkspace() {
  const [sidebar, setSidebar] = useState(true)
  const [mobileMenu, setMobileMenu] = useState(false)
  const [model, setModel] = useState("Claude Sonnet 4.6")
  const [input, setInput] = useState("")
  const [started, setStarted] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [generationStep, setGenerationStep] = useState(0)
  const [elapsed, setElapsed] = useState(0)
  const [submittedPrompt, setSubmittedPrompt] = useState("")
  const [response, setResponse] = useState("")
  const [status, setStatus] = useState("")
  const [animationParts, setAnimationParts] = useState<AnimationData[]>([])
  const [currentPartIndex, setCurrentPartIndex] = useState(0)
  const [waitingForNextPart, setWaitingForNextPart] = useState(false)
  const [error, setError] = useState("")
  const [conversationId, setConversationId] = useState("")
  const [usage, setUsage] = useState<UsageSummary>({})
  const [attachment, setAttachment] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const stepTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const submit = async () => {
    const prompt = input.trim()
    if (!prompt || generating) return
    const startedAt = performance.now()
    setStarted(true)
    setGenerating(true)
    setSubmittedPrompt(prompt)
    setResponse("")
    setAnimationParts([])
    setCurrentPartIndex(0)
    setError("")
    setStatus("Understanding your request")
    setElapsed(0)
    setInput("")
    setGenerationStep(0)

    let step = 0
    stepTimerRef.current = setInterval(() => {
      step = Math.min(step + 1, generationSteps.length - 1)
      setGenerationStep(step)
    }, 6000)

    try {
      await streamChat({
        message: prompt,
        conversationId,
        file: attachment ?? undefined,
        onEvent: (event) => {
          setElapsed(Math.floor((performance.now() - startedAt) / 1000))
          if (event.type === "text") setResponse((v) => v + event.content)
          if (event.type === "status") setStatus(event.content)
          if (event.type === "animation") {
            setAnimationParts([event.data])
            setCurrentPartIndex(0)
          }
          if (event.type === "animation_part") {
            setAnimationParts((prev) => [...prev, event.data])
            setWaitingForNextPart(false)
          }
          if (event.type === "animation_error" || event.type === "error") setError(event.content)
          if (event.type === "cost") setUsage(event.data)
          if (event.type === "done") setConversationId(event.conversation_id)
        },
      })
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Athena could not complete this request")
    } finally {
      setGenerating(false)
      setStatus("")
      setAttachment(null)
      if (stepTimerRef.current) clearInterval(stepTimerRef.current)
    }
  }

  const costInr = usage.total_cost_usd ? (usage.total_cost_usd * 84).toFixed(2) : null

  const SidebarContent = () => (
    <div className="flex h-full flex-col bg-sidebar p-3 text-sidebar-foreground">
      {/* Brand */}
      <div className="flex items-center justify-between px-1 py-1">
        <div className="flex items-center gap-2.5">
          <div className="flex size-8 items-center justify-center rounded-xl border border-border bg-card">
            <AthenaLogo className="size-5" />
          </div>
          <span className="text-sm font-bold tracking-tight">Athena</span>
        </div>
        <button
          className="icon-button"
          onClick={() => { setSidebar(false); setMobileMenu(false) }}
          aria-label="Close sidebar"
        >
          <PanelLeftClose />
        </button>
      </div>

      {/* New chat */}
      <button
        onClick={() => { setStarted(false); setResponse(""); setAnimationParts([]); setError("") }}
        className="mt-4 flex w-full items-center gap-2.5 rounded-xl border border-border bg-card px-3 py-2.5 text-sm font-semibold transition-all duration-200 hover:bg-accent hover:scale-[1.01] active:scale-[0.99]"
      >
        <MessageSquarePlus className="size-4" /> New conversation
      </button>

      <div className="mt-5 flex items-center justify-between px-1">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Recent</p>
      </div>

      <nav className="mt-2 flex flex-col gap-0.5">
        {chats.map((chat, i) => (
          <button
            key={chat.title}
            className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-all duration-150 ${
              i === 0
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            }`}
          >
            <History className="size-4 shrink-0 opacity-60" />
            <span className="min-w-0 flex-1 truncate text-sm">{chat.title}</span>
            <span className="text-[10px] opacity-40">{chat.time}</span>
          </button>
        ))}
      </nav>

      <div className="mt-auto flex flex-col gap-0.5 border-t border-sidebar-border pt-3">
        <button className="sidebar-link"><Languages className="size-4" /> Languages <span className="ml-auto text-[10px]">EN</span></button>
        <button className="sidebar-link"><Settings className="size-4" /> Settings</button>
        <div className="mt-2 flex items-center gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-sidebar-accent">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-foreground text-xs font-bold text-background">
            A
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-semibold">Student</span>
            <span className="block text-[11px] text-muted-foreground">Learning workspace</span>
          </span>
        </div>
      </div>
    </div>
  )

  return (
    <main className="flex h-dvh overflow-hidden bg-background text-foreground">
      {/* Sidebar — desktop */}
      {sidebar && (
        <aside className="hidden w-64 shrink-0 border-r border-sidebar-border lg:block">
          <SidebarContent />
        </aside>
      )}
      {/* Sidebar — mobile overlay */}
      {mobileMenu && (
        <>
          <button
            className="fixed inset-0 z-40 bg-foreground/20 backdrop-blur-sm lg:hidden"
            onClick={() => setMobileMenu(false)}
            aria-label="Close navigation"
          />
          <aside className="fixed inset-y-0 left-0 z-50 w-[min(84vw,20rem)] border-r border-sidebar-border bg-sidebar lg:hidden">
            <SidebarContent />
          </aside>
        </>
      )}

      {/* Main */}
      <section className="flex min-w-0 flex-1 flex-col">
        {/* Header */}
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-border px-3 md:px-5">
          <div className="flex min-w-0 items-center gap-2">
            {!sidebar && (
              <button className="icon-button hidden lg:flex" onClick={() => setSidebar(true)} aria-label="Open sidebar">
                <Menu />
              </button>
            )}
            <button className="icon-button lg:hidden" onClick={() => setMobileMenu(true)} aria-label="Open navigation">
              <Menu />
            </button>
            {!sidebar && (
              <div className="ml-1 flex items-center gap-2 text-muted-foreground/60">
                <AthenaLogo className="size-5" />
                <span className="hidden text-sm font-semibold text-foreground sm:block">Athena</span>
              </div>
            )}
            <div className="ml-1 min-w-0">
              <p className="truncate text-sm font-semibold">
                {submittedPrompt || "New visual conversation"}
              </p>
              <p className="hidden text-[11px] text-muted-foreground sm:block">
                Interactive learning session
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Live stats pill */}
            {(usage.total_tokens || elapsed > 0) && (
              <div className="hidden items-center gap-3 rounded-xl border border-border bg-card px-3 py-1.5 lg:flex">
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Tokens</p>
                  <p className="font-mono text-xs font-semibold">{usage.total_tokens?.toLocaleString() ?? "—"}</p>
                </div>
                <div className="h-4 w-px bg-border" />
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Cost</p>
                  <p className="font-mono text-xs font-semibold">{costInr ? `₹${costInr}` : "—"}</p>
                </div>
                <div className="h-4 w-px bg-border" />
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Time</p>
                  <p className="font-mono text-xs font-semibold">{elapsed}s</p>
                </div>
              </div>
            )}

            <label className="relative">
              <span className="sr-only">Choose model</span>
              <select
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="h-9 appearance-none rounded-xl border border-border bg-card pl-3 pr-8 text-xs font-semibold outline-none transition-all hover:bg-accent focus:ring-2 focus:ring-ring/40"
              >
                <option>Claude Sonnet 4.6</option>
                <option>Qwen 3.6 Flash</option>
                <option>Claude Opus 4.8</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            </label>
          </div>
        </header>

        {/* Content scroll area */}
        <div className="min-h-0 flex-1 overflow-y-auto scroll-smooth">
          {!started ? (
            /* ── LANDING ─────────────────────────────────────────── */
            <div className="relative min-h-full overflow-hidden">
              {/* Animated background gradient */}
              <div className="pointer-events-none absolute inset-0">
                <div className="absolute -top-40 left-1/3 h-80 w-80 rounded-full bg-foreground/5 blur-3xl" />
                <div className="absolute -bottom-40 right-1/4 h-96 w-96 rounded-full bg-foreground/4 blur-3xl" />
              </div>

              <div className="relative mx-auto flex min-h-full max-w-3xl flex-col justify-center px-4 py-16 md:px-8 md:py-24">
                <motion.div
                  className="flex flex-col gap-8"
                  initial={{ opacity: 0, y: 32 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                >
                  {/* Logo badge */}
                  <motion.div
                    className="flex w-fit items-center gap-2 rounded-full border border-border bg-card px-4 py-2 backdrop-blur-sm transition-all hover:border-foreground/30 hover:bg-card/80"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className="flex size-8 items-center justify-center rounded-full bg-foreground/8">
                      <AthenaLogo className="size-4" />
                    </div>
                    <span className="text-xs font-semibold tracking-wide">Athena</span>
                    <span className="text-xs text-muted-foreground">AI Learning</span>
                  </motion.div>

                  {/* Main headline */}
                  <div>
                    <h1 className="text-balance text-5xl font-bold tracking-[-0.02em] leading-[1.15] md:text-7xl">
                      Learn through{" "}
                      <motion.span
                        className="relative inline-block"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.3, duration: 0.6 }}
                      >
                        <span className="absolute -inset-2 blur-xl bg-foreground/10" />
                        <span className="relative">motion.</span>
                      </motion.span>
                    </h1>
                  </div>

                  {/* Subtitle */}
                  <motion.p
                    className="max-w-2xl text-lg leading-relaxed text-muted-foreground md:text-xl"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2, duration: 0.6 }}
                  >
                    Upload documents. Ask questions. Watch concepts transform into stunning cinematic explanations in seconds. Powered by Claude Sonnet 4.6.
                  </motion.p>

                  {/* Stats/features grid */}
                  <motion.div
                    className="mt-6 grid gap-3 sm:grid-cols-3"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4, duration: 0.6 }}
                  >
                    {[
                      { label: "S-tier animations", value: "Canvas + GSAP" },
                      { label: "Precise narration", value: "Real-time sync" },
                      { label: "Any topic", value: "Zero limits" },
                    ].map(({ label, value }) => (
                      <motion.div
                        key={label}
                        className="group rounded-xl border border-border bg-card p-4 transition-all hover:border-foreground/40 hover:bg-accent"
                        whileHover={{ y: -2 }}
                      >
                        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground group-hover:text-foreground transition-colors">
                          {label}
                        </p>
                        <p className="mt-1.5 text-sm font-medium">{value}</p>
                      </motion.div>
                    ))}
                  </motion.div>

                  {/* CTA hint */}
                  <motion.div
                    className="mt-8 flex items-center gap-3 text-xs text-muted-foreground"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.6, duration: 0.6 }}
                  >
                    <div className="h-px flex-1 bg-border" />
                    <span>Start typing or upload a file above</span>
                    <div className="h-px flex-1 bg-border" />
                  </motion.div>
                </motion.div>
              </div>
            </div>
          ) : (
            /* ── CONVERSATION ────────────────────────────────────── */
            <div className="mx-auto flex max-w-4xl flex-col gap-8 px-3 py-8 md:px-8 md:py-10">
              {/* User bubble */}
              <div className="flex justify-end">
                <div className="max-w-[85%] rounded-2xl rounded-br-md bg-foreground px-5 py-3.5 text-sm font-medium leading-relaxed text-background">
                  {submittedPrompt}
                </div>
              </div>

              {/* Athena response */}
              <article className="flex max-w-3xl gap-3">
                <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-xl border border-border bg-card">
                  <AthenaLogo className="size-4" />
                </div>
                <div className="flex min-w-0 flex-col gap-4">
                  <div>
                    <p className="mb-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">Athena</p>
                    <h2 className="text-xl font-bold tracking-tight">
                      {generating && !response ? (
                        <span className="flex items-center gap-2 text-muted-foreground">
                          {status || generationSteps[generationStep]}
                          <span className="cursor" aria-hidden="true" />
                        </span>
                      ) : (
                        <span>{"Here's your visual explanation."}</span>
                      )}
                    </h2>
                    {response && (
                      <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-muted-foreground">
                        {response}
                      </p>
                    )}
                  </div>
                  {response && (
                    <div className="flex items-center gap-1">
                      <button className="message-action"><Copy className="size-3.5" /> Copy</button>
                      <button className="message-action" onClick={submit}><WandSparkles className="size-3.5" /> Animate again</button>
                    </div>
                  )}
                </div>
              </article>

              {/* Animation area */}
              {generating ? (
                <>
                  {animationParts.length > 0 ? (
                    <section className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                          <Sparkles className="size-4" />
                          <span>Part 1 of {animationParts[0]?.total_parts || 1} ready · Playing</span>
                        </div>
                        <span className="font-mono text-xs text-muted-foreground">{elapsed}s</span>
                      </div>
                      <AnimationPlayerSync
                        code={animationParts[currentPartIndex]?.code || ""}
                        topic={animationParts[currentPartIndex]?.topic || submittedPrompt}
                        caption={animationParts[currentPartIndex]?.caption || ""}
                        duration={animationParts[currentPartIndex]?.duration || 14}
                        beats={animationParts[currentPartIndex]?.beats || []}
                        part={animationParts[currentPartIndex]?.part || 1}
                        total_parts={animationParts[currentPartIndex]?.total_parts || 1}
                        autoPlay
                        onPartEnd={() => {
                          if (currentPartIndex < animationParts.length - 1) {
                            setCurrentPartIndex(currentPartIndex + 1)
                          } else {
                            setWaitingForNextPart(true)
                          }
                        }}
                      />
                      {waitingForNextPart &&
                        animationParts[currentPartIndex]?.total_parts != null &&
                        currentPartIndex < (animationParts[currentPartIndex]?.total_parts ?? 1) - 1 && (
                          <AnimationSkeleton
                            part={currentPartIndex + 2}
                            total_parts={animationParts[currentPartIndex]?.total_parts || 1}
                            message="Preparing next part"
                          />
                        )}
                    </section>
                  ) : (
                    <AnimationSkeleton
                      part={1}
                      total_parts={1}
                      message={status || generationSteps[generationStep]}
                    />
                  )}
                </>
              ) : (
                <>
                  {animationParts.length > 0 && (
                    <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5">
                      <Sparkles className="size-4 text-foreground" />
                      <span className="text-xs font-semibold text-foreground">
                        {animationParts.length} scene{animationParts.length > 1 ? "s" : ""} generated in {Math.max(elapsed, 7)}s
                      </span>
                      <span className="ml-auto text-xs text-muted-foreground">Claude Sonnet 4.6</span>
                    </div>
                  )}

                  {animationParts.length > 0 ? (
                    <section className="space-y-4">
                      <AnimationPlayerSync
                        code={animationParts[currentPartIndex]?.code || ""}
                        topic={animationParts[currentPartIndex]?.topic || submittedPrompt}
                        caption={animationParts[currentPartIndex]?.caption || response}
                        duration={animationParts[currentPartIndex]?.duration || 14}
                        beats={animationParts[currentPartIndex]?.beats || []}
                        part={animationParts[currentPartIndex]?.part}
                        total_parts={animationParts[currentPartIndex]?.total_parts}
                        autoPlay={false}
                        onPartEnd={() => {
                          if (currentPartIndex < animationParts.length - 1) {
                            setCurrentPartIndex(currentPartIndex + 1)
                          }
                        }}
                      />

                      {/* Part switcher */}
                      {animationParts.length > 1 && (
                        <div className="flex gap-2">
                          {animationParts.map((_, i) => (
                            <button
                              key={i}
                              onClick={() => setCurrentPartIndex(i)}
                              className={`flex-1 rounded-xl py-2.5 text-xs font-bold tracking-wide transition-all duration-200 ${
                                i === currentPartIndex
                                  ? "bg-foreground text-background"
                                  : "bg-muted text-muted-foreground hover:bg-accent hover:text-foreground"
                              }`}
                            >
                              Part {i + 1}
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Cost + time metrics */}
                      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                        <div className="metric-card">
                          <span>Animation engine</span>
                          <strong>Claude Sonnet 4.6</strong>
                        </div>
                        <div className="metric-card">
                          <span>Generation time</span>
                          <strong>{elapsed}s</strong>
                        </div>
                        <div className="metric-card">
                          <span>Tokens used</span>
                          <strong>{usage.total_tokens?.toLocaleString() ?? "—"}</strong>
                        </div>
                        <div className="metric-card">
                          <span>Total cost</span>
                          <strong>{costInr ? `₹${costInr}` : "—"}</strong>
                        </div>
                      </div>
                    </section>
                  ) : error ? (
                    <div className="rounded-2xl border border-border bg-card p-5 text-sm">
                      <p className="mb-1 font-semibold">Animation failed</p>
                      <p className="text-muted-foreground">{error}</p>
                    </div>
                  ) : null}
                </>
              )}
            </div>
          )}
        </div>

        {/* Composer */}
        <footer className="shrink-0 bg-background/80 px-3 pb-3 pt-2 backdrop-blur-sm md:px-6 md:pb-5">
          <div className="mx-auto max-w-3xl">
            <div className="rounded-2xl border border-border bg-card shadow-[0_8px_32px_rgba(0,0,0,0.25)] transition-all duration-300 focus-within:border-foreground/30">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing && e.keyCode !== 229) {
                    e.preventDefault()
                    submit()
                  }
                }}
                className="max-h-44 min-h-[3.5rem] w-full resize-none bg-transparent px-4 py-3.5 text-sm leading-relaxed outline-none placeholder:text-muted-foreground/50"
                placeholder={`Ask anything \u2014 \u201cHow does a black hole form?\u201d or paste your notes\u2026`}
              />
              <div className="flex items-center justify-between gap-2 px-2 pb-2">
                <div className="flex items-center gap-1">
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="sr-only"
                    accept=".pdf,.txt,.md,.docx,.pptx"
                    onChange={(e) => setAttachment(e.target.files?.[0] ?? null)}
                  />
                  <button className="composer-button" onClick={() => fileInputRef.current?.click()} aria-label="Attach study material">
                    <Paperclip />
                  </button>
                  <button
                    className="composer-button"
                    onClick={() => setInput("Animate how a black hole forms and warps spacetime with dramatic effects")}
                    aria-label="Try an example"
                  >
                    <WandSparkles />
                  </button>
                  {attachment ? (
                    <span className="flex min-w-0 items-center gap-1.5 rounded-lg border border-border bg-accent px-2.5 py-1 text-[11px] font-medium text-foreground">
                      <FileText className="size-3.5 shrink-0" />
                      <span className="max-w-36 truncate">{attachment.name}</span>
                      <button onClick={() => setAttachment(null)} aria-label="Remove attachment">
                        <X className="size-3" />
                      </button>
                    </span>
                  ) : (
                    <span className="hidden items-center gap-1 text-[11px] text-muted-foreground sm:flex">
                      <FileText className="size-3.5" /> PDF · DOCX · PPTX
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="hidden items-center gap-1 text-[10px] font-medium text-muted-foreground md:flex">
                    <Clock className="size-3" /> Ready in ~10–30s
                  </span>
                  <button
                    onClick={submit}
                    disabled={!input.trim() || generating}
                    className="send-button"
                    aria-label="Generate animation"
                  >
                    {generating ? (
                      <span className="size-4 animate-spin rounded-full border-2 border-background/30 border-t-background" />
                    ) : (
                      <ArrowUp className="size-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>
            <p className="mt-2 text-center text-[10px] text-muted-foreground/50">
              Athena can make mistakes. Verify important information.
        </p>
          </div>
        </footer>
      </section>
    </main>
  )
}
