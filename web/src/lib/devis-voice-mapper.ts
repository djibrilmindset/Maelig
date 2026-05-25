/**
 * Mapping intelligent extraction vocale → champs structurés du devis.
 *
 * Objectif : un senior dicte une phrase libre ("Madame Martin au 12 rue de la Gare à Brest"),
 * tous les bons champs se remplissent automatiquement sans qu'il ait à les ressaisir.
 */

const CIVILITES = [
  { match: /^(madame|mme)\s+/i, prenomFallback: "" },
  { match: /^(monsieur|mr|mr\.|m\.)\s+/i, prenomFallback: "" },
  { match: /^(mademoiselle|mlle)\s+/i, prenomFallback: "" },
]

const SOCIETE_KEYWORDS = /\b(sarl|sas|sasu|sa|eurl|sci|sci\b|sasu\b|cabinet|syndic|société|association|asbl|gie|snc|scop)\b/i

export interface ParsedClient {
  nom?: string
  prenom?: string
  raison_sociale?: string
  civilite?: string
}

/**
 * Parse "Madame Martin" → { civilite: "Madame", nom: "Martin" }
 * Parse "Cabinet Bouygues SARL" → { raison_sociale: "Cabinet Bouygues SARL" }
 * Parse "Jean Dupont" → { prenom: "Jean", nom: "Dupont" }
 * Parse "Dupont" → { nom: "Dupont" }
 */
export function parseClientHint(raw: string | undefined | null): ParsedClient {
  if (!raw) return {}
  const cleaned = raw.trim().replace(/\s+/g, " ")
  if (!cleaned) return {}

  // Société ?
  if (SOCIETE_KEYWORDS.test(cleaned)) {
    return { raison_sociale: cleaned }
  }

  // Civilité ?
  for (const c of CIVILITES) {
    const m = cleaned.match(c.match)
    if (m) {
      const rest = cleaned.replace(c.match, "").trim()
      const civ = capitalize(m[1])
      // Si reste = 1 mot → c'est le nom
      // Si reste = 2+ mots → premier = prénom, reste = nom
      const parts = rest.split(" ").filter(Boolean)
      if (parts.length === 1) return { civilite: civ, nom: capitalize(parts[0]) }
      if (parts.length >= 2) {
        return {
          civilite: civ,
          prenom: capitalize(parts[0]),
          nom: parts.slice(1).map(capitalize).join(" "),
        }
      }
      return { civilite: civ }
    }
  }

  // Pas de civilité : split prénom/nom si 2+ mots
  const parts = cleaned.split(" ").filter(Boolean)
  if (parts.length === 1) return { nom: capitalize(parts[0]) }
  if (parts.length >= 2) {
    return {
      prenom: capitalize(parts[0]),
      nom: parts.slice(1).map(capitalize).join(" "),
    }
  }
  return {}
}

export interface ParsedAdresse {
  adresse?: string
  cp?: string
  ville?: string
}

/**
 * Parse "12 rue de la Gare, 29200 Brest" → { adresse: "12 rue de la Gare", cp: "29200", ville: "Brest" }
 * Parse "12 rue de la Gare 75002 Paris" → { adresse: "12 rue de la Gare", cp: "75002", ville: "Paris" }
 * Parse "à Brest" → { ville: "Brest" }
 * Parse "Brest" → { ville: "Brest" }
 */
export function parseAdresse(raw: string | undefined | null): ParsedAdresse {
  if (!raw) return {}
  const cleaned = raw.trim().replace(/^(à|a|au|chez)\s+/i, "").replace(/\s+/g, " ")
  if (!cleaned) return {}

  // CP français = 5 chiffres
  const cpMatch = cleaned.match(/\b(\d{5})\b/)
  if (cpMatch) {
    const cp = cpMatch[1]
    const before = cleaned.slice(0, cpMatch.index).replace(/[,;-]\s*$/, "").trim()
    const after = cleaned.slice(cpMatch.index! + 5).replace(/^[,;-]\s*/, "").trim()
    return {
      adresse: before || undefined,
      cp,
      ville: after || undefined,
    }
  }

  // Pas de CP : si une virgule sépare rue / ville
  if (cleaned.includes(",")) {
    const [adr, ...rest] = cleaned.split(",").map((s) => s.trim()).filter(Boolean)
    return {
      adresse: adr,
      ville: rest.join(", ") || undefined,
    }
  }

  // Pas de chiffre ni virgule → probablement juste la ville
  if (!/\d/.test(cleaned)) {
    return { ville: cleaned }
  }

  // Fallback : tout dans adresse brute
  return { adresse: cleaned }
}

function capitalize(s: string): string {
  if (!s) return s
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase()
}

/**
 * Génère un objet de devis lisible à partir des données extraites.
 * Exemple : "Travaux électriques · 12 rue de la Gare, Brest"
 *           "Rénovation tableau · Mme Martin"
 */
export function deriveObjet(opts: {
  itemsDescriptions: string[]
  chantierAdresse?: string
  clientName?: string
}): string {
  const { itemsDescriptions, chantierAdresse, clientName } = opts
  const cats = inferCategories(itemsDescriptions)
  const base = cats.length > 0 ? cats.join(" + ") : "Travaux électriques"
  const where = chantierAdresse?.split(",")[0]?.trim() || clientName || ""
  return where ? `${base} · ${where}` : base
}

function inferCategories(descs: string[]): string[] {
  const set = new Set<string>()
  for (const d of descs) {
    const l = d.toLowerCase()
    if (/tableau|disjoncteur|différentiel|interrupteur diff/.test(l)) set.add("Tableau électrique")
    else if (/prise|inter|va-et-vient|interrupteur(?! diff)/.test(l)) set.add("Prises & interrupteurs")
    else if (/luminaire|dôme|spot|applique|suspension/.test(l)) set.add("Éclairage")
    else if (/radiateur|sèche-serviette|convecteur|chauffage/.test(l)) set.add("Chauffage")
    else if (/borne|irve|wallbox/.test(l)) set.add("IRVE")
    else if (/détecteur|caméra|alarme|sécurité/.test(l)) set.add("Sécurité")
    else if (/vmc|extracteur/.test(l)) set.add("VMC")
    else if (/câblage|câble|gaine/.test(l)) set.add("Câblage")
  }
  return Array.from(set).slice(0, 2)
}
