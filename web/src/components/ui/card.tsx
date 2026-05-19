import * as React from "react"
import { cn } from "@/lib/utils"

export function Card({
  className,
  glass = true,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { glass?: boolean }) {
  return (
    <div
      className={cn(
        "rounded-[var(--radius-lg)] border border-border p-6",
        glass ? "glass" : "bg-surface",
        className,
      )}
      {...props}
    />
  )
}

export function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex items-start justify-between gap-4 mb-4", className)} {...props} />
}

export function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3 className={cn("font-display text-lg font-semibold tracking-tight", className)} {...props} />
  )
}

export function CardDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("text-sm text-muted", className)} {...props} />
}

export function Badge({
  className,
  tone = "neutral",
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & {
  tone?: "neutral" | "electric" | "success" | "warning" | "danger" | "info"
}) {
  const tones: Record<string, string> = {
    neutral: "bg-surface-3 text-muted border-border",
    electric: "bg-electric/15 text-electric border-electric/30",
    success: "bg-success/15 text-success border-success/30",
    warning: "bg-warning/15 text-warning border-warning/30",
    danger: "bg-danger/15 text-danger border-danger/30",
    info: "bg-info/15 text-info border-info/30",
  }
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium uppercase tracking-wider",
        tones[tone],
        className,
      )}
      {...props}
    />
  )
}
