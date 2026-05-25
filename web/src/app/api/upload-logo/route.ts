import { NextResponse } from "next/server"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { revalidatePath } from "next/cache"

export async function POST(req: Request) {
  try {
    const supabase = await createSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 })

    const { data: profile } = await supabase.from("profiles").select("org_id, role").eq("id", user.id).maybeSingle()
    if (!profile?.org_id || (profile.role !== "owner" && profile.role !== "admin_dep")) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 403 })
    }

    const form = await req.formData()
    const file = form.get("logo") as File
    if (!file || file.size === 0) return NextResponse.json({ error: "Aucun fichier" }, { status: 400 })
    if (!file.type.startsWith("image/")) return NextResponse.json({ error: "Doit être une image" }, { status: 400 })
    if (file.size > 2 * 1024 * 1024) return NextResponse.json({ error: "Max 2 Mo" }, { status: 400 })

    const admin = supabaseAdmin()
    const ext = file.name.split(".").pop() ?? "png"
    const path = `${profile.org_id}/logo.${ext}`

    const buf = Buffer.from(await file.arrayBuffer())

    // Remove old logos
    const { data: oldFiles } = await admin.storage.from("logos").list(profile.org_id, { search: "logo." })
    if (oldFiles && oldFiles.length > 0) {
      await admin.storage.from("logos").remove(oldFiles.map((f: { name: string }) => `${profile.org_id}/${f.name}`))
    }

    const { error: upErr } = await admin.storage.from("logos").upload(path, buf, {
      contentType: file.type,
      upsert: true,
    })
    if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 })

    const { data: pubUrl } = admin.storage.from("logos").getPublicUrl(path)
    await admin.from("orgs").update({ logo_url: pubUrl.publicUrl }).eq("id", profile.org_id)

    revalidatePath("/app/parametres/logo")
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Erreur serveur" }, { status: 500 })
  }
}
