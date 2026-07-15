"use client"

import { useRef, useState, useMemo, useEffect, type ReactNode } from "react"
import { streamChat, type AnimationData, type UsageSummary, getConversations, type ConversationSummary, getConversation, deleteConversation } from "@/lib/athena-api"
import { useTheme } from "@/lib/theme-provider"
import {
  ArrowUp,
  Clock,
  Copy,
  FileText,
  Languages,
  Menu,
  MessageSquarePlus,
  Paperclip,
  PanelLeftClose,
  Sparkles,
  Settings,
  WandSparkles,
  X,
  History as HistoryIcon,
} from "lucide-react"
import { AnimationPlayerSync } from "@/components/animation-player-sync"
import { AnimationSkeleton } from "@/components/animation-skeleton"
import { AthenaLogo } from "@/components/athena-logo"

const ANIMATION_KEYWORDS = [
  "animate", "animation", "visual", "visualize", "show me",
  "diagram", "illustrate", "draw", "demonstrate",
  "graph", "chart", "visual explain", "explain using",
  "show how", "show the", "visualise",
]

const complexPrompts = [
  "Explain how a black hole forms and visualize the event horizon and spaghettification.",
  "Show me how photosynthesis works with an animated diagram of light absorption and glucose synthesis.",
  "Animate the water cycle showing evaporation, condensation, and precipitation.",
  "Visualize how DNA replicates with helicase unwinding and polymerase copying.",
  "Show how the human heart pumps blood through the circulatory system.",
  "Explain quantum entanglement and animate the EPR paradox.",
  "Demonstrate how electromagnetic waves propagate through space.",
  "Visualize the Fourier transform decomposing signals into sine waves.",
  "Show how atoms bond through covalent, ionic, and metallic bonding.",
  "Animate the immune system fighting an infection with antibodies and T-cells.",
]

const generationSteps = [
  "Reading your question",
  "Planning the visual story",
  "Choreographing animations",
  "Synchronising narration",
  "Finalising the scene",
]

/** Simple markdown renderer — handles **bold** and newlines */
function renderMarkdown(text: string) {
  const lines = text.split("\n")
  return lines.map((line, i) => {
    const parts: (string | ReactNode)[] = []
    const regex = /\*\*(.+?)\*\*/g
    let lastIndex = 0
    let match
    while ((match = regex.exec(line)) !== null) {
      if (match.index > lastIndex) parts.push(line.slice(lastIndex, match.index))
      parts.push(<strong key={`${i}-${match.index}`} className="font-bold text-foreground">{match[1]}</strong>)
      lastIndex = regex.lastIndex
    }
    if (lastIndex < line.length) parts.push(line.slice(lastIndex))
    if (parts.length === 0) parts.push(line)
    return (
      <span key={i}>
        {i > 0 && <br />}
        {parts}
      </span>
    )
  })
}

export function AthenaWorkspace() {
  const { theme, setTheme } = useTheme()
  const [sidebar, setSidebar] = useState(false)
  const [mobileMenu, setMobileMenu] = useState(false)
  const [settings, setSettings] = useState(false)
  const [input, setInput] = useState("")
  const [started, setStarted] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [generationStep, setGenerationStep] = useState(0)
  const [elapsed, setElapsed] = useState(0)
  const [submittedPrompt, setSubmittedPrompt] = useState("")
  const [firstPrompt, setFirstPrompt] = useState("")

  // Session name uses the FIRST prompt — stays fixed across the conversation
  const sessionName = useMemo(() => {
    const p = firstPrompt || submittedPrompt
    if (!p) return "New lesson"
    const words = p.split(" ").slice(0, 3).join(" ")
    return words.length > 30 ? words.slice(0, 30) + "..." : words
  }, [firstPrompt, submittedPrompt])

  const wantsAnimation = useMemo(() => {
    const lower = submittedPrompt.toLowerCase()
    return ANIMATION_KEYWORDS.some((kw) => lower.includes(kw))
  }, [submittedPrompt])

  type ChatMessage = { role: "user" | "assistant"; content: string; animation?: AnimationData[]; error?: string }
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [response, setResponse] = useState("")
  const [status, setStatus] = useState("")
  const [animationParts, setAnimationParts] = useState<AnimationData[]>([])
  const [currentPartIndex, setCurrentPartIndex] = useState(0)
  const [waitingForNextPart, setWaitingForNextPart] = useState(false)
  const [error, setError] = useState("")
  const [conversationId, setConversationId] = useState("")
  const [usage, setUsage] = useState<UsageSummary>({})
  const [voice, setVoice] = useState("shubh")
  const [language, setLanguage] = useState("en-IN")
  const [attachment, setAttachment] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const stepTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const [conversations, setConversations] = useState<ConversationSummary[]>([])
  const scrollRef = useRef<HTMLDivElement>(null)
  // Refs to track latest values for the finally block (avoids stale closure)
  const responseRef = useRef("")
  const animationPartsRef = useRef<AnimationData[]>([])
  const errorRef = useRef("")

  // Load conversation history on mount
  useEffect(() => {
    getConversations().then(setConversations).catch(() => {})
  }, [])

  // Auto-scroll to bottom when new content arrives
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, response, animationParts, generating])

  const submit = async () => {
    const prompt = input.trim()
    if (!prompt || generating) return
    const startedAt = performance.now()
    setStarted(true)
    setGenerating(true)
    setSubmittedPrompt(prompt)
    if (!firstPrompt) setFirstPrompt(prompt)
    // Add user message to history
    setMessages((prev) => [...prev, { role: "user", content: prompt }])
    setResponse("")
    responseRef.current = ""
    setAnimationParts([])
    animationPartsRef.current = []
    setCurrentPartIndex(0)
    setError("")
    errorRef.current = ""
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
        voice,
        language,
        onEvent: (event) => {
          setElapsed(Math.floor((performance.now() - startedAt) / 1000))
          if (event.type === "text") {
            setResponse((v) => {
              const new_val = v + event.content
              responseRef.current = new_val
              return new_val
            })
          }
          if (event.type === "status") setStatus(event.content)
          if (event.type === "animation" || event.type === "scene") {
            console.log("[Athena] Scene event received:", event.type, "has scene_json:", !!event.data?.scene_json, "data keys:", Object.keys(event.data || {}))
            setAnimationParts([event.data])
            animationPartsRef.current = [event.data]
            setCurrentPartIndex(0)
          }
          if (event.type === "animation_part") {
            setAnimationParts((prev) => {
              const updated = [...prev, event.data]
              animationPartsRef.current = updated
              return updated
            })
            setWaitingForNextPart(false)
          }
          if (event.type === "animation_error" || event.type === "error") {
            setError(event.content)
            errorRef.current = event.content
          }
          if (event.type === "cost") setUsage(event.data)
          if (event.type === "done") setConversationId(event.conversation_id)
        },
      })
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Athena could not complete this request")
    } finally {
      // Save assistant response to message history using refs (not stale state)
      const finalResponse = responseRef.current
      const finalParts = animationPartsRef.current
      const finalError = errorRef.current
      if (finalResponse || finalParts.length > 0 || finalError) {
        setMessages((prev) => {
          const lastMsg = prev[prev.length - 1]
          if (lastMsg?.role === "assistant" && lastMsg.content === finalResponse) return prev
          return [...prev, {
            role: "assistant",
            content: finalResponse,
            animation: finalParts.length > 0 ? finalParts : undefined,
            error: finalError || undefined,
          }]
        })
      }
      // Clear refs for next message
      responseRef.current = ""
      animationPartsRef.current = []
      errorRef.current = ""
      setGenerating(false)
      setStatus("")
      setAttachment(null)
      if (stepTimerRef.current) clearInterval(stepTimerRef.current)
      getConversations().then(setConversations).catch(() => {})
    }
  }

  const costInr = usage.total_cost_usd ? (usage.total_cost_usd * 84).toFixed(2) : null

  const SidebarContent = () => (
    <div className="flex h-full flex-col bg-sidebar p-3 text-sidebar-foreground">
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

      <button
        onClick={() => { setStarted(false); setResponse(""); setAnimationParts([]); setError(""); setSubmittedPrompt(""); setFirstPrompt(""); setConversationId(""); setUsage({}); setElapsed(0); setMessages([]) }}
        className="mt-4 flex w-full items-center gap-2.5 rounded-xl border border-border bg-card px-3 py-2.5 text-sm font-semibold transition-all duration-200 hover:bg-accent hover:scale-[1.01] active:scale-[0.99]"
      >
        <MessageSquarePlus className="size-4" /> New conversation
      </button>

      {conversations.length > 0 && (
        <div className="mt-5 flex items-center justify-between px-1">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Recent</p>
        </div>
      )}

      <nav className="mt-2 flex flex-col gap-0.5 overflow-y-auto flex-1">
        {conversations.map((conv) => (
          <button
            key={conv.conversation_id}
            onClick={async () => {
              setConversationId(conv.conversation_id)
              setStarted(true)
              setFirstPrompt(conv.title)
              setSubmittedPrompt(conv.title)
              // Load conversation messages
              const data = await getConversation(conv.conversation_id)
              if (data?.messages) {
                const userMsgs = data.messages.filter((m: {role: string}) => m.role === "user")
                const assistantMsgs = data.messages.filter((m: {role: string}) => m.role === "assistant")
                if (userMsgs.length > 0) setSubmittedPrompt(userMsgs[0].content)
                if (assistantMsgs.length > 0) setResponse(assistantMsgs[assistantMsgs.length - 1].content)
              }
            }}
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-all duration-150 text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          >
            <HistoryIcon className="size-4 shrink-0 opacity-60" />
            <span className="min-w-0 flex-1 truncate text-sm">{conv.title}</span>
          </button>
        ))}
      </nav>

      <div className="mt-auto flex flex-col gap-0.5 border-t border-sidebar-border pt-3">
        <button className="sidebar-link"><Languages className="size-4" /> Languages <span className="ml-auto text-[10px]">EN</span></button>
        <button className="sidebar-link" onClick={() => setSettings(!settings)}><Settings className="size-4" /> Settings</button>
      </div>
    </div>
  )

  return (
    <main className="flex h-dvh overflow-hidden bg-background text-foreground hide-scrollbar">
      {/* Sidebar — desktop */}
      {sidebar && (
        <aside className="hidden w-64 shrink-0 border-r border-sidebar-border lg:block">
          <SidebarContent />
        </aside>
      )}
      {/* Sidebar — mobile overlay */}
      {mobileMenu && (
        <>
          <button className="fixed inset-0 z-40 bg-foreground/20 backdrop-blur-sm lg:hidden" onClick={() => setMobileMenu(false)} aria-label="Close navigation" />
          <aside className="fixed inset-y-0 left-0 z-50 w-[min(84vw,20rem)] border-r border-sidebar-border bg-sidebar lg:hidden">
            <SidebarContent />
          </aside>
        </>
      )}

      {/* Main */}
      <section className="flex min-w-0 flex-1 flex-col">
        {/* Header */}
        <header className="flex h-12 shrink-0 items-center justify-between border-b border-border px-3 md:px-5">
          <div className="flex min-w-0 items-center gap-2">
            {!sidebar && (
              <button className="icon-button hidden lg:flex" onClick={() => setSidebar(true)} aria-label="Open sidebar">
                <Menu />
              </button>
            )}
            <button className="icon-button lg:hidden" onClick={() => setMobileMenu(true)} aria-label="Open navigation">
              <Menu />
            </button>
            <div className="ml-1 flex items-center gap-2">
              {started ? (
                <>
                  <AthenaLogo className="size-4" />
                  <span className="text-sm font-bold">Athena</span>
                  <span className="text-[10px] text-muted-foreground font-mono">v2.2</span>
                </>
              ) : (
                <span className="text-sm font-bold">Athena</span>
              )}
            </div>
            {submittedPrompt && (
              <div className="ml-3 min-w-0 hidden sm:block">
                <p className="truncate text-xs text-muted-foreground">{sessionName}</p>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            {(usage.total_tokens || elapsed > 0) && (
              <div className="hidden items-center gap-3 rounded-xl border border-border bg-card px-3 py-1.5 lg:flex">
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Tokens</p>
                  <p className="font-mono text-xs font-semibold text-foreground">{usage.total_tokens?.toLocaleString() ?? "—"}</p>
                </div>
                <div className="h-4 w-px bg-border" />
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Cost</p>
                  <p className="font-mono text-xs font-semibold text-foreground">{costInr ? `₹${costInr}` : "—"}</p>
                </div>
                <div className="h-4 w-px bg-border" />
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Time</p>
                  <p className="font-mono text-xs font-semibold text-foreground">{elapsed}s</p>
                </div>
              </div>
            )}

            <button onClick={() => setSettings(!settings)} className="icon-button relative" aria-label="Settings">
              <Settings />
            </button>
          </div>

          {/* Settings panel */}
          {settings && (
            <div className="absolute right-3 top-12 z-50 w-72 rounded-2xl border border-border bg-card p-4 shadow-2xl">
              <div className="space-y-4">
                <div>
                  <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">Appearance</p>
                  <div className="flex items-center gap-2 rounded-xl border border-border bg-accent p-1">
                    <button onClick={() => setTheme("light")} className={`flex-1 rounded-lg py-2 text-xs font-semibold transition-all ${theme === "light" ? "bg-background text-foreground" : "text-muted-foreground hover:text-foreground"}`}>Light</button>
                    <button onClick={() => setTheme("dark")} className={`flex-1 rounded-lg py-2 text-xs font-semibold transition-all ${theme === "dark" ? "bg-background text-foreground" : "text-muted-foreground hover:text-foreground"}`}>Dark</button>
                  </div>
                </div>
                <div className="border-t border-border pt-3">
                  <button onClick={() => { setStarted(false); setResponse(""); setAnimationParts([]); setError(""); setSettings(false); setSubmittedPrompt(""); setFirstPrompt(""); setConversationId(""); setUsage({}); setElapsed(0); setMessages([]) }} className="w-full rounded-lg bg-accent/50 px-3 py-2 text-xs font-semibold text-foreground transition-colors hover:bg-accent">Reset conversation</button>
                </div>
                <div>
                  <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">Voice</p>
                  <div className="flex items-center gap-2 rounded-xl border border-border bg-accent p-1">
                    <button onClick={() => setVoice("shubh")} className={`flex-1 rounded-lg py-2 text-xs font-semibold transition-all ${voice === "shubh" ? "bg-background text-foreground" : "text-muted-foreground hover:text-foreground"}`}>Male</button>
                    <button onClick={() => setVoice("shruti")} className={`flex-1 rounded-lg py-2 text-xs font-semibold transition-all ${voice === "shruti" ? "bg-background text-foreground" : "text-muted-foreground hover:text-foreground"}`}>Female</button>
                  </div>
                </div>
                <div>
                  <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">Language</p>
                  <div className="flex flex-wrap gap-1.5">
                    {[{ code: "en-IN", label: "EN" }, { code: "hi-IN", label: "HI" }, { code: "ta-IN", label: "TA" }, { code: "te-IN", label: "TE" }, { code: "bn-IN", label: "BN" }, { code: "mr-IN", label: "MR" }].map(({ code, label }) => (
                      <button key={code} onClick={() => setLanguage(code)} className={`rounded-lg px-3 py-1.5 text-[11px] font-bold transition-all ${language === code ? "bg-foreground text-background" : "bg-muted text-muted-foreground hover:bg-accent hover:text-foreground"}`}>{label}</button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </header>

        {/* Content scroll area */}
        <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto scroll-smooth hide-scrollbar">
          {!started ? (
            /* ── LANDING — minimal: just logo + tagline + chatbox ── */
            <div className="flex min-h-full flex-col items-center justify-center px-4">
              <div className="flex flex-col items-center gap-4 mb-12">
                <div className="flex size-14 items-center justify-center rounded-2xl border border-border bg-card">
                  <AthenaLogo className="size-8" />
                </div>
                <h1 className="text-3xl font-bold tracking-tight md:text-4xl">Learn with visuals</h1>
                <p className="text-sm text-muted-foreground">Ask anything — watch it come alive.</p>
              </div>
            </div>
          ) : (
            /* ── CONVERSATION ── */
            <div className="mx-auto flex max-w-4xl flex-col gap-6 px-4 py-6 md:px-8 md:py-8">
              {/* Render ALL previous messages */}
              {messages.map((msg, idx) => (
                <div key={idx}>
                  {msg.role === "user" ? (
                    <div className="flex justify-end">
                      <div className="max-w-[85%] rounded-2xl rounded-br-md bg-foreground px-5 py-3 text-sm font-medium leading-relaxed text-background">
                        {msg.content}
                      </div>
                    </div>
                  ) : (
                    <article className="flex max-w-4xl gap-3">
                      <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg border border-border bg-card">
                        <AthenaLogo className="size-3.5" />
                      </div>
                      <div className="flex min-w-0 flex-1 flex-col gap-3">
                        <div className="text-sm leading-7 text-muted-foreground">
                          {renderMarkdown(msg.content)}
                        </div>
                        {msg.animation && msg.animation.length > 0 && (
                          <AnimationPlayerSync
                            code={msg.animation[0]?.code || ""}
                            topic={msg.animation[0]?.topic || ""}
                            caption={msg.animation[0]?.caption || msg.content}
                            duration={msg.animation[0]?.duration || 14}
                            beats={msg.animation[0]?.beats || []}
                            audio_base64={msg.animation[0]?.audio_base64}
                            part={msg.animation[0]?.part || 1}
                            total_parts={msg.animation[0]?.total_parts || 1}
                            autoPlay={false}
                            voice={voice}
                            language={language}
                            onVoiceChange={setVoice}
                            onLanguageChange={setLanguage}
                          />
                        )}
                        {msg.error && (
                          <div className="rounded-2xl border border-border bg-card p-4 text-sm">
                            <p className="mb-1 font-semibold text-foreground">Animation failed</p>
                            <p className="text-muted-foreground">{msg.error}</p>
                          </div>
                        )}
                      </div>
                    </article>
                  )}
                </div>
              ))}

              {/* Current streaming response (not yet saved to history) */}
              {generating && response && (
                <article className="flex max-w-4xl gap-3">
                  <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg border border-border bg-card">
                    <AthenaLogo className="size-3.5" />
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col gap-3">
                    <div className="text-sm leading-7 text-muted-foreground">
                      {renderMarkdown(response)}
                    </div>
                  </div>
                </article>
              )}

              {/* Loading state while generating (before any response text) */}
              {generating && !response && (
                <article className="flex max-w-4xl gap-3">
                  <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg border border-border bg-card">
                    <AthenaLogo className="size-3.5" />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {status || "Thinking..."}
                    <span className="cursor" aria-hidden="true" />
                  </p>
                </article>
              )}

              {/* Animation area — show when animation parts exist during generation */}
              {generating && animationParts.length > 0 && (
                <section className="space-y-4">
                  <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5">
                    <Sparkles className="size-4 text-foreground" />
                    <span className="text-xs font-semibold text-foreground">
                      Part {currentPartIndex + 1} of {animationParts[0]?.total_parts || 1} · Generating...
                    </span>
                  </div>
                  <AnimationPlayerSync
                    code={animationParts[currentPartIndex]?.code}
                    sceneJSON={animationParts[currentPartIndex]?.scene_json}
                    topic={animationParts[currentPartIndex]?.topic || submittedPrompt}
                    caption={animationParts[currentPartIndex]?.caption || animationParts[currentPartIndex]?.narration || response}
                    duration={animationParts[currentPartIndex]?.total_duration || animationParts[currentPartIndex]?.duration || 14}
                    beats={animationParts[currentPartIndex]?.beats || []}
                    audio_base64={animationParts[currentPartIndex]?.audio_base64}
                    part={animationParts[currentPartIndex]?.part || 1}
                    total_parts={animationParts[currentPartIndex]?.total_parts || 1}
                    autoPlay={true}
                    voice={voice}
                    language={language}
                    onVoiceChange={setVoice}
                    onLanguageChange={setLanguage}
                    onPartEnd={() => {
                      if (currentPartIndex < animationParts.length - 1) {
                        setCurrentPartIndex(currentPartIndex + 1)
                      } else {
                        setWaitingForNextPart(true)
                      }
                    }}
                  />
                </section>
              )}

              {/* Loading skeleton for animation (before any parts arrive) */}
              {generating && animationParts.length === 0 && wantsAnimation && (
                <AnimationSkeleton
                  part={1}
                  total_parts={1}
                  message={status || generationSteps[generationStep]}
                  status={status}
                />
              )}
            </div>
          )}
        </div>

        {/* Composer — always at bottom */}
        <footer className="shrink-0 bg-background/80 px-3 pb-3 pt-2 backdrop-blur-sm md:px-6 md:pb-4">
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
                rows={1}
                className="max-h-20 min-h-[2.25rem] w-full resize-none bg-transparent px-3 py-2 text-sm leading-relaxed outline-none placeholder:text-muted-foreground/50"
                placeholder="Ask anything — or type 'animate' to see it in action..."
              />
              <div className="flex items-center justify-between gap-2 px-2 pb-2">
                <div className="flex items-center gap-1">
                  <input ref={fileInputRef} type="file" className="sr-only" accept=".pdf,.txt,.md,.docx,.pptx" onChange={(e) => setAttachment(e.target.files?.[0] ?? null)} />
                  <button className="composer-button" onClick={() => fileInputRef.current?.click()} aria-label="Attach file">
                    <Paperclip />
                  </button>
                  <button className="composer-button" onClick={() => { const p = complexPrompts[Math.floor(Math.random() * complexPrompts.length)]; setInput(p) }} aria-label="Random prompt" title="Random learning prompt">
                    <Sparkles />
                  </button>
                  {attachment && (
                    <span className="flex min-w-0 items-center gap-1.5 rounded-lg border border-border bg-accent px-2 py-1 text-[11px] font-medium text-foreground">
                      <FileText className="size-3.5 shrink-0" />
                      <span className="max-w-32 truncate">{attachment.name}</span>
                      <button onClick={() => setAttachment(null)} aria-label="Remove"><X className="size-3" /></button>
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={submit} disabled={!input.trim() || generating} className="send-button" aria-label="Send">
                    {generating ? (
                      <span className="size-4 animate-spin rounded-full border-2 border-background/30 border-t-background" />
                    ) : (
                      <ArrowUp className="size-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </footer>
      </section>
    </main>
  )
}
