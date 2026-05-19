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
    .eq("statut", "signe_non_paye")
    .order("date_signature", { ascending: false, nullsFirst: false })

  return (
    <div className="max-w-7xl mx-auto p-6 sm:p-10">
      <ListHeader
        title="Devis signés"
        description="Acceptés par le client, prêts à passer en facture."
        action={<Button asChild><Link href="/app/devis/nouveau">Nouveau devis</Link></Button>}
      />
      <DevisTable
        rows={(rows ?? []) as never}
        emptyTitle="Pas encore de devis signé"
        emptyDescription="Une fois qu'un client signe un devis, il apparaît ici, prêt à devenir une facture."
      />
    </div>
  )
}
