import Link from "next/link"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { DevisTable, ListHeader } from "@/components/devis/devis-table"
import { Button } from "@/components/ui/button"

export const dynamic = "force-dynamic"

export default async function Page() {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from("profiles").select("org_id").eq("id", user!.id).maybeSingle()

  const { data: rows } = await supabase
    .from("devis")
    .select("id, numero, statut, total_ttc, date_emission, date_validite, date_signature, objet, clients(nom, prenom, raison_sociale, email)")
    .eq("org_id", profile!.org_id!)
    .eq("statut", "en_attente_validation")
    .order("date_emission", { ascending: false })

  return (
    <div className="max-w-7xl mx-auto p-6 sm:p-10">
      <ListHeader
        title="Devis en attente de validation"
        description="Envoyés au client, en attente de signature."
        action={<Button asChild><Link href="/app/devis/nouveau">Nouveau devis</Link></Button>}
      />
      <DevisTable
        rows={(rows ?? []) as never}
        emptyTitle="Aucun devis en attente"
        emptyDescription="Vos devis envoyés au client apparaîtront ici."
      />
    </div>
  )
}
