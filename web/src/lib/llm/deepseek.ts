/**
 * DeepSeek API — Fallback provider pour extraction structurée
 * quand DashScope (qwen-plus) est indisponible (compte impayé, timeout, etc.)
 *
 * ATTENTION : on hardcode l'URL api.deepseek.com ici — NE PAS utiliser
 * DEEPSEEK_BASE_URL qui sur Vercel pointe vers Comet (proxy différent).
 * Le fallback DOIT appeler DeepSeek directement pour garantir la compatibilité.
 */
const BASE = "https://api.deepseek.com"
const KEY = process.env.DEEPSEEK_API_KEY

export interface ChatMessage {
  role: "system" | "user" | "assistant"
  content: string
}

interface ChatOpts {
  model?: string
  messages: ChatMessage[]
  temperature?: number
  json?: boolean
  maxTokens?: number
}

export async function deepseekChat(
  opts: ChatOpts,
): Promise<{ text: string; inputTokens: number; outputTokens: number }> {
  const model = opts.model || "deepseek-chat"
  const temperature = opts.temperature ?? 0.1
  const key = KEY || process.env.DEEPSEEK_API_KEY
  if (!key) throw new Error("DEEPSEEK_API_KEY not configured")

  const body: Record<string, unknown> = {
    model,
    messages: opts.messages,
    temperature,
    max_tokens: opts.maxTokens ?? 1024,
  }

  // DeepSeek supports response_format only on newer models
  if (opts.json && model === "deepseek-chat") {
    body.response_format = { type: "json_object" }
  }

  const res = await fetch(`${BASE}/v1/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const err = await res.text().catch(() => "")
    throw new Error(`[deepseek] ${res.status} ${err.slice(0, 300)}`)
  }

  const data = (await res.json()) as {
    choices: Array<{ message: { content: string } }>
    usage?: { prompt_tokens: number; completion_tokens: number }
  }

  return {
    text: data.choices?.[0]?.message?.content ?? "",
    inputTokens: data.usage?.prompt_tokens ?? 0,
    outputTokens: data.usage?.completion_tokens ?? 0,
  }
}

/**
 * Extraction fallback via DeepSeek V4 Pro.
 * Même prompt que l'extraction DashScope mais avec modèle différent.
 * Appelé UNIQUEMENT si qwen-plus sur DashScope échoue.
 */
export async function extractDevisFallback(
  transcript: string,
  knownArticles: string[] = [],
): Promise<{
  client_hint?: string
  chantier_adresse?: string
  heures_main_oeuvre?: number
  items: Array<{ description: string; quantity: number; unit: string }>
  notes?: string
}> {
  const knownList =
    knownArticles.length > 0
      ? `Articles déjà connus du catalogue (à réutiliser exactement si correspondance):\n${knownArticles.slice(0, 80).map((a) => `- ${a}`).join("\n")}\n`
      : ""

  const sys = `Tu es un assistant pour électriciens qui transforme une description vocale de chantier en lignes de devis structurées.
${knownList}
L'électricien parle naturellement comme à un collègue. Tu dois EXTRAIRE l'intention métier :
- Quels matériels (avec quantités)
- Pour qui (nom du client, particulier ou entreprise)
- Où (adresse chantier)
- Combien de temps (main d'œuvre)
- Toute info utile pour le devis (étage, conditions d'accès, urgence…)

Renvoie STRICTEMENT un JSON conforme à ce schéma:
{
  "client_hint": "string|null",
  "chantier_adresse": "string|null",
  "heures_main_oeuvre": number|null,
  "notes": "string|null",
  "items": [
    {
      "description": "string",
      "quantity": number,
      "unit": "u|m|m2|ml|h|kg|ens|jour"
    }
  ]
}

Règles :
- Quantité absente → 1
- Unités : u (unité), m (mètre), m2, ml (mètre linéaire), h (heure), jour (8h), kg, ens (ensemble)
- 'différentiel quarante ampères' → description: 'Interrupteur différentiel 40A 30mA type AC'
- 'cinq prises' → qty: 5, description: 'Prise 16A 2P+T'
- N'invente jamais de matériel non mentionné
- Garde les noms, adresses, téléphones exactement comme dits`

  const { text } = await deepseekChat({
    model: "deepseek-chat",
    temperature: 0.1,
    json: true,
    messages: [
      { role: "system", content: sys },
      { role: "user", content: transcript.slice(0, 6000) },
    ],
  })

  try {
    const parsed = JSON.parse(text) as {
      client_hint?: string
      chantier_adresse?: string
      heures_main_oeuvre?: number
      items?: Array<{ description: string; quantity: number; unit: string }>
      notes?: string
    }
    return {
      client_hint: parsed.client_hint || undefined,
      chantier_adresse: parsed.chantier_adresse || undefined,
      heures_main_oeuvre:
        typeof parsed.heures_main_oeuvre === "number" ? parsed.heures_main_oeuvre : undefined,
      items: Array.isArray(parsed.items)
        ? parsed.items
            .map((it) => ({
              description: String(it.description ?? "").slice(0, 240) || "Article",
              quantity:
                Number.isFinite(Number(it.quantity)) && Number(it.quantity) > 0
                  ? Number(it.quantity)
                  : 1,
              unit: ["u", "m", "m2", "ml", "h", "kg", "ens", "jour"].includes(String(it.unit))
                ? (it.unit as string)
                : "u",
            }))
            .filter((it) => it.description !== "Article")
        : [],
      notes: parsed.notes || undefined,
    }
  } catch {
    return { items: [], notes: "Extraction impossible via DeepSeek." }
  }
}
