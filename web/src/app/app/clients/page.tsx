import Link from "next/link"
import { Users, Plus } from "lucide-react"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { Card, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/app/empty-state"
import { formatDateFR } from "@/lib/utils"

export const dynamic = "force-dynamic"

export default async function Page() {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from("profiles").select("org_id").eq("id", user!.id).maybeSingle()

  const { data: clients } = await supabase
    .from("clients")
    .select("*")
    .eq("org_id", profile!.org_id!)
    .eq("archived", false)
    .order("created_at", { ascending: false })

  return (
    <div className="max-w-6xl mx-auto p-6 sm:p-10 space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <CardTitle>Clients</CardTitle>
          <CardDescription>Le dossier complet de chaque client : coordonnées, devis, factures.</CardDescription>
        </div>
        <Button asChild>
          <Link href="/app/clients/nouveau"><Plus className="h-4 w-4" /> Nouveau client</Link>
        </Button>
      </div>

      {(!clients || clients.length === 0) ? (
        <EmptyState
          icon={<Users className="h-5 w-5 text-electric" />}
          title="Aucun client pour l'instant"
          description="Ajoutez votre 1er client, ou laissez DEP le créer automatiquement à votre 1er devis vocal."
          action={<Button asChild><Link href="/app/clients/nouveau">Ajouter un client</Link></Button>}
        />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {clients.map((c) => (
            <Link key={c.id} href={`/app/clients/${c.id}`}>
              <Card className="h-full transition-colors hover:border-border-strong">
                <div className="text-xs uppercase tracking-wider text-muted">
                  {c.raison_sociale ? "Société" : "Particulier"}
                </div>
                <div className="mt-1 font-display text-lg font-semibold">
                  {c.raison_sociale || [c.prenom, c.nom].filter(Boolean).join(" ")}
                </div>
                <div className="mt-2 text-sm text-muted space-y-0.5">
                  {c.email && <div className="truncate">{c.email}</div>}
                  {c.telephone && <div>{c.telephone}</div>}
                  {(c.ville || c.cp) && <div>{[c.cp, c.ville].filter(Boolean).join(" ")}</div>}
                </div>
                <div className="mt-3 text-xs text-muted-2">Ajouté {formatDateFR(c.created_at)}</div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
