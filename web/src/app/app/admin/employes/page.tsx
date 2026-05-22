import { HardHat, Phone, Languages, Briefcase, Mail } from "lucide-react"
import { Card, CardHeader, CardTitle, CardDescription, Badge } from "@/components/ui/card"
import { AdminNav } from "../admin-nav"
import { requireAdmin } from "../_lib"
import { getLangue } from "@/lib/langues"

export const dynamic = "force-dynamic"

// Demande user 2026-05-22 — Vue admin simplifiée : uniquement les infos
// que l'employé renseigne lui-même via /app/parametres (update_my_profile).
// On retire provider, dates système, agrégats devis/incidents, patron rattaché.
type Employe = {
  signup_id: string
  user_id: string | null
  email: string
  full_name: string | null
  telephone: string | null
  langue_maternelle: string | null
  titre_poste: string | null
  signed_up_at: string
}

export default async function EmployesPage() {
  const { admin } = await requireAdmin()
  const { data } = await admin.from("v_admin_employes").select("*").limit(500)
  const rows = (data ?? []) as Employe[]

  return (
    <div className="max-w-7xl mx-auto p-6 sm:p-10 space-y-8">
      <header>
        <span className="text-xs uppercase tracking-[0.18em] text-muted">Admin DEP · employés</span>
        <h1 className="mt-1 font-display text-3xl sm:text-4xl font-bold tracking-tight">
          <span className="text-electric">{rows.length}</span> employés
        </h1>
        <p className="mt-2 text-muted">
          Uniquement les informations que les employés renseignent eux-mêmes
          dans leur profil (Paramètres).
        </p>
      </header>

      <AdminNav active="employes" />

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Tous les employés</CardTitle>
            <CardDescription>500 lignes max · profil renseigné par l&apos;employé</CardDescription>
          </div>
          <Badge tone="electric">{rows.length}</Badge>
        </CardHeader>

        <div className="overflow-x-auto -mx-6 px-6">
          <table className="w-full text-sm">
            <thead className="text-left text-[11px] uppercase tracking-[0.14em] text-muted-2 border-b border-border">
              <tr>
                <th className="py-3 pr-4 font-medium">Nom</th>
                <th className="py-3 pr-4 font-medium">Email</th>
                <th className="py-3 pr-4 font-medium">Téléphone</th>
                <th className="py-3 pr-4 font-medium">Titre poste</th>
                <th className="py-3 pr-4 font-medium">Langue maternelle</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-muted">
                    <HardHat className="inline h-8 w-8 mb-2 text-muted-2" />
                    <p>Aucun employé pour le moment.</p>
                    <p className="text-xs mt-1">
                      Les patrons les ajoutent via <strong>Paramètres → Mon équipe</strong>.
                    </p>
                  </td>
                </tr>
              ) : null}
              {rows.map((r) => {
                const lang = getLangue(r.langue_maternelle)
                return (
                  <tr key={r.signup_id} className="hover:bg-surface-2/40">
                    <td className="py-3 pr-4">
                      <div className="font-medium truncate max-w-[220px]">
                        {r.full_name ?? <span className="text-muted-2">—</span>}
                      </div>
                    </td>
                    <td className="py-3 pr-4">
                      <a
                        href={`mailto:${r.email}`}
                        className="inline-flex items-center gap-1.5 text-foreground hover:text-electric"
                      >
                        <Mail className="h-3.5 w-3.5 text-muted" />
                        <span className="truncate max-w-[220px]">{r.email}</span>
                      </a>
                    </td>
                    <td className="py-3 pr-4">
                      {r.telephone ? (
                        <a
                          href={`tel:${r.telephone.replace(/\s/g, "")}`}
                          className="inline-flex items-center gap-1.5 text-foreground hover:text-electric"
                        >
                          <Phone className="h-3.5 w-3.5 text-muted" />
                          {r.telephone}
                        </a>
                      ) : (
                        <span className="text-muted-2">—</span>
                      )}
                    </td>
                    <td className="py-3 pr-4">
                      {r.titre_poste ? (
                        <span className="inline-flex items-center gap-1.5">
                          <Briefcase className="h-3.5 w-3.5 text-muted" />
                          {r.titre_poste}
                        </span>
                      ) : (
                        <span className="text-muted-2">—</span>
                      )}
                    </td>
                    <td className="py-3 pr-4">
                      <span className="inline-flex items-center gap-1.5">
                        <Languages className="h-3.5 w-3.5 text-muted" />
                        <span aria-hidden>{lang.flag}</span>
                        {lang.name_fr}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
