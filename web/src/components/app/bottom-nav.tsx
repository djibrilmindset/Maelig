"use client"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  FilePlus2,
  AlertTriangle,
  Users,
  Settings,
} from "lucide-react"
import { cn } from "@/lib/utils"

const BOTTOM_ITEMS = [
  { href: "/app", label: "Accueil", Icon: LayoutDashboard },
  { href: "/app/devis/nouveau", label: "Devis", Icon: FilePlus2 },
  { href: "/app/incidents", label: "Chantier", Icon: AlertTriangle },
  { href: "/app/clients", label: "Clients", Icon: Users },
  { href: "/app/parametres", label: "Compte", Icon: Settings },
]

export function BottomNav() {
  const path = usePathname()

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around border-t border-border bg-background/95 backdrop-blur-md safe-area-bottom pb-safe-bottom px-2">
      {BOTTOM_ITEMS.map(({ href, label, Icon }) => {
        // Active si exact match pour "/app", startsWith pour les sous-routes
        const isActive =
          href === "/app"
            ? path === "/app"
            : path.startsWith(href)
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex flex-col items-center gap-0.5 py-2 px-3 min-w-0 rounded-lg transition-colors",
              isActive
                ? "text-electric"
                : "text-muted-2 hover:text-muted",
            )}
          >
            <Icon className={cn("h-5 w-5 shrink-0", isActive && "drop-shadow-[0_0_8px_rgba(245,197,24,0.4)]")} />
            <span className="text-[10px] font-medium leading-tight truncate max-w-full">
              {label}
            </span>
          </Link>
        )
      })}
    </nav>
  )
}
