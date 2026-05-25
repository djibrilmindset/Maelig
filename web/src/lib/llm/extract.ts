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
  "client_nom": "string|null",        // nom de famille
  "client_prenom": "string|null",     // prénom
  "client_telephone": "string|null",  // numéro de téléphone
  "client_email": "string|null",      // email si mentionné
  "client_adresse": "string|null",    // adresse du client (rue, numéro)
  "client_ville": "string|null",      // ville du client
  "client_cp": "string|null",         // code postal
  "chantier_adresse": "string|null",  // adresse du chantier si différente
  "chantier_objet": "string|null",    // objet du devis (ex: 'Rénovation électrique appartement')
  "heures_main_oeuvre": number|null,  // heures de pose
  "taux_horaire": number|null,        // taux horaire en €/h (ex: 150€ de l'heure → 150)
  "notes": "string|null",             // toute info utile (urgence, accès, fourniture client…)
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
- N'invente jamais de matériel non mentionné.
- Sépare bien le nom et prénom du client. Ex: 'Madame Martin' → client_nom: 'Martin', client_prenom: null
- Extrais le téléphone, l'adresse, la ville et le CP séparément si mentionnés.
- Garde les adresses EXACTEMENT comme dites : '34 bis avenue Kennedy' inchangé.`

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
      items?: Array<{ description: string; quantity: number; unit: string; category?: string }>
      notes?: string
    }

    return {
      client_nom: parsed.client_nom || undefined,
      client_prenom: parsed.client_prenom || undefined,
      client_telephone: parsed.client_telephone || undefined,
      client_email: parsed.client_email || undefined,
      client_adresse: parsed.client_adresse || undefined,
      client_ville: parsed.client_ville || undefined,
      client_cp: parsed.client_cp || undefined,
      chantier_adresse: parsed.chantier_adresse || undefined,
      chantier_objet: parsed.chantier_objet || undefined,
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
