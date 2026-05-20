import Link from "next/link"
import { redirect } from "next/navigation"
import { ShieldCheck } from "lucide-react"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { DevisTable, ListHeader } from "@/components/devis/devis-table"

export const dynamic = "force-dynamic"

export default async function Page() {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from("profiles").select("org_id, role").eq("id", user!.id).maybeSingle()
  if (profile?.role === "slave") redirect("/app")

  const { data: rows } = await supabase
    .from("devis")
    .select("id, numero, statut, total_ttc, date_emission, date_validite, date_signature, objet, clients(nom, prenom, raison_sociale, email)")
    .eq("org_id", profile!.org_id!)
    .eq("statut", "en_attente_validation_patron")
    .order("created_at", { ascending: false })

  return (
    <div className="max-w-7xl mx-auto p-6 sm:p-10">
      <ListHeader
        title="À valider"
        description="Devis préparés par vos collaborateurs, en attente de votre feu vert avant envoi au client."
        action={
          <span className="inline-flex items-center gap-2 rounded-full border border-warning/30 bg-warning/10 px-3 py-1 text-xs font-medium text-warning">
            <ShieldCheck className="h-3 w-3" /> Patron uniquement
          </span>
        }
      />
      <DevisTable
        rows={(rows ?? []) as never}
        emptyTitle="Rien à valider ✅"
        emptyDescription="Vos employés n'ont pas de devis en attente. Tout est à jour."
      />
    </div>
  )
}
