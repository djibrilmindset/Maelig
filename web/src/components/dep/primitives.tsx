"use client"

/**
 * DEP — Shared design primitives v2
 * Port de ~/Maelig/design_handoff_dep/prototype/shared.jsx (Claude.ai Design 2026-05-19)
 *
 * À utiliser dans tous les écrans v2 (Landing, Dashboard, VocalEditor, Incidents, Chat).
 * Tokens via globals.css (--dep-*, --font-bricolage, --font-mono).
 */

import {
  CSSProperties,
  ElementType,
  ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"

/* ─────────── Noise overlay ─────────── */
export function DepNoise({ opacity }: { opacity?: number | string }) {
  return (
    <div
      className="dep-noise-layer"
      aria-hidden="true"
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        zIndex: 2,
        opacity: opacity ?? "var(--noise-opacity)",
        mixBlendMode: "overlay",
        backgroundImage:
          "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 1 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.85'/%3E%3C/svg%3E\")",
        backgroundSize: "220px 220px",
      }}
    />
  )
}

/* ─────────── Magnetic CTA wrapper ─────────── */
export function DepMagnetic({
  strength = 0.25,
  children,
  style,
  className,
  ...rest
}: {
  strength?: number
  children: ReactNode
  style?: CSSProperties
  className?: string
} & React.HTMLAttributes<HTMLSpanElement>) {
  const ref = useRef<HTMLSpanElement | null>(null)
  const onMove = (e: React.MouseEvent<HTMLSpanElement>) => {
    const el = ref.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const x = (e.clientX - (r.left + r.width / 2)) * strength
    const y = (e.clientY - (r.top + r.height / 2)) * strength
    el.style.transform = `translate(${x}px, ${y}px)`
  }
  const reset = () => {
    if (ref.current) ref.current.style.transform = "translate(0,0)"
  }
  return (
    <span
      ref={ref}
      className={`dep-magnetic ${className || ""}`}
      onMouseMove={onMove}
      onMouseLeave={reset}
      style={style}
      {...rest}
    >
      {children}
    </span>
  )
}

/* ─────────── Stagger reveal in-view ─────────── */
export function DepReveal({
  children,
  delay = 0,
  style,
  as = "div",
}: {
  children: ReactNode
  delay?: number
  style?: CSSProperties
  as?: ElementType
}) {
  const ref = useRef<HTMLElement | null>(null)
  const [inView, setInView] = useState(false)
  useEffect(() => {
    const node = ref.current
    if (!node) {
      const t = setTimeout(() => setInView(true), 80 + delay)
      return () => clearTimeout(t)
    }
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setTimeout(() => setInView(true), delay)
            obs.disconnect()
          }
        })
      },
      { threshold: 0.12 }
    )
    obs.observe(node)
    return () => obs.disconnect()
  }, [delay])
  const T = as as ElementType
  return (
    <T
      ref={ref}
      className={`dep-reveal ${inView ? "is-in" : ""}`}
      style={{ transitionDelay: `${delay}ms`, ...style }}
    >
      {children}
    </T>
  )
}

/* ─────────── Status dot ─────────── */
export function DepDot({
  tone = "green",
  size = 8,
}: {
  tone?: "green" | "amber" | "red" | "grey"
  size?: number
}) {
  const map: Record<string, string> = {
    green: "var(--dep-green)",
    amber: "var(--dep-amber)",
    red: "var(--dep-red)",
    grey: "var(--dep-grey-2)",
  }
  return (
    <span
      style={{
        display: "inline-block",
        width: size,
        height: size,
        borderRadius: "50%",
        background: map[tone],
        flexShrink: 0,
      }}
    />
  )
}

/* ─────────── Sparkline ─────────── */
export function DepSpark({
  data,
  color = "var(--dep-yellow)",
  width = 90,
  height = 30,
}: {
  data: number[]
  color?: string
  width?: number
  height?: number
}) {
  const max = Math.max(...data)
  const min = Math.min(...data)
  const range = max - min || 1
  const pts = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * width
      const y = height - ((v - min) / range) * (height - 4) - 2
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(" ")
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
      <polyline
        points={pts}
        fill="none"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ strokeDasharray: 200, animation: "dep-sparkdraw 1.2s ease forwards" }}
      />
    </svg>
  )
}

/* ─────────── Custom icons (épaissis — pas Heroicons brut) ─────────── */
type IconProps = React.SVGAttributes<SVGSVGElement>

export const DepIcon = {
  mic: (props: IconProps) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square" {...props}>
      <rect x="9" y="3" width="6" height="13" rx="3" />
      <path d="M5 11v2a7 7 0 0 0 14 0v-2" />
      <path d="M12 20v2" />
    </svg>
  ),
  camera: (props: IconProps) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square" {...props}>
      <path d="M3 8h4l2-3h6l2 3h4v12H3z" />
      <circle cx="12" cy="13" r="3.4" />
    </svg>
  ),
  video: (props: IconProps) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square" {...props}>
      <rect x="3" y="6" width="13" height="12" rx="1" />
      <path d="M16 10l5-2v8l-5-2z" />
    </svg>
  ),
  bolt: (props: IconProps) => (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M13 2L4 14h7l-1 8 9-12h-7z" />
    </svg>
  ),
  check: (props: IconProps) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" {...props}>
      <path d="M4 12l5 5 11-11" />
    </svg>
  ),
  arrow: (props: IconProps) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" {...props}>
      <path d="M5 12h14" />
      <path d="M13 6l6 6-6 6" />
    </svg>
  ),
  send: (props: IconProps) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M22 2L11 13" />
      <path d="M22 2l-7 20-4-9-9-4z" />
    </svg>
  ),
  back: (props: IconProps) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" {...props}>
      <path d="M19 12H5" />
      <path d="M11 18l-6-6 6-6" />
    </svg>
  ),
  signal: (props: IconProps) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" {...props}>
      <path d="M3 18l4-4" />
      <path d="M8 13l5-5" />
      <path d="M14 7l6-6" />
    </svg>
  ),
  warning: (props: IconProps) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="square" {...props}>
      <path d="M12 3l10 18H2L12 3z" />
      <path d="M12 10v5" />
      <circle cx="12" cy="18" r="0.8" fill="currentColor" />
    </svg>
  ),
  euro: (props: IconProps) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="square" {...props}>
      <path d="M20 6a8 8 0 1 0 0 12" />
      <path d="M3 10h11" />
      <path d="M3 14h11" />
    </svg>
  ),
  truck: (props: IconProps) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square" {...props}>
      <rect x="1" y="6" width="13" height="10" />
      <path d="M14 9h4l3 3v4h-7z" />
      <circle cx="6" cy="18" r="2" />
      <circle cx="17" cy="18" r="2" />
    </svg>
  ),
}

/* ─────────── Tiny waveform (audio capture) ─────────── */
export function DepWaveform({
  active = true,
  color = "var(--dep-red)",
  bars = 32,
  height = 36,
}: {
  active?: boolean
  color?: string
  bars?: number
  height?: number
}) {
  const seed = useMemo(
    () => Array.from({ length: bars }, (_, i) => 0.3 + Math.abs(Math.sin(i * 1.3)) * 0.7),
    [bars]
  )
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 3, height }}>
      {seed.map((h, i) => (
        <div
          key={i}
          style={{
            width: 3,
            borderRadius: 2,
            background: color,
            opacity: active ? 1 : 0.3,
            height: `${(active ? h : h * 0.3) * 100}%`,
            animation: active
              ? `dep-wave-${i % 4} ${0.4 + (i % 7) * 0.05}s ease-in-out infinite alternate`
              : "none",
          }}
        />
      ))}
      <style>{`
        @keyframes dep-wave-0 { from { transform: scaleY(0.4); } to { transform: scaleY(1); } }
        @keyframes dep-wave-1 { from { transform: scaleY(0.7); } to { transform: scaleY(0.5); } }
        @keyframes dep-wave-2 { from { transform: scaleY(0.3); } to { transform: scaleY(0.95); } }
        @keyframes dep-wave-3 { from { transform: scaleY(0.5); } to { transform: scaleY(0.8); } }
      `}</style>
    </div>
  )
}

/* ─────────── Typing dots arc-en-ciel ─────────── */
/* "Parlez<DepTypingDots /> C'est facturé" — montre que ça écoute en live,
   3 dots rebondissants en cascade, couleurs wire-* (rouge / jaune / bleu / vert).
   À utiliser à côté du verbe "Parlez" partout sur le site. */
export function DepTypingDots({
  size = 12,
  inline = true,
}: {
  size?: number
  inline?: boolean
}) {
  const dots = [
    { color: "var(--wire-red)",    delay: "0s" },
    { color: "var(--dep-yellow)",  delay: "0.16s" },
    { color: "var(--wire-blue)",   delay: "0.32s" },
    { color: "var(--wire-green)",  delay: "0.48s" },
  ]
  return (
    <span
      aria-label="indicateur de dictée en cours"
      style={{
        display: inline ? "inline-flex" : "flex",
        alignItems: "baseline",
        gap: size * 0.35,
        marginLeft: size * 0.3,
        marginRight: size * 0.3,
        verticalAlign: "baseline",
      }}
    >
      {dots.map((d, i) => (
        <span
          key={i}
          style={{
            width: size,
            height: size,
            borderRadius: "50%",
            background: d.color,
            display: "inline-block",
            animation: `dep-typing-bounce 1.1s ease-in-out ${d.delay} infinite`,
            boxShadow: `0 0 ${size * 0.6}px ${d.color}`,
          }}
        />
      ))}
    </span>
  )
}

/* ─────────── Impact words ───────────
   Colorise les mots-clés selon leur charge émotionnelle pour rendre
   la lecture instinctive. 5 catégories : gain / pain / action / proof / trust. */
type ImpactTone = "gain" | "pain" | "action" | "proof" | "trust"
export function DepImpact({
  tone,
  children,
  underline = false,
}: {
  tone: ImpactTone
  children: ReactNode
  underline?: boolean
}) {
  const styles: Record<ImpactTone, React.CSSProperties> = {
    gain:   { color: "var(--wire-green)", fontWeight: 700 },
    pain:   { color: "var(--wire-red)",   fontWeight: 600 },
    action: { color: "var(--dep-yellow)", fontWeight: 700, fontStyle: "italic" },
    proof:  { color: "var(--dep-yellow)", fontFamily: "var(--font-mono)", fontWeight: 600, letterSpacing: "-0.02em" },
    trust:  { color: "var(--wire-blue)",  fontWeight: 600 },
  }
  return (
    <span
      className={`dep-impact dep-impact--${tone}`}
      style={{
        ...styles[tone],
        textDecoration: underline ? "underline" : "none",
        textDecorationThickness: "2px",
        textUnderlineOffset: "0.18em",
        textDecorationColor: "currentColor",
      }}
    >
      {children}
    </span>
  )
}

/* ─────────── Eyebrow with cable ─────────── */
export function DepEyebrow({
  children,
  onDark = false,
}: {
  children: ReactNode
  onDark?: boolean
}) {
  return (
    <span
      className="dep-eyebrow inline-flex items-center gap-2"
      style={{ color: onDark ? "var(--dep-grey-3)" : "var(--dep-grey-2)" }}
    >
      <span className="dep-cable" />
      {children}
    </span>
  )
}
