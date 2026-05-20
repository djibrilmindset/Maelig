import { createSupabaseServerClient } from "@/lib/supabase/server"
import { DevisEditor } from "@/components/devis/devis-editor"

export const dynamic = "force-dynamic"

export default async function NouveauDevisPage() {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from("profiles").select("org_id").eq("id", user!.id).maybeSingle()
  const orgId = profile?.org_id

  const [{ data: org }, { data: articles }, { data: clients }] = await Promise.all([
    supabase.from("orgs").select("taux_horaire_default, tva_default").eq("id", orgId!).maybeSingle(),
    supabase
      .from("articles")
      .select("id, nom, prix_unitaire_ht, unite, usage_count")
      .eq("org_id", orgId!)
      .eq("archived", false)
      .order("usage_count", { ascending: false })
      .order("last_used_at", { ascending: false, nullsFirst: false })
      .limit(200),
    supabase
      .from("clients")
      .select("id, nom, prenom, raison_sociale, email")
      .eq("org_id", orgId!)
      .eq("archived", false)
      .order("created_at", { ascending: false })
      .limit(50),
  ])

  return (
    <DevisEditor
      orgDefaults={{
        taux_horaire: Number(org?.taux_horaire_default ?? 45),
        tva_default: Number(org?.tva_default ?? 20),
      }}
      knownArticles={articles ?? []}
      knownClients={clients ?? []}
    />
  )
}
