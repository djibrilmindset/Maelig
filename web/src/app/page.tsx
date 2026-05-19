import Link from "next/link"
import {
  Mic2,
  Languages,
  FileSignature,
  Bell,
  BrainCircuit,
  Users,
  ShieldCheck,
  Wand2,
  ArrowRight,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { HeroMic } from "@/components/marketing/hero-mic"
import { VoicePill } from "@/components/marketing/voice-pill"
import { FeatureCard } from "@/components/marketing/feature-card"
import { PricingCard } from "@/components/marketing/pricing-card"
import { MarqueeTrust } from "@/components/marketing/marquee-trust"
import { SiteNav, SiteFooter } from "@/components/marketing/site-nav"

export default function Home() {
  return (
    <>
      <SiteNav />

      {/* ===== HERO ===== */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-grid opacity-60" />
        <div className="relative mx-auto max-w-6xl px-4 sm:px-6 pt-16 sm:pt-24 pb-20 text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-electric/30 bg-electric/10 px-3 py-1 text-xs font-medium text-electric">
            <span className="h-1.5 w-1.5 rounded-full bg-electric pulse-electric" />
            Nouveau · Devis à la voix pour électriciens
          </span>

          <h1 className="mx-auto mt-6 max-w-3xl font-display text-5xl sm:text-7xl font-extrabold leading-[0.95] tracking-tight">
            Parlez.
            <br className="hidden sm:block" />
            <span className="bg-gradient-to-br from-electric via-electric-soft to-electric-deep bg-clip-text text-transparent">
              C&apos;est facturé.
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-base sm:text-lg text-muted leading-relaxed">
            DEP est la première plateforme qui transforme votre vocal de chantier en
            <strong className="text-foreground"> devis prêt à signer </strong>
            en moins de 2 minutes. Pas de clavier, pas de menus, pas de prise de tête.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button asChild variant="primary" size="lg">
              <Link href="/inscription" className="inline-flex items-center gap-2">
                Démarrer mes 14 jours gratuits
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="ghost" size="lg">
              <Link href="#fonctionnement">Voir comment ça marche</Link>
            </Button>
          </div>
          <p className="mt-3 text-xs text-muted-2">
            Aucune carte bancaire requise · Annulation en 1 clic
          </p>

          <div className="mt-14">
            <HeroMic />
          </div>

          <div className="mt-12">
            <VoicePill />
          </div>
        </div>
      </section>

      {/* Marquee */}
      <MarqueeTrust />

      {/* ===== PAIN ===== */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6 py-20">
        <div className="mx-auto max-w-3xl text-center">
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-electric">
            Vous reconnaissez ça ?
          </span>
          <h2 className="mt-4 font-display text-3xl sm:text-5xl font-bold tracking-tight">
            1h de devis par jour.<br />Une facture oubliée par mois.
          </h2>
          <p className="mt-4 text-muted">
            Vous êtes patron, pas comptable. Et pourtant chaque soir vous y passez. DEP rend
            ces heures perdues à votre famille — sans changer vos habitudes.
          </p>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-3">
          <div className="glass rounded-[var(--radius-lg)] border border-border p-6">
            <span className="font-display text-5xl font-extrabold text-electric">1h</span>
            <p className="mt-3 text-sm text-muted">par devis tapé à la main, le soir, sur Excel.</p>
          </div>
          <div className="glass rounded-[var(--radius-lg)] border border-border p-6">
            <span className="font-display text-5xl font-extrabold text-electric">38%</span>
            <p className="mt-3 text-sm text-muted">des factures impayées des artisans : oubli de relance.</p>
          </div>
          <div className="glass rounded-[var(--radius-lg)] border border-border p-6">
            <span className="font-display text-5xl font-extrabold text-electric">0</span>
            <p className="mt-3 text-sm text-muted">bouton compliqué chez DEP. Un vocal, un devis.</p>
          </div>
        </div>
      </section>

      {/* ===== HOW IT WORKS ===== */}
      <section id="fonctionnement" className="relative mx-auto max-w-6xl px-4 sm:px-6 py-20">
        <div className="text-center">
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-electric">
            En 3 étapes
          </span>
          <h2 className="mt-4 font-display text-3xl sm:text-5xl font-bold tracking-tight">
            Comment ça marche
          </h2>
        </div>

        <ol className="mt-14 grid gap-8 md:grid-cols-3">
          {[
            {
              n: "01",
              title: "Vous décrivez le chantier",
              body:
                "Vous parlez, dans la langue que vous voulez. DEP transcrit, traduit en français, et corrige automatiquement les fautes.",
              color: "var(--wire-red)",
            },
            {
              n: "02",
              title: "Le devis se construit tout seul",
              body:
                "DEP reconnaît les articles, recharge les prix mémorisés, calcule la main-d'œuvre et applique votre taux de TVA. Vous validez.",
              color: "var(--wire-blue)",
            },
            {
              n: "03",
              title: "Signé. Envoyé. Relancé.",
              body:
                "Le client signe en ligne, le PDF part par mail. Les relances partent toutes seules : 1× / semaine, puis 1× / jour après 30 jours.",
              color: "var(--wire-green)",
            },
          ].map((step) => (
            <li
              key={step.n}
              className="glass relative rounded-[var(--radius-lg)] border border-border p-6"
            >
              <span
                className="font-display absolute -top-6 left-6 text-7xl font-extrabold opacity-30"
                style={{ color: step.color }}
              >
                {step.n}
              </span>
              <h3 className="font-display text-xl font-semibold mt-6">{step.title}</h3>
              <p className="mt-2 text-sm text-muted leading-relaxed">{step.body}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* ===== FEATURES ===== */}
      <section id="fonctionnalites" className="mx-auto max-w-6xl px-4 sm:px-6 py-20">
        <div className="text-center">
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-electric">
            Pensé pour le terrain
          </span>
          <h2 className="mt-4 font-display text-3xl sm:text-5xl font-bold tracking-tight">
            Le moins de boutons.<br />Le plus de résultats.
          </h2>
        </div>

        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <FeatureCard
            icon={<Mic2 className="h-6 w-6" strokeWidth={1.8} />}
            title="Vocal universel"
            description="Enregistrez sur le chantier. DEP transcrit même quand ça parle vite, mal, ou en plusieurs langues."
            color="var(--wire-red)"
            delay={0.05}
          />
          <FeatureCard
            icon={<Languages className="h-6 w-6" strokeWidth={1.8} />}
            title="Traduction automatique"
            description="Vos collaborateurs parlent arabe, anglais, créole ? DEP traduit en français propre, prêt à envoyer au client."
            color="var(--wire-blue)"
            delay={0.1}
          />
          <FeatureCard
            icon={<Wand2 className="h-6 w-6" strokeWidth={1.8} />}
            title="Correction d'orthographe"
            description="Toutes les fautes s'effacent toutes seules. Vous voyez la version corrigée s'animer avant l'envoi."
            color="var(--wire-yellow)"
            delay={0.15}
          />
          <FeatureCard
            icon={<BrainCircuit className="h-6 w-6" strokeWidth={1.8} />}
            title="Mémoire des articles"
            description="Vous saisissez un prix une fois. Au prochain devis, DEP le ressort instantanément. Plus vous l'utilisez, plus c'est rapide."
            color="var(--wire-green)"
            delay={0.2}
          />
          <FeatureCard
            icon={<FileSignature className="h-6 w-6" strokeWidth={1.8} />}
            title="Signature électronique"
            description="Le client signe sur son téléphone. Le devis passe en facture en attente. Aucune impression."
            color="var(--electric)"
            delay={0.25}
          />
          <FeatureCard
            icon={<Bell className="h-6 w-6" strokeWidth={1.8} />}
            title="Relances qui marchent"
            description="Hebdomadaire pendant 30 jours, puis quotidienne jusqu'au paiement. Templates rédigés par des pros."
            color="var(--wire-red)"
            delay={0.3}
          />
          <FeatureCard
            icon={<Users className="h-6 w-6" strokeWidth={1.8} />}
            title="Mode patron / employé"
            description="Vous gardez la main sur les prix. Vos employés font les devis sans pouvoir y toucher."
            color="var(--wire-blue)"
            delay={0.35}
          />
          <FeatureCard
            icon={<ShieldCheck className="h-6 w-6" strokeWidth={1.8} />}
            title="Données européennes"
            description="Hébergement chiffré en Europe. RGPD. Vos clients restent vos clients."
            color="var(--wire-green)"
            delay={0.4}
          />
        </div>
      </section>

      {/* ===== PRICING ===== */}
      <section id="tarifs" className="relative mx-auto max-w-6xl px-4 sm:px-6 py-20">
        <div className="text-center mb-12">
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-electric">
            Un seul tarif. Tout dedans.
          </span>
          <h2 className="mt-4 font-display text-3xl sm:text-5xl font-bold tracking-tight">
            100€ / mois. 14 jours offerts.
          </h2>
          <p className="mt-4 mx-auto max-w-2xl text-muted">
            Vous gagnez 1 devis par semaine en plus, DEP est rentabilisé. Sinon, on vous rembourse.
          </p>
        </div>
        <PricingCard />
      </section>

      {/* ===== FINAL CTA ===== */}
      <section className="relative">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 py-24 text-center">
          <div className="glass rounded-[var(--radius-xl)] border border-electric/30 p-10 sm:p-14 glow-electric">
            <h2 className="font-display text-3xl sm:text-5xl font-bold tracking-tight">
              Votre prochain devis,
              <br />
              <span className="wire-underline bg-clip-text text-transparent">en moins de 2 minutes.</span>
            </h2>
            <p className="mt-4 mx-auto max-w-xl text-muted">
              Essayez DEP gratuitement pendant 14 jours. Si on ne vous fait pas gagner 5 heures
              dès la 1ère semaine, on vous rembourse.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Button asChild variant="primary" size="lg">
                <Link href="/inscription" className="inline-flex items-center gap-2">
                  Démarrer maintenant
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="ghost" size="lg">
                <Link href="/connexion">J&apos;ai déjà un compte</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <SiteFooter />
    </>
  )
}
