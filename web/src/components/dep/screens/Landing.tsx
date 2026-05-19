"use client"
// @ts-nocheck — design v2 prototype port, types ajoutés progressivement

import { useState as useLState, useEffect as useLEffect, useRef as useLRef } from "react"
import Image from "next/image"
import { DepMagnetic, DepReveal, DepIcon } from "../primitives"
/* DEP — Landing V2 artboard.
   Full-bleed landing page rendered inside the canvas artboard.
   Dimensions: 1280 × 3400. Scrolls naturally inside the focus overlay. */

const LANGUAGES = [
  { code: 'ar-MA',  name: 'العربية الدارجة', dir: 'rtl' },
  { code: 'pt-PT',  name: 'Português',        dir: 'ltr' },
  { code: 'pl',     name: 'Polski',           dir: 'ltr' },
  { code: 'ro',     name: 'Română',           dir: 'ltr' },
  { code: 'tr',     name: 'Türkçe',           dir: 'ltr' },
  { code: 'wo',     name: 'Wolof',            dir: 'ltr' },
  { code: 'bm',     name: 'Bamanankan',       dir: 'ltr' },
  { code: 'kab',    name: 'Taqbaylit',        dir: 'ltr' },
  { code: 'fa',     name: 'فارسی',            dir: 'rtl' },
  { code: 'ur',     name: 'اُردُو',           dir: 'rtl' },
  { code: 'hi',     name: 'हिन्दी',           dir: 'ltr' },
  { code: 'bn',     name: 'বাংলা',            dir: 'ltr' },
  { code: 'en',     name: 'English',          dir: 'ltr' },
  { code: 'es',     name: 'Español',          dir: 'ltr' },
  { code: 'it',     name: 'Italiano',         dir: 'ltr' },
  { code: 'zh',     name: '中文',              dir: 'ltr' },
  { code: 'vi',     name: 'Tiếng Việt',       dir: 'ltr' },
  { code: 'ta',     name: 'தமிழ்',            dir: 'ltr' },
  { code: 'ka',     name: 'ქართული',          dir: 'ltr' },
  { code: 'so',     name: 'Soomaali',         dir: 'ltr' },
];

function CountUp({ to, prefix = '', suffix = '', duration = 1800 }) {
  const [n, setN] = useLState(0);
  useLEffect(() => {
    let raf, start;
    const step = (t) => {
      if (!start) start = t;
      const p = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setN(Math.floor(to * eased));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [to, duration]);
  return (
    <span className="mono tnum">
      {prefix}{n.toLocaleString('fr-FR')}{suffix}
    </span>
  );
}

function LandingNav() {
  return (
    <div style={{
      position: 'absolute', top: 0, left: 0, right: 0, zIndex: 20,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '24px 48px',
    }}>
      <Image src="/dep-logo.png" alt="DEP" width={120} height={40} priority style={{ width: "auto", height: 40 }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
        <a href="#tarifs" style={{ color: 'var(--dep-grey-4)', textDecoration: 'none', fontSize: 14, fontWeight: 500 }}>Tarifs</a>
        <a href="#faq" style={{ color: 'var(--dep-grey-4)', textDecoration: 'none', fontSize: 14, fontWeight: 500 }}>FAQ chantier</a>
        <a href="#" style={{ color: 'var(--dep-grey-4)', textDecoration: 'none', fontSize: 14, fontWeight: 500 }}>Connexion</a>
        <DepMagnetic strength={0.2}>
          <a href="#tarifs" className="dep-btn dep-btn--primary dep-btn--sm" style={{ textDecoration: 'none' }}>
            Essayer 14 jours
            <DepIcon.arrow style={{ width: 14, height: 14 }} />
          </a>
        </DepMagnetic>
      </div>
    </div>
  );
}

function LandingHero() {
  return (
    <section style={{
      position: 'relative',
      padding: '160px 64px 96px',
      background: 'var(--dep-black)',
      color: 'var(--dep-paper)',
      overflow: 'hidden',
    }} className="dep-noise">
      <div className="dep-mesh" />
      {/* Cable phase decorative */}
      <svg viewBox="0 0 1280 800" style={{ position: 'absolute', top: 0, right: 0, width: '70%', height: '100%', zIndex: 1, opacity: 0.45 }} aria-hidden="true">
        <path d="M 1280 80 Q 900 120 820 280 T 600 480 T 320 700"
              stroke="var(--dep-yellow)" strokeWidth="2" fill="none" strokeDasharray="4 8" />
        <circle cx="820" cy="280" r="4" fill="var(--dep-yellow)" />
        <circle cx="600" cy="480" r="4" fill="var(--dep-yellow)" />
        <circle cx="320" cy="700" r="4" fill="var(--dep-yellow)" />
      </svg>

      <div style={{ position: 'relative', zIndex: 3, maxWidth: 1100 }}>
        <DepReveal>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 32 }}>
            <span className="dep-cable" />
            <span className="dep-eyebrow dep-eyebrow--on-dark">SaaS terrain · électricien · 2026</span>
          </div>
        </DepReveal>

        <DepReveal delay={120}>
          <h1 style={{ fontSize: 96, fontWeight: 700, letterSpacing: '-0.045em', lineHeight: 0.96, marginBottom: 32 }}>
            Parlez.<br />
            C'est <span style={{ color: 'var(--dep-yellow)', fontStyle: 'italic', fontWeight: 600 }}>facturé</span>
          </h1>
        </DepReveal>

        <DepReveal delay={240}>
          <p style={{
            fontSize: 22, lineHeight: 1.45, color: 'var(--dep-grey-4)',
            maxWidth: 720, marginBottom: 48,
          }}>
            Le SaaS qui transforme ta voix en devis, ton devis en facture, et ta facture en cash.
            En FR, et dans 20 langues de chantier
          </p>
        </DepReveal>

        <DepReveal delay={360}>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            <DepMagnetic strength={0.3}>
              <a href="#tarifs" className="dep-btn dep-btn--primary dep-btn--lg" style={{ textDecoration: 'none' }}>
                Démarrer mon essai gratuit
                <DepIcon.arrow style={{ width: 18, height: 18 }} />
              </a>
            </DepMagnetic>
            <a href="#demo" className="dep-btn dep-btn--ghost-dark dep-btn--lg" style={{ textDecoration: 'none' }}>
              <span style={{
                width: 28, height: 28, borderRadius: '50%', background: 'rgba(255,255,255,0.08)',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <svg width="10" height="11" viewBox="0 0 10 11" fill="currentColor"><path d="M0 0v11l10-5.5z"/></svg>
              </span>
              Voir la démo (2 min)
            </a>
          </div>
        </DepReveal>

        <DepReveal delay={480}>
          <div style={{
            marginTop: 80, display: 'flex', gap: 32, alignItems: 'baseline',
            paddingTop: 32, borderTop: '1px solid var(--dep-line-dark)', maxWidth: 880,
          }}>
            <div>
              <div className="mono" style={{ fontSize: 40, fontWeight: 600, letterSpacing: '-0.04em', color: 'var(--dep-yellow)' }}>
                <CountUp to={4} />
                <span style={{ color: 'var(--dep-paper)' }}> min</span>
              </div>
              <div style={{ fontSize: 13, color: 'var(--dep-grey-3)', marginTop: 4 }}>Devis envoyé depuis le chantier</div>
            </div>
            <div style={{ width: 1, alignSelf: 'stretch', background: 'var(--dep-line-dark)' }} />
            <div>
              <div className="mono" style={{ fontSize: 40, fontWeight: 600, letterSpacing: '-0.04em' }}>
                <CountUp to={29120} suffix=" €" />
              </div>
              <div style={{ fontSize: 13, color: 'var(--dep-grey-3)', marginTop: 4 }}>Récupérés par patron en moyenne par an</div>
            </div>
            <div style={{ width: 1, alignSelf: 'stretch', background: 'var(--dep-line-dark)' }} />
            <div>
              <div className="mono" style={{ fontSize: 40, fontWeight: 600, letterSpacing: '-0.04em' }}>
                <CountUp to={20} />
              </div>
              <div style={{ fontSize: 13, color: 'var(--dep-grey-3)', marginTop: 4 }}>Langues chantier supportées</div>
            </div>
          </div>
        </DepReveal>
      </div>
    </section>
  );
}

function LandingProof() {
  return (
    <section style={{
      background: 'var(--dep-yellow)', color: 'var(--dep-black)',
      padding: '28px 64px', display: 'flex', alignItems: 'center', gap: 24,
    }}>
      <DepIcon.bolt style={{ width: 22, height: 22 }} />
      <div style={{ fontSize: 17, fontWeight: 600, letterSpacing: '-0.01em', flex: 1 }}>
        Maelig + 23 électriciens FR déjà sur DEP
        <span style={{ marginLeft: 14, fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 500 }}>
          29 120 €/an récupérés en moyenne sur l'admin
        </span>
      </div>
      <span className="mono" style={{ fontSize: 12, letterSpacing: '0.16em', textTransform: 'uppercase' }}>
        Beta fermée · janvier 2026 →
      </span>
    </section>
  );
}

function LandingMultilingue() {
  // Killer feature: side-by-side translations + marquee of 20 languages.
  return (
    <section style={{
      position: 'relative', padding: '120px 64px',
      background: 'var(--dep-black)', color: 'var(--dep-paper)',
      overflow: 'hidden',
    }} className="dep-noise">
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 72, alignItems: 'center', position: 'relative', zIndex: 3 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 28 }}>
            <span className="dep-cable" />
            <span className="dep-eyebrow dep-eyebrow--on-dark">Killer feature · multilingue chantier</span>
          </div>
          <h2 style={{ fontSize: 52, fontWeight: 700, letterSpacing: '-0.035em', lineHeight: 1.03, marginBottom: 28 }}>
            Ton chef d'équipe parle <em style={{ color: 'var(--dep-yellow)', fontStyle: 'italic' }}>darija</em>.<br />
            Ton apprenti parle <em style={{ color: 'var(--dep-yellow)', fontStyle: 'italic' }}>polonais</em>.<br />
            Toi tu parles FR.<br />
            DEP fait le pont
          </h2>
          <p style={{ fontSize: 19, color: 'var(--dep-grey-4)', lineHeight: 1.55, maxWidth: 520 }}>
            Sur chantier, plus aucune consigne perdue. Plus aucun malentendu.
            Plus aucun retard pour cause de barrière de la langue
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Patron → Karim (darija) */}
          <div style={{
            display: 'flex', justifyContent: 'flex-end',
          }}>
            <div style={{
              background: 'var(--dep-yellow)', color: 'var(--dep-black)',
              padding: '14px 18px', borderRadius: '20px 20px 4px 20px',
              maxWidth: 360, fontSize: 16, fontWeight: 500,
            }}>
              Karim, range les disjoncteurs 16A au tableau de droite avant midi
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, color: 'var(--dep-grey-3)' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M7 17l10-10M17 7v6M17 7h-6"/></svg>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase' }}>
              traduit en darija · confiance haute
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
            <div style={{
              background: 'var(--dep-black-2)', color: 'var(--dep-paper)',
              border: '1px solid var(--dep-line-dark)',
              padding: '14px 18px', borderRadius: '20px 20px 20px 4px',
              maxWidth: 360, fontSize: 17, direction: 'rtl', textAlign: 'right',
              fontWeight: 500,
            }}>
              كريم، رتّب الديجونكتورات 16 أمبير ف التابلو ديك اللي ليمين قبل نصّ النهار
            </div>
          </div>

          {/* Karim → Maelig */}
          <div style={{ display: 'flex', justifyContent: 'flex-start', marginTop: 18 }}>
            <div style={{
              background: 'var(--dep-black-2)', color: 'var(--dep-paper)',
              border: '1px solid var(--dep-line-dark)',
              padding: '14px 18px', borderRadius: '20px 20px 20px 4px',
              maxWidth: 360, fontSize: 17, direction: 'rtl', textAlign: 'right',
              fontWeight: 500,
            }}>
              صافي، خدمت. غير عندي مشكل ف برشا ديال الإيداع
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, color: 'var(--dep-grey-3)' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 7L7 17M7 17v-6M7 17h6"/></svg>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase' }}>
              traduit en FR · confiance haute
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <div style={{
              background: 'var(--dep-paper)', color: 'var(--dep-black)',
              padding: '14px 18px', borderRadius: '20px 20px 4px 20px',
              maxWidth: 360, fontSize: 16, fontWeight: 500,
            }}>
              C'est bon, c'est fait. J'ai juste un souci avec un des supports
            </div>
          </div>
        </div>
      </div>

      {/* Marquee 20 langues */}
      <div style={{ marginTop: 96, paddingTop: 40, borderTop: '1px solid var(--dep-line-dark)', position: 'relative', zIndex: 3 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 24, padding: '0 4px' }}>
          <span className="dep-eyebrow dep-eyebrow--on-dark">20 langues, écriture native, RTL inclus</span>
          <span className="mono" style={{ fontSize: 13, color: 'var(--dep-grey-3)' }}>· paraformer-v2 · qwen-plus · cache 30j</span>
        </div>
        <div style={{ overflow: 'hidden', maskImage: 'linear-gradient(90deg, transparent, black 8%, black 92%, transparent)' }}>
          <div className="dep-marquee">
            {[...LANGUAGES, ...LANGUAGES].map((lang, i) => (
              <span key={i} style={{
                display: 'inline-flex', alignItems: 'center', gap: 12,
                padding: '12px 28px', marginRight: 16,
                border: '1px solid var(--dep-line-dark)',
                borderRadius: 999, color: 'var(--dep-paper)',
                fontSize: 24, fontWeight: 500, letterSpacing: '-0.01em',
                direction: lang.dir, flexShrink: 0,
                background: 'rgba(255,255,255,0.02)',
              }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--dep-yellow)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>{lang.code}</span>
                {lang.name}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function LandingMath() {
  return (
    <section style={{
      background: 'var(--dep-paper)', padding: '120px 64px',
      position: 'relative', overflow: 'hidden',
    }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: 80, alignItems: 'center' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 24 }}>
            <span className="dep-cable" />
            <span className="dep-eyebrow">Le calcul — pas marketing, juste les chiffres</span>
          </div>
          <h2 style={{ fontSize: 52, fontWeight: 700, letterSpacing: '-0.035em', lineHeight: 1.05, marginBottom: 24 }}>
            <span className="mono tnum" style={{ background: 'var(--dep-yellow)', padding: '0 12px', borderRadius: 8, fontWeight: 700 }}>29 120 €</span> récupérés
            <br />par an, par patron
          </h2>
          <p style={{ fontSize: 19, color: 'var(--dep-grey-1)', lineHeight: 1.6, maxWidth: 520, marginBottom: 32 }}>
            Tu passes 8h par semaine sur l'admin. Devis, factures, relances, planning équipe. À 70 €/h facturable, tu perds 560 € chaque semaine. Multiplié par 52 semaines, ça fait 29 120 € qui sortent de ta poche.
          </p>
          <p style={{ fontSize: 17, color: 'var(--dep-black)', fontWeight: 600 }}>
            DEP récupère cette somme. Tu rentres chez toi à 18h
          </p>
        </div>

        <div style={{
          background: 'var(--dep-white)', borderRadius: 24,
          border: '1px solid var(--dep-line-light)',
          padding: '36px 40px',
          boxShadow: '0 30px 60px -30px rgba(0,0,0,0.16)',
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18, fontFamily: 'var(--font-mono)', fontSize: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <span style={{ color: 'var(--dep-grey-1)' }}>Admin par semaine</span>
              <span className="tnum" style={{ fontSize: 22, fontWeight: 600 }}>8 h</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <span style={{ color: 'var(--dep-grey-1)' }}>Tarif horaire facturable</span>
              <span className="tnum" style={{ fontSize: 22, fontWeight: 600 }}>70 €</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <span style={{ color: 'var(--dep-grey-1)' }}>Semaines de travail</span>
              <span className="tnum" style={{ fontSize: 22, fontWeight: 600 }}>52</span>
            </div>
            <div style={{ height: 1, background: 'var(--dep-line-light)', margin: '4px 0' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <span style={{ color: 'var(--dep-black)', fontWeight: 600 }}>Coût annuel admin</span>
              <span className="tnum" style={{ fontSize: 28, fontWeight: 700, color: 'var(--dep-red)' }}>−29 120 €</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', background: 'var(--dep-yellow-soft)', padding: '14px 16px', borderRadius: 12, marginTop: 6 }}>
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 17 }}>Avec DEP, tu récupères</span>
              <span className="tnum" style={{ fontSize: 28, fontWeight: 700 }}>+29 120 €</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function LandingParcours() {
  const steps = [
    { n: '01', icon: 'mic', title: 'Vocal', body: 'Sur chantier, tu dictes ton devis à l\'app. Pas de clavier, pas de stylo, pas de retour bureau' },
    { n: '02', icon: 'bolt', title: 'Clarif IA', body: 'L\'IA structure ce que t\'as dit en lignes de devis. Quantités, prix, main d\'œuvre, tout est extrait' },
    { n: '03', icon: 'euro', title: 'Devis', body: 'Tu relis 30 secondes, tu signes du doigt, le devis part au client par email. Tracé Factur-X 2026' },
    { n: '04', icon: 'send', title: 'Facture', body: 'Le client accepte, la facture se génère seule. Relance auto à J+30 si pas payé' },
  ];
  return (
    <section style={{
      background: 'var(--dep-paper-2)', padding: '120px 64px',
    }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 24 }}>
          <span className="dep-cable" />
          <span className="dep-eyebrow">Parcours · 4 étapes · 4 minutes</span>
        </div>
        <h2 style={{ fontSize: 56, fontWeight: 700, letterSpacing: '-0.035em', lineHeight: 1.04, marginBottom: 64, maxWidth: 800 }}>
          De ta voix au cash, sans repasser au bureau
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 24 }}>
          {steps.map((s, i) => {
            const Icon = DepIcon[s.icon];
            return (
              <div key={s.n} style={{
                background: 'var(--dep-white)', borderRadius: 20,
                border: '1px solid var(--dep-line-light)',
                padding: 28, position: 'relative',
                minHeight: 280, display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
              }}>
                <div className="mono" style={{ fontSize: 13, color: 'var(--dep-grey-2)', letterSpacing: '0.1em' }}>{s.n}</div>
                <div style={{
                  width: 56, height: 56, borderRadius: 14,
                  background: 'var(--dep-black)', color: 'var(--dep-yellow)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '24px 0 20px',
                }}>
                  <Icon style={{ width: 26, height: 26 }} />
                </div>
                <div style={{ flex: 1 }}>
                  <h3 style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.03em', marginBottom: 10 }}>{s.title}</h3>
                  <p style={{ fontSize: 14, color: 'var(--dep-grey-1)', lineHeight: 1.5 }}>{s.body}</p>
                </div>
                {i < 3 && (
                  <DepIcon.arrow style={{
                    width: 24, height: 24, position: 'absolute', top: 28, right: 24,
                    color: 'var(--dep-yellow)',
                  }} />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function LandingVignettes() {
  const v = [
    { before: 'Samedi soir au bureau à rattraper les devis', after: 'Samedi soir avec les enfants au parc' },
    { before: 'Client qui s\'impatiente trois semaines sans devis', after: 'Devis envoyé en 4 minutes depuis le chantier' },
    { before: 'Équipe perdue, consignes en FR qu\'ils captent pas', after: 'Équipe alignée, chacun lit dans sa langue' },
  ];
  return (
    <section style={{ background: 'var(--dep-paper)', padding: '120px 64px' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 24 }}>
          <span className="dep-cable" />
          <span className="dep-eyebrow">Avant DEP · Avec DEP</span>
        </div>
        <h2 style={{ fontSize: 56, fontWeight: 700, letterSpacing: '-0.035em', lineHeight: 1.04, marginBottom: 56, maxWidth: 880 }}>
          Ce qui change vraiment, c'est pas la facturation. C'est ta vie
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}>
          {v.map((x, i) => (
            <div key={i} style={{
              background: 'var(--dep-white)', borderRadius: 20,
              border: '1px solid var(--dep-line-light)', padding: 0, overflow: 'hidden',
            }}>
              <div style={{
                padding: '24px 28px', background: 'var(--dep-paper-2)',
                borderBottom: '1px solid var(--dep-line-light)',
              }}>
                <div className="mono" style={{ fontSize: 11, color: 'var(--dep-grey-2)', letterSpacing: '0.16em', textTransform: 'uppercase', marginBottom: 8 }}>Avant DEP</div>
                <div style={{ fontSize: 17, color: 'var(--dep-grey-1)', textDecoration: 'line-through', textDecorationColor: 'rgba(0,0,0,0.2)', lineHeight: 1.45 }}>
                  {x.before}
                </div>
              </div>
              <div style={{ padding: '24px 28px' }}>
                <div className="mono" style={{ fontSize: 11, color: 'var(--dep-black)', letterSpacing: '0.16em', textTransform: 'uppercase', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span className="dep-cable" style={{ width: 16 }} />
                  Avec DEP
                </div>
                <div style={{ fontSize: 19, color: 'var(--dep-black)', fontWeight: 600, lineHeight: 1.4, letterSpacing: '-0.01em' }}>
                  {x.after}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function LandingPricing() {
  return (
    <section id="tarifs" style={{ background: 'var(--dep-black)', color: 'var(--dep-paper)', padding: '120px 64px', position: 'relative', overflow: 'hidden' }} className="dep-noise">
      <div style={{ maxWidth: 1100, margin: '0 auto', position: 'relative', zIndex: 3 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 24 }}>
          <span className="dep-cable" />
          <span className="dep-eyebrow dep-eyebrow--on-dark">Tarification · sans CB pour démarrer</span>
        </div>
        <h2 style={{ fontSize: 64, fontWeight: 700, letterSpacing: '-0.04em', lineHeight: 1, marginBottom: 64 }}>
          Un prix.<br />Pas d'options.
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 32, alignItems: 'stretch' }}>
          <div style={{
            background: 'var(--dep-yellow)', color: 'var(--dep-black)',
            borderRadius: 24, padding: 40, position: 'relative', overflow: 'hidden',
          }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 24 }}>
              <h3 style={{ fontSize: 36, fontWeight: 700, letterSpacing: '-0.03em' }}>DEP Pro</h3>
              <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)', letterSpacing: '0.16em', textTransform: 'uppercase' }}>
                pour le patron
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 32 }}>
              <span className="mono" style={{ fontSize: 88, fontWeight: 700, letterSpacing: '-0.04em', lineHeight: 1 }}>100</span>
              <span style={{ fontSize: 28, fontWeight: 600 }}>€</span>
              <span style={{ fontSize: 16, color: 'rgba(0,0,0,0.6)' }}>/ mois HT</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 24px', marginBottom: 32 }}>
              {['Vocal devis illimité', 'Factures Factur-X 2026', 'Relances auto J+30', 'Catalogue articles', 'Multilingue 20 langues', 'Incidents chantier', 'Signature client mobile', 'Support email 24h'].map(f => (
                <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 500 }}>
                  <DepIcon.check style={{ width: 16, height: 16, flexShrink: 0 }} />
                  {f}
                </div>
              ))}
            </div>
            <DepMagnetic strength={0.25}>
              <a href="#" className="dep-btn dep-btn--lg" style={{
                background: 'var(--dep-black)', color: 'var(--dep-yellow)',
                textDecoration: 'none', borderRadius: 14, padding: '18px 24px',
                fontWeight: 600,
              }}>
                Démarrer mon essai 14 jours
                <DepIcon.arrow style={{ width: 18, height: 18 }} />
              </a>
            </DepMagnetic>
            <p style={{ fontSize: 12, marginTop: 16, color: 'rgba(0,0,0,0.6)', fontFamily: 'var(--font-mono)' }}>
              Pas de CB. Résiliation libre. RGPD strict
            </p>
          </div>

          <div style={{
            border: '1px solid var(--dep-line-dark)', borderRadius: 24,
            padding: 40, background: 'var(--dep-black-2)',
          }}>
            <h3 style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.025em', marginBottom: 8 }}>+ Employés</h3>
            <p style={{ fontSize: 14, color: 'var(--dep-grey-3)', marginBottom: 28 }}>
              Chaque employé connecté au chat traduit et au module incidents
            </p>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 32 }}>
              <span className="mono" style={{ fontSize: 64, fontWeight: 700, letterSpacing: '-0.04em', lineHeight: 1 }}>5</span>
              <span style={{ fontSize: 22, fontWeight: 600 }}>€</span>
              <span style={{ fontSize: 14, color: 'var(--dep-grey-3)' }}>/ employé / mois</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {['Chat traduit 20 langues', 'Module incidents mobile', 'Vocaux + photos + GPS', 'Compteur d\'heures auto'].map(f => (
                <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14 }}>
                  <DepIcon.check style={{ width: 14, height: 14, color: 'var(--dep-yellow)', flexShrink: 0 }} />
                  {f}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function LandingFAQ() {
  const faq = [
    ['4G faible sur chantier, ça marche ?', 'Oui. DEP fonctionne offline first. Tes devis, vocaux et incidents sont mis en queue locale et syncés dès que tu retrouves du réseau. Tu vois une icône nuage barré quand t\'es offline'],
    ['Si je dicte 30 minutes d\'un coup ?', 'Pas de souci. Le moteur ASR paraformer-v2 supporte les dictées longues. L\'IA structure le tout et te propose chaque article séparément à valider'],
    ['Quelles langues exactement ?', 'P0 : darija (ar-MA), portugais, polonais, roumain, turc. P1 : wolof, bambara, kabyle, farsi, urdu. P2 : hindi, bengali, anglais, espagnol, italien, géorgien, chinois, vietnamien, tamoul, somali. 20 au total'],
    ['RGPD, où sont stockées mes données ?', 'Serveurs OVH Roubaix. Chiffré au repos AES-256, en transit TLS 1.3. Aucun pixel tiers. Pas de Google Fonts ni Google Analytics. Tu peux exporter ou supprimer tes données à tout moment'],
    ['Factur-X 2026, vous êtes prêts ?', 'Oui. DEP est conforme à la facturation électronique B2B obligatoire entrée en vigueur en septembre 2026. Format Factur-X PDF/A-3 avec XML CII. PDP partenaire en cours d\'agrément'],
    ['Résiliation comment ?', 'Un clic dans l\'app, prise d\'effet le mois suivant. Pas d\'engagement, pas de pénalité. Tes données restent exportables 90 jours après'],
  ];
  const [open, setOpen] = useLState(0);
  return (
    <section id="faq" style={{ background: 'var(--dep-paper)', padding: '120px 64px' }}>
      <div style={{ maxWidth: 1000, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 24 }}>
          <span className="dep-cable" />
          <span className="dep-eyebrow">FAQ chantier · questions concrètes</span>
        </div>
        <h2 style={{ fontSize: 52, fontWeight: 700, letterSpacing: '-0.035em', lineHeight: 1.05, marginBottom: 48 }}>
          Ce que tu te demandes vraiment
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0, borderTop: '1px solid var(--dep-line-light)' }}>
          {faq.map(([q, a], i) => (
            <div key={i} style={{ borderBottom: '1px solid var(--dep-line-light)' }}>
              <button onClick={() => setOpen(open === i ? -1 : i)} style={{
                width: '100%', textAlign: 'left', padding: '24px 0',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                background: 'transparent', border: 'none', cursor: 'pointer',
                fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 600,
                color: 'var(--dep-black)', letterSpacing: '-0.02em',
              }}>
                {q}
                <span style={{
                  width: 36, height: 36, borderRadius: 18, background: open === i ? 'var(--dep-yellow)' : 'transparent',
                  border: '1px solid', borderColor: open === i ? 'var(--dep-yellow)' : 'var(--dep-line-light)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.2s ease',
                }}>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" style={{ transform: open === i ? 'rotate(45deg)' : 'none', transition: 'transform 0.2s' }}>
                    <path d="M7 2v10M2 7h10"/>
                  </svg>
                </span>
              </button>
              {open === i && (
                <div style={{ paddingBottom: 24, fontSize: 17, color: 'var(--dep-grey-1)', lineHeight: 1.55, maxWidth: 760 }}>
                  {a}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function LandingCTAFinal() {
  return (
    <section style={{
      background: 'var(--dep-black)', color: 'var(--dep-paper)',
      padding: '160px 64px', textAlign: 'center', position: 'relative', overflow: 'hidden',
    }} className="dep-noise">
      <div className="dep-mesh" />
      <div style={{ position: 'relative', zIndex: 3, maxWidth: 1000, margin: '0 auto' }}>
        <h2 style={{ fontSize: 80, fontWeight: 700, letterSpacing: '-0.04em', lineHeight: 1, marginBottom: 48 }}>
          Ton prochain devis,<br />
          tu le <em style={{ color: 'var(--dep-yellow)', fontStyle: 'italic' }}>dictes</em> en 4 min<br />
          ou tu le tapes une heure ?
        </h2>
        <DepMagnetic strength={0.3}>
          <a href="#" className="dep-btn dep-btn--primary dep-btn--lg" style={{ textDecoration: 'none', fontSize: 20, padding: '24px 36px' }}>
            Démarrer mon essai gratuit
            <DepIcon.arrow style={{ width: 22, height: 22 }} />
          </a>
        </DepMagnetic>
        <p className="mono" style={{ fontSize: 13, color: 'var(--dep-grey-3)', marginTop: 24, letterSpacing: '0.08em' }}>
          14 jours · Pas de CB · Résiliation libre · RGPD strict
        </p>
      </div>
    </section>
  );
}

function LandingFooter() {
  return (
    <footer style={{ background: 'var(--dep-black)', color: 'var(--dep-grey-3)', padding: '48px 64px 64px', borderTop: '1px solid var(--dep-line-dark)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 48, flexWrap: 'wrap' }}>
        <div>
          <Image src="/dep-logo.png" alt="DEP" width={120} height={40} priority style={{ width: "auto", height: 40 }} />
          <p style={{ marginTop: 16, fontSize: 13, maxWidth: 320, lineHeight: 1.5 }}>
            DEP. Devis Électricité Plateforme. Le SaaS terrain pour électriciens FR. Conçu sur chantier avec Maelig, électricien indépendant
          </p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, auto)', gap: 48, fontSize: 13 }}>
          <div>
            <div className="mono" style={{ color: 'var(--dep-paper)', textTransform: 'uppercase', letterSpacing: '0.16em', fontSize: 11, marginBottom: 14 }}>Produit</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <a href="#" style={{ color: 'inherit', textDecoration: 'none' }}>Vocal devis</a>
              <a href="#" style={{ color: 'inherit', textDecoration: 'none' }}>Chat traduit</a>
              <a href="#" style={{ color: 'inherit', textDecoration: 'none' }}>Incidents chantier</a>
              <a href="#" style={{ color: 'inherit', textDecoration: 'none' }}>Tarifs</a>
            </div>
          </div>
          <div>
            <div className="mono" style={{ color: 'var(--dep-paper)', textTransform: 'uppercase', letterSpacing: '0.16em', fontSize: 11, marginBottom: 14 }}>Légal</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <a href="#" style={{ color: 'inherit', textDecoration: 'none' }}>Mentions légales</a>
              <a href="#" style={{ color: 'inherit', textDecoration: 'none' }}>CGV</a>
              <a href="#" style={{ color: 'inherit', textDecoration: 'none' }}>RGPD</a>
              <a href="#" style={{ color: 'inherit', textDecoration: 'none' }}>Cookies</a>
            </div>
          </div>
          <div>
            <div className="mono" style={{ color: 'var(--dep-paper)', textTransform: 'uppercase', letterSpacing: '0.16em', fontSize: 11, marginBottom: 14 }}>Contact</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <a href="mailto:ayouneslead@gmail.com" style={{ color: 'inherit', textDecoration: 'none' }}>ayouneslead@gmail.com</a>
              <span>Maelig21 · pilote</span>
              <span>Hébergé OVH Roubaix</span>
            </div>
          </div>
        </div>
      </div>
      <div style={{ borderTop: '1px solid var(--dep-line-dark)', marginTop: 40, paddingTop: 24, display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.06em' }}>
        <span>© 2026 DEP. Tous droits réservés</span>
        <span>v2.0 · build 2026.05.19</span>
      </div>
    </footer>
  );
}

export default function Landing() {
  return (
    <div className="dep dep--dark" style={{ position: 'relative', width: '100%', minHeight: '100%' }}>
      <LandingNav />
      <LandingHero />
      <LandingProof />
      <LandingMultilingue />
      <LandingMath />
      <LandingParcours />
      <LandingVignettes />
      <LandingPricing />
      <LandingFAQ />
      <LandingCTAFinal />
      <LandingFooter />
      
    </div>
  );
}


