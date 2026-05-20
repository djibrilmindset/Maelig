import { Mail, Apple, HardHat, AlertCircle, AlertTriangle } from "lucide-react"
import { Card, CardHeader, CardTitle, CardDescription, Badge } from "@/components/ui/card"
import { AdminNav } from "../admin-nav"
import { requireAdmin, formatRelative } from "../_lib"

export const dynamic = "force-dynamic"

type Employe = {
  signup_id: string
  user_id: string | null
  email: string
  full_name: string | null
  provider: string
  is_email_confirmed: boolean
  signed_up_at: string
  last_sign_in_at: string | null
  org_id: string | null
  org_nom: string | null
  subscription_status: string | null
  owner_user_id: string | null
  owner_full_name: string | null
  owner_email: string | null
  incidents_signales: number
  incidents_ouverts: number
  devis_crees: number
  devis_a_valider: number
  last_incident_at: string | null
}

export default async function EmployesPage() {
  const { admin } = await requireAdmin()
  const { data } = await admin.from("v_admin_employes").select("*").limit(500)
  const rows = (data ?? []) as Employe[]

  const totaux = rows.reduce(
    (acc, r) => ({
      incidents: acc.incidents + Number(r.incidents_signales ?? 0),
      ouverts: acc.ouverts + Number(r.incidents_ouverts ?? 0),
      devis: acc.devis + Number(r.devis_crees ?? 0),
      a_valider: acc.a_valider + Number(r.devis_a_valider ?? 0),
    }),
    { incidents: 0, ouverts: 0, devis: 0, a_valider: 0 },
  )

  return (
    <div className="max-w-7xl mx-auto p-6 sm:p-10 space-y-8">
      <header>
        <span className="text-xs uppercase tracking-[0.18em] text-muted">Admin DEP · employés</span>
        <h1 className="mt-1 font-display text-3xl sm:text-4xl font-bold tracking-tight">
          <span className="text-electric">{rows.length}</span> employés sur chantier
        </h1>
        <p className="mt-2 text-muted">Comptes <strong className="text-foreground">slave</strong>. Patron rattaché visible. Activité incidents &amp; devis traçable.</p>
      </header>

      <AdminNav active="employes" />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Mini label="Incidents signalés" value={totaux.incidents} icon={AlertTriangle} />
        <Mini label="Incidents ouverts" value={totaux.ouverts} tone={totaux.ouverts > 0 ? "warning" : "neutral"} />
        <Mini label="Devis créés" value={totaux.devis} />
        <Mini label="En attente validation" value={totaux.a_valider} tone={totaux.a_valider > 0 ? "warning" : "neutral"} />
      </div>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Tous les employés</CardTitle>
            <CardDescription>500 lignes max · activité chantier en temps réel</CardDescription>
          </div>
          <Badge tone="electric">{rows.length}</Badge>
        </CardHeader>

        <div className="overflow-x-auto -mx-6 px-6">
          <table className="w-full text-sm">
            <thead className="text-left text-[11px] uppercase tracking-[0.14em] text-muted-2 border-b border-border">
              <tr>
                <th className="py-3 pr-4 font-medium">Employé</th>
                <th className="py-3 pr-4 font-medium">Source</th>
                <th className="py-3 pr-4 font-medium">Patron rattaché</th>
                <th className="py-3 pr-4 font-medium text-right">Incidents</th>
                <th className="py-3 pr-4 font-medium text-right">Devis</th>
                <th className="py-3 pr-4 font-medium">Inscrit</th>
                <th className="py-3 pr-4 font-medium">Dernière connexion</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-muted">
                    <HardHat className="inline h-8 w-8 mb-2 text-muted-2" />
                    <p>Aucun employé invité pour le moment.</p>
                    <p className="text-xs mt-1">Les patrons les ajoutent via <strong>Paramètres → Mon équipe</strong>.</p>
                  </td>
                </tr>
              ) : null}
              {rows.map((r) => (
                <tr key={r.signup_id} className="hover:bg-surface-2/40">
                  <td className="py-3 pr-4">
                    <div className="font-medium truncate max-w-[200px]">{r.full_name ?? r.email}</div>
                    <div className="text-xs text-muted-2 truncate max-w-[200px]">{r.email}</div>
                  </td>
                  <td className="py-3 pr-4">
                    <ProviderBadge provider={r.provider} />
                    {!r.is_email_confirmed ? <Badge tone="warning" className="ml-1"><AlertCircle className="h-3 w-3" /> Non confirmé</Badge> : null}
                  </td>
                  <td className="py-3 pr-4">
                    <div className="truncate max-w-[220px]">{r.owner_full_name ?? r.owner_email ?? <span className="text-muted-2">Aucun</span>}</div>
                    <div className="text-xs text-muted truncate max-w-[220px]">{r.org_nom ?? ""}</div>
                  </td>
                  <td className="py-3 pr-4 text-right tabular-nums">
                    <span className="text-foreground">{r.incidents_ouverts}</span>
                    <span className="text-muted-2"> / {r.incidents_signales}</span>
                  </td>
                  <td className="py-3 pr-4 text-right tabular-nums">
                    <span className="text-foreground">{r.devis_a_valider}</span>
                    <span className="text-muted-2"> / {r.devis_crees}</span>
                  </td>
                  <td className="py-3 pr-4 text-xs text-muted whitespace-nowrap">{formatRelative(r.signed_up_at)}</td>
                  <td className="py-3 pr-4 text-xs text-muted whitespace-nowrap">
                    {r.last_sign_in_at ? formatRelative(r.last_sign_in_at) : <span className="text-muted-2">Jamais</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}

function Mini({ label, value, tone = "neutral", icon: Icon }: { label: string; value: number; tone?: "neutral" | "warning"; icon?: typeof HardHat }) {
  const t = { neutral: "text-foreground", warning: "text-warning" }[tone]
  return (
    <Card className="!p-5">
      <div className="flex items-start justify-between">
        <p className="text-[11px] uppercase tracking-[0.18em] text-muted-2">{label}</p>
        {Icon ? <Icon className="h-4 w-4 text-muted" /> : null}
      </div>
      <p className={`mt-2 font-display text-2xl font-bold tabular-nums ${t}`}>{value}</p>
    </Card>
  )
}

function ProviderBadge({ provider }: { provider: string }) {
  if (provider === "google") return <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface-2 px-2.5 py-1 text-[11px] font-medium"><span className="h-2 w-2 rounded-full bg-[#4285F4]" /> Google</span>
  if (provider === "apple")  return <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface-2 px-2.5 py-1 text-[11px] font-medium"><Apple className="h-3 w-3" /> Apple</span>
  return <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface-2 px-2.5 py-1 text-[11px] font-medium"><Mail className="h-3 w-3" /> Email</span>
}
