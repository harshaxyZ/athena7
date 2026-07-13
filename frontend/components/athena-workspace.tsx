"use client"

import { useRef, useState } from "react"
import { streamChat, type AnimationData, type UsageSummary } from "@/lib/athena-api"
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
import { AnimationPlayerSync } from "@/components/animation-player-sync"
import { AnimationSkeleton } from "@/components/animation-skeleton"
import { AthenaLoader, AthenaLogo } from "@/components/athena-logo"

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
  const [sidebar, setSidebar] = useState(true)
  const [mobileMenu, setMobileMenu] = useState(false)
  const [model, setModel] = useState("GLM 5.2")
  const [input, setInput] = useState("")
  const [started, setStarted] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [generationStep, setGenerationStep] = useState(0)
  const [secondsLeft, setSecondsLeft] = useState(30)
  const [elapsed, setElapsed] = useState(0)
  const [submittedPrompt, setSubmittedPrompt] = useState("")
  const [response, setResponse] = useState("")
  const [status, setStatus] = useState("")
  const [animation, setAnimation] = useState<AnimationData | null>(null)
  const [animationParts, setAnimationParts] = useState<AnimationData[]>([])
  const [currentPartIndex, setCurrentPartIndex] = useState(0)
  const [waitingForNextPart, setWaitingForNextPart] = useState(false)
  const [error, setError] = useState("")
  const [conversationId, setConversationId] = useState("")
  const [usage, setUsage] = useState<UsageSummary>({})
  const [attachment, setAttachment] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const generationSteps = [
    "Reading your question",
    "Planning the visual story",
    "Building scene 1 of 3",
    "Synchronizing narration",
    "Finishing the animation",
  ]

  const submit = async () => {
    const prompt = input.trim()
    if (!prompt || generating) return
    const startedAt = performance.now()
    setStarted(true); setGenerating(true); setSubmittedPrompt(prompt); setResponse(""); setAnimation(null); setError(""); setStatus("Understanding your request"); setElapsed(0); setInput("")
    try {
      await streamChat({ message: prompt, conversationId, file: attachment ?? undefined, onEvent: (event) => {
        setElapsed(Math.floor((performance.now() - startedAt) / 1000))
        if (event.type === "text") setResponse((value) => value + event.content)
        if (event.type === "status") setStatus(event.content)
        if (event.type === "animation") {
          setAnimation(event.data)
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
      } })
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Athena could not complete this request")
    } finally {
      setGenerating(false); setStatus(""); setAttachment(null)
    }
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
            <div className="min-w-0"><p className="truncate text-sm font-medium">{submittedPrompt || "New visual conversation"}</p><p className="hidden text-[11px] text-muted-foreground sm:block">Interactive learning session</p></div>
          </div>
          <div className="flex items-center gap-1.5 md:gap-2">
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
              <div className="ml-auto max-w-[85%] rounded-2xl rounded-br-md bg-primary px-4 py-3 text-sm leading-relaxed text-primary-foreground">{submittedPrompt}</div>
              <article className="flex max-w-3xl gap-3"><span className="mt-1 flex size-7 shrink-0 items-center justify-center rounded-full border border-border"><AthenaLogo className="size-4" /></span><div className="flex flex-col gap-4"><div><p className="text-xs font-medium text-muted-foreground">Athena</p><h2 className="mt-2 text-xl font-semibold tracking-tight">{generating && !response ? "Understanding your request" : "Here&apos;s the visual explanation."}</h2><p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-muted-foreground">{response || "Athena is preparing a concise explanation before directing the animation."}</p></div><div className="flex items-center gap-1"><button className="message-action"><Copy /> Copy</button><button className="message-action"><WandSparkles /> Animate</button></div></div></article>
              {generating ? (
                <>
                  {animationParts.length > 0 ? (
                    <section className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Sparkles className="size-4" />
                          <span>Playing part 1 of {animationParts[0]?.total_parts || 1}</span>
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
                      {waitingForNextPart && animationParts[currentPartIndex]?.total_parts && currentPartIndex < animationParts[currentPartIndex]!.total_parts! - 1 && (
                        <AnimationSkeleton
                          part={(currentPartIndex + 2)}
                          total_parts={animationParts[currentPartIndex]?.total_parts || 1}
                          message="Next part is being prepared"
                        />
                      )}
                    </section>
                  ) : (
                    <AnimationSkeleton
                      part={1}
                      total_parts={1}
                      message={status || generationSteps[generationStep] || "Generating animation..."}
                    />
                  )}
                </>
              ) : (
                <>
                  {animationParts.length > 0 && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Sparkles className="size-4" />
                      <span>Athena created {animationParts.length} scene{animationParts.length > 1 ? "s" : ""} in {Math.max(elapsed, 9)} seconds</span>
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
                      {animationParts.length > 1 && (
                        <div className="flex gap-2">
                          {animationParts.map((_, i) => (
                            <button
                              key={i}
                              onClick={() => setCurrentPartIndex(i)}
                              className={`flex-1 rounded-lg py-2 text-xs font-medium transition-colors ${
                                i === currentPartIndex
                                  ? "bg-primary text-primary-foreground"
                                  : "bg-muted text-muted-foreground hover:bg-muted/80"
                              }`}
                            >
                              Part {i + 1}
                            </button>
                          ))}
                        </div>
                      )}
                    </section>
                  ) : (
                    <div className="rounded-2xl border border-destructive/40 bg-destructive/10 p-5 text-sm text-destructive">
                      {error || "No animation was returned. Try describing the motion and objects more specifically."}
                    </div>
                  )}
                  {animationParts.length > 0 && (
                    <div className="grid grid-cols-2 gap-2 text-xs md:grid-cols-4">
                      <div className="metric-card"><span>Model</span><strong>S-tier</strong></div>
                      <div className="metric-card"><span>Generation</span><strong>{elapsed} seconds</strong></div>
                      <div className="metric-card"><span>Tokens</span><strong>{usage.total_tokens ?? "—"}</strong></div>
                      <div className="metric-card"><span>Cost</span><strong>{usage.total_cost_usd ? `₹${(usage.total_cost_usd * 82).toFixed(2)}` : "—"}</strong></div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        <footer className="shrink-0 bg-background px-3 pb-3 pt-2 md:px-6 md:pb-5">
          <div className="mx-auto max-w-4xl rounded-2xl border border-border bg-card p-2 shadow-[0_12px_48px_rgba(0,0,0,.12)] focus-within:ring-2 focus-within:ring-ring/30">
            <textarea value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing && event.keyCode !== 229) { event.preventDefault(); submit() } }} className="max-h-40 min-h-14 w-full resize-none bg-transparent px-3 py-2 text-sm leading-relaxed outline-none placeholder:text-muted-foreground" placeholder="Ask anything, or describe what you want to see..." />
            <div className="flex items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-1"><input ref={fileInputRef} type="file" className="sr-only" accept=".pdf,.txt,.md,.docx,.pptx" onChange={(event) => setAttachment(event.target.files?.[0] ?? null)} /><button className="composer-button" onClick={() => fileInputRef.current?.click()} aria-label="Attach study material"><Paperclip /></button><button className="composer-button" onClick={() => setInput("Animate how a lithium-ion battery stores and releases energy, with a microscopic view") } aria-label="Insert animation stress test"><WandSparkles /></button>{attachment ? <span className="flex min-w-0 items-center gap-1 rounded-lg bg-accent px-2 py-1 text-[11px]"><FileText className="size-3.5 shrink-0" /><span className="max-w-36 truncate">{attachment.name}</span><button onClick={() => setAttachment(null)} aria-label="Remove attachment"><X className="size-3" /></button></span> : <span className="hidden items-center gap-1 rounded-lg px-2 text-[11px] text-muted-foreground sm:flex"><FileText className="size-3.5" /> PDF, DOCX, PPTX</span>}</div>
              <div className="flex items-center gap-2"><span className="hidden items-center gap-1 text-[10px] text-muted-foreground md:flex"><Clock3 className="size-3" /> Visuals usually ready in under 30s</span><button onClick={submit} disabled={!input.trim()} className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground transition-transform hover:scale-[1.03] disabled:opacity-30" aria-label="Send"><ArrowUp /></button></div>
            </div>
          </div>
          <p className="mt-2 text-center text-[10px] text-muted-foreground">Athena can make mistakes. Check important facts.</p>
        </footer>
      </section>
    </main>
  )
}
