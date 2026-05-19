"use client"
import { useEffect, useRef, useState } from "react"
import { Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"
import { Textarea } from "@/components/ui/input"

/**
 * Textarea that, when the user clicks "Envoyer / valider" (or onBlur),
 * shows the corrected version animating in, then commits.
 * Cas d'usage: zones de texte où l'on veut une correction live "comme par magie".
 */
export function SmartTextarea({
  value,
  onChange,
  placeholder,
  rows = 4,
  correctOnBlur = false,
  className,
  id,
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  rows?: number
  correctOnBlur?: boolean
  className?: string
  id?: string
}) {
  const [pending, setPending] = useState(false)
  const [animatedText, setAnimatedText] = useState<string | null>(null)
  const animRef = useRef<number | null>(null)

  async function correctNow() {
    const text = value.trim()
    if (!text || text.length < 4) return
    setPending(true)
    try {
      const res = await fetch("/api/text/correct", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      })
      const data = (await res.json()) as { corrected?: string; changed?: boolean; error?: string }
      if (data.corrected && data.changed) {
        animateReplace(data.corrected)
      }
    } catch {
      // silent
    } finally {
      setPending(false)
    }
  }

  function animateReplace(target: string) {
    if (animRef.current) cancelAnimationFrame(animRef.current)
    let i = 0
    const total = target.length
    const stepMs = 12
    let last = performance.now()
    const step = (now: number) => {
      if (now - last >= stepMs) {
        i = Math.min(total, i + Math.max(1, Math.round((now - last) / stepMs)))
        last = now
        setAnimatedText(target.slice(0, i))
      }
      if (i < total) {
        animRef.current = requestAnimationFrame(step)
      } else {
        animRef.current = null
        onChange(target)
        setTimeout(() => setAnimatedText(null), 250)
      }
    }
    animRef.current = requestAnimationFrame(step)
  }

  // Expose method via blur if requested
  function handleBlur() {
    if (correctOnBlur) void correctNow()
  }

  useEffect(() => () => { if (animRef.current) cancelAnimationFrame(animRef.current) }, [])

  return (
    <div className="relative">
      <Textarea
        id={id}
        rows={rows}
        placeholder={placeholder}
        value={animatedText ?? value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={handleBlur}
        className={cn("pr-10", animatedText && "ring-2 ring-electric/60", className)}
      />
      <button
        type="button"
        onClick={correctNow}
        title="Corriger l'orthographe maintenant"
        className={cn(
          "absolute top-2 right-2 grid h-7 w-7 place-items-center rounded-md border border-border bg-surface-3 text-electric",
          pending && "animate-pulse",
        )}
        aria-label="Corriger"
      >
        <Sparkles className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}
