/**
 * Traduction multilingue via DashScope qwen-turbo.
 * Spécialisé BTP / chantiers : vocabulaire technique électrique préservé,
 * style direct, sans em-dash (— interdit par doctrine).
 */
import { dashscopeChat, type ChatMessage } from "./dashscope"
import { getLangue } from "@/lib/langues"

/**
 * Traduit un message d'un employé vers la langue du patron, ET vice-versa.
 * `from` et `to` sont des codes ISO (ou nos codes locaux : wo, bm, ff, etc.)
 */
export async function translateMessage(text: string, from: string, to: string): Promise<string> {
  if (!text?.trim()) return ""
  if (from === to) return text

  const fromL = getLangue(from)
  const toL = getLangue(to)

  // Pièges spécifiques :
  // - cible darija : forcer dialecte maghrébin, jamais MSA
  // - cible pt-PT : forcer portugais européen, jamais BR
  // - langues subsahariennes (use_nllb_pipeline) : qualité dégradée → flag
  const extra: string[] = []
  if (toL.is_dialectal && toL.code === "ary") {
    extra.push(
      "ATTENTION : la cible est l'arabe dialectal MAGHRÉBIN (darija algéro-marocaine), PAS l'arabe standard (MSA). " +
      "Utilise le vocabulaire courant des chantiers (cf. termes empruntés au français : zerda, briket, kafrour, etc.). " +
      "Garde la phrase courte et orale.",
    )
  }
  if (toL.code === "pt-PT") {
    extra.push("ATTENTION : portugais EUROPÉEN (Portugal), pas brésilien. Vocabulaire et conjugaison de Lisbonne.")
  }
  if (toL.use_nllb_pipeline) {
    extra.push("Cette langue est moins bien couverte par les LLMs. Sois prudent : si tu n'es pas sûr d'un terme technique, garde-le en français entre parenthèses.")
  }

  const sys: ChatMessage = {
    role: "system",
    content:
      `Tu es un traducteur professionnel pour chantiers d'électricité en France. ` +
      `Traduis ce message de ${fromL.name_fr} (${fromL.native}) vers ${toL.name_fr} (${toL.native}). ` +
      `Préserve TOUS les termes techniques (prise, disjoncteur, NF C 15-100, kW, A, IP44, etc.). ` +
      `Style direct, oral, comme à un collègue. INTERDIT : tiret demi-cadratin —, tiret cadratin ---. ` +
      `Noms propres (lieu, personne) : garde-les tels quels. ` +
      (extra.length ? `\n${extra.join("\n")}\n` : "") +
      `Réponds UNIQUEMENT avec la traduction, sans guillemets ni préambule.`,
  }
  const user: ChatMessage = { role: "user", content: text.slice(0, 3500) }
  const { text: out } = await dashscopeChat({
    model: pickModel(toL),
    messages: [sys, user],
    temperature: 0.2,
  })
  return clean(out)
}

/**
 * Routing modèle :
 * - darija dialectal + berbère + langues subsahariennes : qwen-plus (meilleur sur dialectes)
 * - Europe + portugais + turc : qwen-turbo (4× moins cher, qualité suffisante)
 */
function pickModel(target: { is_dialectal?: boolean; use_nllb_pipeline?: boolean; code: string }): string {
  if (target.is_dialectal || target.use_nllb_pipeline || ["kab", "shi", "rif"].includes(target.code)) {
    return "qwen-plus"
  }
  return "qwen-turbo"
}

/**
 * Traduit un message en MULTIPLES langues en parallèle (1 appel = tableau).
 * Optimisé pour la chat : on envoie 1 fois, on stocke FR + AR + PT + … dans translations jsonb.
 */
export async function translateMany(text: string, fromLang: string, targets: string[]): Promise<Record<string, string>> {
  const out: Record<string, string> = { [fromLang]: text }
  const toFetch = targets.filter((t) => t !== fromLang)
  if (toFetch.length === 0) return out

  const results = await Promise.all(toFetch.map((t) => translateMessage(text, fromLang, t).catch(() => null)))
  toFetch.forEach((t, i) => {
    if (results[i]) out[t] = results[i]!
  })
  return out
}

/**
 * Détection rapide de la langue d'un texte (qwen-turbo en mode classification).
 * Retourne un code de notre table LANGUES (ou 'fr' par défaut).
 */
export async function detectLanguage(text: string): Promise<string> {
  if (!text?.trim()) return "fr"
  const { text: out } = await dashscopeChat({
    model: "qwen-turbo",
    temperature: 0,
    messages: [
      {
        role: "system",
        content:
          `Identifie la langue principale du texte suivant. ` +
          `Réponds UNIQUEMENT avec le code ISO 639-1 ou un de ces codes spéciaux : ` +
          `fr, ar, pt, es, it, en, tr, pl, ro, bg, wo, bm, ff, soninke, kab, zh, de, nl, ru, uk. ` +
          `Aucun autre texte, juste le code.`,
      },
      { role: "user", content: text.slice(0, 1500) },
    ],
  })
  return clean(out).toLowerCase().slice(0, 12)
}

function clean(s: string) {
  return s
    .replace(/—/g, ",")
    .replace(/–/g, "-")
    .replace(/--+/g, "")
    .replace(/^["'`]+|["'`]+$/g, "")
    .trim()
}
