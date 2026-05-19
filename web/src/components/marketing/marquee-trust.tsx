"use client"
import { Zap, Shield, Sparkles, Smile, Clock4, Hammer } from "lucide-react"

const items = [
  { Icon: Zap, label: "Conçu pour les électriciens" },
  { Icon: Clock4, label: "Devis en 90 secondes chrono" },
  { Icon: Shield, label: "Données hébergées en Europe" },
  { Icon: Sparkles, label: "Vocal multilingue auto-corrigé" },
  { Icon: Hammer, label: "Mémoire des articles intelligente" },
  { Icon: Smile, label: "Pensé pour les chefs allergiques au digital" },
]

export function MarqueeTrust() {
  const loop = [...items, ...items]
  return (
    <div className="relative overflow-hidden border-y border-border bg-surface/40 py-4">
      <div className="marquee flex gap-10 whitespace-nowrap">
        {loop.map(({ Icon, label }, i) => (
          <span
            key={`${label}-${i}`}
            className="flex items-center gap-2 text-sm text-muted"
          >
            <Icon className="h-4 w-4 text-electric" />
            {label}
          </span>
        ))}
      </div>
      <div className="absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-background to-transparent pointer-events-none" />
      <div className="absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-background to-transparent pointer-events-none" />
    </div>
  )
}
