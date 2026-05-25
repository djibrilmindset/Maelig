import Link from "next/link"
import { ArrowLeft, Save, Percent, Clock, Bell } from "lucide-react"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { Card, CardTitle } from "@/components/ui/card"
import { Input, Label } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { redirect } from "next/navigation"
import { seedDefaultArticles, updateArticlePrice } from "@/lib/actions/articles"

export const dynamic = "force-dynamic"

async function saveDefaults(formData: FormData) {
  "use server"
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  const { data: profile } = await supabase.from("profiles").select("org_id, role").eq("id", user.id).maybeSingle()
  if (!profile?.org_id || (profile.role !== "owner" && profile.role !== "admin_dep")) return

  const data = {
    taux_horaire_default: Math.max(0, Number(formData.get("taux_horaire") ?? 45)),
    tva_default: Math.max(0, Math.min(30, Number(formData.get("tva") ?? 20))),
    relance_hebdo_jours: Math.max(1, Number(formData.get("relance_hebdo") ?? 30)),
    relance_quotidienne_after: Math.max(1, Number(formData.get("relance_quotidienne") ?? 7)),
  }

  const { error } = await supabase.from("orgs").update(data).eq("id", profile.org_id)
  if (error) throw new Error(error.message)
  redirect("/app/parametres/defauts?ok=1")
}

export default async function DefautsPage(props: { searchParams: Promise<Record<string, string>> }) {
  const searchParams = await props.searchParams
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from("profiles").select("org_id, role").eq("id", user!.id).maybeSingle()
  const { data: org } = await supabase.from("orgs").select("*").eq("id", profile!.org_id!).maybeSingle()
  const isOwner = profile?.role === "owner" || profile?.role === "admin_dep"
  const { data: articles } = await supabase
    .from("articles")
    .select("id, nom, categorie, prix_unitaire_ht, unite")
    .eq("org_id", profile!.org_id!)
    .eq("archived", false)
    .order("categorie", { ascending: true })
    .order("nom", { ascending: true })
    .limit(200)

  return (
    <div className="max-w-5xl mx-auto p-6 sm:p-10 space-y-6">
      <Link href="/app/parametres" className="inline-flex items-center gap-1 text-xs text-muted hover:text-electric">
        <ArrowLeft className="h-3 w-3" /> Paramètres
      </Link>
      <CardTitle>Défauts devis</CardTitle>
      <p className="text-sm text-muted -mt-3">
        Valeurs pré-remplies à chaque nouveau devis. Gagnez des secondes.
      </p>

      <form action={saveDefaults}>
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <Percent className="h-4 w-4 text-electric" />
            <h3 className="font-display font-semibold">Tarifs par défaut</h3>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="taux_horaire">Taux horaire (€/h)</Label>
              <Input
                id="taux_horaire"
                name="taux_horaire"
                type="number"
                step="0.5"
                min="0"
                className="mt-2"
                defaultValue={org?.taux_horaire_default ?? 45}
              />
              <p className="mt-1 text-xs text-muted-2">Sera pré-rempli à chaque nouveau devis.</p>
            </div>
            <div>
              <Label htmlFor="tva">TVA par défaut (%)</Label>
              <Input
                id="tva"
                name="tva"
                type="number"
                step="0.5"
                min="0"
                max="30"
                className="mt-2"
                defaultValue={org?.tva_default ?? 20}
              />
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-2 mb-4">
            <Bell className="h-4 w-4 text-electric" />
            <h3 className="font-display font-semibold">Relances automatiques</h3>
          </div>
          <p className="text-sm text-muted mb-4">
            DEP envoie des relances par email aux clients qui n&apos;ont pas signé ou payé.
          </p>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="relance_hebdo">
                <Clock className="inline h-3 w-3 mr-1" />
                Première relance après X jours
              </Label>
              <Input
                id="relance_hebdo"
                name="relance_hebdo"
                type="number"
                min="1"
                className="mt-2"
                defaultValue={org?.relance_hebdo_jours ?? 30}
              />
              <p className="mt-1 text-xs text-muted-2">Relance hebdomadaire ensuite.</p>
            </div>
            <div>
              <Label htmlFor="relance_quotidienne">
                <Clock className="inline h-3 w-3 mr-1" />
                Relance quotidienne après X jours sans réponse
              </Label>
              <Input
                id="relance_quotidienne"
                name="relance_quotidienne"
                type="number"
                min="1"
                className="mt-2"
                defaultValue={org?.relance_quotidienne_after ?? 7}
              />
              <p className="mt-1 text-xs text-muted-2">Passe en mode quotidien après ce délai.</p>
            </div>
          </div>
        </Card>

        {isOwner && (
          <div className="sticky bottom-4 z-30">
            <div className="glass border border-border rounded-[var(--radius-lg)] p-3 flex justify-end">
              <Button type="submit">
                <Save className="h-4 w-4" /> Enregistrer
              </Button>
            </div>
          </div>
        )}
      </form>

      {!isOwner && (
        <p className="text-sm text-warning">Seul le propriétaire peut modifier ces réglages.</p>
      )}

      {/* Catalogue par défaut */}
      {isOwner && (
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <h3 className="font-display font-semibold">📦 Catalogue par défaut</h3>
          </div>
          <p className="text-sm text-muted mb-4">
            Générez 45 articles d'électricité courants (prises, interrupteurs, disjoncteurs, câbles, luminaires…)
            avec prix basiques modifiables. Ces articles seront disponibles dans tous vos devis.
          </p>
          <form
            action={async () => {
              "use server"
              const result = await seedDefaultArticles()
              if (result.note) redirect("/app/parametres/defauts?catalogue=exists")
              else redirect("/app/parametres/defauts?catalogue=ok")
            }}
          >
            <Button variant="outline" type="submit">
              Générer le catalogue
            </Button>
          </form>
          {searchParams?.catalogue === "ok" && (
            <p className="mt-2 text-xs text-success">✅ 45 articles ajoutés au catalogue.</p>
          )}
          {searchParams?.catalogue === "exists" && (
            <p className="mt-2 text-xs text-muted">ℹ️ Articles déjà présents (aucun doublon).</p>
          )}
        </Card>
      )}

      {/* Liste des articles avec prix modifiables */}
      {isOwner && articles && articles.length > 0 && (
        <Card>
          <CardTitle className="mb-4">📋 Liste des articles ({articles.length})</CardTitle>
          <p className="text-sm text-muted mb-4">Cliquez sur un prix pour le modifier.</p>
          <div className="space-y-1 max-h-[500px] overflow-y-auto">
            {articles.map((a) => (
              <form
                key={a.id}
                className="grid grid-cols-[1fr,auto,auto] gap-2 items-center py-1.5 px-2 rounded hover:bg-surface-2 text-sm"
                action={async (fd: FormData) => {
                  "use server"
                  const price = Number(fd.get("price"))
                  if (price >= 0) await updateArticlePrice(a.id, price)
                }}
              >
                <span className="truncate">{a.nom}</span>
                <span className="text-[11px] text-muted px-2">{a.categorie}</span>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    name="price"
                    step="0.01"
                    min="0"
                    defaultValue={a.prix_unitaire_ht ?? 0}
                    className="w-20 text-right bg-transparent border border-border rounded px-2 py-1 text-sm focus:border-electric focus:outline-none"
                  />
                  <span className="text-muted text-xs">€</span>
                  <button type="submit" className="text-[11px] text-electric hover:underline px-1">💾</button>
                </div>
              </form>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}
