"use client"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

export function FeatureCard({
  icon,
  title,
  description,
  color = "var(--electric)",
  delay = 0,
}: {
  icon: React.ReactNode
  title: string
  description: string
  color?: string
  delay?: number
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ duration: 0.6, delay, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ y: -4 }}
      className={cn(
        "glass relative overflow-hidden rounded-[var(--radius-lg)] border border-border p-6",
        "transition-colors hover:border-border-strong",
      )}
    >
      <div
        className="absolute -top-16 -right-16 h-40 w-40 rounded-full opacity-20 blur-3xl"
        style={{ background: color }}
      />
      <div
        className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-xl border border-border"
        style={{ background: `${color}1f`, color }}
      >
        {icon}
      </div>
      <h3 className="font-display text-xl font-semibold tracking-tight mb-2">{title}</h3>
      <p className="text-sm text-muted leading-relaxed">{description}</p>
    </motion.div>
  )
}
