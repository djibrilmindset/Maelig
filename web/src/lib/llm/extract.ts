/**
 * Extraction structurée de devis via DeepSeek V4 Pro — PRIMARY provider.
 * Remplace définitivement DashScope (Alibaba) qui était en arrearage.
 *
 * Endpoint : api.deepseek.com (hardcodé — NE PAS utiliser DEEPSEEK_BASE_URL
 * qui sur Vercel pointe vers Comet, un proxy différent).
 * Modèle : deepseek-chat (DeepSeek V4 Flash, quasi gratuit).
 */
const BASE = "https://api.deepseek.com"
const KEY = process.env.DEEPSEEK_API_KEY

export async function extractDevis(
  transcript: string,
  knownArticles: string[] = [],
): Promise<{
  client_hint?: string
  chantier_adresse?: string
  heures_main_oeuvre?: number
  items: Array<{ description: string; quantity: number; unit: string; category?: string }>
  notes?: string
}> {
  if (!KEY) throw new Error("DEEPSEEK_API_KEY not configured")

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

Règles d'extraction :
- Quantités explicites : 'cinq prises' → quantity: 5.
- Quantité absente → 1 par défaut.
- Unités : u (unité), m (mètre), m2, ml (mètre linéaire), h (heure), jour (8h), kg, ens (ensemble)
- 'différentiel quarante ampères' → description: 'Interrupteur différentiel 40A 30mA type AC'
- 'cinq prises' → qty: 5, description: 'Prise 16A 2P+T'
- N'invente jamais de matériel non mentionné. Pas de 'goulotte' si pas dit.
- Garde les noms propres, adresses, téléphones EXACTEMENT comme dits.`

  const res = await fetch(`${BASE}/v1/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${KEY}`,
    },
    body: JSON.stringify({
      model: "deepseek-chat",
      messages: [
        { role: "system", content: sys },
        { role: "user", content: transcript.slice(0, 6000) },
      ],
      response_format: { type: "json_object" },
      temperature: 0.1,
      max_tokens: 1024,
    }),
  })

  if (!res.ok) {
    const err = await res.text().catch(() => "")
    throw new Error(`[deepseek] ${res.status} ${err.slice(0, 300)}`)
  }

  const data = (await res.json()) as {
    choices: Array<{ message: { content: string } }>
  }

  const text = data.choices?.[0]?.message?.content ?? ""

  try {
    const parsed = JSON.parse(text) as {
      client_hint?: string
      chantier_adresse?: string
      heures_main_oeuvre?: number
      items?: Array<{ description: string; quantity: number; unit: string; category?: string }>
      notes?: string
    }

    return {
      client_hint: parsed.client_hint || undefined,
      chantier_adresse: parsed.chantier_adresse || undefined,
      heures_main_oeuvre:
        typeof parsed.heures_main_oeuvre === "number" ? parsed.heures_main_oeuvre : undefined,
      items: Array.isArray(parsed.items)
        ? parsed.items
            .map((it: Record<string, unknown>) => ({
              description: String(it.description ?? "").slice(0, 240) || "Article",
              quantity:
                Number.isFinite(Number(it.quantity)) && Number(it.quantity) > 0
                  ? Number(it.quantity)
                  : 1,
              unit: ["u", "m", "m2", "ml", "h", "kg", "ens", "jour"].includes(String(it.unit))
                ? (it.unit as string)
                : "u",
              category: String(it.category ?? "") || undefined,
            }))
            .filter((it: { description: string }) => it.description !== "Article")
        : [],
      notes: parsed.notes || undefined,
    }
  } catch {
    return { items: [], notes: "Extraction impossible — vérifiez la transcription." }
  }
}
