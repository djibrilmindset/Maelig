import Link from "next/link"

export const metadata = { title: "Design Preview · DEP v2" }

const screens = [
  { slug: "landing", label: "01 · Landing V2", desc: "page de vente (1280×3400 scroll)" },
  { slug: "vocal", label: "02 · Vocal Devis Editor", desc: "4 étapes mobile, dictée + clarif IA" },
  { slug: "incidents", label: "03 · Incidents Mobile", desc: "3 gros boutons + thread bilatéral" },
  { slug: "dashboard", label: "04 · Dashboard Control Tower", desc: "Là maintenant + KPIs + flux" },
  { slug: "chat", label: "05 · Chat Bilatéral Traduit", desc: "patron ↔ employé 20 langues" },
]

export default function DesignPreviewIndex() {
  return (
    <main style={{ minHeight: "100vh", background: "var(--dep-paper)", color: "var(--dep-black)", padding: 64, fontFamily: "var(--font-bricolage)" }}>
      <div style={{ maxWidth: 880, margin: "0 auto" }}>
        <span className="dep-eyebrow">DEP · Design v2 handoff Claude.ai Design 2026-05-19</span>
        <h1 style={{ fontSize: "clamp(40px, 6vw, 72px)", marginTop: 16, lineHeight: 1.04 }}>
          5 écrans prototype, branchés sur la prod.
        </h1>
        <p style={{ marginTop: 16, fontSize: 18, color: "var(--dep-grey-1)", maxWidth: 640 }}>
          Port mécanique JSX → TSX depuis <code className="mono">~/Maelig/design_handoff_dep/prototype/screens/</code>.
          Tokens DEP v2 actifs (jaune #F5C518, Bricolage Grotesque, IBM Plex Mono). Logo officiel Maelig.
        </p>

        <div style={{ marginTop: 48, display: "grid", gap: 16 }}>
          {screens.map((s) => (
            <Link
              key={s.slug}
              href={`/design-preview/${s.slug}`}
              className="dep-card"
              style={{
                display: "flex", flexDirection: "column", gap: 6,
                padding: 24, borderRadius: 20,
                border: "1px solid var(--dep-line-light)",
                background: "var(--dep-white)",
                textDecoration: "none", color: "inherit",
                transition: "transform .2s, box-shadow .2s",
              }}
            >
              <span style={{ fontWeight: 700, fontSize: 22 }}>{s.label}</span>
              <span style={{ color: "var(--dep-grey-2)" }}>{s.desc}</span>
            </Link>
          ))}
        </div>

        <p style={{ marginTop: 64, fontSize: 13, color: "var(--dep-grey-2)" }}>
          Phase 2 du rebuild. Une fois validés visuellement, ces écrans remplaceront les routes prod
          (page.tsx, devis/nouveau, incidents/nouveau, app, /chat).
        </p>
      </div>
    </main>
  )
}
