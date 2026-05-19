"use server"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { createSupabaseServerClient } from "@/lib/supabase/server"

const Schema = z.object({
  id: z.string().optional(),
  nom: z.string().min(1),
  prenom: z.string().optional(),
  raison_sociale: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  telephone: z.string().optional(),
  adresse: z.string().optional(),
  ville: z.string().optional(),
  cp: z.string().optional(),
  notes: z.string().optional(),
})

export async function saveClient(input: unknown) {
  const data = Schema.parse(input)
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from("profiles").select("org_id").eq("id", user!.id).maybeSingle()
  const orgId = profile!.org_id!

  if (data.id) {
    const { error } = await supabase.from("clients").update({
      nom: data.nom, prenom: data.prenom || null, raison_sociale: data.raison_sociale || null,
      email: data.email || null, telephone: data.telephone || null,
      adresse: data.adresse || null, ville: data.ville || null, cp: data.cp || null,
      notes: data.notes || null,
    }).eq("id", data.id).eq("org_id", orgId)
    if (error) throw new Error(error.message)
  } else {
    const { error } = await supabase.from("clients").insert({
      org_id: orgId,
      nom: data.nom, prenom: data.prenom || null, raison_sociale: data.raison_sociale || null,
      email: data.email || null, telephone: data.telephone || null,
      adresse: data.adresse || null, ville: data.ville || null, cp: data.cp || null,
      notes: data.notes || null,
    })
    if (error) throw new Error(error.message)
  }
  revalidatePath("/app/clients")
  return { ok: true }
}

export async function archiveClient(id: string) {
  const supabase = await createSupabaseServerClient()
  const { error } = await supabase.from("clients").update({ archived: true }).eq("id", id)
  if (error) throw new Error(error.message)
  revalidatePath("/app/clients")
  return { ok: true }
}
