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
  Sparkles,
  Heart,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { HeroMic } from "@/components/marketing/hero-mic"
import { VoiceFlow } from "@/components/marketing/voice-flow"
import { FeatureCard } from "@/components/marketing/feature-card"
import { PricingCard } from "@/components/marketing/pricing-card"
import { MarqueeTrust } from "@/components/marketing/marquee-trust"
import { SiteNav, SiteFooter } from "@/components/marketing/site-nav"
import { CostOfOps } from "@/components/marketing/cost-of-ops"
import { Vignettes } from "@/components/marketing/vignettes"
import { EmployeeSection } from "@/components/marketing/employee-section"
import { MultilingualSection } from "@/components/marketing/multilingual-section"

export default function Home() {
  return (
    <>
      <SiteNav />

      {/* ===== HERO ===== */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-grid opacity-50" />
        <div className="relative mx-auto max-w-6xl px-4 sm:px-6 pt-20 sm:pt-28 pb-24 text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-electric/30 bg-electric/10 px-3.5 py-1.5 text-[13px] font-medium text-electric">
            <span className="h-1.5 w-1.5 rounded-full bg-electric pulse-electric" />
            Pensé pour les chefs d&apos;entreprise, pas pour les développeurs
          </span>

          <h1 className="mx-auto mt-7 max-w-4xl font-display text-5xl sm:text-7xl md:text-[96px] font-extrabold leading-[0.9] tracking-tight">
            Parlez.{" "}
            <br className="hidden md:block" />
            <span className="bg-gradient-to-br from-electric via-electric-soft to-electric-deep bg-clip-text text-transparent">
              C&apos;est facturé.
            </span>
          </h1>

          <p className="mx-auto mt-7 max-w-2xl text-lg sm:text-xl text-foreground/85 leading-relaxed">
            Rentrez avant la nuit. Profitez des vôtres.{" "}
            <strong className="text-electric">1 journée par semaine récupérée.</strong>
            <br className="hidden sm:block" />
            DEP fait vos devis, traduit vos employés, relance vos clients.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button asChild variant="primary" size="lg" className="text-base">
              <Link href="/inscription" className="inline-flex items-center gap-2">
                Récupérer mes weekends — 14 jours offerts
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="ghost" size="lg" className="text-base">
              <Link href="#flow">Voir en 30 secondes</Link>
            </Button>
          </div>
          <p className="mt-4 text-sm text-muted-2">
            Aucune carte bancaire pour démarrer · Annulation en 1 clic · Garantie 30 jours
          </p>

          <div className="mt-16">
            <HeroMic />
          </div>
        </div>
      </section>

      {/* ===== MARQUEE ===== */}
      <MarqueeTrust />

      {/* ===== VOICE FLOW (the 4 steps with big arrows) ===== */}
      <section id="flow" className="mx-auto max-w-6xl px-4 sm:px-6 py-24">
        <div className="mx-auto max-w-3xl text-center mb-14">
          <span className="text-[13px] font-semibold uppercase tracking-[0.22em] text-electric">
            Du chantier au virement
          </span>
          <h2 className="mt-4 font-display text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight leading-[0.95]">
            En 4 mouvements.
          </h2>
          <p className="mt-5 text-base sm:text-lg text-muted">
            Vous parlez. DEP fait le reste, dans l&apos;ordre, sans rien oublier.
          </p>
        </div>
        <VoiceFlow />
        <div className="mt-10 mx-auto max-w-2xl text-center text-base text-muted leading-relaxed">
          <Sparkles className="inline h-4 w-4 text-electric mr-1.5 align-middle" />
          Au moindre doute, DEP vous récite ce qu&apos;il a compris avant de bouger.{" "}
          <strong className="text-foreground/90">Un mot suffit pour valider.</strong>{" "}
          Plus jamais de devis à réécrire.
        </div>
      </section>

      {/* ===== MULTILINGUAL — THE BIG DIFFERENTIATOR ===== */}
      <section className="relative border-y border-border bg-surface/40">
        <div className="absolute inset-0 bg-grid opacity-30" />
        <div className="relative mx-auto max-w-6xl px-4 sm:px-6 py-24 sm:py-28">
          <div className="mx-auto max-w-3xl text-center mb-14">
            <span className="inline-flex items-center gap-2 rounded-full border border-electric/30 bg-electric/10 px-3.5 py-1.5 text-[13px] font-semibold uppercase tracking-[0.18em] text-electric">
              <Languages className="h-3.5 w-3.5" />
              La fonctionnalité que personne d&apos;autre n&apos;a
            </span>
            <h2 className="mt-5 font-display text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight leading-[0.95]">
              Votre Algérien, votre Sénégalais, votre Portugais.{" "}
              <span className="bg-gradient-to-br from-electric to-electric-deep bg-clip-text text-transparent">
                Enfin compris.
              </span>
            </h2>
            <p className="mt-6 text-base sm:text-lg text-foreground/85 leading-relaxed">
              Vos meilleurs employés ne parlent pas tous français. Vous le savez. Eux aussi. Et tous les jours,
              les <em>« j&apos;ai pas compris ce qu&apos;il voulait dire »</em> vous coûtent du temps, de l&apos;argent,
              et des tensions. DEP traduit dans les deux sens, en direct.
            </p>
          </div>

          <MultilingualSection />

          <div className="mt-12 mx-auto max-w-3xl text-center">
            <p className="text-base sm:text-lg text-foreground/90 leading-relaxed">
              Quand vous créez un devis, DEP demande la langue maternelle de votre employé.{" "}
              <strong className="text-electric">Une fois.</strong> Ensuite, tout circule traduit, automatiquement,
              dans toute l&apos;application. Vos employés se sentent compris. Vous arrêtez de répéter.
            </p>
          </div>
        </div>
      </section>

      {/* ===== COST OF OPS — the math ===== */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6 py-24">
        <div className="mx-auto max-w-3xl text-center mb-12">
          <span className="text-[13px] font-semibold uppercase tracking-[0.22em] text-electric">
            Le vrai prix de votre Excel
          </span>
          <h2 className="mt-4 font-display text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight leading-[0.95]">
            Une heure par jour, ce n&apos;est pas une heure.{" "}
            <span className="bg-gradient-to-br from-electric to-electric-deep bg-clip-text text-transparent">
              C&apos;est ça :
            </span>
          </h2>
        </div>

        <CostOfOps />

        <div className="mt-14 mx-auto max-w-3xl text-center">
          <p className="text-lg sm:text-xl text-foreground/95 leading-relaxed">
            DEP coûte <strong className="text-electric">100 € par mois</strong>.<br />
            Vous récupérez <strong className="text-electric">29 120 € de marge</strong>, vos weekends,
            et le silence dans la chambre.
          </p>
          <p className="mt-3 text-sm text-muted-2">ROI ×24. Et c&apos;est l&apos;estimation la plus prudente.</p>
        </div>
      </section>

      {/* ===== VIGNETTES (pain) ===== */}
      <section className="border-t border-border bg-surface/30">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-24">
          <div className="mx-auto max-w-3xl text-center mb-14">
            <span className="text-[13px] font-semibold uppercase tracking-[0.22em] text-electric">
              Vous vous reconnaissez ?
            </span>
            <h2 className="mt-4 font-display text-4xl sm:text-5xl font-bold tracking-tight leading-[0.95]">
              Trois moments. Vous en avez vécu au moins deux.
            </h2>
          </div>
          <Vignettes />
        </div>
      </section>

      {/* ===== FEATURES ===== */}
      <section id="fonctionnalites" className="mx-auto max-w-6xl px-4 sm:px-6 py-24">
        <div className="text-center max-w-3xl mx-auto mb-14">
          <span className="text-[13px] font-semibold uppercase tracking-[0.22em] text-electric">
            Pensé pour le terrain
          </span>
          <h2 className="mt-4 font-display text-4xl sm:text-5xl font-bold tracking-tight leading-[0.95]">
            Le moins de boutons.{" "}
            <span className="text-electric">Le plus de résultat.</span>
          </h2>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <FeatureCard
            icon={<Languages className="h-6 w-6" strokeWidth={1.8} />}
            title="Traduction bilatérale en temps réel"
            description="Arabe, portugais, wolof, bambara, turc, roumain, polonais… DEP traduit vos employés vers vous, et vous vers eux. Une seule conversation, deux fenêtres."
            color="var(--electric)"
            delay={0.05}
          />
          <FeatureCard
            icon={<Mic2 className="h-6 w-6" strokeWidth={1.8} />}
            title="Vocal universel"
            description="Sur le chantier, en voiture, dans le bruit. DEP transcrit même quand ça parle vite et mal."
            color="var(--wire-red)"
            delay={0.1}
          />
          <FeatureCard
            icon={<Wand2 className="h-6 w-6" strokeWidth={1.8} />}
            title="Clarification avant action"
            description="Avant de monter le devis, DEP vous récite ce qu'il a compris. Vous validez d'un mot. Plus jamais de réécriture."
            color="var(--wire-yellow)"
            delay={0.15}
          />
          <FeatureCard
            icon={<BrainCircuit className="h-6 w-6" strokeWidth={1.8} />}
            title="Mémoire de vos articles"
            description="Vous saisissez un prix une fois. Au prochain devis, il ressort tout seul. Le 50e devis prend 30 secondes."
            color="var(--wire-green)"
            delay={0.2}
          />
          <FeatureCard
            icon={<FileSignature className="h-6 w-6" strokeWidth={1.8} />}
            title="Signature en ligne"
            description="Le client signe sur son téléphone, où qu'il soit. Le devis bascule en facture toute seule."
            color="var(--wire-blue)"
            delay={0.25}
          />
          <FeatureCard
            icon={<Bell className="h-6 w-6" strokeWidth={1.8} />}
            title="Relances qui marchent"
            description="Hebdo amicale, puis quotidienne, puis ferme. Vos clients règlent. Vous ne dites jamais le mot « impayé »."
            color="var(--wire-red)"
            delay={0.3}
          />
          <FeatureCard
            icon={<Users className="h-6 w-6" strokeWidth={1.8} />}
            title="Mode patron / employé"
            description="Vos employés font les devis. Ils ne voient ni ne modifient les prix. Vous gardez le contrôle."
            color="var(--wire-blue)"
            delay={0.35}
          />
          <FeatureCard
            icon={<ShieldCheck className="h-6 w-6" strokeWidth={1.8} />}
            title="Traçabilité totale"
            description="Chaque devis, chaque modif, chaque envoi : journal complet. Plus de « je sais plus qui a fait quoi »."
            color="var(--wire-green)"
            delay={0.4}
          />
        </div>
      </section>

      {/* ===== EMPLOYEE / SLAVE ===== */}
      <section className="border-t border-border bg-surface/30">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-24">
          <div className="mx-auto max-w-3xl text-center mb-14">
            <span className="text-[13px] font-semibold uppercase tracking-[0.22em] text-electric">
              Vos employés vont l&apos;aimer aussi
            </span>
            <h2 className="mt-4 font-display text-4xl sm:text-5xl font-bold tracking-tight leading-[0.95]">
              Une IA qui ne <span className="text-electric">leur prend pas la tête</span>.
            </h2>
            <p className="mt-5 text-base sm:text-lg text-muted">
              Pas de question idiote, pas de menu caché. Ils parlent, ça passe. Vous gardez la main.
            </p>
          </div>
          <EmployeeSection />
        </div>
      </section>

      {/* ===== FAMILY TIME CALLOUT ===== */}
      <section className="mx-auto max-w-5xl px-4 sm:px-6 py-24 text-center">
        <Heart className="mx-auto h-7 w-7 text-electric" strokeWidth={1.6} />
        <h2 className="mt-5 font-display text-3xl sm:text-5xl font-bold tracking-tight leading-[0.95]">
          Le vrai objectif de DEP, c&apos;est <span className="text-electric">votre dimanche</span>.
        </h2>
        <p className="mt-6 mx-auto max-w-2xl text-base sm:text-lg text-foreground/85 leading-relaxed">
          On ne vous vend pas un logiciel. On vous rachète vos heures perdues. Pour les rendre à votre femme,
          à vos enfants, à votre dos qui fatigue, à votre tête qui mérite du calme. Le reste, ce sont des détails.
        </p>
      </section>

      {/* ===== PRICING ===== */}
      <section id="tarifs" className="border-t border-border bg-surface/30">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-24">
          <div className="text-center mb-14">
            <span className="text-[13px] font-semibold uppercase tracking-[0.22em] text-electric">
              Un seul tarif. Tout dedans.
            </span>
            <h2 className="mt-4 font-display text-4xl sm:text-5xl font-bold tracking-tight leading-[0.95]">
              100 € / mois. <span className="text-electric">14 jours offerts.</span>
            </h2>
            <p className="mt-5 mx-auto max-w-2xl text-base sm:text-lg text-muted">
              Vous économisez une journée par semaine. À votre taux horaire, DEP s&apos;auto-finance
              en moins de 90 minutes.
            </p>
          </div>
          <PricingCard />
        </div>
      </section>

      {/* ===== FINAL CTA ===== */}
      <section className="relative">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 py-28 text-center">
          <div className="glass rounded-3xl border border-electric/30 p-10 sm:p-16 glow-electric">
            <h2 className="font-display text-4xl sm:text-6xl font-bold tracking-tight leading-[0.95]">
              Demain matin,{" "}
              <span className="wire-underline bg-clip-text text-transparent">
                votre premier devis en 2 minutes.
              </span>
            </h2>
            <p className="mt-6 mx-auto max-w-xl text-base sm:text-lg text-muted">
              Essayez DEP 14 jours gratuitement. Si on ne vous fait pas gagner 5 heures dès la 1ère
              semaine, on vous rembourse.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Button asChild variant="primary" size="lg" className="text-base">
                <Link href="/inscription" className="inline-flex items-center gap-2">
                  Démarrer maintenant
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="ghost" size="lg" className="text-base">
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
