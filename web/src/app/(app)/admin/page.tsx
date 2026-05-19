import { redirect } from "next/navigation"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { Users, Mail, Apple, ShieldCheck, AlertCircle, CheckCircle2 } from "lucide-react"
import { Card, CardHeader, CardTitle, CardDescription, Badge } from "@/components/ui/card"
import { AdminTabs } from "./admin-tabs"
import { TestEmailPanel } from "./test-email-panel"

export const dynamic = "force-dynamic"

const ADMIN_EMAILS = ["ayouneslead@gmail.com", "djibrilmindset@gmail.com"]

type SignupRow = {
  id: string
  user_id: string | null
  email: string
  provider: string
  full_name: string | null
  company: string | null
  org_id: string | null
  org_nom: string | null
  subscription_status: string | null
  trial_ends_at: string | null
  is_email_confirmed: boolean
  email_confirmed_at: string | null
  signed_up_at: string
  last_sign_in_at: string | null
  role: string | null
  account_state: string
}

type Stats = {
  total_signups: number
  confirmed: number
  pending_email: number
  via_google: number
  via_apple: number
  via_email: number
  last_24h: number
  last_7d: number
  last_30d: number
}

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/connexion")

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, email")
    .eq("id", user.id)
    .maybeSingle()

  // Gate strict : admin_dep ou email whitelist
  const isAdmin = profile?.role === "admin_dep" || ADMIN_EMAILS.includes((user.email || "").toLowerCase())
  if (!isAdmin) redirect("/app")

  const tab = (await searchParams).tab ?? "recensement"

  const [{ data: signups }, { data: statsRow }, { data: emailLog }] = await Promise.all([
    supabase.from("v_admin_signups").select("*").limit(200),
    supabase.from("v_admin_signups_stats").select("*").maybeSingle(),
    supabase.from("email_test_log").select("*").order("sent_at", { ascending: false }).limit(50),
  ])

  const rows = (signups ?? []) as SignupRow[]
  const stats = (statsRow ?? null) as Stats | null

  return (
    <div className="max-w-7xl mx-auto p-6 sm:p-10 space-y-8">
      <header>
        <span className="text-xs uppercase tracking-[0.18em] text-muted">Admin DEP · accès restreint</span>
        <h1 className="mt-1 font-display text-3xl sm:text-4xl font-bold tracking-tight">
          Recensement & <span className="text-electric">délivrabilité</span>
        </h1>
        <p className="mt-2 text-muted">
          Toutes les créations de comptes en temps réel, et un atelier pour tester chaque email transactionnel
        </p>
      </header>

      <AdminTabs active={tab} />

      {tab === "delivrabilite" ? (
        <DeliveryTab logs={emailLog ?? []} currentUserEmail={user.email!} />
      ) : (
        <RecensementTab rows={rows} stats={stats} />
      )}
    </div>
  )
}

function StatCard({ label, value, sub, tone = "neutral" }: { label: string; value: number | string; sub?: string; tone?: "neutral" | "electric" | "success" | "danger" }) {
  const toneColor = {
    neutral: "text-foreground",
    electric: "text-electric",
    success: "text-success",
    danger: "text-danger",
  }[tone]
  return (
    <Card className="!p-5">
      <p className="text-[11px] uppercase tracking-[0.18em] text-muted-2">{label}</p>
      <p className={`mt-2 font-display text-3xl font-bold tabular-nums ${toneColor}`}>{value}</p>
      {sub ? <p className="mt-1 text-xs text-muted">{sub}</p> : null}
    </Card>
  )
}

function RecensementTab({ rows, stats }: { rows: SignupRow[]; stats: Stats | null }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total comptes" value={stats?.total_signups ?? 0} sub={`${stats?.last_7d ?? 0} sur 7j`} tone="electric" />
        <StatCard label="Confirmés" value={stats?.confirmed ?? 0} tone="success" sub={`${stats?.pending_email ?? 0} en attente`} />
        <StatCard label="Google" value={stats?.via_google ?? 0} sub={`Email: ${stats?.via_email ?? 0}`} />
        <StatCard label="Apple" value={stats?.via_apple ?? 0} sub={`24h: ${stats?.last_24h ?? 0}`} />
      </div>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Derniers inscrits</CardTitle>
            <CardDescription>200 lignes max · triés par date d&apos;inscription · source : signup_events + profiles + orgs</CardDescription>
          </div>
          <Badge tone="electric">{rows.length}</Badge>
        </CardHeader>

        <div className="overflow-x-auto -mx-6 px-6">
          <table className="w-full text-sm">
            <thead className="text-left text-[11px] uppercase tracking-[0.14em] text-muted-2 border-b border-border">
              <tr>
                <th className="py-3 pr-4 font-medium">Email · Nom</th>
                <th className="py-3 pr-4 font-medium">Source</th>
                <th className="py-3 pr-4 font-medium">Org</th>
                <th className="py-3 pr-4 font-medium">État compte</th>
                <th className="py-3 pr-4 font-medium">Inscrit</th>
                <th className="py-3 pr-4 font-medium">Dernière connexion</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-muted">Aucun signup pour le moment</td>
                </tr>
              ) : null}
              {rows.map((r) => (
                <tr key={r.id} className="hover:bg-surface-2/40">
                  <td className="py-3 pr-4">
                    <div className="font-medium truncate max-w-[260px]">{r.email}</div>
                    <div className="text-xs text-muted truncate max-w-[260px]">
                      {r.full_name ?? "—"} {r.company ? `· ${r.company}` : ""}
                    </div>
                  </td>
                  <td className="py-3 pr-4">
                    <ProviderBadge provider={r.provider} />
                  </td>
                  <td className="py-3 pr-4">
                    <div className="truncate max-w-[200px]">{r.org_nom ?? <span className="text-muted-2">—</span>}</div>
                    <div className="text-xs text-muted">{r.subscription_status ?? ""}</div>
                  </td>
                  <td className="py-3 pr-4">
                    <AccountStateBadge state={r.account_state} confirmed={r.is_email_confirmed} />
                  </td>
                  <td className="py-3 pr-4 text-xs text-muted whitespace-nowrap">{formatRelative(r.signed_up_at)}</td>
                  <td className="py-3 pr-4 text-xs text-muted whitespace-nowrap">{r.last_sign_in_at ? formatRelative(r.last_sign_in_at) : <span className="text-muted-2">Jamais</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}

function DeliveryTab({ logs, currentUserEmail }: { logs: Array<Record<string, unknown>>; currentUserEmail: string }) {
  return (
    <div className="space-y-6">
      <div className="grid lg:grid-cols-[1.4fr_1fr] gap-6 items-start">
        <TestEmailPanel defaultRecipient={currentUserEmail} />

        <Card className="!p-5">
          <CardTitle className="text-base">Pourquoi ce panel ?</CardTitle>
          <CardDescription className="mt-2">
            Avant qu&apos;un patron BTP n&apos;arrive sur DEP, il faut être <strong className="text-foreground">absolument certain</strong> que :
          </CardDescription>
          <ul className="mt-4 space-y-2 text-sm text-foreground/85">
            <li className="flex items-start gap-2"><CheckCircle2 className="h-4 w-4 text-success mt-0.5 shrink-0" /> L&apos;email de <strong>confirmation d&apos;inscription</strong> arrive en boîte principale (pas spam)</li>
            <li className="flex items-start gap-2"><CheckCircle2 className="h-4 w-4 text-success mt-0.5 shrink-0" /> Le <strong>magic link</strong> fonctionne (1 clic = connecté)</li>
            <li className="flex items-start gap-2"><CheckCircle2 className="h-4 w-4 text-success mt-0.5 shrink-0" /> L&apos;email de <strong>reset password</strong> arrive en moins de 30s</li>
            <li className="flex items-start gap-2"><CheckCircle2 className="h-4 w-4 text-success mt-0.5 shrink-0" /> L&apos;email d&apos;<strong>invitation employé</strong> est lisible (chef d&apos;équipe pas forcément aisé avec l&apos;email)</li>
          </ul>
          <div className="mt-4 rounded-md border border-warning/30 bg-warning/10 p-3 text-xs text-warning-foreground">
            <AlertCircle className="inline h-3 w-3 mr-1" />
            Si un test échoue : vérifier le SMTP custom dans Supabase Dashboard → Auth → SMTP Settings.
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Historique des tests</CardTitle>
            <CardDescription>50 derniers envois (tous opérateurs admin confondus)</CardDescription>
          </div>
          <Badge tone="electric">{logs.length}</Badge>
        </CardHeader>

        <div className="overflow-x-auto -mx-6 px-6">
          <table className="w-full text-sm">
            <thead className="text-left text-[11px] uppercase tracking-[0.14em] text-muted-2 border-b border-border">
              <tr>
                <th className="py-3 pr-4 font-medium">Quand</th>
                <th className="py-3 pr-4 font-medium">Template</th>
                <th className="py-3 pr-4 font-medium">Destinataire</th>
                <th className="py-3 pr-4 font-medium">Statut</th>
                <th className="py-3 pr-4 font-medium">Erreur</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-muted">Aucun test envoyé pour le moment</td>
                </tr>
              ) : null}
              {logs.map((l) => {
                const sentAt = (l.sent_at as string) ?? ""
                const status = (l.status as string) ?? ""
                return (
                  <tr key={l.id as string} className="hover:bg-surface-2/40">
                    <td className="py-3 pr-4 text-xs text-muted whitespace-nowrap">{formatRelative(sentAt)}</td>
                    <td className="py-3 pr-4 font-medium">{l.template as string}</td>
                    <td className="py-3 pr-4 text-xs">{l.recipient_email as string}</td>
                    <td className="py-3 pr-4">
                      <Badge tone={status === "sent" || status === "delivered" ? "success" : status === "failed" || status === "bounced" ? "danger" : "neutral"}>
                        {status}
                      </Badge>
                    </td>
                    <td className="py-3 pr-4 text-xs text-danger max-w-[260px] truncate">{(l.error_message as string | null) ?? ""}</td>
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

function ProviderBadge({ provider }: { provider: string }) {
  if (provider === "google") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface-2 px-2.5 py-1 text-[11px] font-medium">
        <span className="h-2 w-2 rounded-full bg-[#4285F4]" /> Google
      </span>
    )
  }
  if (provider === "apple") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface-2 px-2.5 py-1 text-[11px] font-medium">
        <Apple className="h-3 w-3" /> Apple
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface-2 px-2.5 py-1 text-[11px] font-medium">
      <Mail className="h-3 w-3" /> Email
    </span>
  )
}

function AccountStateBadge({ state, confirmed }: { state: string; confirmed: boolean }) {
  if (!confirmed) return <Badge tone="warning"><AlertCircle className="h-3 w-3" /> Email non confirmé</Badge>
  if (state === "trialing") return <Badge tone="info"><ShieldCheck className="h-3 w-3" /> Essai</Badge>
  if (state === "paying") return <Badge tone="success"><CheckCircle2 className="h-3 w-3" /> Payant</Badge>
  if (state === "past_due") return <Badge tone="danger">Impayé</Badge>
  if (state === "canceled") return <Badge tone="neutral">Annulé</Badge>
  return <Badge tone="neutral"><Users className="h-3 w-3" /> Confirmé</Badge>
}

function formatRelative(iso: string): string {
  if (!iso) return "—"
  const d = new Date(iso)
  const diff = Date.now() - d.getTime()
  const min = Math.floor(diff / 60_000)
  if (min < 1) return "à l'instant"
  if (min < 60) return `il y a ${min} min`
  const h = Math.floor(min / 60)
  if (h < 24) return `il y a ${h}h`
  const day = Math.floor(h / 24)
  if (day < 30) return `il y a ${day}j`
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })
}
