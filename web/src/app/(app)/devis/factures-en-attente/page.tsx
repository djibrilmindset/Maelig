import { createSupabaseServerClient } from "@/lib/supabase/server"
import { FacturesTable, ListHeader } from "@/components/devis/devis-table"

export const dynamic = "force-dynamic"

export default async function Page() {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from("profiles").select("org_id").eq("id", user!.id).maybeSingle()

  const { data: rows } = await supabase
    .from("factures")
    .select("id, numero, statut, total_ttc, date_emission, date_echeance, relances_count, clients(nom, prenom, raison_sociale)")
    .eq("org_id", profile!.org_id!)
    .in("statut", ["en_attente", "partielle"])
    .order("date_emission", { ascending: false })

  return (
    <div className="max-w-7xl mx-auto p-6 sm:p-10">
      <ListHeader
        title="Factures en attente"
        description="Factures envoyées en attente d'encaissement. Relances automatiques actives."
      />
      <FacturesTable rows={(rows ?? []) as never} />
    </div>
  )
}
