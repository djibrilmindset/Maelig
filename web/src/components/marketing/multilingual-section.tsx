"use client"
import { motion } from "framer-motion"
import { ArrowRight, MessagesSquare } from "lucide-react"
import { LANGUES_P0_P1 } from "@/lib/langues"

/**
 * THE multilingual section.
 * Concrete vignette : Moussa parle bambara, le patron répond en français,
 * Moussa lit en bambara. DEP fait tout entre les deux.
 *
 * Suivi d'une grille d'orgueil avec les 20 langues supportées.
 */
export function MultilingualSection() {
  return (
    <div className="space-y-12">
      <div className="grid md:grid-cols-[1fr_auto_1fr] items-center gap-6">
        <Bubble
          who="Moussa, ouvrier"
          flag="🇲🇱"
          lang="Bambara"
          original={`I ka kɛnɛyɔrɔ la, prises caya tɛ ka cogo bɛ. An ka ɲini fila nin sɛgɛ ye.`}
          translation={`« Sur le chantier, il manque des prises. Il nous en faut deux de plus. »`}
          tone="warm"
          delay={0}
        />
        <BridgeArrow />
        <Bubble
          who="Vous, patron"
          flag="🇫🇷"
          lang="Français"
          original={`Pas de souci, on ajoute deux prises 16A étanches. Je passe te voir à 14h.`}
          translation={`« Foyi tɛ. An bɛna prises 16A fila kura don. N na taa i fɔ 14h.»`}
          tone="cool"
          reversed
          delay={0.18}
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.55 }}
        className="glass rounded-2xl border border-border p-6 sm:p-7"
      >
        <div className="flex items-center gap-3">
          <MessagesSquare className="h-5 w-5 text-electric" />
          <span className="text-[13px] font-semibold uppercase tracking-[0.18em] text-electric">
            Une seule conversation, deux langues
          </span>
        </div>
        <p className="mt-3 text-base sm:text-lg text-foreground/90 leading-relaxed">
          Vous écrivez en français. Votre employé lit dans sa langue maternelle. Il vous répond chez lui,
          vous le recevez en français. La même conversation, deux fenêtres. Plus jamais de{" "}
          <em className="text-electric">« j&apos;ai pas compris ce qu&apos;il voulait dire »</em>.
        </p>

        <div className="mt-6 flex flex-wrap gap-2">
          {LANGUES_P0_P1.map((l) => (
            <span
              key={l.code}
              className="inline-flex items-center gap-2 rounded-full border border-border bg-surface-2 px-3 py-1.5 text-sm"
              title={`${l.name_fr} (${l.native})`}
            >
              <span className="text-base leading-none" aria-hidden>{l.flag}</span>
              <span className="font-medium text-foreground/85">{l.name_fr}</span>
            </span>
          ))}
        </div>
        <p className="mt-4 text-sm text-muted-2">
          Et n&apos;importe quelle autre langue : il suffit de la demander, on l&apos;ajoute.
        </p>
      </motion.div>
    </div>
  )
}

function Bubble({
  who,
  flag,
  lang,
  original,
  translation,
  tone,
  reversed,
  delay = 0,
}: {
  who: string
  flag: string
  lang: string
  original: string
  translation: string
  tone: "warm" | "cool"
  reversed?: boolean
  delay?: number
}) {
  const accent = tone === "warm" ? "var(--wire-red)" : "var(--wire-blue)"
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ delay, duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
      className={`glass rounded-2xl border border-border p-6 ${reversed ? "md:text-right" : ""}`}
    >
      <div className={`flex items-center gap-2 ${reversed ? "md:justify-end" : ""}`}>
        <span className="text-2xl leading-none" aria-hidden>{flag}</span>
        <div>
          <div className="text-sm font-semibold">{who}</div>
          <div className="text-[11px] uppercase tracking-[0.16em]" style={{ color: accent }}>
            {lang}
          </div>
        </div>
      </div>

      <blockquote
        className="mt-4 font-display text-xl sm:text-2xl font-semibold leading-snug"
        style={{ color: accent }}
      >
        {original}
      </blockquote>

      <div className={`mt-3 flex items-start gap-2 ${reversed ? "md:flex-row-reverse" : ""}`}>
        <span className="mt-1 inline-block h-1.5 w-1.5 rounded-full" style={{ background: accent }} />
        <p className="text-[15px] text-muted leading-relaxed">{translation}</p>
      </div>
      <div className="mt-3 text-[10px] uppercase tracking-[0.18em] text-muted-2">
        Traduction automatique DEP, instantanée
      </div>
    </motion.div>
  )
}

function BridgeArrow() {
  return (
    <div className="hidden md:flex flex-col items-center gap-1 text-electric">
      <svg width="64" height="80" viewBox="0 0 64 80" fill="none" aria-hidden="true">
        <defs>
          <linearGradient id="bridge-up" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0" stopColor="#e63946" />
            <stop offset="1" stopColor="#2f6fff" />
          </linearGradient>
          <linearGradient id="bridge-down" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#2f6fff" />
            <stop offset="1" stopColor="#e63946" />
          </linearGradient>
        </defs>
        <motion.path
          d="M 18 70 C 18 28 46 52 46 10"
          stroke="url(#bridge-up)"
          strokeWidth="3"
          strokeLinecap="round"
          fill="none"
          initial={{ pathLength: 0 }}
          whileInView={{ pathLength: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1.4, ease: "easeOut" }}
        />
        <motion.path
          d="M 41 14 L 47 8 L 54 14"
          stroke="#2f6fff"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          initial={{ pathLength: 0 }}
          whileInView={{ pathLength: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.6, duration: 0.5 }}
        />
      </svg>
      <div className="text-[10px] uppercase tracking-[0.16em] text-muted">DEP traduit</div>
      <ArrowRight className="h-3 w-3 rotate-90 -mt-1 text-muted" />
    </div>
  )
}
