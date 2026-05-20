import { notFound } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, AlertTriangle, Sparkles, Mic, Camera, Phone, MessageSquare, Languages } from "lucide-react"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { Card, CardTitle, Badge } from "@/components/ui/card"
import { formatDateFR, relativeFR, initials } from "@/lib/utils"
import { getLangue } from "@/lib/langues"
import { IncidentReply } from "./client"

export const dynamic = "force-dynamic"

const URG_META: Record<string, { tone: "danger" | "warning" | "info" | "neutral"; label: string; bg: string }> = {
  urgent:    { tone: "danger",  label: "Urgent",    bg: "from-danger/20" },
  important: { tone: "warning", label: "Important", bg: "from-warning/20" },
  normal:    { tone: "info",    label: "Normal",    bg: "from-info/20" },
  info:      { tone: "neutral", label: "Info",      bg: "from-muted/10" },
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from("profiles").select("org_id, role, langue_maternelle").eq("id", user!.id).maybeSingle()
  const isOwner = profile?.role === "owner" || profile?.role === "admin_dep"

  const { data: incident } = await supabase
    .from("incidents")
    .select(`
      id, titre, urgency, statut, ai_resume, ai_action_recommandee, ai_priorite_score,
      description_corrigee, description_raw, lang_detected, audio_url, attachments,
      created_at, resolved_at, reponse_patron, chantier_id, devis_id, client_id,
      sender:profiles!incidents_sender_id_fkey(id, full_name, email, telephone, langue_maternelle, role),
      clients(nom, prenom, raison_sociale, telephone, email)
    `)
    .eq("id", id)
    .eq("org_id", profile!.org_id!)
    .maybeSingle()
  if (!incident) notFound()

  const { data: messages } = await supabase
    .from("incident_messages")
    .select("id, sender_id, body_raw, body_corrected, translations, audio_url, attachments, created_at, sender:profiles!incident_messages_sender_id_fkey(full_name, role, langue_maternelle)")
    .eq("incident_id", id)
    .order("created_at", { ascending: true })

  const urg = URG_META[incident.urgency] ?? URG_META.normal
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sender = incident.sender as any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const client = incident.clients as any
  const attachments: Array<{ path: string; type: string; name: string; size: number }> = Array.isArray(incident.attachments) ? incident.attachments : []

  // Pre-sign media URLs for display
  const admin = supabaseAdmin()
  const signedAttachments = await Promise.all(
    attachments.map(async (a) => {
      const { data } = await admin.storage.from("chantier-media").createSignedUrl(a.path, 60 * 60)
      return { ...a, url: data?.signedUrl ?? null }
    }),
  )
  const audioSignedUrl = incident.audio_url
    ? (await admin.storage.from("chantier-media").createSignedUrl(incident.audio_url, 60 * 60)).data?.signedUrl ?? null
    : null

  return (
    <div className="max-w-4xl mx-auto p-6 sm:p-10 space-y-6">
      <Link href="/app/incidents" className="inline-flex items-center gap-1 text-xs text-muted hover:text-electric">
        <ArrowLeft className="h-3 w-3" /> Galères de chantier
      </Link>

      {/* Hero IA */}
      <Card className={`relative overflow-hidden`}>
        <div className={`absolute -top-20 -right-20 h-48 w-48 rounded-full blur-3xl opacity-30 bg-gradient-to-br ${urg.bg} to-transparent`} />
        <div className="relative">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge tone={urg.tone}><AlertTriangle className="inline h-3 w-3 mr-1" />{urg.label}</Badge>
            <span className="text-[11px] uppercase tracking-wider text-muted-2">{incident.statut}</span>
            <span className="text-xs text-muted-2">{relativeFR(incident.created_at)} · {formatDateFR(incident.created_at)}</span>
          </div>
          <h1 className="mt-3 font-display text-3xl sm:text-4xl font-bold tracking-tight">{incident.titre}</h1>
          <p className="mt-4 text-base text-foreground/90 leading-relaxed">{incident.ai_resume}</p>

          {incident.ai_action_recommandee && (
            <div className="mt-5 rounded-lg border border-electric/30 bg-electric/5 p-3">
              <div className="flex items-center gap-2 text-electric text-xs font-semibold uppercase tracking-[0.16em]">
                <Sparkles className="h-3 w-3" /> Action recommandée
              </div>
              <p className="mt-1 text-base font-medium">{incident.ai_action_recommandee}</p>
            </div>
          )}
        </div>
      </Card>

      {/* Auteur + client */}
      <div className="grid sm:grid-cols-2 gap-4">
        <Card>
          <CardTitle className="text-sm">Envoyé par</CardTitle>
          <div className="mt-3 flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-full bg-electric text-black font-semibold">
              {initials(sender?.full_name)}
            </div>
            <div>
              <div className="font-medium">{sender?.full_name ?? "—"}</div>
              <div className="text-xs text-muted-2">{sender?.role === "owner" ? "Patron" : "Collaborateur"} · {getLangue(sender?.langue_maternelle).flag} {getLangue(sender?.langue_maternelle).name_fr}</div>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {sender?.telephone && (
              <a href={`tel:${String(sender.telephone).replace(/\s/g, "")}`} className="inline-flex items-center gap-1.5 text-sm text-electric hover:underline">
                <Phone className="h-3.5 w-3.5" /> {sender.telephone}
              </a>
            )}
            {sender?.email && (
              <a href={`mailto:${sender.email}`} className="inline-flex items-center gap-1.5 text-sm text-electric hover:underline">
                <MessageSquare className="h-3.5 w-3.5" /> {sender.email}
              </a>
            )}
          </div>
        </Card>
        {client && (
          <Card>
            <CardTitle className="text-sm">Client concerné</CardTitle>
            <div className="mt-3 font-medium">{client.raison_sociale || `${client.prenom ?? ""} ${client.nom}`.trim()}</div>
            <div className="mt-2 flex flex-wrap gap-2 text-sm">
              {client.telephone && (
                <a href={`tel:${String(client.telephone).replace(/\s/g, "")}`} className="inline-flex items-center gap-1 text-electric hover:underline">
                  <Phone className="h-3.5 w-3.5" /> {client.telephone}
                </a>
              )}
              {client.email && (
                <a href={`mailto:${client.email}`} className="inline-flex items-center gap-1 text-electric hover:underline">
                  <MessageSquare className="h-3.5 w-3.5" /> {client.email}
                </a>
              )}
            </div>
          </Card>
        )}
      </div>

      {/* Audio + texte original */}
      {(audioSignedUrl || incident.description_corrigee || incident.description_raw) && (
        <Card>
          <CardTitle className="text-sm">Message d&apos;origine</CardTitle>
          {audioSignedUrl && (
            <audio controls src={audioSignedUrl} className="mt-3 w-full" />
          )}
          {incident.description_corrigee && (
            <p className="mt-3 text-foreground/90 leading-relaxed">« {incident.description_corrigee} »</p>
          )}
          {incident.lang_detected && incident.lang_detected !== "fr" && incident.description_raw && (
            <details className="mt-3">
              <summary className="text-xs text-muted-2 cursor-pointer inline-flex items-center gap-1">
                <Languages className="h-3 w-3 text-electric" /> Voir l&apos;original ({getLangue(incident.lang_detected).name_fr})
              </summary>
              <p className="mt-2 text-sm text-muted italic">{incident.description_raw}</p>
            </details>
          )}
        </Card>
      )}

      {/* Galerie media */}
      {signedAttachments.length > 0 && (
        <Card>
          <CardTitle className="text-sm flex items-center gap-2">
            <Camera className="h-4 w-4" /> Pièces jointes ({signedAttachments.length})
          </CardTitle>
          <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
            {signedAttachments.map((a, i) => {
              if (!a.url) return null
              return a.type.startsWith("image/") ? (
                <a key={i} href={a.url} target="_blank" rel="noreferrer" className="aspect-square overflow-hidden rounded-lg border border-border bg-surface-2 group block">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={a.url} alt={a.name} className="h-full w-full object-cover group-hover:scale-105 transition-transform" />
                </a>
              ) : (
                <video key={i} src={a.url} controls className="aspect-square w-full rounded-lg bg-black object-cover" />
              )
            })}
          </div>
        </Card>
      )}

      {/* Thread + reply */}
      <Card>
        <CardTitle className="text-sm">Conversation</CardTitle>
        <div className="mt-4 space-y-4">
          {(messages ?? []).slice(1).map((m) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const ms = m.sender as any
            const isOwnerMsg = ms?.role === "owner" || ms?.role === "admin_dep"
            // Show translated body in our language if available
            const myLang = profile?.langue_maternelle ?? "fr"
            const translations = (m.translations ?? {}) as Record<string, string>
            const display = translations[myLang] ?? m.body_corrected ?? m.body_raw
            return (
              <div key={m.id} className={`flex gap-3 ${isOwnerMsg ? "flex-row-reverse" : ""}`}>
                <div className={`grid h-8 w-8 shrink-0 place-items-center rounded-full ${isOwnerMsg ? "bg-electric text-black" : "bg-surface-3 text-foreground"} text-xs font-semibold`}>
                  {initials(ms?.full_name ?? "")}
                </div>
                <div className={`max-w-[80%] rounded-2xl border border-border px-4 py-2.5 ${isOwnerMsg ? "bg-electric/10 border-electric/30" : "bg-surface-2"}`}>
                  <div className="text-[11px] text-muted-2 mb-1">{ms?.full_name ?? "—"} · {relativeFR(m.created_at)}</div>
                  <div className="text-sm leading-relaxed">{display}</div>
                </div>
              </div>
            )
          })}
          {(messages ?? []).length <= 1 && (
            <p className="text-sm text-muted">Pas encore d&apos;échanges. {isOwner ? "Répondez à votre employé ci-dessous." : "En attente du retour du patron."}</p>
          )}
        </div>

        <IncidentReply incidentId={incident.id} isOwner={isOwner} currentStatut={incident.statut} />
      </Card>
    </div>
  )
}
