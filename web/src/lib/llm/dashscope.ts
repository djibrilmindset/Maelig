/**
 * DASHSCOPE — STUB UNIQUEMENT pour compatibilité.
 * DashScope Alibaba ne fonctionne plus (compte en arrearage).
 * Tous les appels LLM sont redirigés vers DeepSeek (api.deepseek.com).
 *
 * Ces fonctions sont encore utilisées par :
 * - extract-text/route.ts (extraction structurée depuis texte)
 * - transcribe/route.ts (pipeline ASR → extraction)
 *
 * TODO: migrer ces routes vers extract.ts direct.
 */
import { hashLLMInput, llmCacheGet, llmCachePut, trackLLMUsage } from "./cache"
import { HIGHLIGHT_INSTRUCTION, stripMarkers } from "./highlight"

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
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${DS_KEY}`,
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const err = await res.text().catch(() => "")
    throw new Error(`[dashscope-stub→deepseek] ${res.status} ${err.slice(0, 200)}`)
  }

  const data = (await res.json()) as {
    choices: Array<{ message: { content: string } }>
    usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number }
  }

  return {
    text: data.choices?.[0]?.message?.content ?? "",
    raw: data,
    inputTokens: data.usage?.prompt_tokens ?? 0,
    outputTokens: data.usage?.completion_tokens ?? 0,
  }
}

/**
 * Correction FR — stub qui retourne le texte brut inchangé.
 * La correction orthographique est désactivée (DashScope arrearage).
 * La correction sera restaurée quand extract.ts sera finalisé.
 */
export async function correctFR(
  raw: string,
  opts: { orgId?: string; userId?: string; useHighlights?: boolean } = {},
): Promise<string> {
  const text = raw.slice(0, 4000)
  const useHighlights = opts.useHighlights !== false
  const cacheKey = hashLLMInput("qwen-turbo", useHighlights ? "correct_fr_hl" : "correct_fr", text)

  const cached = await llmCacheGet<{ corrected: string }>(cacheKey)
  if (cached?.corrected) {
    void trackLLMUsage({
      org_id: opts.orgId, user_id: opts.userId,
      model: "qwen-turbo", task: "correct_fr",
      cache_hit: true, cost_eur: 0,
    })
    return cleanText(cached.corrected)
  }

  // Appel DeepSeek avec prompt de correction FR
  const prompt: ChatMessage[] = [
    {
      role: "system",
      content:
        "Tu es un correcteur français professionnel pour un logiciel de devis d'électricien.\n" +
        "Corrige UNIQUEMENT les fautes d'orthographe et de grammaire.\n" +
        "Ne change PAS le sens, ne reformule PAS, ne réorganise PAS les phrases.\n" +
        (useHighlights
          ? `${HIGHLIGHT_INSTRUCTION}\n`
          : ""),
    },
    { role: "user", content: text },
  ]

  try {
    const result = await dashscopeChat({
      model: "deepseek-chat",
      messages: prompt,
      temperature: 0.05,
    })
    const corrected = result.text.slice(0, 5000) || text

    await llmCachePut(cacheKey, { corrected })
    void trackLLMUsage({
      org_id: opts.orgId, user_id: opts.userId,
      model: "deepseek-chat", task: "correct_fr",
      input_tokens: result.inputTokens,
      output_tokens: result.outputTokens,
      cost_eur: estimateCostEUR("deepseek-chat", result.inputTokens, result.outputTokens),
    })
    return cleanText(corrected)
  } catch {
    return cleanText(text) // fallback silencieux
  }
}

// ── Types d'extraction ──

export interface ExtractedItem {
  description: string
  quantity: number
  unit: "u" | "m" | "m2" | "ml" | "h" | "kg" | "ens"
  category?: string
  suggested_article_ref?: string
}

export interface ExtractedDevis {
  client_hint?: string
  client_nom?: string
  client_prenom?: string
  client_telephone?: string
  client_email?: string
  client_adresse?: string
  client_ville?: string
  client_cp?: string
  chantier_adresse?: string
  chantier_objet?: string
  heures_main_oeuvre?: number
  taux_horaire?: number
  items: ExtractedItem[]
  notes?: string
}

/**
 * Extraction structurée via DeepSeek V4 Flash.
 *
 * Prompt en français pour électriciens. Extrait articles, client, adresse, heures, notes.
 */
export async function extractDevisFromTranscript(transcript: string, knownArticles: string[] = []): Promise<ExtractedDevis> {
  const knownList = knownArticles.length
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
  "client_nom": "string|null",
  "client_prenom": "string|null",
  "client_telephone": "string|null",
  "client_email": "string|null",
  "client_adresse": "string|null",
  "client_ville": "string|null",
  "client_cp": "string|null",
  "chantier_adresse": "string|null",
  "chantier_objet": "string|null",
  "heures_main_oeuvre": number|null,
  "taux_horaire": number|null,
  "notes": "string|null",
  "items": [
    {
      "description": "string",
      "quantity": number,
      "unit": "u|m|m2|ml|h|kg|ens|jour",
      "category": "string|null",
      "suggested_article_ref": "string|null"
    }
  ]
}

Règles d'extraction :
- Quantités explicites : 'cinq prises' → 5. Quantité absente → 1.
- Unités : 'u' | 'm' | 'm2' | 'ml' | 'h' | 'jour' | 'kg' | 'ens'
- Demi-journée = 4h | journée = 8h | semaine = 40h.
- Reformule en français standard électricien (NF C 15-100).
- N'INVENTE JAMAIS de matériel non mentionné.
- Si le user dicte UNIQUEMENT les infos client (nom, adresse, téléphone) sans article du tout, extrais quand même les champs client et retourne items: [] vide.
- Si le texte est COURTS (juste un nom, juste un téléphone), extrais quand même client_hint et/ou client_telephone. '06.12.34.56.78' = client_telephone. 'Dupont' = client_hint + client_nom. 'Jean Dupont' = client_prenom + client_nom.
- Catégorie : devine intelligemment (mots-clés : 'prise', 'inter', 'va-et-vient' = Prise/Interrupteur ; 'disjoncteur', 'tableau', 'différentiel' = Tableau ; 'radiateur', 'convecteur' = Chauffage ; 'détecteur', 'caméra' = Sécurité ; 'borne', 'IRVE' = IRVE ; 'VMC' = VMC).
- Notes : capture toute info COMMERCIALE utile (urgent / fourniture client / accès difficile / neuf vs rénovation).`

  const { text } = await dashscopeChat({
    model: "deepseek-chat",
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
      client_nom: parsed.client_nom || undefined,
      client_prenom: parsed.client_prenom || undefined,
      client_telephone: parsed.client_telephone || undefined,
      client_email: parsed.client_email || undefined,
      client_adresse: parsed.client_adresse || undefined,
      client_ville: parsed.client_ville || undefined,
      client_cp: parsed.client_cp || undefined,
      chantier_adresse: parsed.chantier_adresse || undefined,
      chantier_objet: parsed.chantier_objet || undefined,
      heures_main_oeuvre: typeof parsed.heures_main_oeuvre === "number" ? parsed.heures_main_oeuvre : undefined,
      taux_horaire: typeof parsed.taux_horaire === "number" ? parsed.taux_horaire : undefined,
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

function cleanText(s: string): string {
  // Supprime les tirets cadratin et autres caractères problématiques
  return s.replace(/—/g, "-").replace(/–/g, "-").replace(/\u00AD/g, "").trim()
}

function estimateCostEUR(_model: string, _in: number, _out: number): number {
  return 0 // DeepSeek V4 Flash ≈ gratuit
}
