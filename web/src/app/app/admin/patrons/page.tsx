import { Mail, Apple, Briefcase, AlertCircle, CheckCircle2, ShieldCheck, Users, Receipt } from "lucide-react"
import { Card, CardHeader, CardTitle, CardDescription, Badge } from "@/components/ui/card"
import { AdminNav } from "../admin-nav"
import { requireAdmin, formatEUR, formatRelative } from "../_lib"

export const dynamic = "force-dynamic"

type Patron = {
  signup_id: string
  user_id: string | null
  email: string
  full_name: string | null
  company: string | null
  provider: string
  is_email_confirmed: boolean
  email_confirmed_at: string | null
  signed_up_at: string
  last_sign_in_at: string | null
  org_id: string | null
  org_nom: string | null
  subscription_status: string | null
  trial_ends_at: string | null
  org_created_at: string | null
  employes_count: number
  devis_total: number
  devis_signes: number
  factures_payees: number
  ca_encaisse: number
  ca_en_attente: number
  incidents_ouverts: number
  account_state: string
}

export default async function PatronsPage() {
  const { admin } = await requireAdmin()
  const { data } = await admin.from("v_admin_patrons").select("*").limit(500)
  const rows = (data ?? []) as Patron[]

  const totaux = rows.reduce(
    (acc, r) => ({
      ca_encaisse: acc.ca_encaisse + Number(r.ca_encaisse ?? 0),
      ca_en_attente: acc.ca_en_attente + Number(r.ca_en_attente ?? 0),
      employes: acc.employes + Number(r.employes_count ?? 0),
      devis_signes: acc.devis_signes + Number(r.devis_signes ?? 0),
    }),
    { ca_encaisse: 0, ca_en_attente: 0, employes: 0, devis_signes: 0 },
  )

  return (
    <div className="max-w-7xl mx-auto p-6 sm:p-10 space-y-8">
      <header>
        <span className="text-xs uppercase tracking-[0.18em] text-muted">Admin DEP · patrons</span>
        <h1 className="mt-1 font-display text-3xl sm:text-4xl font-bold tracking-tight">
          <span className="text-electric">{rows.length}</span> chefs d&apos;entreprise
        </h1>
        <p className="mt-2 text-muted">Tous les comptes <strong className="text-foreground">owner</strong>. Cliquez sur une ligne pour le détail org &amp; activité.</p>
      </header>

      <AdminNav active="patrons" />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Mini label="CA total encaissé" value={formatEUR(totaux.ca_encaisse)} tone="success" />
        <Mini label="CA en attente" value={formatEUR(totaux.ca_en_attente)} tone="warning" />
        <Mini label="Employés rattachés" value={totaux.employes} icon={Users} />
        <Mini label="Devis signés" value={totaux.devis_signes} icon={Receipt} />
      </div>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Tous les patrons</CardTitle>
            <CardDescription>500 lignes max · triés par date d&apos;inscription</CardDescription>
          </div>
          <Badge tone="electric">{rows.length}</Badge>
        </CardHeader>

        <div className="overflow-x-auto -mx-6 px-6">
          <table className="w-full text-sm">
            <thead className="text-left text-[11px] uppercase tracking-[0.14em] text-muted-2 border-b border-border">
              <tr>
                <th className="py-3 pr-4 font-medium">Patron · Société</th>
                <th className="py-3 pr-4 font-medium">Source</th>
                <th className="py-3 pr-4 font-medium">Abonnement</th>
                <th className="py-3 pr-4 font-medium text-right">CA encaissé</th>
                <th className="py-3 pr-4 font-medium text-right">Équipe</th>
                <th className="py-3 pr-4 font-medium text-right">Devis</th>
                <th className="py-3 pr-4 font-medium">Inscrit</th>
                <th className="py-3 pr-4 font-medium">Dernière connexion</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-muted">
                    <Briefcase className="inline h-8 w-8 mb-2 text-muted-2" />
                    <p>Aucun patron pour le moment. Le premier signup atterrira ici en temps réel.</p>
                  </td>
                </tr>
              ) : null}
              {rows.map((r) => (
                <tr key={r.signup_id} className="hover:bg-surface-2/40">
                  <td className="py-3 pr-4">
                    <div className="font-medium truncate max-w-[240px]">{r.full_name ?? r.email}</div>
                    <div className="text-xs text-muted truncate max-w-[240px]">
                      {r.org_nom ?? r.company ?? "—"} · <span className="text-muted-2">{r.email}</span>
                    </div>
                  </td>
                  <td className="py-3 pr-4">
                    <ProviderBadge provider={r.provider} />
                  </td>
                  <td className="py-3 pr-4">
                    <SubBadge status={r.subscription_status} trialEndsAt={r.trial_ends_at} confirmed={r.is_email_confirmed} />
                  </td>
                  <td className="py-3 pr-4 text-right tabular-nums">{formatEUR(r.ca_encaisse)}</td>
                  <td className="py-3 pr-4 text-right tabular-nums">{r.employes_count}</td>
                  <td className="py-3 pr-4 text-right tabular-nums">
                    <span className="text-foreground">{r.devis_signes}</span>
                    <span className="text-muted-2"> / {r.devis_total}</span>
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

function Mini({ label, value, tone = "neutral", icon: Icon }: { label: string; value: string | number; tone?: "neutral" | "success" | "warning"; icon?: typeof Briefcase }) {
  const t = { neutral: "text-foreground", success: "text-success", warning: "text-warning" }[tone]
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

function SubBadge({ status, trialEndsAt, confirmed }: { status: string | null; trialEndsAt: string | null; confirmed: boolean }) {
  if (!confirmed) return <Badge tone="warning"><AlertCircle className="h-3 w-3" /> Email non confirmé</Badge>
  if (status === "trialing") {
    const daysLeft = trialEndsAt ? Math.max(0, Math.ceil((new Date(trialEndsAt).getTime() - Date.now()) / 86_400_000)) : null
    return <Badge tone="info"><ShieldCheck className="h-3 w-3" /> Essai{daysLeft !== null ? ` · ${daysLeft}j` : ""}</Badge>
  }
  if (status === "active")    return <Badge tone="success"><CheckCircle2 className="h-3 w-3" /> Payant</Badge>
  if (status === "past_due")  return <Badge tone="danger">Impayé</Badge>
  if (status === "canceled")  return <Badge tone="neutral">Annulé</Badge>
  return <Badge tone="neutral">—</Badge>
}
