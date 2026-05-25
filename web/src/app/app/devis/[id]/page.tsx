import { notFound } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Building2, Phone, Mail, MapPin } from "lucide-react"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { Card, Badge } from "@/components/ui/card"
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

  const [devisResult, orgResult] = await Promise.all([
    supabase
      .from("devis")
      .select("*, clients(*), devis_items(*, articles!left(id, nom, categorie))")
      .eq("id", id)
      .eq("org_id", profile!.org_id!)
      .maybeSingle(),
    supabase
      .from("orgs")
      .select("nom, adresse, ville, cp, tel, email, logo_url, siret, conditions_reglement")
      .eq("id", profile!.org_id!)
      .maybeSingle(),
  ])

  const devis = devisResult.data
  if (!devis) notFound()

  const org = orgResult.data
  const meta = STATUT_META[devis.statut as DevisStatut]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const c = devis.clients as any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const items = (devis.devis_items as any[] | null) ?? []

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-8">
      {/* Back + Status */}
      <div className="flex items-center justify-between mb-6">
        <Link href="/app" className="inline-flex items-center gap-1 text-xs text-muted hover:text-electric">
          <ArrowLeft className="h-3 w-3" /> Tableau de bord
        </Link>
        <Badge tone={meta.tone}>{meta.label}</Badge>
      </div>

      {/* ===== DEVIS DOCUMENT ===== */}
      <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden print:shadow-none print:border-0">
        <div className="p-6 sm:p-10 space-y-8">

          {/* ── HEADER: Logo + Entreprise (gauche) / Client + Métadata (droite) ── */}
          <div className="grid sm:grid-cols-2 gap-6">
            {/* Gauche : Logo + Entreprise */}
            <div>
              {org?.logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={org.logo_url} alt="Logo" className="h-16 sm:h-20 object-contain mb-3" />
              ) : (
                <div className="h-16 sm:h-20 flex items-center mb-3">
                  <span className="text-2xl font-bold text-gray-800">{org?.nom || "Mon Entreprise"}</span>
                </div>
              )}
              <div className="text-sm text-gray-600 space-y-1">
                <div className="font-semibold text-gray-900">{org?.nom || ""}</div>
                {org?.adresse && <div className="flex items-start gap-1.5"><MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0 text-gray-400" />{org.adresse}{org.cp ? `, ${org.cp}` : ""}{org.ville ? ` ${org.ville}` : ""}</div>}
                {org?.tel && <div className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5 text-gray-400" />{org.tel}</div>}
                {org?.email && <div className="flex items-center gap-1.5"><Mail className="h-3.5 w-3.5 text-gray-400" />{org.email}</div>}
                {org?.siret && <div className="text-gray-400 text-xs mt-1">SIRET : {org.siret}</div>}
              </div>
            </div>

            {/* Droite : Client + Métadata */}
            <div className="sm:text-right">
              <div className="bg-gray-50 rounded-xl p-4 sm:inline-block sm:text-left">
                <h1 className="text-lg font-bold text-gray-900 mb-2">DEVIS</h1>
                <div className="text-sm text-gray-600 space-y-1">
                  <div className="flex justify-between gap-4"><span className="text-gray-400">N°</span><span className="font-mono font-medium">{devis.numero}</span></div>
                  <div className="flex justify-between gap-4"><span className="text-gray-400">Date</span><span>{formatDateFR(devis.date_emission)}</span></div>
                  {devis.objet && <div className="flex justify-between gap-4"><span className="text-gray-400">Objet</span><span className="text-right max-w-[200px]">{devis.objet}</span></div>}
                </div>
              </div>
              <div className="mt-4 bg-gray-50 rounded-xl p-4 sm:inline-block sm:text-left">
                <div className="text-xs uppercase tracking-wider text-gray-400 mb-2">Client</div>
                <div className="text-sm space-y-1">
                  <div className="font-semibold text-gray-900">{c?.raison_sociale || [c?.prenom, c?.nom].filter(Boolean).join(" ") || "—"}</div>
                  {c?.email && <div>{c.email}</div>}
                  {c?.telephone && <div>{c.telephone}</div>}
                  {(c?.adresse || c?.ville) && <div className="text-gray-500">{[c.adresse, c.cp, c.ville].filter(Boolean).join(" · ")}</div>}
                </div>
              </div>
            </div>
          </div>

          {/* ── SÉPARATEUR ── */}
          <hr className="border-gray-200" />

          {/* ── CHANTIER ── */}
          {devis.chantier_adresse && (
            <div className="text-sm text-gray-600">
              <span className="text-xs uppercase tracking-wider text-gray-400">Chantier :</span> {devis.chantier_adresse}
              {devis.notes_client && <div className="mt-1 text-gray-500 italic">{devis.notes_client}</div>}
            </div>
          )}

          {/* ── TABLEAU ARTICLES ── */}
          <div>
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b-2 border-gray-200">
                  <th className="text-left py-2.5 text-xs uppercase tracking-wider text-gray-500 font-semibold">Désignation</th>
                  <th className="text-right py-2.5 px-2 text-xs uppercase tracking-wider text-gray-500 font-semibold w-16">Qté</th>
                  <th className="text-right py-2.5 px-2 text-xs uppercase tracking-wider text-gray-500 font-semibold w-16">Unité</th>
                  <th className="text-right py-2.5 px-2 text-xs uppercase tracking-wider text-gray-500 font-semibold w-24">PU HT</th>
                  <th className="text-right py-2.5 text-xs uppercase tracking-wider text-gray-500 font-semibold w-24">Total HT</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 && (
                  <tr><td colSpan={5} className="py-8 text-center text-gray-400">Aucune ligne</td></tr>
                )}
                {items.map((it: any) => {
                  if (it.is_section === true) {
                    return (
                      <tr key={it.id}>
                        <td colSpan={5} className="py-3 font-bold text-base text-gray-900 border-b border-gray-100">{it.description}</td>
                      </tr>
                    )
                  }
                  return (
                    <tr key={it.id} className="border-b border-gray-100">
                      <td className="py-2.5 text-gray-700">{it.description}</td>
                      <td className="py-2.5 text-right font-mono text-gray-800">{it.quantite}</td>
                      <td className="py-2.5 text-right text-gray-500">{it.unite}</td>
                      <td className="py-2.5 text-right font-mono text-gray-800">{formatEUR(it.prix_unitaire_ht)}</td>
                      <td className="py-2.5 text-right font-mono text-gray-800">{formatEUR(it.total_ht)}</td>
                    </tr>
                  )
                })}
                {devis.heures_main_oeuvre > 0 && (
                  <tr className="border-b border-gray-100 bg-gray-50/50">
                    <td className="py-2.5 text-gray-700">Main-d&apos;œuvre · pose</td>
                    <td className="py-2.5 text-right font-mono text-gray-800">{devis.heures_main_oeuvre}</td>
                    <td className="py-2.5 text-right text-gray-500">h</td>
                    <td className="py-2.5 text-right font-mono text-gray-800">{formatEUR(devis.taux_horaire)}</td>
                    <td className="py-2.5 text-right font-mono text-gray-800">{formatEUR(devis.cout_main_oeuvre_ht)}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* ── TOTAUX + CONDITIONS ── */}
          <div className="grid sm:grid-cols-2 gap-6">
            {/* Gauche : Conditions de règlement */}
            <div>
              {org?.conditions_reglement && (
                <>
                  <h3 className="text-xs uppercase tracking-wider text-gray-500 font-semibold mb-2">Conditions de règlement</h3>
                  <div className="text-xs text-gray-600 leading-relaxed whitespace-pre-line">{org.conditions_reglement}</div>
                </>
              )}
            </div>

            {/* Droite : Totaux */}
            <div className="sm:text-right">
              <div className="inline-block text-sm space-y-1.5">
                <div className="flex justify-between gap-8"><span className="text-gray-500">Total HT</span><span className="font-mono font-medium">{formatEUR(devis.total_ht)}</span></div>
                <div className="flex justify-between gap-8"><span className="text-gray-500">TVA ({devis.tva_taux}%)</span><span className="font-mono font-medium">{formatEUR(devis.tva_montant)}</span></div>
                <div className="flex justify-between gap-8 border-t-2 border-gray-900 pt-2 mt-2">
                  <span className="font-bold text-gray-900">Total TTC</span>
                  <span className="font-bold text-lg text-gray-900">{formatEUR(devis.total_ttc)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* ── SIGNATURES ── */}
          <hr className="border-gray-200" />
          <div className="grid sm:grid-cols-2 gap-8 pt-2">
            <div>
              <div className="text-xs uppercase tracking-wider text-gray-400 mb-2">Bon pour accord</div>
              <div className="border-b border-gray-300 h-12 mb-1" />
              <div className="text-xs text-gray-400">Date et signature du client</div>
            </div>
            <div className="sm:text-right">
              <div className="text-xs uppercase tracking-wider text-gray-400 mb-2">Cachet et signature de l&apos;entreprise</div>
              <div className="border-b border-gray-300 h-12 mb-1" />
              <div className="text-xs text-gray-400">{org?.nom || "L'entreprise"}</div>
            </div>
          </div>

        </div>
      </div>

      {/* ── ACTIONS ── */}
      <div className="mt-6">
        <DevisActions
          devisId={devis.id}
          statut={devis.statut}
          signePar={devis.signe_par}
          signeLe={devis.signe_le}
        />
      </div>
    </div>
  )
}
