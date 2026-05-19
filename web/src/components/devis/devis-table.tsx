import Link from "next/link"
import { Receipt, FileText, ArrowRight } from "lucide-react"
import { Badge, Card, CardTitle, CardDescription } from "@/components/ui/card"
import { EmptyState } from "@/components/app/empty-state"
import { Button } from "@/components/ui/button"
import { STATUT_META } from "@/lib/devis-status"
import { formatEUR, formatDateFR, relativeFR } from "@/lib/utils"
import type { DevisStatut } from "@/lib/supabase/database.types"

interface DevisRow {
  id: string
  numero: string | null
  statut: DevisStatut
  total_ttc: number
  date_emission: string
  date_validite: string | null
  date_signature: string | null
  objet: string | null
  clients: {
    nom: string
    prenom: string | null
    raison_sociale: string | null
    email: string | null
  } | null
}

export function DevisTable({ rows, emptyTitle, emptyDescription }: { rows: DevisRow[]; emptyTitle: string; emptyDescription: string }) {
  if (rows.length === 0) {
    return (
      <EmptyState
        icon={<FileText className="h-5 w-5 text-electric" />}
        title={emptyTitle}
        description={emptyDescription}
        action={
          <Button asChild>
            <Link href="/app/devis/nouveau">Créer un devis</Link>
          </Button>
        }
      />
    )
  }
  return (
    <Card className="p-0 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-xs uppercase tracking-wider text-muted bg-surface-2/60">
            <tr>
              <th className="text-left p-3">Numéro</th>
              <th className="text-left p-3">Client</th>
              <th className="text-left p-3">Objet</th>
              <th className="text-left p-3">Statut</th>
              <th className="text-left p-3">Date</th>
              <th className="text-right p-3">Total TTC</th>
              <th className="p-3 w-12"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((d) => {
              const meta = STATUT_META[d.statut]
              const client = d.clients
              const clientLabel = client?.raison_sociale || [client?.prenom, client?.nom].filter(Boolean).join(" ") || "—"
              return (
                <tr key={d.id} className="border-t border-border hover:bg-surface-2 transition-colors">
                  <td className="p-3 font-mono text-xs text-muted">{d.numero ?? "—"}</td>
                  <td className="p-3 font-medium">{clientLabel}</td>
                  <td className="p-3 text-muted truncate max-w-[260px]">{d.objet ?? "—"}</td>
                  <td className="p-3"><Badge tone={meta.tone}>{meta.label}</Badge></td>
                  <td className="p-3 text-muted">
                    <div>{formatDateFR(d.date_emission)}</div>
                    <div className="text-[11px] text-muted-2">{relativeFR(d.date_emission)}</div>
                  </td>
                  <td className="p-3 text-right font-display font-semibold">{formatEUR(d.total_ttc)}</td>
                  <td className="p-3">
                    <Link href={`/app/devis/${d.id}`} className="grid h-8 w-8 place-items-center rounded-md text-muted hover:text-electric hover:bg-surface-3">
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </Card>
  )
}

export function FacturesTable({ rows }: { rows: Array<{
  id: string;
  numero: string | null;
  statut: string;
  total_ttc: number;
  date_emission: string;
  date_echeance: string | null;
  relances_count: number;
  clients: { nom: string; prenom: string | null; raison_sociale: string | null } | null
}> }) {
  if (rows.length === 0) {
    return (
      <EmptyState
        icon={<Receipt className="h-5 w-5 text-electric" />}
        title="Aucune facture pour le moment"
        description="Dès qu'un devis est signé, transformez-le en facture en 1 clic."
        action={<Button asChild><Link href="/app/devis/signes">Voir les devis signés</Link></Button>}
      />
    )
  }
  return (
    <Card className="p-0 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-xs uppercase tracking-wider text-muted bg-surface-2/60">
            <tr>
              <th className="text-left p-3">Numéro</th>
              <th className="text-left p-3">Client</th>
              <th className="text-left p-3">Statut</th>
              <th className="text-left p-3">Émise</th>
              <th className="text-left p-3">Échéance</th>
              <th className="text-left p-3">Relances</th>
              <th className="text-right p-3">Total TTC</th>
              <th className="p-3 w-12"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((f) => (
              <tr key={f.id} className="border-t border-border hover:bg-surface-2 transition-colors">
                <td className="p-3 font-mono text-xs text-muted">{f.numero ?? "—"}</td>
                <td className="p-3 font-medium">{f.clients?.raison_sociale || [f.clients?.prenom, f.clients?.nom].filter(Boolean).join(" ") || "—"}</td>
                <td className="p-3">
                  <Badge tone={
                    f.statut === "payee" ? "success" :
                    f.statut === "abandonnee" ? "danger" :
                    f.statut === "partielle" ? "info" : "warning"
                  }>{f.statut.replace("_", " ")}</Badge>
                </td>
                <td className="p-3 text-muted">{formatDateFR(f.date_emission)}</td>
                <td className="p-3 text-muted">{f.date_echeance ? formatDateFR(f.date_echeance) : "—"}</td>
                <td className="p-3 text-muted">{f.relances_count}</td>
                <td className="p-3 text-right font-display font-semibold">{formatEUR(f.total_ttc)}</td>
                <td className="p-3">
                  <Link href={`/app/factures/${f.id}`} className="grid h-8 w-8 place-items-center rounded-md text-muted hover:text-electric hover:bg-surface-3">
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  )
}

export function ListHeader({ title, description, action }: { title: string; description?: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 mb-6">
      <div>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription className="mt-1">{description}</CardDescription>}
      </div>
      {action}
    </div>
  )
}
