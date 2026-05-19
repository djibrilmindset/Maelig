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
