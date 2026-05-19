/**
 * DashScope (Alibaba Cloud) — Chinese LLM stack, OpenAI-compatible.
 * Used for: French correction, multilingual → French translation,
 * structured extraction of articles from speech transcripts.
 *
 * Models:
 * - qwen-turbo            : cheap, fast, FR correction (~$0.05/M in)
 * - qwen-plus             : mid-range, harder extraction
 * - qwen3-asr-flash       : speech-to-text (via separate ASR endpoint)
 */
const BASE = process.env.DASHSCOPE_BASE_URL || "https://dashscope-intl.aliyuncs.com/compatible-mode/v1"
const KEY = process.env.DASHSCOPE_API_KEY

if (!KEY) {
  // Won't crash build, but log when first used
  console.warn("[dashscope] DASHSCOPE_API_KEY missing — voice/correction features disabled")
}

export type ChatMessage = { role: "system" | "user" | "assistant"; content: string }

export async function dashscopeChat({
  model = "qwen-turbo",
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
}): Promise<{ text: string; raw: unknown }> {
  if (!KEY) throw new Error("DASHSCOPE_API_KEY not configured")
  const res = await fetch(`${BASE}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${KEY}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature,
      ...(json ? { response_format: { type: "json_object" } } : {}),
      ...(maxTokens ? { max_tokens: maxTokens } : {}),
    }),
  })
  if (!res.ok) {
    const err = await res.text().catch(() => "")
    throw new Error(`[dashscope] ${res.status} ${err.slice(0, 200)}`)
  }
  const data = (await res.json()) as { choices: Array<{ message: { content: string } }> }
  return { text: data.choices?.[0]?.message?.content ?? "", raw: data }
}

/**
 * Correct French text: spelling, grammar, sentence reconstruction.
 * Returns clean readable French. Strips em-dashes (CLAUDE.md feedback).
 */
export async function correctFR(raw: string): Promise<string> {
  const prompt: ChatMessage[] = [
    {
      role: "system",
      content:
        "Tu es un correcteur français professionnel pour un logiciel de devis d'électricien.\n" +
        "Reformule en français correct, clair et professionnel.\n" +
        "Garde le sens technique (prises, tableau, disjoncteur, etc.).\n" +
        "INTERDITS : tiret demi-cadratin (—), tiret cadratin (---), point final isolé en fin de phrase courte.\n" +
        "Si le texte est dans une autre langue (arabe, anglais, espagnol, créole, wolof, etc.), TRADUIS en français.\n" +
        "Réponds UNIQUEMENT avec le texte corrigé, sans préambule.",
    },
    { role: "user", content: raw.slice(0, 4000) },
  ]
  const { text } = await dashscopeChat({ model: "qwen-turbo", messages: prompt, temperature: 0.2 })
  return cleanText(text)
}

function cleanText(s: string): string {
  return s
    .replace(/—/g, ",")
    .replace(/–/g, "-")
    .replace(/---+/g, "")
    .replace(/--/g, "-")
    .trim()
}

/**
 * Extract devis line items from a free-form speech transcript.
 * Returns JSON array of items: { description, quantity, unit, suggestedPrice?, category? }
 */
export interface ExtractedItem {
  description: string
  quantity: number
  unit: "u" | "m" | "m2" | "ml" | "h" | "kg" | "ens"
  category?: string
  suggested_article_ref?: string
}

export interface ExtractedDevis {
  client_hint?: string
  chantier_adresse?: string
  heures_main_oeuvre?: number
  items: ExtractedItem[]
  notes?: string
}

export async function extractDevisFromTranscript(transcript: string, knownArticles: string[] = []): Promise<ExtractedDevis> {
  const knownList = knownArticles.length
    ? `Articles déjà connus du catalogue (à réutiliser exactement si correspondance):\n${knownArticles.slice(0, 80).map((a) => `- ${a}`).join("\n")}\n`
    : ""

  const sys = `Tu es un assistant pour électriciens qui transforme une description vocale de chantier en lignes de devis structurées.
${knownList}
Renvoie STRICTEMENT un JSON conforme à ce schéma:
{
  "client_hint": "string|null",            // si nom client mentionné
  "chantier_adresse": "string|null",       // si adresse mentionnée
  "heures_main_oeuvre": number|null,       // heures de pose si mentionnées
  "notes": "string|null",                  // remarques utiles non incluses dans items
  "items": [
    {
      "description": "string",             // libellé clair grand public (ex: 'Prise 16A étanche IP44')
      "quantity": number,                  // quantité numérique
      "unit": "u|m|m2|ml|h|kg|ens",
      "category": "string|null",           // 'Prise', 'Tableau', 'Câblage', 'Luminaire', 'Chauffage', 'Domotique', etc.
      "suggested_article_ref": "string|null"  // si correspond à un article déjà connu
    }
  ]
}
Règles :
- Identifie les quantités explicites (ex: 'cinq prises' → 5).
- Si quantité non précisée → 1.
- Unité par défaut: 'u' (unité). Câble → 'm'. Main d'œuvre → 'h'.
- Reformule les descriptions en français propre (vocabulaire électricien standard NF C 15-100).
- N'invente JAMAIS d'articles non mentionnés.`

  const { text } = await dashscopeChat({
    model: "qwen-plus",
    temperature: 0.1,
    json: true,
    messages: [
      { role: "system", content: sys },
      { role: "user", content: transcript.slice(0, 6000) },
    ],
  })

  try {
    const parsed = JSON.parse(text) as ExtractedDevis
    return {
      client_hint: parsed.client_hint || undefined,
      chantier_adresse: parsed.chantier_adresse || undefined,
      heures_main_oeuvre: typeof parsed.heures_main_oeuvre === "number" ? parsed.heures_main_oeuvre : undefined,
      items: Array.isArray(parsed.items) ? parsed.items.map(sanitizeItem) : [],
      notes: parsed.notes || undefined,
    }
  } catch {
    return { items: [], notes: "Extraction impossible — relisez le devis." }
  }
}

function sanitizeItem(it: Partial<ExtractedItem>): ExtractedItem {
  return {
    description: String(it.description ?? "").slice(0, 240) || "Article",
    quantity: Number.isFinite(Number(it.quantity)) && Number(it.quantity) > 0 ? Number(it.quantity) : 1,
    unit: (["u", "m", "m2", "ml", "h", "kg", "ens"].includes(String(it.unit))
      ? (it.unit as ExtractedItem["unit"])
      : "u"),
    category: it.category || undefined,
    suggested_article_ref: it.suggested_article_ref || undefined,
  }
}
