import Image from "next/image"
import Link from "next/link"
import { cn } from "@/lib/utils"

export function DepLogo({
  className,
  href = "/",
  size = 40,
  withWordmark = false,
}: {
  className?: string
  href?: string | null
  size?: number
  withWordmark?: boolean
}) {
  const inner = (
    <span className={cn("inline-flex items-center gap-3", className)}>
      <Image
        src="/dep-logo.png"
        alt="DEP — Plateforme de gestion électrique"
        width={size * 2.6}
        height={size}
        priority
        className="object-contain"
        style={{ height: size, width: "auto", mixBlendMode: "screen" }}
      />
      {withWordmark ? (
        <span className="hidden sm:flex flex-col leading-none">
          <span className="font-display font-extrabold text-lg tracking-tight">DEP</span>
          <span className="text-[10px] uppercase tracking-[0.18em] text-muted">
            gestion électrique
          </span>
        </span>
      ) : null}
    </span>
  )
  if (href === null) return inner
  return <Link href={href} className="group inline-flex">{inner}</Link>
}

export function DepMark({ className, size = 28 }: { className?: string; size?: number }) {
  return (
    <Image
      src="/dep-logo.png"
      alt="DEP"
      width={size * 2.6}
      height={size}
      className={cn("object-contain", className)}
      style={{ height: size, width: "auto", mixBlendMode: "screen" }}
      priority
    />
  )
}
