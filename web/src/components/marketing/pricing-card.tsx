"use client"
import Link from "next/link"
import { motion } from "framer-motion"
import { Check, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"

export function PricingCard() {
  const features = [
    "Devis vocal multilingue (FR, AR, anglais…) auto-traduit FR",
    "Correction orthographique automatique avant envoi",
    "Mémoire des prix de vos articles + main-d'œuvre",
    "Signature électronique du client en 1 clic",
    "Envoi mail automatique avec PDF joint",
    "Relances hebdo, puis quotidiennes après 1 mois",
    "Espace client : dossier complet par client",
    "Tableau de bord en temps réel (devis, factures, impayés)",
    "Accompagnement onboarding inclus",
  ]
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      className="relative mx-auto max-w-2xl"
    >
      <div className="absolute -inset-1 rounded-[1.25rem] bg-gradient-to-br from-electric/40 via-wire-blue/10 to-wire-green/30 blur-2xl opacity-60" />
      <div className="relative glass rounded-[1.25rem] border border-electric/30 p-8 sm:p-10 glow-electric">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-electric" />
            <span className="text-sm font-semibold uppercase tracking-[0.16em] text-electric">
              Tout inclus
            </span>
          </div>
          <span className="rounded-full border border-electric/40 bg-electric/10 px-3 py-1 text-xs font-medium text-electric">
            14 jours gratuits
          </span>
        </div>

        <div className="mb-6">
          <div className="flex items-baseline gap-2">
            <span className="font-display text-6xl sm:text-7xl font-extrabold tracking-tight">
              100€
            </span>
            <span className="text-muted">/ mois</span>
          </div>
          <p className="mt-2 text-sm text-muted">
            Sans engagement. Annulez en 1 clic. Compte secondaire (esclave) : +5€/mois par utilisateur.
          </p>
        </div>

        <ul className="space-y-2.5 mb-8">
          {features.map((f) => (
            <li key={f} className="flex items-start gap-3 text-sm">
              <Check className="mt-0.5 h-4 w-4 flex-none text-electric" />
              <span className="text-foreground/90">{f}</span>
            </li>
          ))}
        </ul>

        <div className="flex flex-col sm:flex-row gap-3">
          <Button asChild variant="primary" size="lg" className="flex-1">
            <Link href="/inscription">Démarrer mes 14 jours gratuits</Link>
          </Button>
          <Button asChild variant="ghost" size="lg" className="flex-1">
            <Link href="/contact">Parler à Maelig</Link>
          </Button>
        </div>

        <p className="mt-4 text-center text-xs text-muted-2">
          Aucune carte requise pour démarrer · Garantie satisfait ou remboursé 30 jours
        </p>
      </div>
    </motion.div>
  )
}
