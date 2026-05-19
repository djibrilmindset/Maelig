/**
 * Rate limiting via Upstash Redis.
 * Si UPSTASH_REDIS_REST_URL / TOKEN absent en env, on désactive proprement
 * (renvoie always success). En prod il faut les configurer.
 *
 * Stratégie : 3 buckets selon le coût LLM de la route.
 */
import { Ratelimit } from "@upstash/ratelimit"
import { Redis } from "@upstash/redis"

const URL = process.env.UPSTASH_REDIS_REST_URL
const TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN

let redis: Redis | null = null
if (URL && TOKEN) {
  redis = new Redis({ url: URL, token: TOKEN })
} else if (process.env.NODE_ENV === "production") {
  console.warn("[ratelimit] UPSTASH_REDIS_REST_URL/TOKEN missing — rate limiting désactivé")
}

/** ASR + transcription complète (la plus chère) : 10 / min par user, 100 / jour par org. */
export const limitVoice = redis
  ? new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(10, "1 m"), prefix: "rl:voice", analytics: true })
  : null

export const limitVoiceDaily = redis
  ? new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(100, "1 d"), prefix: "rl:voice:d", analytics: true })
  : null

/** Correction texte (cheap) : 60 / min par user. */
export const limitText = redis
  ? new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(60, "1 m"), prefix: "rl:text", analytics: true })
  : null

/** Création incident (audio + photos) : 5 / min par user. */
export const limitIncident = redis
  ? new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(5, "1 m"), prefix: "rl:inc", analytics: true })
  : null

/** Stripe checkout : 10 / heure par user (protection contre spam billing). */
export const limitStripe = redis
  ? new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(10, "1 h"), prefix: "rl:stripe", analytics: true })
  : null

export interface LimitResult {
  success: boolean
  remaining: number
  reset: number
  limit: number
}

const NOOP: LimitResult = { success: true, remaining: 9999, reset: 0, limit: 9999 }

/** Helper combinant 2 limites (par user + par org/jour). Stoppe à la 1ère qui dépasse. */
export async function checkLimits(
  ...checks: Array<{ ratelimit: Ratelimit | null; key: string }>
): Promise<LimitResult> {
  for (const { ratelimit, key } of checks) {
    if (!ratelimit) continue
    const r = await ratelimit.limit(key)
    if (!r.success) {
      return { success: false, remaining: r.remaining, reset: r.reset, limit: r.limit }
    }
  }
  return NOOP
}

/** Renvoie la Response 429 standard avec les headers RateLimit-*. */
export function tooManyRequests(r: LimitResult): Response {
  return new Response(JSON.stringify({
    error: "rate_limit_exceeded",
    message: "Trop de requêtes. Patientez quelques instants.",
    reset_at: r.reset,
  }), {
    status: 429,
    headers: {
      "Content-Type": "application/json",
      "X-RateLimit-Limit": String(r.limit),
      "X-RateLimit-Remaining": String(r.remaining),
      "X-RateLimit-Reset": String(r.reset),
      "Retry-After": String(Math.max(1, Math.ceil((r.reset - Date.now()) / 1000))),
    },
  })
}
