"use client"
import { motion } from "framer-motion"
import { Check, Pencil, Sparkles, AlertCircle, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { Clarification } from "@/lib/llm/clarify"
import { HighlightedText, HighlightLegend } from "./highlighted-text"
import { parseHighlightMarkers } from "@/lib/llm/highlight"

/**
 * Carte de clarification : on montre au patron/employé CE QU'ON A COMPRIS
 * avant de toucher au devis. Validation = 1 clic. Sinon = précision = nouveau passage.
 */
export function ClarifyCard({
  clarification,
  language,
  onConfirm,
  onEdit,
  onCancel,
  pending,
}: {
  clarification: Clarification
  language?: string
  onConfirm: () => void
  onEdit: () => void
  onCancel: () => void
  pending?: boolean
}) {
  const totalItems = clarification.items.length
  const lowConf = clarification.items.filter((i) => i.confidence === "low").length
  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className="relative glass border border-electric/40 rounded-2xl p-6 sm:p-7 glow-electric"
    >
      <button
        onClick={onCancel}
        aria-label="Annuler"
        className="absolute top-3 right-3 grid h-8 w-8 place-items-center rounded-md text-muted hover:bg-surface-3 hover:text-foreground"
      >
        <X className="h-4 w-4" />
      </button>

      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-electric">
        <Sparkles className="h-3.5 w-3.5" />
        Voici ce que j&apos;ai compris{language && language !== "fr" ? ` · langue détectée : ${language}` : ""}
      </div>

      <HighlightedText
        text={`« ${clarification.summary || "Je n'ai pas tout saisi — précise le client ou les articles."} »`}
        className="mt-4 font-display text-xl sm:text-2xl font-semibold leading-snug"
      />
      {parseHighlightMarkers(clarification.summary).some((s) => s.confidence === "low" || s.confidence === "medium") && (
        <HighlightLegend className="mt-2" />
      )}

      {clarification.items.length > 0 && (
        <ul className="mt-5 grid sm:grid-cols-2 gap-2">
          {clarification.items.map((it, i) => (
            <li
              key={i}
              className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm"
            >
              <span className="truncate">
                <span className="font-mono text-muted mr-2">{it.qty} {it.unit}</span>
                {it.label}
              </span>
              <span
                className={`text-[10px] uppercase tracking-wider rounded-full px-2 py-0.5 ${
                  it.confidence === "high"
                    ? "bg-success/15 text-success"
                    : it.confidence === "medium"
                    ? "bg-info/15 text-info"
                    : "bg-warning/15 text-warning"
                }`}
              >
                {it.confidence === "high" ? "sûr" : it.confidence === "medium" ? "ok" : "à vérifier"}
              </span>
            </li>
          ))}
        </ul>
      )}

      {(clarification.client || clarification.site || clarification.labor_hours) && (
        <div className="mt-5 grid sm:grid-cols-3 gap-2 text-sm">
          {clarification.client && (
            <Info label="Client" value={clarification.client} />
          )}
          {clarification.site && (
            <Info label="Chantier" value={clarification.site} />
          )}
          {clarification.labor_hours != null && (
            <Info label="Main-d'œuvre" value={`${clarification.labor_hours} h`} />
          )}
        </div>
      )}

      {clarification.questions.length > 0 && (
        <div className="mt-5 rounded-lg border border-warning/30 bg-warning/5 p-3">
          <div className="flex items-center gap-2 text-warning text-sm font-medium">
            <AlertCircle className="h-4 w-4" />
            {clarification.questions.length === 1 ? "Une précision" : `${clarification.questions.length} précisions`} avant de continuer :
          </div>
          <ul className="mt-2 list-disc list-inside space-y-1 text-sm text-foreground/90">
            {clarification.questions.map((q, i) => (
              <li key={i}>{q}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <div className="text-xs text-muted-2">
          {totalItems} ligne{totalItems > 1 ? "s" : ""}
          {lowConf > 0 ? ` · ${lowConf} à vérifier` : ""}
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="md" onClick={onEdit} disabled={pending}>
            <Pencil className="h-4 w-4" /> Préciser à la voix
          </Button>
          <Button variant="primary" size="md" onClick={onConfirm} loading={pending}>
            <Check className="h-4 w-4" /> C&apos;est bon, construis le devis
          </Button>
        </div>
      </div>
    </motion.div>
  )
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-surface-2 px-3 py-2">
      <div className="text-[10px] uppercase tracking-wider text-muted">{label}</div>
      <div className="mt-0.5 font-medium truncate">{value}</div>
    </div>
  )
}
