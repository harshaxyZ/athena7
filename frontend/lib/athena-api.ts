export type BackendHealth = {
  status: string
  service: string
  version: string
  model: string
  openrouter_configured: boolean
  sarvam_configured: boolean
}

export type UsageSummary = {
  total_tokens?: number
  total_cost_usd?: number
  total_cost_inr?: number
}

const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000").replace(/\/$/, "")

export type Beat = { time: number; action: string; objects: string; camera: string; narration: string; subtitle: string }
export type AnimationData = {
  type: "js_scene" | "scene"
  code?: string
  scene_json?: Record<string, unknown>
  topic?: string
  caption?: string
  narration?: string
  duration?: number
  total_duration?: number
  beats?: Beat[]
  audio_base64?: string
  voice_id?: string
  part?: number
  total_parts?: number
  plan?: { title?: string }
}
export type ChatEvent =
  | { type: "text"; content: string }
  | { type: "status"; content: string }
  | { type: "animation"; data: AnimationData }
  | { type: "animation_part"; data: AnimationData }
  | { type: "scene"; data: AnimationData }
  | { type: "animation_error" | "error"; content: string }
  | { type: "cost"; data: UsageSummary }
  | { type: "done"; conversation_id: string }

export async function streamChat(input: { message: string; conversationId?: string; file?: File; voice?: string; language?: string; signal?: AbortSignal; onEvent: (event: ChatEvent) => void }) {
  const body = new FormData()
  body.set("message", input.message)
  body.set("conversation_id", input.conversationId ?? "")
  body.set("language", input.language ?? "en-IN")
  body.set("voice", input.voice ?? "")
  if (input.file) body.set("file", input.file)
  const response = await fetch(`${API_URL}/api/chat`, { method: "POST", body, signal: input.signal })
  if (!response.ok || !response.body) throw new Error(`Athena backend unavailable (${response.status})`)
  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ""
  while (true) {
    const { value, done } = await reader.read()
    buffer += decoder.decode(value, { stream: !done })
    const frames = buffer.split("\n\n")
    buffer = frames.pop() ?? ""
    for (const frame of frames) {
      const line = frame.split("\n").find((item) => item.startsWith("data: "))
      if (line) input.onEvent(JSON.parse(line.slice(6)) as ChatEvent)
    }
    if (done) break
  }
}

export async function getBackendHealth(): Promise<BackendHealth> {
  const response = await fetch(`${API_URL}/health`, { cache: "no-store" })
  if (!response.ok) throw new Error(`Backend unavailable (${response.status})`)
  return response.json()
}

export async function createNarration(text: string): Promise<string> {
  const response = await fetch(`${API_URL}/api/narration`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, language: "en-IN" }),
  })
  if (!response.ok) throw new Error(`Narration unavailable (${response.status})`)
  return URL.createObjectURL(await response.blob())
}

export async function getGlobalUsage(): Promise<UsageSummary> {
  const response = await fetch(`${API_URL}/api/tokens/global`, { cache: "no-store" })
  if (!response.ok) throw new Error(`Usage unavailable (${response.status})`)
  return response.json()
}

export type ConversationSummary = {
  conversation_id: string
  title: string
  language: string
  created_at: number
  updated_at: number
  message_count: number
}

export async function getConversations(): Promise<ConversationSummary[]> {
  const response = await fetch(`${API_URL}/api/chat/conversations`, { cache: "no-store" })
  if (!response.ok) return []
  const data = await response.json()
  return data.conversations ?? []
}

export async function getConversation(conversationId: string) {
  const response = await fetch(`${API_URL}/api/chat/conversations/${conversationId}`, { cache: "no-store" })
  if (!response.ok) return null
  return response.json()
}

export async function deleteConversation(conversationId: string) {
  await fetch(`${API_URL}/api/chat/conversations/${conversationId}`, { method: "DELETE" })
}
