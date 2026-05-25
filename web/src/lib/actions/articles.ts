"use server"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { createSupabaseServerClient } from "@/lib/supabase/server"

const Schema = z.object({
  id: z.string().optional(),
  nom: z.string().min(1),
  description: z.string().optional(),
  ref: z.string().optional(),
  unite: z.string().default("u"),
  prix_unitaire_ht: z.coerce.number().min(0),
  categorie: z.string().optional(),
})

export async function saveArticle(input: unknown) {
  const data = Schema.parse(input)
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from("profiles").select("org_id, role").eq("id", user!.id).maybeSingle()
  if (!profile?.org_id) throw new Error("no_org")
  if (profile.role !== "owner" && profile.role !== "admin_dep") throw new Error("forbidden_slave")

  const payload = {
    nom: data.nom,
    description: data.description || null,
    ref: data.ref || null,
    unite: data.unite || "u",
    prix_unitaire_ht: data.prix_unitaire_ht,
    categorie: data.categorie || null,
  }
  if (data.id) {
    const { error } = await supabase.from("articles").update(payload).eq("id", data.id).eq("org_id", profile.org_id)
    if (error) throw new Error(error.message)
  } else {
    const { error } = await supabase.from("articles").insert({ ...payload, org_id: profile.org_id })
    if (error) throw new Error(error.message)
  }
  revalidatePath("/app/catalogue")
  return { ok: true }
}

export async function archiveArticle(id: string) {
  const supabase = await createSupabaseServerClient()
  const { error } = await supabase.from("articles").update({ archived: true }).eq("id", id)
  if (error) throw new Error(error.message)
  revalidatePath("/app/catalogue")
  return { ok: true }
}

// ── 45 articles électricité courants ──
const DEFAULT_ARTICLES = [
  { nom: "Prise 16A 2P+T blanc", unite: "u", prix_unitaire_ht: 4.50, categorie: "Prise", ref: "PR-16A-B" },
  { nom: "Prise 16A 2P+T étanche IP44", unite: "u", prix_unitaire_ht: 9.00, categorie: "Prise", ref: "PR-16A-IP44" },
  { nom: "Prise 20A 2P+T", unite: "u", prix_unitaire_ht: 6.50, categorie: "Prise", ref: "PR-20A" },
  { nom: "Prise RJ45 réseau", unite: "u", prix_unitaire_ht: 12.00, categorie: "Prise", ref: "PR-RJ45" },
  { nom: "Prise TV coaxiale", unite: "u", prix_unitaire_ht: 9.50, categorie: "Prise", ref: "PR-TV" },
  { nom: "Interrupteur simple", unite: "u", prix_unitaire_ht: 4.00, categorie: "Interrupteur", ref: "INT-S" },
  { nom: "Interrupteur double", unite: "u", prix_unitaire_ht: 5.50, categorie: "Interrupteur", ref: "INT-D" },
  { nom: "Interrupteur va-et-vient", unite: "u", prix_unitaire_ht: 5.00, categorie: "Interrupteur", ref: "INT-VV" },
  { nom: "Interrupteur permutateur", unite: "u", prix_unitaire_ht: 8.00, categorie: "Interrupteur", ref: "INT-PERM" },
  { nom: "Interrupteur poussoir", unite: "u", prix_unitaire_ht: 4.50, categorie: "Interrupteur", ref: "INT-POUS" },
  { nom: "Interrupteur télérupteur", unite: "u", prix_unitaire_ht: 6.00, categorie: "Interrupteur", ref: "INT-TEL" },
  { nom: "Disjoncteur 16A 1P+N", unite: "u", prix_unitaire_ht: 14.00, categorie: "Tableau", ref: "DIS-16" },
  { nom: "Disjoncteur 20A 1P+N", unite: "u", prix_unitaire_ht: 14.50, categorie: "Tableau", ref: "DIS-20" },
  { nom: "Disjoncteur 32A 1P+N", unite: "u", prix_unitaire_ht: 16.00, categorie: "Tableau", ref: "DIS-32" },
  { nom: "Interrupteur différentiel 40A 30mA type AC", unite: "u", prix_unitaire_ht: 35.00, categorie: "Tableau", ref: "ID-40-AC" },
  { nom: "Interrupteur différentiel 63A 30mA type AC", unite: "u", prix_unitaire_ht: 45.00, categorie: "Tableau", ref: "ID-63-AC" },
  { nom: "Interrupteur différentiel 40A 30mA type A", unite: "u", prix_unitaire_ht: 55.00, categorie: "Tableau", ref: "ID-40-A" },
  { nom: "Interrupteur différentiel 63A 30mA type A", unite: "u", prix_unitaire_ht: 75.00, categorie: "Tableau", ref: "ID-63-A" },
  { nom: "Parafoudre 3P+N 40kA", unite: "u", prix_unitaire_ht: 120.00, categorie: "Tableau", ref: "PARA-40" },
  { nom: "Tableau électrique 13 modules", unite: "u", prix_unitaire_ht: 45.00, categorie: "Tableau", ref: "TAB-13" },
  { nom: "Tableau électrique 18 modules", unite: "u", prix_unitaire_ht: 65.00, categorie: "Tableau", ref: "TAB-18" },
  { nom: "Tableau électrique 36 modules", unite: "u", prix_unitaire_ht: 95.00, categorie: "Tableau", ref: "TAB-36" },
  { nom: "Câble 1.5mm² RO2V 3G", unite: "m", prix_unitaire_ht: 1.20, categorie: "Câblage", ref: "CAB-15-3G" },
  { nom: "Câble 2.5mm² RO2V 3G", unite: "m", prix_unitaire_ht: 1.80, categorie: "Câblage", ref: "CAB-25-3G" },
  { nom: "Câble 6mm² RO2V 3G", unite: "m", prix_unitaire_ht: 3.50, categorie: "Câblage", ref: "CAB-6-3G" },
  { nom: "Goulotte PVC 40x20mm", unite: "m", prix_unitaire_ht: 2.50, categorie: "Câblage", ref: "GOU-40" },
  { nom: "Goulotte PVC 60x40mm", unite: "m", prix_unitaire_ht: 4.00, categorie: "Câblage", ref: "GOU-60" },
  { nom: "Tube ICTA 20mm", unite: "m", prix_unitaire_ht: 1.50, categorie: "Câblage", ref: "ICT-20" },
  { nom: "Dôme LED 12W blanc chaud", unite: "u", prix_unitaire_ht: 18.00, categorie: "Luminaire", ref: "DOME-12W" },
  { nom: "Spot LED encastré 7W", unite: "u", prix_unitaire_ht: 12.00, categorie: "Luminaire", ref: "SPOT-7W" },
  { nom: "Applique murale LED 10W", unite: "u", prix_unitaire_ht: 25.00, categorie: "Luminaire", ref: "APPL-10W" },
  { nom: "Suspension décorative", unite: "u", prix_unitaire_ht: 45.00, categorie: "Luminaire", ref: "SUSP" },
  { nom: "Radiateur électrique 1000W", unite: "u", prix_unitaire_ht: 89.00, categorie: "Chauffage", ref: "RAD-1000" },
  { nom: "Radiateur électrique 1500W", unite: "u", prix_unitaire_ht: 110.00, categorie: "Chauffage", ref: "RAD-1500" },
  { nom: "Radiateur électrique 2000W", unite: "u", prix_unitaire_ht: 135.00, categorie: "Chauffage", ref: "RAD-2000" },
  { nom: "Sèche-serviette électrique 500W", unite: "u", prix_unitaire_ht: 180.00, categorie: "Chauffage", ref: "SS-500" },
  { nom: "VMC simple flux autoréglable", unite: "u", prix_unitaire_ht: 180.00, categorie: "VMC", ref: "VMC-SF" },
  { nom: "VMC hygroréglable", unite: "u", prix_unitaire_ht: 250.00, categorie: "VMC", ref: "VMC-HYGRO" },
  { nom: "Détecteur de fumée (DAAF)", unite: "u", prix_unitaire_ht: 25.00, categorie: "Sécurité", ref: "DAAF" },
  { nom: "Caméra IP extérieure", unite: "u", prix_unitaire_ht: 120.00, categorie: "Sécurité", ref: "CAM-IP" },
  { nom: "Sonnette vidéo sans fil", unite: "u", prix_unitaire_ht: 65.00, categorie: "Sécurité", ref: "SON-VID" },
  { nom: "Borne IRVE 7.4kW monophasée", unite: "u", prix_unitaire_ht: 850.00, categorie: "IRVE", ref: "IRVE-74" },
  { nom: "Borne IRVE 22kW triphasée", unite: "u", prix_unitaire_ht: 1200.00, categorie: "IRVE", ref: "IRVE-22" },
  { nom: "Mise en conformité installation", unite: "ens", prix_unitaire_ht: 250.00, categorie: "Services", ref: "CONF" },
]

export async function seedDefaultArticles() {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("not_authenticated")
  const { data: profile } = await supabase.from("profiles").select("org_id, role").eq("id", user.id).maybeSingle()
  if (!profile?.org_id) throw new Error("no_org")
  if (profile.role !== "owner" && profile.role !== "admin_dep") throw new Error("forbidden_slave")

  // Insère seulement les nouveaux (unique index lower(nom) + org_id)
  const toInsert = DEFAULT_ARTICLES.map((a) => ({ ...a, org_id: profile.org_id! }))
  const { data: existing } = await supabase.from("articles").select("nom").eq("org_id", profile.org_id)
  const existingNames = new Set((existing ?? []).map((e) => e.nom.toLowerCase()))
  const newOnes = toInsert.filter((a) => !existingNames.has(a.nom.toLowerCase()))

  if (newOnes.length === 0) return { ok: true, inserted: 0, total: DEFAULT_ARTICLES.length, note: "Tous déjà présents" }

  const { error } = await supabase.from("articles").insert(newOnes)
  if (error) throw new Error(error.message)

  revalidatePath("/app/parametres/defauts")
  return { ok: true, inserted: newOnes.length, total: DEFAULT_ARTICLES.length }
}

export async function updateArticlePrice(id: string, prix_unitaire_ht: number) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("not_authenticated")
  const { data: profile } = await supabase.from("profiles").select("org_id, role").eq("id", user.id).maybeSingle()
  if (!profile?.org_id) throw new Error("no_org")
  if (profile.role !== "owner" && profile.role !== "admin_dep") throw new Error("forbidden_slave")
  const { error } = await supabase.from("articles").update({ prix_unitaire_ht }).eq("id", id).eq("org_id", profile.org_id)
  if (error) throw new Error(error.message)
  revalidatePath("/app/parametres/defauts")
  return { ok: true }
}
