"use client"
import { motion } from "framer-motion"
import { Mic, Sparkles, FileText, Send } from "lucide-react"

const steps = [
  { Icon: Mic, label: "Vous parlez", color: "var(--wire-red)" },
  { Icon: Sparkles, label: "On transcrit", color: "var(--wire-blue)" },
  { Icon: FileText, label: "Devis prêt", color: "var(--wire-yellow)" },
  { Icon: Send, label: "Envoyé au client", color: "var(--wire-green)" },
]

export function VoicePill() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4">
      {steps.map(({ Icon, label, color }, i) => (
        <motion.div
          key={label}
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: i * 0.18, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="glass flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm"
        >
          <span
            className="grid h-6 w-6 place-items-center rounded-full"
            style={{ background: color, color: "#000" }}
          >
            <Icon className="h-3.5 w-3.5" />
          </span>
          <span className="text-foreground/90 font-medium">{label}</span>
          {i < steps.length - 1 && (
            <span className="mx-1 hidden sm:block text-muted">→</span>
          )}
        </motion.div>
      ))}
    </div>
  )
}
