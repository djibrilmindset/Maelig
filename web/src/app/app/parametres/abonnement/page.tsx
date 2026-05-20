import { createSupabaseServerClient } from "@/lib/supabase/server"
import { Card, CardTitle, Badge } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { formatDateFR } from "@/lib/utils"
import { Subscribe, SyncSeats } from "./client"

export const dynamic = "force-dynamic"

export default async function AbonnementPage() {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from("profiles").select("org_id, role").eq("id", user!.id).maybeSingle()
  const { data: org } = await supabase.from("orgs").select("*").eq("id", profile!.org_id!).maybeSingle()

  const status = org?.subscription_status ?? "trialing"
  const isOwner = profile?.role === "owner" || profile?.role === "admin_dep"

  return (
    <div className="max-w-3xl mx-auto p-6 sm:p-10 space-y-6">
      <CardTitle>Abonnement DEP</CardTitle>

      <Card>
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-wider text-muted">Statut</div>
            <div className="mt-1 font-display text-3xl font-bold">DEP Pro</div>
            <div className="mt-2"><Badge tone={status === "trialing" ? "warning" : status === "active" ? "success" : "danger"}>{status}</Badge></div>
          </div>
          <div className="text-right">
            <div className="text-xs uppercase tracking-wider text-muted">Tarif</div>
            <div className="mt-1 font-display text-3xl font-bold">100€<span className="text-sm text-muted font-normal">/mois</span></div>
            <div className="mt-1 text-xs text-muted">+ 5€/mois par esclave</div>
          </div>
        </div>
        <div className="mt-6 grid sm:grid-cols-2 gap-4 text-sm">
          <Info label="Essai gratuit jusqu'au" value={org?.trial_ends_at ? formatDateFR(org.trial_ends_at) : "—"} />
          <Info label="Prochaine échéance" value={org?.current_period_end ? formatDateFR(org.current_period_end) : "—"} />
          <Info label="Sièges esclaves" value={String(org?.slave_seats ?? 0)} />
          <Info label="Stripe customer" value={org?.stripe_customer_id ?? "—"} mono />
        </div>
      </Card>

      {isOwner && (
        <Card>
          <CardTitle>Gérer mon abonnement</CardTitle>
          <p className="mt-2 text-sm text-muted">
            Démarrer ou gérer votre abonnement DEP via Stripe (paiement sécurisé). 14 jours gratuits offerts.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Subscribe />
            {org?.stripe_customer_id && (
              <Button variant="secondary" formAction="" onClick={undefined}>
                Portail facturation
              </Button>
            )}
          </div>
        </Card>
      )}

      <Card>
        <CardTitle>Ajouter / retirer des esclaves</CardTitle>
        <p className="mt-2 text-sm text-muted">
          Vos employés. Ils peuvent créer des devis mais pas modifier les prix du catalogue. 5€/mois par compte.
        </p>
        <SyncSeats current={org?.slave_seats ?? 0} disabled={!isOwner} />
      </Card>
    </div>
  )
}

function Info({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-[0.18em] text-muted">{label}</div>
      <div className={`mt-0.5 ${mono ? "font-mono text-xs" : ""}`}>{value}</div>
    </div>
  )
}
