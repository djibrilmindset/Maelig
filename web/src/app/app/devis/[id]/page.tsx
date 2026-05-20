import { notFound } from "next/navigation"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { Card, CardTitle, Badge } from "@/components/ui/card"
import { STATUT_META } from "@/lib/devis-status"
import { formatEUR, formatDateFR } from "@/lib/utils"
import type { DevisStatut } from "@/lib/supabase/database.types"
import { DevisActions } from "./actions"

export const dynamic = "force-dynamic"

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!UUID_RE.test(id)) notFound()

  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from("profiles").select("org_id").eq("id", user!.id).maybeSingle()

  const { data: devis } = await supabase
    .from("devis")
    .select("*, clients(*), devis_items(*)")
    .eq("id", id)
    .eq("org_id", profile!.org_id!)
    .maybeSingle()

  if (!devis) notFound()

  const meta = STATUT_META[devis.statut as DevisStatut]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const c = devis.clients as any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const items = (devis.devis_items as any[] | null) ?? []

  return (
    <div className="max-w-5xl mx-auto p-6 sm:p-10 space-y-6">
      <div>
        <Link href="/app" className="inline-flex items-center gap-1 text-xs text-muted hover:text-electric">
          <ArrowLeft className="h-3 w-3" /> Tableau de bord
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <span className="font-mono text-sm text-muted">{devis.numero}</span>
          <Badge tone={meta.tone}>{meta.label}</Badge>
          <span className="text-sm text-muted">· Émis le {formatDateFR(devis.date_emission)}</span>
        </div>
        <h1 className="mt-1 font-display text-3xl font-bold tracking-tight">{devis.objet || "Devis"}</h1>
        <p className="text-muted">{meta.description}</p>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <Card>
          <CardTitle>Client</CardTitle>
          <div className="mt-3 text-sm space-y-1">
            <div className="font-medium">{c?.raison_sociale || [c?.prenom, c?.nom].filter(Boolean).join(" ")}</div>
            {c?.email && <div className="text-muted">{c.email}</div>}
            {c?.telephone && <div className="text-muted">{c.telephone}</div>}
            {(c?.adresse || c?.ville) && <div className="text-muted">{[c.adresse, c.cp, c.ville].filter(Boolean).join(" · ")}</div>}
          </div>
        </Card>
        <Card>
          <CardTitle>Chantier</CardTitle>
          <div className="mt-3 text-sm space-y-1">
            <div>{devis.chantier_adresse || "—"}</div>
            {devis.notes_client && <div className="text-muted">{devis.notes_client}</div>}
          </div>
        </Card>
      </div>

      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs uppercase tracking-wider text-muted bg-surface-2/60">
              <tr>
                <th className="text-left p-3">Description</th>
                <th className="text-right p-3 w-20">Qté</th>
                <th className="text-right p-3 w-20">Unité</th>
                <th className="text-right p-3 w-28">PU HT</th>
                <th className="text-right p-3 w-28">Total HT</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 && (
                <tr><td colSpan={5} className="p-6 text-center text-muted">Aucune ligne</td></tr>
              )}
              {items.map((it) => (
                <tr key={it.id} className="border-t border-border">
                  <td className="p-3">{it.description}</td>
                  <td className="p-3 text-right font-mono">{it.quantite}</td>
                  <td className="p-3 text-right text-muted">{it.unite}</td>
                  <td className="p-3 text-right font-mono">{formatEUR(it.prix_unitaire_ht)}</td>
                  <td className="p-3 text-right font-mono">{formatEUR(it.total_ht)}</td>
                </tr>
              ))}
              {devis.heures_main_oeuvre > 0 && (
                <tr className="border-t border-border bg-surface-2/40">
                  <td className="p-3">Main-d&apos;œuvre · pose</td>
                  <td className="p-3 text-right font-mono">{devis.heures_main_oeuvre}</td>
                  <td className="p-3 text-right text-muted">h</td>
                  <td className="p-3 text-right font-mono">{formatEUR(devis.taux_horaire)}</td>
                  <td className="p-3 text-right font-mono">{formatEUR(devis.cout_main_oeuvre_ht)}</td>
                </tr>
              )}
            </tbody>
            <tfoot>
              <tr className="border-t border-border">
                <td colSpan={4} className="p-3 text-right text-muted">Total HT</td>
                <td className="p-3 text-right font-mono">{formatEUR(devis.total_ht)}</td>
              </tr>
              <tr>
                <td colSpan={4} className="p-3 text-right text-muted">TVA ({devis.tva_taux}%)</td>
                <td className="p-3 text-right font-mono">{formatEUR(devis.tva_montant)}</td>
              </tr>
              <tr className="border-t border-electric/40 bg-electric/5">
                <td colSpan={4} className="p-3 text-right text-electric font-semibold uppercase tracking-wider text-xs">Total TTC</td>
                <td className="p-3 text-right font-display text-xl font-bold text-electric">{formatEUR(devis.total_ttc)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Card>

      <DevisActions devisId={devis.id} statut={devis.statut} />
    </div>
  )
}
