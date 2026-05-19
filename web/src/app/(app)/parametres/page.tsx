import Link from "next/link"
import { Building2, Settings as SettingsIcon, Users, CreditCard, Image as ImageIcon } from "lucide-react"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { Card, CardTitle, CardDescription, Badge } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export const dynamic = "force-dynamic"

export default async function Page() {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user!.id).maybeSingle()
  const { data: org } = await supabase.from("orgs").select("*").eq("id", profile!.org_id!).maybeSingle()

  const cards = [
    {
      href: "/app/parametres/societe",
      Icon: Building2,
      title: "Société",
      description: "Nom, adresse, SIRET, RIB. Apparaît sur vos devis et factures.",
    },
    {
      href: "/app/parametres/logo",
      Icon: ImageIcon,
      title: "Logo & branding",
      description: "Téléchargez le logo de votre entreprise. Visible sur tous les documents.",
    },
    {
      href: "/app/parametres/equipe",
      Icon: Users,
      title: "Équipe (esclaves)",
      description: "Invitez des collaborateurs. Ils peuvent créer des devis sans toucher aux prix.",
    },
    {
      href: "/app/parametres/abonnement",
      Icon: CreditCard,
      title: "Abonnement DEP",
      description: "Plan, facturation, ajout de sièges supplémentaires.",
    },
    {
      href: "/app/parametres/defauts",
      Icon: SettingsIcon,
      title: "Défauts (TVA, taux horaire, relances)",
      description: "Vos préférences par défaut pour gagner des secondes à chaque devis.",
    },
  ]

  return (
    <div className="max-w-5xl mx-auto p-6 sm:p-10 space-y-6">
      <div>
        <CardTitle>Paramètres</CardTitle>
        <CardDescription>Réglages de votre compte et de votre entreprise.</CardDescription>
      </div>

      <Card className="flex items-center justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-wider text-muted">Plan actuel</div>
          <div className="mt-1 font-display text-2xl font-bold">DEP Pro · 100€/mois</div>
          <div className="mt-1 flex items-center gap-2">
            <Badge tone={org?.subscription_status === "trialing" ? "warning" : "success"}>
              {org?.subscription_status}
            </Badge>
            {org?.subscription_status === "trialing" && org?.trial_ends_at && (
              <span className="text-xs text-muted">Essai jusqu&apos;au {new Date(org.trial_ends_at).toLocaleDateString("fr-FR")}</span>
            )}
          </div>
        </div>
        <Button asChild><Link href="/app/parametres/abonnement">Gérer</Link></Button>
      </Card>

      <div className="grid sm:grid-cols-2 gap-4">
        {cards.map(({ href, Icon, title, description }) => (
          <Link key={href} href={href}>
            <Card className="h-full transition-colors hover:border-border-strong">
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-surface-2 text-electric">
                <Icon className="h-5 w-5" />
              </div>
              <div className="mt-4 font-display font-semibold">{title}</div>
              <p className="mt-1 text-sm text-muted">{description}</p>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
