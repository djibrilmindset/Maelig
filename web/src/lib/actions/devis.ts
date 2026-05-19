"use server"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { supabaseAdmin } from "@/lib/supabase/admin"

const ItemSchema = z.object({
  id: z.string().optional(),
  description: z.string().min(1).max(500),
  quantite: z.coerce.number().positive(),
  unite: z.string().default("u"),
  prix_unitaire_ht: z.coerce.number().nonnegative().default(0),
  article_id: z.string().nullable().optional(),
})

const ClientPayloadSchema = z.object({
  id: z.string().nullable().optional(),
  nom: z.string().min(1),
  prenom: z.string().optional(),
  raison_sociale: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  telephone: z.string().optional(),
  adresse: z.string().optional(),
  ville: z.string().optional(),
  cp: z.string().optional(),
})

const DevisSchema = z.object({
  id: z.string().optional(),
  client: ClientPayloadSchema,
  objet: z.string().optional(),
  chantier_adresse: z.string().optional(),
  notes_internes: z.string().optional(),
  notes_client: z.string().optional(),
  taux_horaire: z.coerce.number().optional(),
  heures_main_oeuvre: z.coerce.number().nonnegative().default(0),
  tva_taux: z.coerce.number().min(0).max(100).default(20),
  items: z.array(ItemSchema).default([]),
})

export type DevisPayload = z.infer<typeof DevisSchema>

async function getOrg() {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("not_authenticated")
  const { data: profile } = await supabase
    .from("profiles").select("org_id, role")
    .eq("id", user.id).maybeSingle()
  if (!profile?.org_id) throw new Error("no_org")
  return { supabase, user, orgId: profile.org_id, role: profile.role }
}

export async function saveDevis(payload: DevisPayload, action: "draft" | "send" = "draft") {
  const data = DevisSchema.parse(payload)
  const { supabase, user, orgId } = await getOrg()
  const admin = supabaseAdmin()

  // Ensure client
  let clientId = data.client.id ?? null
  if (!clientId) {
    const { data: created, error } = await supabase
      .from("clients")
      .insert({
        org_id: orgId,
        nom: data.client.nom,
        prenom: data.client.prenom || null,
        raison_sociale: data.client.raison_sociale || null,
        email: data.client.email || null,
        telephone: data.client.telephone || null,
        adresse: data.client.adresse || null,
        ville: data.client.ville || null,
        cp: data.client.cp || null,
      })
      .select("id").single()
    if (error) throw new Error(error.message)
    clientId = created.id
  } else {
    // Update client info if provided
    await supabase
      .from("clients")
      .update({
        nom: data.client.nom,
        prenom: data.client.prenom || null,
        raison_sociale: data.client.raison_sociale || null,
        email: data.client.email || null,
        telephone: data.client.telephone || null,
        adresse: data.client.adresse || null,
        ville: data.client.ville || null,
        cp: data.client.cp || null,
      })
      .eq("id", clientId)
      .eq("org_id", orgId)
  }

  // Upsert devis
  let devisId = data.id ?? null
  const newStatut = action === "send" ? "en_attente_validation" : "brouillon"

  if (!devisId) {
    const { data: dev, error } = await supabase
      .from("devis")
      .insert({
        org_id: orgId,
        client_id: clientId,
        statut: newStatut,
        objet: data.objet || null,
        chantier_adresse: data.chantier_adresse || null,
        notes_internes: data.notes_internes || null,
        notes_client: data.notes_client || null,
        taux_horaire: data.taux_horaire ?? null,
        heures_main_oeuvre: data.heures_main_oeuvre,
        tva_taux: data.tva_taux,
        created_by: user.id,
      })
      .select("id").single()
    if (error) throw new Error(error.message)
    devisId = dev.id
  } else {
    const { error } = await supabase
      .from("devis")
      .update({
        client_id: clientId,
        statut: newStatut,
        objet: data.objet || null,
        chantier_adresse: data.chantier_adresse || null,
        notes_internes: data.notes_internes || null,
        notes_client: data.notes_client || null,
        taux_horaire: data.taux_horaire ?? null,
        heures_main_oeuvre: data.heures_main_oeuvre,
        tva_taux: data.tva_taux,
      })
      .eq("id", devisId)
      .eq("org_id", orgId)
    if (error) throw new Error(error.message)
  }

  // Items: replace all
  await admin.from("devis_items").delete().eq("devis_id", devisId)
  if (data.items.length > 0) {
    const rows = data.items.map((it, i) => ({
      devis_id: devisId,
      article_id: it.article_id ?? null,
      ordre: i,
      description: it.description,
      quantite: it.quantite,
      unite: it.unite || "u",
      prix_unitaire_ht: it.prix_unitaire_ht,
    }))
    const { error } = await admin.from("devis_items").insert(rows)
    if (error) throw new Error(error.message)
  }

  // Upsert articles (auto-memory) for items not linked to a known article
  for (const it of data.items) {
    if (it.article_id) continue
    const name = it.description.trim()
    if (!name) continue
    // Find existing by name (case-insensitive)
    const { data: existing } = await supabase
      .from("articles").select("id")
      .eq("org_id", orgId).ilike("nom", name).limit(1).maybeSingle()
    if (existing) {
      await supabase.from("articles")
        .update({ prix_unitaire_ht: it.prix_unitaire_ht, last_used_at: new Date().toISOString() })
        .eq("id", existing.id)
    } else {
      await supabase.from("articles").insert({
        org_id: orgId,
        nom: name,
        unite: it.unite || "u",
        prix_unitaire_ht: it.prix_unitaire_ht,
        last_used_at: new Date().toISOString(),
      }).select("id")
    }
  }

  revalidatePath("/app")
  revalidatePath("/app/devis/attente-validation")
  revalidatePath(`/app/devis/${devisId}`)
  return { ok: true, devisId }
}

export async function changeDevisStatut(devisId: string, statut: string) {
  const allowed = ["brouillon","en_attente_validation","signe_non_paye","facture_en_attente","facture_payee","facture_abandonnee"]
  if (!allowed.includes(statut)) throw new Error("statut_invalid")
  const { supabase, orgId } = await getOrg()
  const { error } = await supabase.from("devis")
    .update({ statut: statut as never })
    .eq("id", devisId).eq("org_id", orgId)
  if (error) throw new Error(error.message)
  revalidatePath("/app")
  revalidatePath(`/app/devis/${devisId}`)
  return { ok: true }
}

export async function deleteDevis(devisId: string) {
  const { supabase, orgId } = await getOrg()
  const { error } = await supabase.from("devis").delete().eq("id", devisId).eq("org_id", orgId)
  if (error) throw new Error(error.message)
  revalidatePath("/app")
  return { ok: true }
}

export async function convertDevisToFacture(devisId: string) {
  const { supabase, orgId } = await getOrg()
  const { data: d } = await supabase.from("devis")
    .select("id, client_id, total_ht, tva_montant, total_ttc")
    .eq("id", devisId).eq("org_id", orgId).maybeSingle()
  if (!d) throw new Error("devis_not_found")
  const admin = supabaseAdmin()
  const { data: facture, error } = await admin.from("factures").insert({
    org_id: orgId,
    devis_id: d.id,
    client_id: d.client_id,
    statut: "en_attente",
    total_ht: d.total_ht,
    tva_montant: d.tva_montant,
    total_ttc: d.total_ttc,
  }).select("id").single()
  if (error) throw new Error(error.message)
  await supabase.from("devis").update({ statut: "facture_en_attente" })
    .eq("id", d.id).eq("org_id", orgId)
  revalidatePath("/app")
  revalidatePath("/app/devis/factures-en-attente")
  return { ok: true, factureId: facture.id }
}
