"use client"
import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { Loader2 } from "lucide-react"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[var(--radius)] text-sm font-medium transition-[transform,box-shadow,background-color,color,opacity] active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-background",
  {
    variants: {
      variant: {
        primary:
          "bg-electric text-black hover:bg-electric-soft shadow-[0_8px_24px_-8px_rgba(255,213,0,0.55)] hover:shadow-[0_12px_32px_-8px_rgba(255,213,0,0.75)] font-semibold",
        secondary:
          "bg-surface-2 text-foreground border border-border hover:bg-surface-3 hover:border-border-strong",
        ghost:
          "text-foreground hover:bg-surface-2",
        outline:
          "border border-border-strong text-foreground hover:bg-surface-2",
        danger:
          "bg-danger text-white hover:bg-red-500",
        wire:
          "relative text-black font-semibold border-0 bg-electric overflow-hidden",
        link:
          "underline-offset-4 text-electric hover:underline px-0",
      },
      size: {
        sm: "h-9 px-3 text-xs",
        md: "h-11 px-5",
        lg: "h-14 px-7 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean
  iconLeft?: React.ReactNode
  iconRight?: React.ReactNode
  asChild?: boolean
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className, variant, size, loading, iconLeft, iconRight, asChild = false, children, ...props },
    ref,
  ) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        ref={ref as React.Ref<HTMLButtonElement>}
        className={cn(buttonVariants({ variant, size }), className)}
        aria-busy={loading || undefined}
        {...(!asChild && { disabled: loading || (props as React.ButtonHTMLAttributes<HTMLButtonElement>).disabled })}
        {...props}
      >
        {asChild ? (
          children
        ) : (
          <>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : iconLeft}
            {children}
            {!loading ? iconRight : null}
          </>
        )}
      </Comp>
    )
  },
)
Button.displayName = "Button"

export { buttonVariants }
