"use client"
import Link from "next/link"
import { useEffect, useCallback } from "react"
import { usePathname } from "next/navigation"
import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Menu, X, FilePlus2, LayoutDashboard, Hourglass, FileCheck,
  Receipt, Archive, Users, PackageSearch, Settings, Shield,
  AlertTriangle, ShieldCheck, Sparkles, LogOut,
} from "lucide-react"
import { DepMark } from "@/components/brand/dep-logo"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

/* ── Navigation items (mirroir de sidebar.tsx) ── */
type NavItem =
  | { type: "section"; label: string }
  | {
      href: string
      label: string
      Icon: typeof LayoutDashboard
      accent?: boolean
      ownerOnly?: boolean
      employeeAccent?: boolean
      adminOnly?: boolean
    }

const NAV: NavItem[] = [
  { href: "/app", label: "Tableau de bord", Icon: LayoutDashboard },
  { type: "section", label: "Devis" },
  { href: "/app/devis/nouveau", label: "Créer un devis", Icon: FilePlus2, accent: true },
  { href: "/app/devis/a-valider", label: "À valider (employés)", Icon: ShieldCheck, ownerOnly: true },
  { href: "/app/devis/attente-validation", label: "En attente du client", Icon: Hourglass },
  { href: "/app/devis/signes", label: "Signés (pas encore payés)", Icon: FileCheck },
  { href: "/app/devis/factures-en-attente", label: "Factures en attente", Icon: Receipt },
  { href: "/app/devis/archives", label: "Payées / abandonnées", Icon: Archive },
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
]

/* ── NavItem renderer (mutualisé entre sidebar & drawer) ── */
function NavLink({ item, path, onClick }: { item: NavItem & { href?: string }; path: string; onClick?: () => void }) {
  if ("type" in item && item.type === "section") {
    return (
      <div className="px-2 pt-4 pb-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-2">
        {item.label}
      </div>
    )
  }
  const i = item as Required<Pick<NavItem, "href">> & NavItem
  const isActive = path === i.href || (i.href !== "/app" && path.startsWith(i.href))
  return (
    <Link
      href={i.href}
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 rounded-[10px] px-3 py-2.5 text-sm transition-colors",
        isActive
          ? "bg-surface-3 text-foreground border border-border"
          : "text-muted hover:bg-surface-2 hover:text-foreground",
        i.accent &&
          "bg-electric text-black hover:bg-electric-soft hover:text-black border border-electric font-semibold shadow-[0_8px_24px_-12px_rgba(255,213,0,0.55)]",
        i.employeeAccent &&
          "border border-wire-red/30 bg-wire-red/10 text-wire-red hover:bg-wire-red/15 hover:text-wire-red font-semibold",
      )}
    >
      <i.Icon className={cn("h-4 w-4 shrink-0", i.accent && "text-black", i.employeeAccent && "text-wire-red")} />
      <span className="truncate">{i.label}</span>
    </Link>
  )
}

/* ── Mobile topbar + drawer coulissant ── */
export function MobileTopbar() {
  const [open, setOpen] = useState(false)
  const path = usePathname()

  // Lock body scroll when drawer is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = ""
    }
    return () => { document.body.style.overflow = "" }
  }, [open])

  const close = useCallback(() => setOpen(false), [])

  return (
    <>
      {/* Top bar */}
      <div className="lg:hidden sticky top-0 z-40 flex items-center justify-between gap-3 border-b border-border bg-background/85 backdrop-blur px-4 py-3">
        <div className="flex items-center gap-2">
          <button
            aria-label={open ? "Fermer le menu" : "Ouvrir le menu"}
            onClick={() => setOpen((v) => !v)}
            className="grid h-9 w-9 place-items-center rounded-md border border-border bg-surface-2"
          >
            {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
          <DepMark size={26} />
        </div>
        <Button asChild size="sm" variant="primary">
          <Link href="/app/devis/nouveau">
            <FilePlus2 className="h-4 w-4" /> Devis
          </Link>
        </Button>
      </div>

      {/* Overlay + Drawer */}
      <AnimatePresence>
        {open && (
          <>
            {/* Overlay */}
            <motion.div
              key="mobile-nav-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
              onClick={close}
              aria-hidden="true"
            />

            {/* Drawer */}
            <motion.aside
              key="mobile-nav-drawer"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="fixed left-0 top-0 bottom-0 z-50 flex w-72 flex-col border-r border-border bg-background"
              role="dialog"
              aria-modal="true"
              aria-label="Navigation principale"
            >
              {/* Drawer header */}
              <div className="flex items-center justify-between px-5 py-5 border-b border-border">
                <span className="font-display font-extrabold text-lg">DEP</span>
                <button
                  aria-label="Fermer"
                  onClick={close}
                  className="grid h-8 w-8 place-items-center rounded-md border border-border bg-surface-2"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Drawer nav */}
              <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
                {NAV.map((item, idx) => (
                  <NavLink key={"type" in item ? `s-${idx}` : (item as any).href} item={item as any} path={path} onClick={close} />
                ))}
              </nav>

              {/* Drawer footer */}
              <div className="px-5 py-4 border-t border-border">
                <span className="text-xs text-muted-2">DEP — Gestion électrique</span>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
