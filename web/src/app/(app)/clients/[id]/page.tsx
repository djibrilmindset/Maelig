import { notFound } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Mail, Phone, MapPin, FileText } from "lucide-react"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { Card, CardTitle, Badge } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { STATUT_META } from "@/lib/devis-status"
import { formatEUR, formatDateFR } from "@/lib/utils"
import type { DevisStatut } from "@/lib/supabase/database.types"

export const dynamic = "force-dynamic"

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from("profiles").select("org_id").eq("id", user!.id).maybeSingle()

  const { data: client } = await supabase.from("clients").select("*").eq("id", id).eq("org_id", profile!.org_id!).maybeSingle()
  if (!client) notFound()

  const [{ data: devis }, { data: factures }] = await Promise.all([
    supabase.from("devis").select("id, numero, statut, total_ttc, date_emission").eq("client_id", id).order("date_emission", { ascending: false }),
    supabase.from("factures").select("id, numero, statut, total_ttc, date_emission").eq("client_id", id).order("date_emission", { ascending: false }),
  ])

  const totalCA = (factures ?? []).filter((f) => f.statut === "payee").reduce((s, f) => s + Number(f.total_ttc), 0)
  const totalAttente = (factures ?? []).filter((f) => f.statut === "en_attente" || f.statut === "partielle").reduce((s, f) => s + Number(f.total_ttc), 0)

  return (
    <div className="max-w-5xl mx-auto p-6 sm:p-10 space-y-6">
      <Link href="/app/clients" className="inline-flex items-center gap-1 text-xs text-muted hover:text-electric">
        <ArrowLeft className="h-3 w-3" /> Clients
      </Link>

      <div className="flex items-start justify-between gap-4">
        <div>
          <span className="text-xs uppercase tracking-wider text-muted">{client.raison_sociale ? "Société" : "Particulier"}</span>
          <h1 className="font-display text-3xl font-bold tracking-tight">
            {client.raison_sociale || [client.prenom, client.nom].filter(Boolean).join(" ")}
          </h1>
        </div>
        <Button asChild>
          <Link href={`/app/devis/nouveau?client=${client.id}`}>+ Devis pour ce client</Link>
        </Button>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <Card>
          <CardTitle className="text-sm">Coordonnées</CardTitle>
          <ul className="mt-3 space-y-1.5 text-sm">
            {client.email && <li className="flex items-center gap-2"><Mail className="h-3.5 w-3.5 text-muted" />{client.email}</li>}
            {client.telephone && <li className="flex items-center gap-2"><Phone className="h-3.5 w-3.5 text-muted" />{client.telephone}</li>}
            {(client.adresse || client.ville) && (
              <li className="flex items-start gap-2"><MapPin className="h-3.5 w-3.5 text-muted mt-0.5" />
                <span>{[client.adresse, client.cp, client.ville].filter(Boolean).join("\n")}</span>
              </li>
            )}
          </ul>
        </Card>
        <Card>
          <CardTitle className="text-sm">CA encaissé</CardTitle>
          <div className="mt-2 font-display text-3xl font-bold text-success">{formatEUR(totalCA)}</div>
        </Card>
        <Card>
          <CardTitle className="text-sm">En attente d&apos;encaissement</CardTitle>
          <div className="mt-2 font-display text-3xl font-bold text-warning">{formatEUR(totalAttente)}</div>
        </Card>
      </div>

      {client.notes && (
        <Card>
          <CardTitle>Notes internes</CardTitle>
          <p className="mt-2 text-sm text-muted whitespace-pre-line">{client.notes}</p>
        </Card>
      )}

      <Card className="p-0 overflow-hidden">
        <div className="p-4 flex items-center justify-between">
          <CardTitle><FileText className="inline h-4 w-4 mr-1" /> Devis & factures</CardTitle>
        </div>
        {(devis ?? []).length === 0 && (factures ?? []).length === 0 ? (
          <p className="px-4 pb-6 text-sm text-muted">Aucun document encore.</p>
        ) : (
          <ul className="divide-y divide-border">
            {[...(devis ?? []).map((d) => ({ ...d, kind: "devis" as const })), ...(factures ?? []).map((f) => ({ ...f, kind: "facture" as const }))]
              .sort((a, b) => +new Date(b.date_emission) - +new Date(a.date_emission))
              .map((row) => {
                const meta = row.kind === "devis" ? STATUT_META[row.statut as DevisStatut] : { label: row.statut, tone: row.statut === "payee" ? "success" as const : "warning" as const }
                return (
                  <li key={`${row.kind}-${row.id}`} className="flex items-center justify-between gap-3 p-3 hover:bg-surface-2">
                    <div className="flex items-center gap-3">
                      <Badge tone={row.kind === "facture" ? "electric" : "neutral"}>{row.kind}</Badge>
                      <span className="font-mono text-xs text-muted">{row.numero ?? "—"}</span>
                      <Badge tone={meta.tone as never}>{meta.label}</Badge>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-muted">{formatDateFR(row.date_emission)}</span>
                      <span className="font-display font-semibold">{formatEUR(row.total_ttc)}</span>
                      <Link className="text-xs text-electric hover:underline" href={row.kind === "devis" ? `/app/devis/${row.id}` : `/app/factures/${row.id}`}>Ouvrir →</Link>
                    </div>
                  </li>
                )
              })}
          </ul>
        )}
      </Card>
    </div>
  )
}
