"use client"
import { parseHighlightMarkers, type SegmentConfidence } from "@/lib/llm/highlight"
import { cn } from "@/lib/utils"

/**
 * Affiche du texte avec les segments à confiance variable en couleur.
 *
 * - low (rouge) : à vérifier d'urgence (sens ambigu, mot mal entendu)
 * - medium (orange) : à relire (nom propre, chiffre douteux)
 * - tech (jaune doux) : terme technique préservé
 * - high (normal) : aucune décoration
 *
 * Au hover : tooltip natif via title attribute.
 */
export function HighlightedText({
  text,
  className,
  as = "p",
}: {
  text: string
  className?: string
  as?: "p" | "span" | "div"
}) {
  const segments = parseHighlightMarkers(text)
  const Tag = as
  return (
    <Tag className={cn(className)}>
      {segments.map((s, i) => {
        if (s.confidence === "high") return <span key={i}>{s.text}</span>
        return <Highlight key={i} confidence={s.confidence}>{s.text}</Highlight>
      })}
    </Tag>
  )
}

function Highlight({ confidence, children }: { confidence: SegmentConfidence; children: React.ReactNode }) {
  const styles: Record<SegmentConfidence, string> = {
    low: "bg-danger/20 text-danger border-b-2 border-dashed border-danger/60 px-0.5 rounded-sm",
    medium: "bg-warning/15 text-warning border-b border-dashed border-warning/60 px-0.5 rounded-sm",
    tech: "bg-electric/15 text-electric px-0.5 rounded-sm",
    high: "",
  }
  const titles: Record<SegmentConfidence, string> = {
    low: "À vérifier d'urgence : sens ou mot ambigu",
    medium: "À relire : nom propre ou chiffre potentiellement incertain",
    tech: "Terme technique préservé",
    high: "",
  }
  return (
    <span className={styles[confidence]} title={titles[confidence]}>
      {children}
    </span>
  )
}

/**
 * Mini légende inline à mettre près des champs avec correction IA.
 */
export function HighlightLegend({ className }: { className?: string }) {
  return (
    <div className={cn("flex flex-wrap gap-3 text-[11px] text-muted", className)}>
      <span className="inline-flex items-center gap-1">
        <span className="h-2 w-3 rounded-sm bg-danger/40 border-b-2 border-dashed border-danger/60" />
        à vérifier
      </span>
      <span className="inline-flex items-center gap-1">
        <span className="h-2 w-3 rounded-sm bg-warning/30 border-b border-dashed border-warning/60" />
        à relire
      </span>
      <span className="inline-flex items-center gap-1">
        <span className="h-2 w-3 rounded-sm bg-electric/30" />
        technique
      </span>
    </div>
  )
}
