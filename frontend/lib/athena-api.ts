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
