import Link from "next/link"
import { Briefcase, HardHat, Shield, MailCheck, ArrowUpRight, TrendingUp, AlertTriangle, Euro } from "lucide-react"
import { Card, CardTitle, CardDescription, Badge } from "@/components/ui/card"
import { AdminNav } from "./admin-nav"
import { requireAdmin, formatEUR } from "./_lib"

export const dynamic = "force-dynamic"

type RoleStats = {
  total_patrons: number
  total_employes: number
  total_admins: number
  orgs_trialing: number
  orgs_paying: number
  orgs_past_due: number
  ca_total: number
  devis_signes_total: number
  incidents_ouverts_total: number
  nouveaux_24h: number
  nouveaux_7d: number
}

export default async function AdminOverviewPage() {
  const { admin } = await requireAdmin()

  const [{ data: stats }, { data: signupsStats }] = await Promise.all([
    admin.from("v_admin_role_stats").select("*").maybeSingle(),
    admin.from("v_admin_signups_stats").select("*").maybeSingle(),
  ])

  const s = (stats ?? {}) as Partial<RoleStats>

  return (
    <div className="max-w-7xl mx-auto p-6 sm:p-10 space-y-8">
      <header>
        <span className="text-xs uppercase tracking-[0.18em] text-muted">Admin DEP · accès restreint</span>
        <h1 className="mt-1 font-display text-3xl sm:text-4xl font-bold tracking-tight">
          Vue d&apos;<span className="text-electric">ensemble</span>
        </h1>
        <p className="mt-2 text-muted">Toute la plateforme en un coup d&apos;œil. Clique sur une catégorie pour entrer dans le détail.</p>
      </header>

      <AdminNav active="overview" />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label="CA encaissé" value={formatEUR(s.ca_total ?? 0)} sub={`${s.devis_signes_total ?? 0} devis signés`} Icon={Euro} tone="success" />
        <KpiCard label="Patrons trialing" value={s.orgs_trialing ?? 0} sub={`${s.orgs_paying ?? 0} payants`} Icon={TrendingUp} tone="electric" />
        <KpiCard label="Past due" value={s.orgs_past_due ?? 0} sub="à relancer Stripe" Icon={AlertTriangle} tone={(s.orgs_past_due ?? 0) > 0 ? "danger" : "neutral"} />
        <KpiCard label="Incidents ouverts" value={s.incidents_ouverts_total ?? 0} sub={`${s.nouveaux_24h ?? 0} signups 24h`} Icon={AlertTriangle} tone={(s.incidents_ouverts_total ?? 0) > 5 ? "warning" : "neutral"} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <CategoryCard
          href="/app/admin/patrons"
          Icon={Briefcase}
          title="Patrons"
          subtitle="Chefs d'entreprise"
          count={s.total_patrons ?? 0}
          accent="electric"
          desc="Tous les comptes propriétaires. Org, abonnement, CA, équipe et activité."
        />
        <CategoryCard
          href="/app/admin/employes"
          Icon={HardHat}
          title="Employés"
          subtitle="Comptes esclaves (slave)"
          count={s.total_employes ?? 0}
          accent="info"
          desc="Compagnons connectés au chat traduit + module incidents. Patron rattaché visible."
        />
        <CategoryCard
          href="/app/admin/admins"
          Icon={Shield}
          title="Admins DEP"
          subtitle="Super-utilisateurs"
          count={s.total_admins ?? 0}
          accent="warning"
          desc="Maelig + Djibril. Voient tout, peuvent tester la délivrabilité."
        />
      </div>

      <Link
        href="/app/admin/delivrabilite"
        className="group flex items-center justify-between rounded-[var(--radius-lg)] border border-border bg-surface/40 hover:bg-surface-2/40 p-5 transition-colors"
      >
        <div className="flex items-center gap-4">
          <span className="grid h-11 w-11 place-items-center rounded-full bg-electric/15 text-electric">
            <MailCheck className="h-5 w-5" />
          </span>
          <div>
            <p className="font-display font-semibold">Tester la délivrabilité email</p>
            <p className="text-sm text-muted">Envoie un email de test (confirmation, magic link, reset, invite) et vérifie les bounces.</p>
          </div>
        </div>
        <ArrowUpRight className="h-5 w-5 text-muted group-hover:text-electric transition-colors" />
      </Link>

      <Card className="bg-electric/5 border-electric/20">
        <div className="flex items-start gap-3">
          <Badge tone="electric">Recensement live</Badge>
          <div>
            <CardTitle className="text-base">Signups récents</CardTitle>
            <CardDescription className="mt-1">
              {signupsStats?.last_24h ?? 0} sur 24h · {signupsStats?.last_7d ?? 0} sur 7 jours · {signupsStats?.last_30d ?? 0} sur 30 jours · {signupsStats?.confirmed ?? 0} confirmés sur {signupsStats?.total_signups ?? 0} total
            </CardDescription>
          </div>
        </div>
      </Card>
    </div>
  )
}

function KpiCard({ label, value, sub, Icon, tone = "neutral" }: { label: string; value: number | string; sub?: string; Icon: typeof Briefcase; tone?: "neutral" | "electric" | "success" | "warning" | "danger" }) {
  const colors = {
    neutral: "text-foreground",
    electric: "text-electric",
    success: "text-success",
    warning: "text-warning",
    danger: "text-danger",
  }[tone]
  return (
    <Card className="!p-5">
      <div className="flex items-start justify-between">
        <p className="text-[11px] uppercase tracking-[0.18em] text-muted-2">{label}</p>
        <Icon className={`h-4 w-4 ${colors}`} />
      </div>
      <p className={`mt-2 font-display text-3xl font-bold tabular-nums ${colors}`}>{value}</p>
      {sub ? <p className="mt-1 text-xs text-muted">{sub}</p> : null}
    </Card>
  )
}

function CategoryCard({ href, Icon, title, subtitle, count, desc, accent }: { href: string; Icon: typeof Briefcase; title: string; subtitle: string; count: number; desc: string; accent: "electric" | "info" | "warning" }) {
  const accents = {
    electric: "bg-electric/15 text-electric border-electric/30 group-hover:bg-electric/25",
    info:     "bg-info/15 text-info border-info/30 group-hover:bg-info/25",
    warning:  "bg-warning/15 text-warning border-warning/30 group-hover:bg-warning/25",
  }[accent]
  return (
    <Link href={href} className="group block rounded-[var(--radius-lg)] border border-border bg-surface/40 hover:bg-surface-2/40 p-6 transition-colors">
      <div className="flex items-start justify-between mb-4">
        <span className={`grid h-12 w-12 place-items-center rounded-[14px] border transition-colors ${accents}`}>
          <Icon className="h-5 w-5" />
        </span>
        <ArrowUpRight className="h-5 w-5 text-muted-2 group-hover:text-foreground transition-colors" />
      </div>
      <p className="text-[11px] uppercase tracking-[0.18em] text-muted-2">{subtitle}</p>
      <h3 className="mt-1 font-display text-2xl font-bold tracking-tight flex items-baseline gap-2">
        {title}
        <span className="font-mono text-muted text-base tabular-nums">{count}</span>
      </h3>
      <p className="mt-3 text-sm text-muted leading-relaxed">{desc}</p>
    </Link>
  )
}
