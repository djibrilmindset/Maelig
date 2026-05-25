"use server"

import { revalidatePath } from "next/cache"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { supabaseAdmin } from "@/lib/supabase/admin"

export async function uploadLogoAction(prev: { ok: boolean; error?: string }, formData: FormData): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: "Non authentifié" }
  const { data: profile } = await supabase.from("profiles").select("org_id, role").eq("id", user.id).maybeSingle()
  if (!profile?.org_id || (profile.role !== "owner" && profile.role !== "admin_dep")) return { ok: false, error: "Non autorisé" }

  const file = formData.get("logo") as File
  if (!file || file.size === 0) return { ok: false, error: "Aucun fichier sélectionné" }
  if (!file.type.startsWith("image/")) return { ok: false, error: "Le fichier doit être une image (PNG, JPG, SVG)" }
  if (file.size > 2 * 1024 * 1024) return { ok: false, error: "Image trop volumineuse (max 2 Mo)" }

  const admin = supabaseAdmin()
  const ext = file.name.split(".").pop() ?? "png"
  const path = `${profile.org_id}/logo.${ext}`

  const buf = Buffer.from(await file.arrayBuffer())

  // Supprime les anciens logos
  const { data: oldFiles } = await admin.storage.from("logos").list(profile.org_id, { search: "logo." })
  if (oldFiles && oldFiles.length > 0) {
    await admin.storage.from("logos").remove(oldFiles.map((f: { name: string }) => `${profile.org_id}/${f.name}`))
  }

  const { error: upErr } = await admin.storage.from("logos").upload(path, buf, {
    contentType: file.type,
    upsert: true,
  })
  if (upErr) return { ok: false, error: `Erreur upload: ${upErr.message}` }

  const { data: pubUrl } = admin.storage.from("logos").getPublicUrl(path)
  await admin.from("orgs").update({ logo_url: pubUrl.publicUrl }).eq("id", profile.org_id)

  revalidatePath("/app/parametres/logo")
  return { ok: true }
}
