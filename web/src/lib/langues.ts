/**
 * Langues supportées par DEP - chantiers BTP France.
 *
 * Priorisation basée sur recherche INSEE / DARES / FFB / Capeb (mai 2026) :
 * - P0 : top 5, couvre 65-75% main d'œuvre BTP non-francophone (obligatoire v1)
 * - P1 : top 10, couvre 85-90% (rapide)
 * - P2 : long tail, couvre 95%+ (nice to have)
 *
 * Pièges importants à gérer côté translate.ts :
 * - "ary" et "arq" : darija (arabe dialectal maghrébin), NE PAS confondre avec
 *   l'arabe standard moderne (ar/MSA). Les ouvriers comprennent mal le MSA.
 * - "pt-PT" vs "pt-BR" : portugais européen dominant en France (Madère). pt-BR
 *   sonne mal aux ouvriers, ils râlent.
 * - "kab" (kabyle) et "shi" (chleuh) : amazigh, indépendants de l'arabe.
 *   ~1/3 des Algériens en France sont kabylophones L1.
 * - "tr" (turc) ≠ "kmr" (kurmandji) : à différencier à l'inscription.
 *
 * LLMs recommandés (cf. _research/langues_btp_france.md) :
 * - 95% du trafic (UE + darija) : qwen-turbo DashScope ($0.033/$0.10 par 1M)
 * - Backup gratuit MVP : glm-4.7-flash
 * - Precision darija + berbère : qwen3.6-max ou deepseek-v4-pro + glossaire BTP
 * - Langues africaines subsahariennes : pipeline NLLB-200 + qwen post-édition
 *   (aucun LLM chinois ne les fait bien tout seul)
 */
export type LanguePriorite = "P0" | "P1" | "P2"

export interface Langue {
  code: string
  name_fr: string
  native: string
  flag: string
  priority: LanguePriorite
  rtl?: boolean
  /** % estimé des ouvriers BTP non-francophones qui la parlent en France */
  share_pct?: number
  /** Pour darija : forcer dialecte non-MSA dans les prompts de traduction */
  is_dialectal?: boolean
  /** Pour wolof/bambara/peul/soninké : passer par NLLB-200 puis post-édition LLM */
  use_nllb_pipeline?: boolean
  notes?: string
}

export const LANGUES: Langue[] = [
  // ────────── P0 ──────────────────────────────────────────────
  {
    code: "fr", name_fr: "Français", native: "Français", flag: "🇫🇷",
    priority: "P0",
  },
  {
    code: "ary", name_fr: "Darija (arabe maghrébin)", native: "الدارجة",
    flag: "🇲🇦", rtl: true, priority: "P0", share_pct: 28, is_dialectal: true,
    notes: "Algérie + Maroc, langue véhiculaire dominante. NE PAS utiliser MSA.",
  },
  {
    code: "pt-PT", name_fr: "Portugais (Portugal)", native: "Português",
    flag: "🇵🇹", priority: "P0", share_pct: 20,
    notes: "Européen, pas BR. Madère = grosse communauté BTP.",
  },
  {
    code: "pl", name_fr: "Polonais", native: "Polski",
    flag: "🇵🇱", priority: "P0", share_pct: 13,
    notes: "N°1 du détachement européen sur les chantiers FR.",
  },
  {
    code: "ro", name_fr: "Roumain", native: "Română",
    flag: "🇷🇴", priority: "P0", share_pct: 11,
  },
  // ────────── P1 ──────────────────────────────────────────────
  {
    code: "kab", name_fr: "Kabyle (amazigh)", native: "Taqbaylit",
    flag: "🇩🇿", priority: "P1", share_pct: 7,
    notes: "Berbère algérien. 1/3 des Algériens en FR sont L1 kabyle.",
  },
  {
    code: "shi", name_fr: "Chleuh (amazigh)", native: "Tachelhit",
    flag: "🇲🇦", priority: "P1", share_pct: 4,
    notes: "Berbère marocain (Sud, Souss). Indépendant de la darija.",
  },
  {
    code: "tr", name_fr: "Turc", native: "Türkçe",
    flag: "🇹🇷", priority: "P1", share_pct: 4,
  },
  {
    code: "bm", name_fr: "Bambara", native: "Bamanankan",
    flag: "🇲🇱", priority: "P1", share_pct: 3, use_nllb_pipeline: true,
    notes: "Mali, lingua franca subsaharienne. Pipeline NLLB obligatoire.",
  },
  {
    code: "snk", name_fr: "Soninké", native: "Sooninke",
    flag: "🇲🇱", priority: "P1", share_pct: 2, use_nllb_pipeline: true,
    notes: "Mali/Sénégal, communauté BTP IDF.",
  },
  // ────────── P2 long tail ────────────────────────────────────
  {
    code: "wo", name_fr: "Wolof", native: "Wolof",
    flag: "🇸🇳", priority: "P2", share_pct: 2, use_nllb_pipeline: true,
  },
  {
    code: "ff", name_fr: "Peul (Fula)", native: "Fulfulde",
    flag: "🇸🇳", priority: "P2", share_pct: 2, use_nllb_pipeline: true,
  },
  {
    code: "kmr", name_fr: "Kurde (kurmandji)", native: "Kurdî",
    flag: "🇹🇷", priority: "P2", share_pct: 2,
    notes: "À différencier du turc à l'inscription.",
  },
  {
    code: "uk", name_fr: "Ukrainien", native: "Українська",
    flag: "🇺🇦", priority: "P2", share_pct: 2,
    notes: "Vague récente depuis 2022.",
  },
  {
    code: "bg", name_fr: "Bulgare", native: "Български",
    flag: "🇧🇬", priority: "P2", share_pct: 1,
  },
  {
    code: "es", name_fr: "Espagnol", native: "Español",
    flag: "🇪🇸", priority: "P2", share_pct: 1,
  },
  {
    code: "rif", name_fr: "Rifain (amazigh)", native: "Tarifit",
    flag: "🇲🇦", priority: "P2", share_pct: 1,
  },
  // ────────── Pour la traduction (utilitaires) ───────────────
  {
    code: "ar", name_fr: "Arabe standard (MSA)", native: "العربية",
    flag: "🌍", rtl: true, priority: "P2",
    notes: "À éviter sur les chantiers (incompris). Préférer darija.",
  },
  {
    code: "en", name_fr: "Anglais", native: "English",
    flag: "🇬🇧", priority: "P2",
  },
  {
    code: "it", name_fr: "Italien", native: "Italiano",
    flag: "🇮🇹", priority: "P2",
  },
  {
    code: "zh", name_fr: "Chinois", native: "中文",
    flag: "🇨🇳", priority: "P2",
  },
]

export const LANGUES_P0: Langue[] = LANGUES.filter((l) => l.priority === "P0")
export const LANGUES_P0_P1: Langue[] = LANGUES.filter((l) => l.priority !== "P2")
export const LANGUES_BY_CODE: Record<string, Langue> = Object.fromEntries(LANGUES.map((l) => [l.code, l]))

export function getLangue(code: string | null | undefined): Langue {
  if (!code) return LANGUES_BY_CODE.fr
  // Aliases : 'ary'/'arq' → darija unifié ; 'ar' → MSA séparé
  const aliases: Record<string, string> = {
    arq: "ary",   // arabe algérien → darija
    "ar-MA": "ary",
    "ar-DZ": "ary",
    "ar-TN": "ary",
    pt: "pt-PT",  // par défaut portugais européen
    "pt-BR": "pt-PT",
  }
  const normalized = aliases[code] ?? code
  return LANGUES_BY_CODE[normalized] ?? LANGUES_BY_CODE[code] ?? LANGUES_BY_CODE.fr
}

/** Retourne le drapeau d'une langue, ou un drapeau par défaut. */
export function getFlag(code: string | null | undefined): string {
  return getLangue(code).flag
}

/** Pour les selects UI : on propose P0 puis P1, P2 en "Autres". */
export function getLanguageOptions(): { group: string; items: Langue[] }[] {
  return [
    { group: "Recommandées", items: LANGUES.filter((l) => l.priority === "P0") },
    { group: "Fréquentes", items: LANGUES.filter((l) => l.priority === "P1") },
    { group: "Autres", items: LANGUES.filter((l) => l.priority === "P2") },
  ]
}
