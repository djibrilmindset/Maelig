import Link from "next/link"
import { FilePlus2, FileCheck, Hourglass, Receipt, Users, Mic, Sparkles, AlertTriangle } from "lucide-react"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { Card, CardTitle, Badge } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/app/empty-state"
import { formatEUR, formatDateFR } from "@/lib/utils"
import { STATUT_META } from "@/lib/devis-status"
import type { DevisStatut } from "@/lib/supabase/database.types"

export const dynamic = "force-dynamic"

export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role, org_id")
    .eq("id", user!.id)
    .maybeSingle()
  const orgId = profile?.org_id

  const [{ count: nbClients }, { count: nbDevisAtt }, { count: nbSignes }, { count: nbFacturesAtt }, totalsRes, latestDevisRes] =
    orgId
      ? await Promise.all([
          supabase.from("clients").select("*", { count: "exact", head: true }).eq("org_id", orgId),
          supabase.from("devis").select("*", { count: "exact", head: true }).eq("org_id", orgId).eq("statut", "en_attente_validation"),
          supabase.from("devis").select("*", { count: "exact", head: true }).eq("org_id", orgId).eq("statut", "signe_non_paye"),
          supabase.from("factures").select("*", { count: "exact", head: true }).eq("org_id", orgId).eq("statut", "en_attente"),
          supabase
            .from("factures")
            .select("total_ttc, statut")
            .eq("org_id", orgId)
            .in("statut", ["en_attente", "payee", "partielle"]),
          supabase
            .from("devis")
            .select("id, numero, statut, total_ttc, date_emission, clients(nom, prenom, raison_sociale)")
            .eq("org_id", orgId)
            .order("created_at", { ascending: false })
            .limit(6),
        ])
      : [{ count: 0 }, { count: 0 }, { count: 0 }, { count: 0 }, { data: [] }, { data: [] }]

  const totalEnAttente = (totalsRes.data ?? [])
    .filter((f: { statut: string }) => f.statut === "en_attente" || f.statut === "partielle")
    .reduce((s: number, f: { total_ttc: number | null }) => s + Number(f.total_ttc ?? 0), 0)
  const totalEncaisse = (totalsRes.data ?? [])
    .filter((f: { statut: string }) => f.statut === "payee")
    .reduce((s: number, f: { total_ttc: number | null }) => s + Number(f.total_ttc ?? 0), 0)

  const latestDevis = latestDevisRes.data ?? []

  const greeting = (() => {
    const h = new Date().getHours()
    if (h < 6) return "Bonne nuit"
    if (h < 12) return "Bonjour"
    if (h < 18) return "Bon après-midi"
    return "Bonsoir"
  })()
  const firstName = profile?.full_name?.split(" ")?.[0] ?? "patron"

  return (
    <div className="max-w-7xl mx-auto p-6 sm:p-10 space-y-10">
      {/* Hero */}
      <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4">
        <div>
          <span className="text-xs uppercase tracking-[0.18em] text-muted">{formatDateFR(new Date())}</span>
          <h1 className="mt-1 font-display text-3xl sm:text-4xl font-bold tracking-tight">
            {greeting}, <span className="text-electric">{firstName}</span>.
          </h1>
          <p className="mt-2 text-muted">On commence par un devis ?</p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="primary" size="lg" className="gap-2">
            <Link href="/app/devis/nouveau"><FilePlus2 className="h-4 w-4" /> Nouveau devis</Link>
          </Button>
          <Button asChild variant="ghost" size="lg" className="gap-2">
            <Link href="/app/devis/nouveau?source=voice"><Mic className="h-4 w-4" /> Vocal direct</Link>
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Encaissé" value={formatEUR(totalEncaisse)} tone="success" />
        <KpiCard label="En attente d'encaissement" value={formatEUR(totalEnAttente)} tone="warning" />
        <KpiCard label="Devis en attente de signature" value={nbDevisAtt ?? 0} icon={<Hourglass className="h-4 w-4 text-info" />} />
        <KpiCard label="Factures à encaisser" value={nbFacturesAtt ?? 0} icon={<Receipt className="h-4 w-4 text-electric" />} />
      </div>

      {/* Pipeline shortcuts */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <ShortcutCard
          href="/app/devis/attente-validation"
          Icon={Hourglass}
          color="var(--info)"
          title="À relancer"
          stat={nbDevisAtt ?? 0}
          help="Devis envoyés sans réponse"
        />
        <ShortcutCard
          href="/app/devis/signes"
          Icon={FileCheck}
          color="var(--warning)"
          title="À facturer"
          stat={nbSignes ?? 0}
          help="Devis signés, prêts à devenir factures"
        />
        <ShortcutCard
          href="/app/devis/factures-en-attente"
          Icon={Receipt}
          color="var(--electric)"
          title="À encaisser"
          stat={nbFacturesAtt ?? 0}
          help="Factures envoyées, en attente"
        />
        <ShortcutCard
          href="/app/clients"
          Icon={Users}
          color="var(--wire-blue)"
          title="Clients"
          stat={nbClients ?? 0}
          help="Vos contacts professionnels"
        />
      </div>

      {/* Latest devis */}
      <div>
        <div className="flex items-end justify-between mb-3">
          <h2 className="font-display text-xl font-semibold">Derniers devis</h2>
          <Link href="/app/devis/attente-validation" className="text-xs text-electric hover:underline">
            Voir tous →
          </Link>
        </div>

        {latestDevis.length === 0 ? (
          <EmptyState
            icon={<Sparkles className="h-5 w-5 text-electric" />}
            title="Aucun devis pour le moment"
            description="Lancez votre 1er devis en vocal : décrivez le chantier, DEP s'occupe du reste."
            action={
              <Button asChild>
                <Link href="/app/devis/nouveau">
                  <Mic className="h-4 w-4" /> Démarrer en vocal
                </Link>
              </Button>
            }
          />
        ) : (
          <Card className="overflow-hidden p-0">
            <ul className="divide-y divide-border">
              {latestDevis.map((d) => {
                const meta = STATUT_META[d.statut as DevisStatut]
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const c = d.clients as any
                const clientLabel = c?.raison_sociale || [c?.prenom, c?.nom].filter(Boolean).join(" ") || "—"
                return (
                  <li key={d.id} className="flex items-center justify-between gap-4 p-4 hover:bg-surface-2 transition-colors">
                    <div className="min-w-0">
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-xs text-muted">{d.numero ?? "—"}</span>
                        <Badge tone={meta.tone}>{meta.label}</Badge>
                      </div>
                      <div className="mt-1 text-sm font-medium truncate">{clientLabel}</div>
                      <div className="text-xs text-muted-2">{formatDateFR(d.date_emission)}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-display font-semibold">{formatEUR(d.total_ttc)}</div>
                      <Link href={`/app/devis/${d.id}`} className="text-xs text-electric hover:underline">Ouvrir →</Link>
                    </div>
                  </li>
                )
              })}
            </ul>
          </Card>
        )}
      </div>

      <Card>
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-electric mt-0.5" />
          <div>
            <CardTitle>Astuce DEP</CardTitle>
            <p className="mt-1 text-sm text-muted">
              Plus vous saisissez d&apos;articles, plus vos prochains devis se remplissent tout seuls. DEP retient
              chaque prix et le ressort instantanément.
            </p>
          </div>
        </div>
      </Card>
    </div>
  )
}

function KpiCard({ label, value, tone, icon }: { label: string; value: string | number; tone?: "success" | "warning" | "info" | "electric"; icon?: React.ReactNode }) {
  const accent =
    tone === "success" ? "from-success/30" :
    tone === "warning" ? "from-warning/30" :
    tone === "info" ? "from-info/30" :
    "from-electric/30"
  return (
    <Card className={`relative overflow-hidden`}>
      <div className={`absolute -top-12 -right-12 h-32 w-32 rounded-full bg-gradient-to-br ${accent} to-transparent opacity-30 blur-2xl`} />
      <div className="flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-muted">{icon}{label}</div>
      <div className="mt-3 font-display text-3xl font-bold">{value}</div>
    </Card>
  )
}

function ShortcutCard({
  href, Icon, color, title, stat, help,
}: {
  href: string
  Icon: React.ComponentType<{ className?: string }>
  color: string
  title: string
  stat: number
  help: string
}) {
  return (
    <Link href={href}>
      <Card className="group h-full transition-colors hover:border-border-strong">
        <div className="flex items-center justify-between">
          <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border" style={{ background: `${color}1a`, color }}>
            <Icon className="h-5 w-5" />
          </div>
          <span className="font-display text-2xl font-bold">{stat}</span>
        </div>
        <div className="mt-4 font-display font-semibold">{title}</div>
        <div className="text-xs text-muted-2">{help}</div>
      </Card>
    </Link>
  )
}
