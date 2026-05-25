import Link from "next/link"
import { ArrowLeft, Trash2 } from "lucide-react"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { Card, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { LogoUploadForm } from "./logo-upload-form"

export const dynamic = "force-dynamic"

async function removeLogo() {
  "use server"
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  const { data: profile } = await supabase.from("profiles").select("org_id, role").eq("id", user.id).maybeSingle()
  if (!profile?.org_id || (profile.role !== "owner" && profile.role !== "admin_dep")) return

  const admin = supabaseAdmin()
  await admin.from("orgs").update({ logo_url: null }).eq("id", profile.org_id)

  // Try to remove old files
  await admin.storage.from("assets").remove([`org-logos/${profile.org_id}`]).catch(() => {})

  revalidatePath("/app/parametres/logo")
  redirect("/app/parametres/logo?deleted=1")
}

export default async function LogoPage() {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from("profiles").select("org_id, role").eq("id", user!.id).maybeSingle()
  const { data: org } = await supabase.from("orgs").select("nom, logo_url").eq("id", profile!.org_id!).maybeSingle()
  const isOwner = profile?.role === "owner" || profile?.role === "admin_dep"
  const hasLogo = Boolean(org?.logo_url)

  return (
    <div className="max-w-5xl mx-auto p-6 sm:p-10 space-y-6">
      <Link href="/app/parametres" className="inline-flex items-center gap-1 text-xs text-muted hover:text-electric">
        <ArrowLeft className="h-3 w-3" /> Paramètres
      </Link>
      <CardTitle>Logo & branding</CardTitle>
      <p className="text-sm text-muted -mt-3">
        Votre logo apparaît en haut de chaque devis et facture.
      </p>

      <Card>
        {/* Current logo preview */}
        {hasLogo && (
          <div className="mb-6">
            <div className="text-xs uppercase tracking-wider text-muted mb-3">Logo actuel</div>
            <div className="inline-flex items-center justify-center rounded-xl border border-border bg-surface-2 p-6 max-w-xs">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={org!.logo_url!}
                alt="Logo de l'entreprise"
                className="object-contain max-h-24"
                style={{ maxWidth: 240, maxHeight: 96 }}
              />
            </div>
            {isOwner && (
              <form action={removeLogo} className="mt-3">
                <Button variant="ghost" size="sm" className="text-danger gap-2" type="submit">
                  <Trash2 className="h-3.5 w-3.5" /> Supprimer le logo
                </Button>
              </form>
            )}
          </div>
        )}

        {/* Upload form — client component avec feedback */}
        {isOwner && <LogoUploadForm />}
      </Card>

      {!isOwner && (
        <p className="text-sm text-warning">Seul le propriétaire peut modifier le logo.</p>
      )}
    </div>
  )
}
