"use client"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  FilePlus2,
  Hourglass,
  FileCheck,
  Receipt,
  Archive,
  Users,
  PackageSearch,
  Settings,
  LogOut,
  Sparkles,
  ShieldCheck,
  AlertTriangle,
  Shield,
} from "lucide-react"
import { DepLogo } from "@/components/brand/dep-logo"
import { cn, initials } from "@/lib/utils"

type ProfileLite = { full_name: string | null; email: string | null; role: string }
type OrgLite = { nom: string | null }

const NAV = [
  { href: "/app", label: "Tableau de bord", Icon: LayoutDashboard },
  { type: "section", label: "Devis" },
  { href: "/app/devis/nouveau", label: "Créer un devis", Icon: FilePlus2, accent: true },
  { href: "/app/devis/a-valider", label: "À valider (employés)", Icon: ShieldCheck, ownerOnly: true },
  { href: "/app/devis/attente-validation", label: "En attente du client", Icon: Hourglass },
  { href: "/app/devis/signes", label: "Signés · pas encore payés", Icon: FileCheck },
  { href: "/app/devis/factures-en-attente", label: "Factures en attente", Icon: Receipt },
  { href: "/app/devis/archives", label: "Payées · abandonnées", Icon: Archive },
  { type: "section", label: "Chantiers" },
  { href: "/app/incidents", label: "Galères de chantier", Icon: AlertTriangle },
  { href: "/app/incidents/nouveau", label: "Signaler un problème", Icon: AlertTriangle, employeeAccent: true },
  { type: "section", label: "Ressources" },
  { href: "/app/clients", label: "Clients", Icon: Users },
  { href: "/app/catalogue", label: "Catalogue d'articles", Icon: PackageSearch },
  { href: "/app/parametres/equipe", label: "Mon équipe", Icon: Users },
  { type: "section", label: "Compte" },
  { href: "/app/parametres", label: "Paramètres", Icon: Settings },
  { href: "/app/admin", label: "Admin DEP", Icon: Shield, adminOnly: true },
] as const

export function Sidebar({ profile, org }: { profile: ProfileLite | null; org: OrgLite | null }) {
  const path = usePathname()
  return (
    <aside className="hidden lg:flex flex-col w-72 shrink-0 border-r border-border bg-surface/40 backdrop-blur-md">
      <div className="px-5 py-5 border-b border-border">
        <DepLogo size={32} withWordmark />
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {NAV.map((item, idx) => {
          if ("type" in item) {
            return (
              <div
                key={`${item.type}-${idx}`}
                className="px-2 pt-4 pb-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-2"
              >
                {item.label}
              </div>
            )
          }
          const navItem = item as { href: string; label: string; Icon: typeof LayoutDashboard; accent?: boolean; ownerOnly?: boolean; employeeAccent?: boolean; adminOnly?: boolean }
          if (navItem.ownerOnly && profile?.role === "slave") return null
          if (navItem.adminOnly && profile?.role !== "admin_dep") return null
          return (
            <Link
              key={navItem.href}
              href={navItem.href}
              className={cn(
                "group flex items-center gap-3 rounded-[10px] px-3 py-2.5 text-sm transition-colors",
                path === navItem.href || (navItem.href !== "/app" && path.startsWith(navItem.href))
                  ? "bg-surface-3 text-foreground border border-border"
                  : "text-muted hover:bg-surface-2 hover:text-foreground",
                navItem.accent &&
                  "bg-electric text-black hover:bg-electric-soft hover:text-black border border-electric font-semibold shadow-[0_8px_24px_-12px_rgba(255,213,0,0.55)]",
                navItem.employeeAccent &&
                  "border border-wire-red/30 bg-wire-red/10 text-wire-red hover:bg-wire-red/15 hover:text-wire-red font-semibold",
              )}
            >
              <navItem.Icon className={cn("h-4 w-4", navItem.accent && "text-black", navItem.employeeAccent && "text-wire-red")} />
              <span className="truncate">{navItem.label}</span>
            </Link>
          )
        })}
      </nav>

      <div className="border-t border-border p-3">
        {org && (
          <div className="px-2 pb-3 text-xs text-muted-2">
            <Sparkles className="inline h-3 w-3 text-electric mr-1" />
            {org.nom}
          </div>
        )}
        <div className="glass flex items-center gap-3 rounded-[10px] border border-border p-2">
          <div className="grid h-9 w-9 place-items-center rounded-full bg-electric text-black font-semibold">
            {initials(profile?.full_name || profile?.email)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium">{profile?.full_name ?? "—"}</div>
            <div className="truncate text-[11px] text-muted">{profile?.email}</div>
          </div>
          <form action="/api/auth/signout" method="post">
            <button
              type="submit"
              title="Se déconnecter"
              className="grid h-8 w-8 place-items-center rounded-md text-muted hover:bg-surface-3 hover:text-danger"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </form>
        </div>
      </div>
    </aside>
  )
}
