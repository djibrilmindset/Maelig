/**
 * Analyse IA d'un incident chantier :
 *  - résume en 1 phrase claire (français propre)
 *  - classe l'urgence : urgent / important / normal / info
 *  - score de priorité 0..1 (composite)
 *  - propose une action immédiate au patron
 *
 * Input : transcript audio (déjà ASR + corrigé) + nombre/types de pièces jointes.
 * Output : structure typée.
 */
import { dashscopeChat, type ChatMessage } from "./dashscope"
import { trackLLMUsage, estimateCostEUR } from "./cache"

export type IncidentUrgency = "urgent" | "important" | "normal" | "info"

export interface IncidentAnalysis {
  titre: string
  urgency: IncidentUrgency
  ai_priorite_score: number
  ai_resume: string
  ai_action_recommandee: string
}

export async function analyzeIncident(opts: {
  transcript: string
  language?: string
  photo_count?: number
  video_count?: number
  chantier_label?: string
  client_label?: string
}): Promise<IncidentAnalysis> {
  const sys: ChatMessage = {
    role: "system",
    content: `Tu es l'assistant DEP pour électriciens. Un employé sur un chantier vient de signaler un problème par vocal + photos.
Ta mission : aider le patron à comprendre la situation EN 5 SECONDES.

Réponds STRICTEMENT en JSON conforme à ce schéma :
{
  "titre": "5-8 mots max, comme un titre de SMS, en français clair",
  "urgency": "urgent | important | normal | info",
  "ai_priorite_score": 0.0 à 1.0,
  "ai_resume": "2-3 phrases courtes en français, ton terrain, sans em-dash —",
  "ai_action_recommandee": "1 phrase d'action immédiate (ex: 'Rappeler le client', 'Couper le courant', 'Repasser demain matin')"
}

Règles de tri urgence :
- urgent : danger physique, coupure de courant, fuite, blessure, client furieux qui annule → score 0.85+
- important : retard chantier, matériel manquant bloquant, désaccord client, dégât matériel → 0.6-0.85
- normal : question, précision technique, doute sur câblage → 0.3-0.6
- info : photo de progression, simple remontée → 0-0.3

Style : direct, oral, comme à un collègue. INTERDIT : tirets — ou ---, formulations IA ("voici", "je vais", "permettez-moi"), point isolé en fin de courte phrase.

MARQUAGE confiance dans ai_resume : entoure de ‹ et › les mots dont tu doutes vraiment (mot mal entendu, sens ambigu), de « et » les mots à relire (nom propre, chiffre douteux). Max 2-3 marqueurs au total. N'utilise PAS ces marqueurs par défaut.`,
  }
  const user: ChatMessage = {
    role: "user",
    content: `${opts.chantier_label ? `Chantier : ${opts.chantier_label}\n` : ""}${opts.client_label ? `Client : ${opts.client_label}\n` : ""}Pièces jointes : ${opts.photo_count ?? 0} photo(s), ${opts.video_count ?? 0} vidéo(s)\nLangue détectée : ${opts.language ?? "fr"}\n\nMessage de l'employé :\n${opts.transcript.slice(0, 4000)}`,
  }

  const t0 = Date.now()
  const { text, inputTokens, outputTokens } = await dashscopeChat({
    model: "qwen-plus",
    temperature: 0.2,
    json: true,
    messages: [sys, user],
  })
  void trackLLMUsage({
    model: "qwen-plus", task: "analyze_incident", cache_hit: false,
    input_tokens: inputTokens, output_tokens: outputTokens,
    duration_ms: Date.now() - t0,
    cost_eur: estimateCostEUR("qwen-plus", inputTokens, outputTokens),
  })

  try {
    const j = JSON.parse(text) as Partial<IncidentAnalysis>
    const urgency: IncidentUrgency = (["urgent","important","normal","info"] as const).includes((j.urgency ?? "normal") as never)
      ? (j.urgency as IncidentUrgency)
      : "normal"
    const score = typeof j.ai_priorite_score === "number" ? Math.max(0, Math.min(1, j.ai_priorite_score)) : urgencyScore(urgency)
    return {
      titre: clean(j.titre ?? "Signalement chantier"),
      urgency,
      ai_priorite_score: score,
      ai_resume: clean(j.ai_resume ?? opts.transcript.slice(0, 200)),
      ai_action_recommandee: clean(j.ai_action_recommandee ?? "À traiter dès que possible."),
    }
  } catch {
    return {
      titre: "Signalement chantier",
      urgency: "normal",
      ai_priorite_score: 0.4,
      ai_resume: opts.transcript.slice(0, 200),
      ai_action_recommandee: "Voir le message complet de l'employé.",
    }
  }
}

function clean(s: string): string {
  return s.replace(/—/g, ",").replace(/–/g, "-").replace(/--+/g, "").trim()
}

function urgencyScore(u: IncidentUrgency): number {
  return { urgent: 0.9, important: 0.7, normal: 0.45, info: 0.2 }[u]
}

/**
 * Tableau de bord agrégé : à partir d'un set d'incidents ouverts,
 * propose au patron OÙ mettre son énergie EN PREMIER (1-2 actions max).
 */
export async function prioritizeForPatron(incidents: Array<{ titre: string; urgency: IncidentUrgency; ai_resume: string; created_at: string }>): Promise<{ next_actions: string[] }> {
  if (incidents.length === 0) return { next_actions: [] }

  const list = incidents
    .slice(0, 20)
    .map((i, idx) => `${idx + 1}. [${i.urgency.toUpperCase()}] ${i.titre} - ${i.ai_resume.slice(0, 120)}`)
    .join("\n")

  const sys: ChatMessage = {
    role: "system",
    content: `Tu es l'assistant DEP. Le patron a ${incidents.length} signalements ouverts.
Tu dois lui dire EN 1 à 2 actions max où mettre son énergie EN PREMIER ce matin, comme un chef d'équipe expérimenté qui prend du recul.
Réponds JSON : { "next_actions": ["action 1 directe", "action 2 directe"] }
Format actions : 1 phrase, verbe à l'infinitif ou impératif, max 80 caractères.
INTERDIT : tirets — ou ---, listes longues, conseils vagues, formulations IA.`,
  }
  const { text } = await dashscopeChat({
    model: "qwen-turbo",
    temperature: 0.3,
    json: true,
    messages: [sys, { role: "user", content: list }],
  })
  try {
    const j = JSON.parse(text) as { next_actions?: string[] }
    return { next_actions: Array.isArray(j.next_actions) ? j.next_actions.slice(0, 2).map(clean) : [] }
  } catch {
    return { next_actions: [] }
  }
}
