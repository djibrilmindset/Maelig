"use client"
import * as React from "react"
import { cn } from "@/lib/utils"

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, invalid, type = "text", ...props }, ref) => {
    return (
      <input
        ref={ref}
        type={type}
        className={cn(
          "flex h-11 w-full rounded-[var(--radius)] border border-border bg-surface px-4 py-2 text-sm text-foreground placeholder:text-muted-2",
          "transition-colors focus-visible:border-electric focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]/40",
          "disabled:cursor-not-allowed disabled:opacity-50",
          invalid && "border-danger focus-visible:border-danger focus-visible:ring-danger/30",
          className,
        )}
        {...props}
      />
    )
  },
)
Input.displayName = "Input"

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }>(
  ({ className, invalid, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        "flex min-h-[100px] w-full rounded-[var(--radius)] border border-border bg-surface px-4 py-3 text-sm text-foreground placeholder:text-muted-2",
        "transition-colors focus-visible:border-electric focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]/40",
        "disabled:cursor-not-allowed disabled:opacity-50",
        invalid && "border-danger focus-visible:border-danger focus-visible:ring-danger/30",
        className,
      )}
      {...props}
    />
  ),
)
Textarea.displayName = "Textarea"

export function Label({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn(
        "text-xs font-medium uppercase tracking-[0.14em] text-muted",
        className,
      )}
      {...props}
    />
  )
}

export function FieldError({ children }: { children?: React.ReactNode }) {
  if (!children) return null
  return <p className="text-xs text-danger mt-1">{children}</p>
}
