import Link from "next/link"
import { DepLogo } from "@/components/brand/dep-logo"
import { Button } from "@/components/ui/button"

export function SiteNav() {
  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/70 backdrop-blur-xl">
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <DepLogo size={36} withWordmark />
        <ul className="hidden md:flex items-center gap-8 text-sm text-muted">
          <li><Link href="/#fonctionnement" className="hover:text-foreground transition-colors">Comment ça marche</Link></li>
          <li><Link href="/#fonctionnalites" className="hover:text-foreground transition-colors">Fonctionnalités</Link></li>
          <li><Link href="/#tarifs" className="hover:text-foreground transition-colors">Tarifs</Link></li>
        </ul>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/connexion">Se connecter</Link>
          </Button>
          <Button variant="primary" size="sm" asChild>
            <Link href="/inscription">Essayer 14 jours</Link>
          </Button>
        </div>
      </nav>
    </header>
  )
}

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-surface/50">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-12">
        <div className="grid gap-10 md:grid-cols-4">
          <div>
            <DepLogo size={32} withWordmark />
            <p className="mt-4 text-sm text-muted max-w-xs leading-relaxed">
              Le devis et la facture d&apos;électricien à la voix. Conçu en France pour les pros
              du bâtiment qui veulent gagner du temps sans bidouille.
            </p>
          </div>
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-[0.18em] text-muted mb-3">Produit</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/#fonctionnalites" className="text-foreground/80 hover:text-electric">Fonctionnalités</Link></li>
              <li><Link href="/#tarifs" className="text-foreground/80 hover:text-electric">Tarifs</Link></li>
              <li><Link href="/#fonctionnement" className="text-foreground/80 hover:text-electric">Comment ça marche</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-[0.18em] text-muted mb-3">Société</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/contact" className="text-foreground/80 hover:text-electric">Contact</Link></li>
              <li><Link href="/mentions-legales" className="text-foreground/80 hover:text-electric">Mentions légales</Link></li>
              <li><Link href="/cgv" className="text-foreground/80 hover:text-electric">CGV</Link></li>
              <li><Link href="/confidentialite" className="text-foreground/80 hover:text-electric">Confidentialité</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-[0.18em] text-muted mb-3">Compte</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/connexion" className="text-foreground/80 hover:text-electric">Se connecter</Link></li>
              <li><Link href="/inscription" className="text-foreground/80 hover:text-electric">Créer un compte</Link></li>
            </ul>
          </div>
        </div>
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-border pt-6 text-xs text-muted-2">
          <span>© {new Date().getFullYear()} DEP · Tous droits réservés.</span>
          <span className="wire-underline bg-clip-text text-transparent font-medium">Fait avec ⚡ pour les électriciens</span>
        </div>
      </div>
    </footer>
  )
}
