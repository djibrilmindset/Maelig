import Link from "next/link"
import { PackageSearch, Plus, BrainCircuit } from "lucide-react"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { Card, CardTitle, CardDescription, Badge } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/app/empty-state"
import { formatEUR } from "@/lib/utils"

export const dynamic = "force-dynamic"

export default async function Page() {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from("profiles").select("org_id, role").eq("id", user!.id).maybeSingle()
  const isOwner = profile?.role === "owner" || profile?.role === "admin_dep"

  const { data: articles } = await supabase
    .from("articles")
    .select("*")
    .eq("org_id", profile!.org_id!)
    .eq("archived", false)
    .order("usage_count", { ascending: false })
    .order("last_used_at", { ascending: false, nullsFirst: false })
    .limit(500)

  return (
    <div className="max-w-6xl mx-auto p-6 sm:p-10 space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <CardTitle>Catalogue d&apos;articles</CardTitle>
          <CardDescription>
            <BrainCircuit className="inline h-4 w-4 text-electric mr-1" />
            Mémoire automatique. Chaque article saisi ressort à votre prochain devis.
          </CardDescription>
        </div>
        {isOwner && (
          <Button asChild>
            <Link href="/app/catalogue/nouveau"><Plus className="h-4 w-4" /> Ajouter</Link>
          </Button>
        )}
      </div>

      {(!articles || articles.length === 0) ? (
        <EmptyState
          icon={<PackageSearch className="h-5 w-5 text-electric" />}
          title="Catalogue vide"
          description="Faites votre 1er devis : DEP saisira automatiquement chaque article et son prix dans le catalogue."
          action={
            isOwner ? (
              <Button asChild><Link href="/app/catalogue/nouveau">Ajouter un article</Link></Button>
            ) : null
          }
        />
      ) : (
        <Card className="p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs uppercase tracking-wider text-muted bg-surface-2/60">
                <tr>
                  <th className="text-left p-3">Nom</th>
                  <th className="text-left p-3">Catégorie</th>
                  <th className="text-left p-3">Unité</th>
                  <th className="text-right p-3">PU HT</th>
                  <th className="text-right p-3">Utilisé</th>
                </tr>
              </thead>
              <tbody>
                {articles.map((a) => (
                  <tr key={a.id} className="border-t border-border hover:bg-surface-2 transition-colors">
                    <td className="p-3 font-medium">{a.nom}</td>
                    <td className="p-3"><span className="text-muted">{a.categorie ?? "—"}</span></td>
                    <td className="p-3 text-muted">{a.unite}</td>
                    <td className="p-3 text-right font-mono">{formatEUR(a.prix_unitaire_ht)}</td>
                    <td className="p-3 text-right">
                      <Badge tone={a.usage_count > 5 ? "electric" : "neutral"}>{a.usage_count}× </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  )
}
