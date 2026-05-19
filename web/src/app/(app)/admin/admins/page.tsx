import { Mail, Apple, Shield, AlertCircle, FlaskConical } from "lucide-react"
import { Card, CardHeader, CardTitle, CardDescription, Badge } from "@/components/ui/card"
import { AdminNav } from "../admin-nav"
import { requireAdmin, formatRelative } from "../_lib"

export const dynamic = "force-dynamic"

type Admin = {
  signup_id: string
  user_id: string | null
  email: string
  full_name: string | null
  provider: string
  is_email_confirmed: boolean
  signed_up_at: string
  last_sign_in_at: string | null
  org_nom: string | null
  tests_envoyes: number
  last_test_at: string | null
}

export default async function AdminsPage() {
  const { supabase } = await requireAdmin()
  const { data } = await supabase.from("v_admin_admins").select("*").limit(100)
  const rows = (data ?? []) as Admin[]

  return (
    <div className="max-w-7xl mx-auto p-6 sm:p-10 space-y-8">
      <header>
        <span className="text-xs uppercase tracking-[0.18em] text-muted">Admin DEP · super-utilisateurs</span>
        <h1 className="mt-1 font-display text-3xl sm:text-4xl font-bold tracking-tight">
          <span className="text-electric">{rows.length}</span> admins DEP
        </h1>
        <p className="mt-2 text-muted">Comptes avec role <strong className="text-foreground">admin_dep</strong>. Accès total plateforme + test délivrabilité.</p>
      </header>

      <AdminNav active="admins" />

      <Card className="bg-warning/5 border-warning/20">
        <div className="flex items-start gap-3">
          <Badge tone="warning"><AlertCircle className="h-3 w-3" /> Confidentiel</Badge>
          <div>
            <CardTitle className="text-base">Liste figée — emails whitelist</CardTitle>
            <CardDescription className="mt-1">
              Seuls 3 emails sont admin_dep par défaut : <code className="text-foreground">ayouneslead@gmail.com</code>, <code className="text-foreground">djibrilmindset@gmail.com</code>, <code className="text-foreground">djibrilsylearn@gmail.com</code>.
              Toute autre adresse sera reçue comme <strong>owner</strong>.
            </CardDescription>
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Tous les admins</CardTitle>
            <CardDescription>Tests de délivrabilité envoyés par chacun, dernière activité</CardDescription>
          </div>
          <Badge tone="electric">{rows.length}</Badge>
        </CardHeader>

        <div className="overflow-x-auto -mx-6 px-6">
          <table className="w-full text-sm">
            <thead className="text-left text-[11px] uppercase tracking-[0.14em] text-muted-2 border-b border-border">
              <tr>
                <th className="py-3 pr-4 font-medium">Admin</th>
                <th className="py-3 pr-4 font-medium">Source</th>
                <th className="py-3 pr-4 font-medium">Org sandbox</th>
                <th className="py-3 pr-4 font-medium text-right">Tests envoyés</th>
                <th className="py-3 pr-4 font-medium">Dernier test</th>
                <th className="py-3 pr-4 font-medium">Inscrit</th>
                <th className="py-3 pr-4 font-medium">Dernière connexion</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-muted">
                    <Shield className="inline h-8 w-8 mb-2 text-muted-2" />
                    <p>Aucun admin DEP — bizarre, tu devrais y être.</p>
                  </td>
                </tr>
              ) : null}
              {rows.map((r) => (
                <tr key={r.signup_id} className="hover:bg-surface-2/40">
                  <td className="py-3 pr-4">
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-warning" />
                      <div>
                        <div className="font-medium">{r.full_name ?? r.email}</div>
                        <div className="text-xs text-muted-2">{r.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 pr-4">
                    <ProviderBadge provider={r.provider} />
                    {!r.is_email_confirmed ? <Badge tone="warning" className="ml-1">Non confirmé</Badge> : null}
                  </td>
                  <td className="py-3 pr-4 text-xs">{r.org_nom ?? "—"}</td>
                  <td className="py-3 pr-4 text-right tabular-nums">
                    <span className="inline-flex items-center gap-1"><FlaskConical className="h-3 w-3 text-electric" />{r.tests_envoyes}</span>
                  </td>
                  <td className="py-3 pr-4 text-xs text-muted whitespace-nowrap">
                    {r.last_test_at ? formatRelative(r.last_test_at) : <span className="text-muted-2">Jamais</span>}
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

function ProviderBadge({ provider }: { provider: string }) {
  if (provider === "google") return <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface-2 px-2.5 py-1 text-[11px] font-medium"><span className="h-2 w-2 rounded-full bg-[#4285F4]" /> Google</span>
  if (provider === "apple")  return <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface-2 px-2.5 py-1 text-[11px] font-medium"><Apple className="h-3 w-3" /> Apple</span>
  return <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface-2 px-2.5 py-1 text-[11px] font-medium"><Mail className="h-3 w-3" /> Email</span>
}
