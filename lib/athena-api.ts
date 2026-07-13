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

export async function getBackendHealth(): Promise<BackendHealth> {
  const response = await fetch("/backend/health", { cache: "no-store" })
  if (!response.ok) throw new Error(`Backend unavailable (${response.status})`)
  return response.json()
}

export async function getGlobalUsage(): Promise<UsageSummary> {
  const response = await fetch("/backend/api/tokens/global", { cache: "no-store" })
  if (!response.ok) throw new Error(`Usage unavailable (${response.status})`)
  return response.json()
}
