/**
 * Highlighting des mots/segments incertains dans transcription + correction + traduction.
 *
 * Convention de marquage (placée par le LLM ou heuristiquement) :
 *  - «mot»   → confiance MOYENNE (orange) : à relire
 *  - ‹mot›   → confiance FAIBLE (rouge)   : à corriger / vérifier d'urgence
 *  - **mot** → mot technique préservé (jaune doux, juste pour visibilité)
 *
 * Output : tableau de segments { text, confidence } qu'on rend côté React
 * avec un composant <HighlightedText/>.
 */

export type SegmentConfidence = "high" | "medium" | "low" | "tech"

export interface Segment {
  text: string
  confidence: SegmentConfidence
}

const RE_LOW = /‹([^›]+)›/g
const RE_MEDIUM = /«([^»]+)»/g
const RE_TECH = /\*\*([^*]+)\*\*/g

/**
 * Parse un texte marqué et retourne les segments.
 * Préserve les espaces et la ponctuation entre les zones.
 */
export function parseHighlightMarkers(input: string): Segment[] {
  if (!input) return []
  // Combined regex pour split en respectant l'ordre
  const combined = /(‹[^›]+›|«[^»]+»|\*\*[^*]+\*\*)/g
  const parts = input.split(combined).filter((s) => s !== "")
  const segs: Segment[] = []
  for (const p of parts) {
    if (RE_LOW.test(p)) {
      segs.push({ text: p.slice(1, -1), confidence: "low" })
    } else if (RE_MEDIUM.test(p)) {
      segs.push({ text: p.slice(1, -1), confidence: "medium" })
    } else if (RE_TECH.test(p)) {
      segs.push({ text: p.slice(2, -2), confidence: "tech" })
    } else {
      segs.push({ text: p, confidence: "high" })
    }
    // reset regex lastIndex (RegExp état)
    RE_LOW.lastIndex = 0
    RE_MEDIUM.lastIndex = 0
    RE_TECH.lastIndex = 0
  }
  return segs
}

/**
 * Retire toutes les balises pour obtenir le texte propre (pour copier ou sauver clean).
 */
export function stripMarkers(input: string): string {
  if (!input) return ""
  return input
    .replace(/‹([^›]+)›/g, "$1")
    .replace(/«([^»]+)»/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
}

/**
 * Instruction commune à coller dans tous les prompts LLM qui produisent
 * du texte à relire. Demande au modèle de marquer les passages incertains.
 */
export const HIGHLIGHT_INSTRUCTION = `
RÈGLES DE MARQUAGE des passages incertains :
- Entoure de ‹ et › les mots où tu hésites VRAIMENT (sens ambigu, mot mal entendu, traduction approximative).
- Entoure de « et » les mots/expressions à RELIRE (nom propre potentiellement mal orthographié, chiffre douteux, terme rare).
- Entoure de ** et ** les termes techniques électricien préservés tels quels (références produit, normes, dimensions exactes).
- N'utilise CES MARQUEURS QUE quand c'est utile (max 3-4 marqueurs par phrase). Ne les utilise pas par défaut.
- Le but : que l'humain repère en 1 coup d'œil ce qui mérite vérification.
`.trim()
