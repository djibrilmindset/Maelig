/**
 * Clarification IA — entre l'input vocal/texte et la construction du devis.
 *
 * Le but : éviter de construire un devis sur une mauvaise compréhension.
 * On résume CE QU'ON A COMPRIS, en bullet points clairs, avec des questions
 * de précision UNIQUEMENT si nécessaire. Le patron ou employé valide d'un mot.
 *
 * Sortie JSON :
 * {
 *   "summary": "1-2 phrases qui résument l'intention",
 *   "items": [{ "label": "...", "qty": 5, "unit": "u", "confidence": "high|medium|low" }],
 *   "client": "string|null",
 *   "site": "string|null",
 *   "labor_hours": number|null,
 *   "questions": ["string"]   // 0 à 3 questions de précision MAX
 * }
 */
import { dashscopeChat, type ChatMessage } from "./dashscope"
import { hashLLMInput, llmCacheGet, llmCachePut, trackLLMUsage, estimateCostEUR } from "./cache"
import { HIGHLIGHT_INSTRUCTION } from "./highlight"

export interface ClarificationItem {
  label: string
  qty: number
  unit: string
  confidence: "high" | "medium" | "low"
}

export interface Clarification {
  summary: string
  items: ClarificationItem[]
  client: string | null
  site: string | null
  labor_hours: number | null
  questions: string[]
}

export async function clarifyTranscript(
  text: string,
  contextHints?: { knownArticles?: string[]; knownClients?: string[]; orgId?: string; userId?: string },
): Promise<Clarification> {
  const input = text.slice(0, 4000)
  const cacheKey = hashLLMInput("qwen-plus", "clarify", input)
  const cached = await llmCacheGet<Clarification>(cacheKey)
  if (cached?.items) {
    void trackLLMUsage({ org_id: contextHints?.orgId, user_id: contextHints?.userId, model: "qwen-plus", task: "clarify", cache_hit: true, cost_eur: 0 })
    return cached
  }

  const hints =
    (contextHints?.knownArticles?.length
      ? `Articles déjà connus (utilise leur libellé exact si match):\n${contextHints.knownArticles.slice(0, 50).join("\n")}\n\n`
      : "") +
    (contextHints?.knownClients?.length
      ? `Clients connus (match approximatif autorisé):\n${contextHints.knownClients.slice(0, 30).join("\n")}\n\n`
      : "")

  const sys: ChatMessage = {
    role: "system",
    content:
      `Tu es l'assistant DEP, plateforme de devis pour électriciens.
Tu reçois ce qu'un patron ou un employé vient de dicter/écrire. Avant de monter le devis, RÉSUME ce que tu as compris, en français clair, et pose UNIQUEMENT les questions strictement nécessaires (zéro question si tout est clair).

${hints}
Réponds STRICTEMENT en JSON conforme à ce schéma :
{
  "summary": "1 ou 2 phrases (français, sans em-dash —, sans point final isolé), comme tu parlerais à un pote électricien",
  "items": [
    { "label": "Prise 16A étanche IP44", "qty": 5, "unit": "u", "confidence": "high|medium|low" }
  ],
  "client": "Nom du client si mentionné, sinon null",
  "site": "Adresse du chantier si mentionnée, sinon null",
  "labor_hours": 8,
  "questions": [
    "Au max 3 questions seulement si ambiguïté réelle (qté manquante, prix flou, doublon, etc.)"
  ]
}

Règles d'or :
- INTERDIT : tirets — ou ---, points isolés en fin de courte phrase, formulations type IA ('certainement', 'voici', 'je vais', 'permettez-moi').
- Si quantité absente : qty = 1 et confidence = "low".
- Si des infos manquent : extrais ce que tu as compris, liste dans questions UNIQUEMENT ce qui manque (1-2 max). Ne dis jamais "Je n'ai pas compris" — extrais toujours le maximum.
- Le ton est direct, chaleureux, comme un collègue. Pas robotique.
- Dans summary, ${HIGHLIGHT_INSTRUCTION.split('\n').slice(1, 4).join(' ')}`,
  }
  const user: ChatMessage = { role: "user", content: input }

  const t0 = Date.now()
  const { text: out, inputTokens, outputTokens } = await dashscopeChat({
    model: "qwen-plus",
    temperature: 0.15,
    json: true,
    messages: [sys, user],
  })

  try {
    const j = JSON.parse(out) as Partial<Clarification>
    const result: Clarification = {
      summary: j.summary?.toString() ?? "",
      items: Array.isArray(j.items)
        ? j.items.map((it) => ({
            label: String(it.label ?? "").slice(0, 240) || "Article",
            qty: Number.isFinite(Number(it.qty)) && Number(it.qty) > 0 ? Number(it.qty) : 1,
            unit: ["u", "m", "m2", "ml", "h", "kg", "ens"].includes(String(it.unit)) ? String(it.unit) : "u",
            confidence: (["high", "medium", "low"] as const).includes((it.confidence ?? "medium") as never)
              ? (it.confidence as ClarificationItem["confidence"])
              : "medium",
          }))
        : [],
      client: j.client ?? null,
      site: j.site ?? null,
      labor_hours: typeof j.labor_hours === "number" ? j.labor_hours : null,
      questions: Array.isArray(j.questions) ? j.questions.slice(0, 3).map(String) : [],
    }
    const cost = estimateCostEUR("qwen-plus", inputTokens, outputTokens)
    void llmCachePut({ hash: cacheKey, model: "qwen-plus", task: "clarify", input_preview: input.slice(0, 200), output: result, cost_saved_eur: cost })
    void trackLLMUsage({
      org_id: contextHints?.orgId, user_id: contextHints?.userId,
      model: "qwen-plus", task: "clarify", cache_hit: false,
      input_tokens: inputTokens, output_tokens: outputTokens,
      duration_ms: Date.now() - t0, cost_eur: cost,
    })
    return result
  } catch {
    return {
      summary: text.slice(0, 200),
      items: [],
      client: null,
      site: null,
      labor_hours: null,
      questions: ["Précise le client, l'adresse ou les articles si tu veux les ajouter."],
    }
  }
}
