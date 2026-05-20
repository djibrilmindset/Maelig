import Link from "next/link"
import { ArrowLeft, Phone, Mail, Languages, Crown, UserPlus } from "lucide-react"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { Card, CardTitle, Badge } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/app/empty-state"
import { initials } from "@/lib/utils"
import { getLangue } from "@/lib/langues"
import { InviteForm } from "./client"

export const dynamic = "force-dynamic"

export default async function Page() {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: me } = await supabase
    .from("profiles")
    .select("org_id, role")
    .eq("id", user!.id)
    .maybeSingle()
  const isOwner = me?.role === "owner" || me?.role === "admin_dep"

  const { data: members } = await supabase
    .from("profiles")
    .select("id, full_name, email, telephone, role, langue_maternelle, titre_poste, avatar_url, created_at")
    .eq("org_id", me!.org_id!)
    .order("role", { ascending: true })
    .order("created_at", { ascending: true })

  return (
    <div className="max-w-5xl mx-auto p-6 sm:p-10 space-y-6">
      <Link href="/app/parametres" className="inline-flex items-center gap-1 text-xs text-muted hover:text-electric">
        <ArrowLeft className="h-3 w-3" /> Paramètres
      </Link>
      <div className="flex items-start justify-between gap-4">
        <div>
          <CardTitle>Mon équipe</CardTitle>
          <p className="mt-1 text-sm text-muted">
            Vos collaborateurs. Numéro direct, langue maternelle, rôle. L&apos;IA traduit pour vous.
          </p>
        </div>
      </div>

      {isOwner && (
        <Card>
          <div className="flex items-start gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl border border-border bg-surface-2 text-electric">
              <UserPlus className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <h3 className="font-display font-semibold">Inviter un collaborateur</h3>
              <p className="mt-1 text-sm text-muted">
                +5 €/mois par compte. Il pourra créer des devis sans toucher aux prix. DEP traduira ses messages dans votre langue.
              </p>
              <InviteForm />
            </div>
          </div>
        </Card>
      )}

      {(!members || members.length === 0) ? (
        <EmptyState
          title="Aucun collaborateur"
          description="Invitez votre 1er collaborateur ci-dessus."
        />
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {members.map((m) => {
            const lang = getLangue(m.langue_maternelle)
            const isOwnerCard = m.role === "owner" || m.role === "admin_dep"
            return (
              <Card key={m.id} className="relative">
                <div className="flex items-start gap-4">
                  <div className="grid h-12 w-12 place-items-center rounded-full bg-electric text-black font-semibold text-base shrink-0">
                    {initials(m.full_name || m.email)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-display text-base font-semibold truncate">{m.full_name || m.email}</span>
                      {isOwnerCard && <Badge tone="electric"><Crown className="inline h-3 w-3 mr-0.5" /> patron</Badge>}
                      {m.role === "slave" && <Badge tone="info">collaborateur</Badge>}
                    </div>
                    {m.titre_poste && <div className="text-sm text-muted">{m.titre_poste}</div>}
                    <ul className="mt-3 space-y-1.5 text-sm">
                      {m.email && (
                        <li>
                          <a href={`mailto:${m.email}`} className="inline-flex items-center gap-2 text-foreground hover:text-electric">
                            <Mail className="h-3.5 w-3.5 text-muted" />
                            <span className="truncate">{m.email}</span>
                          </a>
                        </li>
                      )}
                      {m.telephone && (
                        <li>
                          <a href={`tel:${m.telephone.replace(/\s/g, "")}`} className="inline-flex items-center gap-2 text-foreground hover:text-electric">
                            <Phone className="h-3.5 w-3.5 text-muted" />
                            <span>{m.telephone}</span>
                          </a>
                        </li>
                      )}
                      <li className="inline-flex items-center gap-2 text-muted">
                        <Languages className="h-3.5 w-3.5" />
                        <span aria-hidden>{lang.flag}</span>
                        <span>{lang.name_fr}</span>
                        <span className="text-muted-2">· {lang.native}</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
