import Link from "next/link"
import { LayoutDashboard, Briefcase, HardHat, Shield, MailCheck } from "lucide-react"
import { cn } from "@/lib/utils"

const SECTIONS = [
  { href: "/app/admin",                label: "Vue d'ensemble",     Icon: LayoutDashboard, key: "overview" },
  { href: "/app/admin/patrons",        label: "Patrons",            Icon: Briefcase,       key: "patrons" },
  { href: "/app/admin/employes",       label: "Employés",           Icon: HardHat,         key: "employes" },
  { href: "/app/admin/admins",         label: "Admins DEP",         Icon: Shield,          key: "admins" },
  { href: "/app/admin/delivrabilite",  label: "Délivrabilité",      Icon: MailCheck,       key: "delivery" },
] as const

export function AdminNav({ active }: { active: typeof SECTIONS[number]["key"] }) {
  return (
    <nav className="flex flex-wrap gap-1 border-b border-border -mb-2">
      {SECTIONS.map((s) => {
        const is = active === s.key
        return (
          <Link
            key={s.key}
            href={s.href}
            className={cn(
              "inline-flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap",
              is
                ? "border-electric text-foreground"
                : "border-transparent text-muted hover:text-foreground hover:border-border",
            )}
          >
            <s.Icon className="h-4 w-4" />
            {s.label}
          </Link>
        )
      })}
    </nav>
  )
}
