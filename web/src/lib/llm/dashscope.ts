/**
 * DASHSCOPE — STUB UNIQUEMENT pour compatibilité.
 * DashScope Alibaba ne fonctionne plus (compte en arrearage).
 * Tous les appels LLM sont redirigés vers DeepSeek (api.deepseek.com).
 *
 * Ces fonctions ne sont utilisées que par :
 * - clarify.ts, incidents.ts, translate.ts
 * - text/correct/route.ts, incidents/route.ts
 *
 * À terme, ces fichiers devront migrer vers extract.ts direct.
 */
const DS_BASE = "https://api.deepseek.com"
const DS_KEY = process.env.DEEPSEEK_API_KEY

export type ChatMessage = { role: "system" | "user" | "assistant"; content: string }

export async function dashscopeChat({
  model = "deepseek-chat",
  messages,
  temperature = 0.2,
  json = false,
  maxTokens,
}: {
  model?: string
  messages: ChatMessage[]
  temperature?: number
  json?: boolean
  maxTokens?: number
}): Promise<{ text: string; raw: unknown; inputTokens: number; outputTokens: number }> {
  if (!DS_KEY) throw new Error("DEEPSEEK_API_KEY not configured (DashScope migrated)")

  const body: Record<string, unknown> = {
    model,
    messages,
    temperature,
    ...(maxTokens ? { max_tokens: maxTokens } : {}),
  }
  if (json) body.response_format = { type: "json_object" }

  const res = await fetch(`${DS_BASE}/v1/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${DS_KEY}` },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const err = await res.text().catch(() => "")
    throw new Error(`[dashscope-stub→deepseek] ${res.status} ${err.slice(0, 200)}`)
  }

  const data = (await res.json()) as {
    choices: Array<{ message: { content: string } }>
    usage?: { prompt_tokens: number; completion_tokens: number }
  }

  return {
    text: data.choices?.[0]?.message?.content ?? "",
    raw: data,
    inputTokens: data.usage?.prompt_tokens ?? 0,
    outputTokens: data.usage?.completion_tokens ?? 0,
  }
}

/** Stub correctFR — retourne le texte inchangé (plus de correction DashScope) */
export async function correctFR(raw: string): Promise<string> {
  return raw
}
