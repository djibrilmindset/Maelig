import Link from "next/link"
import { AlertTriangle, Camera, Mic, Plus, Clock4, Sparkles } from "lucide-react"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { Card, CardTitle, CardDescription, Badge } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/app/empty-state"
import { formatDateFR, relativeFR, initials } from "@/lib/utils"
import { prioritizeForPatron } from "@/lib/llm/incidents"

export const dynamic = "force-dynamic"

const URG_META: Record<string, { tone: "danger" | "warning" | "info" | "neutral"; label: string }> = {
  urgent: { tone: "danger", label: "Urgent" },
  important: { tone: "warning", label: "Important" },
  normal: { tone: "info", label: "Normal" },
  info: { tone: "neutral", label: "Info" },
}

const STATUT_META: Record<string, string> = {
  ouvert: "Ouvert",
  en_cours: "En cours",
  resolu: "Résolu",
  escalade: "Escalade",
  ferme: "Fermé",
}

export default async function Page() {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from("profiles").select("org_id, role").eq("id", user!.id).maybeSingle()
  const isOwner = profile?.role === "owner" || profile?.role === "admin_dep"

  const { data: rows } = await supabase
    .from("incidents")
    .select("id, titre, urgency, statut, ai_resume, ai_action_recommandee, ai_priorite_score, created_at, attachments, sender:profiles!incidents_sender_id_fkey(full_name, langue_maternelle)")
    .eq("org_id", profile!.org_id!)
    .order("statut", { ascending: true })
    .order("ai_priorite_score", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(50)

  const ouverts = (rows ?? []).filter((r) => ["ouvert", "en_cours", "escalade"].includes(r.statut))
  const closed = (rows ?? []).filter((r) => ["resolu", "ferme"].includes(r.statut))

  // IA priorisation pour patron (top 2 actions)
  let nextActions: string[] = []
  if (isOwner && ouverts.length > 0) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const r = await prioritizeForPatron(ouverts.map((o: any) => ({ titre: o.titre, urgency: o.urgency, ai_resume: o.ai_resume ?? "", created_at: o.created_at })))
      nextActions = r.next_actions
    } catch { /* ignore */ }
  }

  return (
    <div className="max-w-6xl mx-auto p-6 sm:p-10 space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <CardTitle>Galères de chantier</CardTitle>
          <CardDescription>
            Vos employés signalent un problème, vous le voyez ici en 1 coup d&apos;œil — résumé IA, urgence et action recommandée.
          </CardDescription>
        </div>
        <Button asChild variant={isOwner ? "secondary" : "primary"} className={isOwner ? "" : "gap-2"}>
          <Link href="/app/incidents/nouveau">
            <AlertTriangle className="h-4 w-4" /> Signaler
          </Link>
        </Button>
      </div>

      {isOwner && nextActions.length > 0 && (
        <Card className="border-electric/40 glow-electric">
          <div className="flex items-start gap-3">
            <Sparkles className="h-5 w-5 text-electric mt-0.5" />
            <div>
              <CardTitle>Ce matin, mettez votre énergie ici</CardTitle>
              <ul className="mt-3 space-y-2">
                {nextActions.map((a, i) => (
                  <li key={i} className="flex items-start gap-3 text-base">
                    <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-electric text-black font-bold text-xs">{i + 1}</span>
                    <span className="text-foreground/95 leading-snug">{a}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Card>
      )}

      {ouverts.length === 0 && closed.length === 0 ? (
        <EmptyState
          icon={<AlertTriangle className="h-5 w-5 text-electric" />}
          title="Aucun signalement"
          description="Quand vos employés voient un problème sur le chantier, ils peuvent l'envoyer ici en 1 photo et 1 vocal."
          action={<Button asChild><Link href="/app/incidents/nouveau"><Plus className="h-4 w-4" /> Signaler une galère</Link></Button>}
        />
      ) : (
        <>
          {ouverts.length > 0 && (
            <section>
              <div className="mb-2 text-xs uppercase tracking-[0.18em] text-muted">Ouverts ({ouverts.length})</div>
              <div className="space-y-3">
                {await Promise.all(ouverts.map(async (i) => <IncidentRow key={i.id} incident={i} />))}
              </div>
            </section>
          )}
          {closed.length > 0 && (
            <section className="opacity-70">
              <div className="mb-2 text-xs uppercase tracking-[0.18em] text-muted">Résolus ({closed.length})</div>
              <div className="space-y-3">
                {await Promise.all(closed.slice(0, 10).map(async (i) => <IncidentRow key={i.id} incident={i} compact />))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  )
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function IncidentRow({ incident, compact }: { incident: any; compact?: boolean }) {
  const urg = URG_META[incident.urgency] ?? URG_META.normal
  const attachments: Array<{ path: string; type: string }> = Array.isArray(incident.attachments) ? incident.attachments : []
  const photoCount = attachments.filter((a) => a.type?.startsWith("image/")).length
  const videoCount = attachments.filter((a) => a.type?.startsWith("video/")).length
  const hasAudio = Boolean(incident.audio_url)

  // 1ère vignette signée (si patron)
  let thumbUrl: string | null = null
  const firstPhoto = attachments.find((a) => a.type?.startsWith("image/"))
  if (firstPhoto) {
    const { data } = await supabaseAdmin().storage.from("chantier-media").createSignedUrl(firstPhoto.path, 60 * 15)
    thumbUrl = data?.signedUrl ?? null
  }

  return (
    <Link href={`/app/incidents/${incident.id}`}>
      <Card className="group flex gap-4 transition-colors hover:border-border-strong">
        {thumbUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={thumbUrl} alt="" className="h-20 w-20 rounded-lg object-cover shrink-0" />
        ) : (
          <div className="h-20 w-20 grid place-items-center rounded-lg bg-surface-3 text-muted shrink-0">
            <AlertTriangle className="h-7 w-7" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge tone={urg.tone}>{urg.label}</Badge>
            <span className="text-[11px] uppercase tracking-wider text-muted-2">{STATUT_META[incident.statut] ?? incident.statut}</span>
          </div>
          <div className="mt-1 font-display text-lg font-semibold tracking-tight">{incident.titre}</div>
          {!compact && (
            <p className="mt-1 text-sm text-muted line-clamp-2 leading-snug">{incident.ai_resume}</p>
          )}
          <div className="mt-2 flex items-center gap-3 text-xs text-muted-2">
            <span><Clock4 className="inline h-3 w-3 mr-1" /> {relativeFR(incident.created_at)} · {formatDateFR(incident.created_at)}</span>
            <span>{initials(incident.sender?.full_name ?? "")}</span>
            {photoCount > 0 && <span><Camera className="inline h-3 w-3" /> {photoCount}</span>}
            {videoCount > 0 && <span>🎬 {videoCount}</span>}
            {hasAudio && <span><Mic className="inline h-3 w-3" /></span>}
          </div>
        </div>
      </Card>
    </Link>
  )
}
