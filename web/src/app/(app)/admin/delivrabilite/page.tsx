import { AlertCircle, CheckCircle2 } from "lucide-react"
import { Card, CardHeader, CardTitle, CardDescription, Badge } from "@/components/ui/card"
import { AdminNav } from "../admin-nav"
import { TestEmailPanel } from "../test-email-panel"
import { requireAdmin, formatRelative } from "../_lib"

export const dynamic = "force-dynamic"

type EmailLog = {
  id: string
  template: string
  recipient_email: string
  status: string
  error_message: string | null
  sent_at: string
  delivered_at: string | null
  opened_at: string | null
}

export default async function DelivrabilitePage() {
  const { supabase, user } = await requireAdmin()
  const { data: logs } = await supabase
    .from("email_test_log")
    .select("*")
    .order("sent_at", { ascending: false })
    .limit(100)
  const rows = (logs ?? []) as EmailLog[]

  const totaux = rows.reduce(
    (acc, r) => ({
      sent: acc.sent + (r.status === "sent" || r.status === "delivered" ? 1 : 0),
      failed: acc.failed + (r.status === "failed" || r.status === "bounced" ? 1 : 0),
    }),
    { sent: 0, failed: 0 },
  )
  const tauxSuccess = rows.length ? Math.round((totaux.sent * 100) / rows.length) : 100

  return (
    <div className="max-w-7xl mx-auto p-6 sm:p-10 space-y-8">
      <header>
        <span className="text-xs uppercase tracking-[0.18em] text-muted">Admin DEP · délivrabilité</span>
        <h1 className="mt-1 font-display text-3xl sm:text-4xl font-bold tracking-tight">
          Tester les emails <span className="text-electric">avant que les patrons arrivent</span>
        </h1>
        <p className="mt-2 text-muted">Confirmation inscription, magic link, reset password, invitation employé. Garde un œil sur les bounces.</p>
      </header>

      <AdminNav active="delivery" />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Mini label="Envois OK" value={totaux.sent} tone="success" />
        <Mini label="Échecs" value={totaux.failed} tone={totaux.failed > 0 ? "danger" : "neutral"} />
        <Mini label="Taux succès" value={`${tauxSuccess}%`} tone={tauxSuccess >= 95 ? "success" : tauxSuccess >= 80 ? "warning" : "danger"} />
        <Mini label="Total tests" value={rows.length} />
      </div>

      <div className="grid lg:grid-cols-[1.4fr_1fr] gap-6 items-start">
        <TestEmailPanel defaultRecipient={user.email!} />

        <Card className="!p-5">
          <CardTitle className="text-base">Checklist avant lancement</CardTitle>
          <CardDescription className="mt-2">
            Avant qu&apos;un patron BTP n&apos;arrive sur DEP, on veut être <strong className="text-foreground">absolument certains</strong> que :
          </CardDescription>
          <ul className="mt-4 space-y-2 text-sm text-foreground/85">
            <li className="flex items-start gap-2"><CheckCircle2 className="h-4 w-4 text-success mt-0.5 shrink-0" /> L&apos;email de <strong>confirmation</strong> arrive en boîte principale</li>
            <li className="flex items-start gap-2"><CheckCircle2 className="h-4 w-4 text-success mt-0.5 shrink-0" /> Le <strong>magic link</strong> connecte en 1 clic</li>
            <li className="flex items-start gap-2"><CheckCircle2 className="h-4 w-4 text-success mt-0.5 shrink-0" /> Le <strong>reset password</strong> arrive en moins de 30s</li>
            <li className="flex items-start gap-2"><CheckCircle2 className="h-4 w-4 text-success mt-0.5 shrink-0" /> L&apos;<strong>invitation employé</strong> est lisible sur mobile</li>
          </ul>
          <div className="mt-4 rounded-md border border-warning/30 bg-warning/10 p-3 text-xs text-warning-foreground">
            <AlertCircle className="inline h-3 w-3 mr-1" />
            Si un test échoue : Supabase Dashboard → Auth → SMTP Settings → vérifier sender domaine + SPF/DKIM.
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Historique des tests</CardTitle>
            <CardDescription>100 derniers envois</CardDescription>
          </div>
          <Badge tone="electric">{rows.length}</Badge>
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
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-muted">Aucun test envoyé pour le moment</td>
                </tr>
              ) : null}
              {rows.map((l) => {
                const ok = l.status === "sent" || l.status === "delivered"
                return (
                  <tr key={l.id} className="hover:bg-surface-2/40">
                    <td className="py-3 pr-4 text-xs text-muted whitespace-nowrap">{formatRelative(l.sent_at)}</td>
                    <td className="py-3 pr-4 font-medium">{l.template}</td>
                    <td className="py-3 pr-4 text-xs">{l.recipient_email}</td>
                    <td className="py-3 pr-4">
                      <Badge tone={ok ? "success" : (l.status === "failed" || l.status === "bounced") ? "danger" : "neutral"}>{l.status}</Badge>
                    </td>
                    <td className="py-3 pr-4 text-xs text-danger max-w-[320px] truncate">{l.error_message ?? ""}</td>
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

function Mini({ label, value, tone = "neutral" }: { label: string; value: string | number; tone?: "neutral" | "success" | "warning" | "danger" }) {
  const t = {
    neutral: "text-foreground",
    success: "text-success",
    warning: "text-warning",
    danger: "text-danger",
  }[tone]
  return (
    <Card className="!p-5">
      <p className="text-[11px] uppercase tracking-[0.18em] text-muted-2">{label}</p>
      <p className={`mt-2 font-display text-2xl font-bold tabular-nums ${t}`}>{value}</p>
    </Card>
  )
}
