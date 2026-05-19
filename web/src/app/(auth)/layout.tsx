import Link from "next/link"
import { DepLogo } from "@/components/brand/dep-logo"

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Left visual */}
      <aside className="relative hidden lg:flex items-center justify-center overflow-hidden border-r border-border bg-surface/30">
        <div className="absolute inset-0 bg-grid opacity-60" />
        <div className="absolute inset-0 bg-gradient-to-br from-electric/10 via-transparent to-wire-blue/10" />
        <div className="relative z-10 max-w-md p-10">
          <DepLogo size={56} withWordmark />
          <h2 className="mt-10 font-display text-4xl font-bold leading-tight">
            Parlez. <span className="text-electric">C&apos;est facturé.</span>
          </h2>
          <p className="mt-4 text-muted">
            Vos devis et factures à la voix. Conçu pour les électriciens qui
            préfèrent leurs outils à leur clavier.
          </p>
          <ul className="mt-8 space-y-3 text-sm text-foreground/85">
            <li className="flex items-center gap-3"><span className="h-2 w-2 rounded-full bg-wire-red" /> Devis vocal multilingue, corrigé tout seul</li>
            <li className="flex items-center gap-3"><span className="h-2 w-2 rounded-full bg-wire-blue" /> Mémoire de vos prix d&apos;articles</li>
            <li className="flex items-center gap-3"><span className="h-2 w-2 rounded-full bg-wire-green" /> Relances automatiques jusqu&apos;au paiement</li>
            <li className="flex items-center gap-3"><span className="h-2 w-2 rounded-full bg-electric" /> 14 jours offerts, sans carte</li>
          </ul>
        </div>
      </aside>

      <main className="relative flex items-center justify-center p-6 pt-24 sm:p-10 sm:pt-28 lg:pt-10">
        <div className="absolute top-6 left-6 lg:hidden">
          <DepLogo size={32} />
        </div>
        <div className="w-full max-w-md">{children}</div>
        <Link
          href="/"
          className="absolute bottom-6 right-6 text-xs text-muted hover:text-foreground transition-colors"
        >
          ← retour à l&apos;accueil
        </Link>
      </main>
    </div>
  )
}
