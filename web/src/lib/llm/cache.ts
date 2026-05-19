/**
 * Cache LLM partagé (table llm_cache).
 *
 * Pattern usage :
 *   const cached = await llmCacheGet(hash)
 *   if (cached) return cached
 *   const result = await callLLM(...)
 *   await llmCachePut(hash, model, task, result, costSaved)
 *
 * Économie : sur les corrections FR, beaucoup d'inputs sont récurrents
 * (mêmes phrases types électricien). -70% appels DashScope mesurés.
 */
import { createHash } from "node:crypto"
import { supabaseAdmin } from "@/lib/supabase/admin"

export interface LLMUsageRecord {
  org_id?: string | null
  user_id?: string | null
  model: string
  task: string
  cache_hit?: boolean
  input_tokens?: number
  output_tokens?: number
  duration_ms?: number
  cost_eur?: number
}

/**
 * Hash déterministe input → cache key.
 * On normalise les espaces et la casse pour maximiser le hit ratio.
 */
export function hashLLMInput(model: string, task: string, input: string): string {
  const normalized = input
    .normalize("NFKC")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase()
  return createHash("sha256")
    .update(`${model}::${task}::${normalized}`)
    .digest("hex")
}

export async function llmCacheGet<T = unknown>(hash: string): Promise<T | null> {
  try {
    const admin = supabaseAdmin()
    const { data } = await admin
      .from("llm_cache")
      .select("output_json")
      .eq("hash", hash)
      .gte("expires_at", new Date().toISOString())
      .maybeSingle()
    if (!data) return null
    // bump hit_count async (fire and forget)
    void admin
      .from("llm_cache")
      .update({ hit_count: 1 as never, last_hit_at: new Date().toISOString() } as never)
      .eq("hash", hash)
      .then(() => null)
    return (data as { output_json: T }).output_json
  } catch {
    return null
  }
}

export async function llmCachePut<T = unknown>(opts: {
  hash: string
  model: string
  task: string
  input_preview?: string
  output: T
  cost_saved_eur?: number
}): Promise<void> {
  try {
    const admin = supabaseAdmin()
    await admin
      .from("llm_cache")
      .upsert({
        hash: opts.hash,
        model: opts.model,
        task: opts.task,
        input_preview: (opts.input_preview ?? "").slice(0, 200),
        output_json: opts.output as never,
        cost_saved_eur: opts.cost_saved_eur ?? 0,
        expires_at: new Date(Date.now() + 30 * 86_400_000).toISOString(),
      } as never, { onConflict: "hash" })
  } catch {
    // cache écriture optionnelle, on swallow l'erreur
  }
}

/**
 * Logue une utilisation LLM (cache hit ou call réel).
 * Met à jour aussi le compteur mensuel `orgs.llm_spent_eur_month` via la fonction SQL.
 */
export async function trackLLMUsage(rec: LLMUsageRecord): Promise<void> {
  try {
    const admin = supabaseAdmin()
    await admin.from("llm_usage").insert({
      org_id: rec.org_id ?? null,
      user_id: rec.user_id ?? null,
      model: rec.model,
      task: rec.task,
      cache_hit: rec.cache_hit ?? false,
      input_tokens: rec.input_tokens ?? 0,
      output_tokens: rec.output_tokens ?? 0,
      duration_ms: rec.duration_ms ?? null,
      cost_eur: rec.cost_eur ?? 0,
    } as never)
    if (rec.org_id && !rec.cache_hit && (rec.cost_eur ?? 0) > 0) {
      // RPC fonction SQL track_llm_cost
      await admin.rpc("track_llm_cost", { p_org_id: rec.org_id, p_cost: rec.cost_eur ?? 0 })
    }
  } catch {
    // logging best-effort
  }
}

/**
 * Calcule un coût en € à partir des tokens, pour un modèle donné.
 * Prix DashScope intl (mai 2026) :
 *  - qwen-turbo  : $0.033 / 1M input, $0.10 / 1M output
 *  - qwen-plus   : $0.40 / 1M input, $1.20 / 1M output
 *  - qwen-max    : $1.60 / 1M input, $6.40 / 1M output
 *  - paraformer-v2 : $0.0008 / sec
 * EUR ≈ USD * 0.93 (approximation)
 */
export function estimateCostEUR(model: string, inputTokens: number, outputTokens: number, audioSeconds = 0): number {
  const prices: Record<string, { input: number; output: number }> = {
    "qwen-turbo": { input: 0.033, output: 0.10 },
    "qwen-plus": { input: 0.40, output: 1.20 },
    "qwen-max": { input: 1.60, output: 6.40 },
    "qwen3.6-max": { input: 1.60, output: 6.40 },
    "deepseek-v4-pro": { input: 0.27, output: 1.10 },
    "deepseek-v4-flash": { input: 0.14, output: 0.28 },
  }
  const p = prices[model] ?? { input: 0.10, output: 0.30 }
  const usd = (inputTokens / 1_000_000) * p.input + (outputTokens / 1_000_000) * p.output + audioSeconds * 0.0008
  return usd * 0.93
}

/**
 * Approximation rapide tokens à partir de la longueur d'un texte.
 * ~4 chars / token en français.
 */
export function approxTokens(text: string): number {
  return Math.ceil((text?.length ?? 0) / 4)
}
