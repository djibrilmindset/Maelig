import Link from "next/link"
import { Users, MailCheck } from "lucide-react"
import { cn } from "@/lib/utils"

export function AdminTabs({ active }: { active: string }) {
  const tabs = [
    { id: "recensement", label: "Recensement", Icon: Users },
    { id: "delivrabilite", label: "Délivrabilité", Icon: MailCheck },
  ]
  return (
    <div className="flex gap-1 border-b border-border -mb-2">
      {tabs.map((t) => {
        const is = active === t.id
        return (
          <Link
            key={t.id}
            href={`/app/admin?tab=${t.id}`}
            className={cn(
              "inline-flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors",
              is
                ? "border-electric text-foreground"
                : "border-transparent text-muted hover:text-foreground hover:border-border",
            )}
          >
            <t.Icon className="h-4 w-4" />
            {t.label}
          </Link>
        )
      })}
    </div>
  )
}
