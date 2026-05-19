"use client"
// @ts-nocheck — design v2 prototype port, types ajoutés progressivement

import { useState as useIState } from "react"
import Image from "next/image"
import { DepNoise, DepMagnetic, DepDot, DepIcon, DepWaveform } from "../primitives"
/* DEP — Incidents Mobile.
   Trois écrans côte à côte montrant le flow + plusieurs langues différentes
   sur chacun pour démontrer i18n. */

// Une langue par phone-frame, plusieurs langues affichées en parallèle.
const INCIDENT_I18N = {
  fr: {
    h1: 'Que s\'est-il passé ?',
    urgent: 'Urgent · Préviens le patron tout de suite',
    cancel: 'Annuler',
    btn: { photo: 'Photo', video: 'Vidéo', vocal: 'Vocal' },
    addNote: 'Ajoute un mot si tu veux',
    send: 'Envoyer au patron',
    tagAuto: 'Catégorie · IA',
    tags: ['Chute', 'Dégât', 'Retard', 'Matériel HS', 'Conflit', 'Autre'],
    sent: 'Envoyé au patron',
    sentSub: 'Tu auras une réponse dès qu\'il aura vu',
    back: 'Retour',
    seeAll: 'Voir mes incidents',
  },
  ar: { // darija
    h1: 'أش وقع؟',
    urgent: 'مستعجل · عيّط للباطرون دابا',
    cancel: 'إلغاء',
    btn: { photo: 'صورة', video: 'فيديو', vocal: 'صوت' },
    addNote: 'زيد كلمة إلى بغيتي',
    send: 'صيفط للباطرون',
    tagAuto: 'الصنف · ذكاء',
    tags: ['طيحة', 'ضرر', 'تأخير', 'معدّة خاسرة', 'مشكل', 'آخر'],
    sent: 'تصيفط للباطرون',
    sentSub: 'غادي تلقى الجواب فاش يشوفها',
    back: 'رجوع',
    seeAll: 'حوايجي كاملين',
  },
  pl: {
    h1: 'Co się stało?',
    urgent: 'Pilne · Zawiadom szefa od razu',
    cancel: 'Anuluj',
    btn: { photo: 'Zdjęcie', video: 'Wideo', vocal: 'Głos' },
    addNote: 'Dopisz coś jeśli chcesz',
    send: 'Wyślij szefowi',
    tagAuto: 'Kategoria · AI',
    tags: ['Upadek', 'Szkoda', 'Opóźnienie', 'Sprzęt HS', 'Spór', 'Inne'],
    sent: 'Wysłano szefowi',
    sentSub: 'Dostaniesz odpowiedź gdy zobaczy',
    back: 'Powrót',
    seeAll: 'Moje zgłoszenia',
  },
};

function IncidentScreen1({ t, lang }) {
  const dir = lang === 'ar' ? 'rtl' : 'ltr';
  return (
    <div dir={dir} className="dep dep--dark" style={{
      width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
      padding: '20px 20px 28px', color: 'var(--dep-paper)',
      background: 'var(--dep-black)', position: 'relative', overflow: 'hidden',
    }}>
      <DepNoise />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative', zIndex: 3, marginBottom: 24 }}>
        <Image src="/dep-logo.png" alt="DEP" width={120} height={40} priority style={{ width: "auto", height: 40 }} />
        <span className="mono" style={{ fontSize: 10, color: 'var(--dep-grey-3)', letterSpacing: '0.16em', textTransform: 'uppercase' }}>
          incident · {lang}
        </span>
      </div>

      <h1 style={{
        fontSize: 48, fontWeight: 700, letterSpacing: '-0.035em', lineHeight: 1.04,
        marginBottom: 36, position: 'relative', zIndex: 3,
      }}>
        {t.h1}
      </h1>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 18, position: 'relative', zIndex: 3 }}>
        <BigButton icon={DepIcon.camera} label={t.btn.photo} dir={dir} />
        <BigButton icon={DepIcon.video}  label={t.btn.video} dir={dir} />
        <BigButton icon={DepIcon.mic}    label={t.btn.vocal} dir={dir} accent />
      </div>

      <label style={{
        marginTop: 28, display: 'flex', alignItems: 'center', gap: 12, fontSize: 15,
        padding: '14px 14px', background: 'rgba(220,38,38,0.12)',
        border: '1px solid rgba(220,38,38,0.3)', borderRadius: 14, position: 'relative', zIndex: 3,
      }}>
        <span style={{
          width: 22, height: 22, borderRadius: 6, background: 'transparent',
          border: '2px solid var(--dep-red)', flexShrink: 0,
        }} />
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600 }}>{t.urgent}</div>
        </div>
        <span className="dep-rec-dot" style={{ width: 10, height: 10 }} />
      </label>

      <button style={{
        marginTop: 'auto', alignSelf: 'center', padding: '12px 24px',
        background: 'transparent', border: 'none', color: 'var(--dep-grey-3)',
        fontFamily: 'inherit', fontSize: 14, cursor: 'pointer',
      }}>{t.cancel}</button>
    </div>
  );
}

function BigButton({ icon: Icon, label, dir, accent }) {
  return (
    <button style={{
      width: '100%', minHeight: 110, padding: '18px 22px',
      background: accent ? 'var(--dep-yellow)' : 'var(--dep-black-2)',
      color: accent ? 'var(--dep-black)' : 'var(--dep-paper)',
      border: accent ? 'none' : '1px solid var(--dep-line-dark)',
      borderRadius: 18, cursor: 'pointer',
      display: 'flex', alignItems: 'center', gap: 18,
      flexDirection: dir === 'rtl' ? 'row-reverse' : 'row',
      fontFamily: 'inherit',
    }}>
      <span style={{
        width: 56, height: 56, borderRadius: 14,
        background: accent ? 'rgba(0,0,0,0.1)' : 'rgba(245,197,24,0.12)',
        color: accent ? 'var(--dep-black)' : 'var(--dep-yellow)',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}><Icon style={{ width: 28, height: 28 }} /></span>
      <span style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-0.025em', textAlign: dir === 'rtl' ? 'right' : 'left' }}>{label}</span>
    </button>
  );
}

function IncidentScreen2({ t, lang }) {
  const dir = lang === 'ar' ? 'rtl' : 'ltr';
  // Mock du média : vocal sélectionné, waveform + transcription bilingue
  return (
    <div dir={dir} className="dep dep--dark" style={{
      width: '100%', height: '100%', padding: '20px 20px 28px',
      background: 'var(--dep-black)', color: 'var(--dep-paper)',
      display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden',
    }}>
      <DepNoise />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative', zIndex: 3, marginBottom: 18 }}>
        <button style={{ background: 'transparent', border: 'none', padding: 0, cursor: 'pointer', color: 'var(--dep-paper)' }}>
          <DepIcon.back style={{ width: 22, height: 22, transform: dir === 'rtl' ? 'scaleX(-1)' : 'none' }} />
        </button>
        <span className="mono" style={{ fontSize: 10, color: 'var(--dep-grey-3)', letterSpacing: '0.14em', textTransform: 'uppercase' }}>
          vocal · 00:23
        </span>
        <span className="dep-rec-dot" />
      </div>

      {/* Mock waveform preview */}
      <div style={{
        background: 'var(--dep-black-2)', border: '1px solid var(--dep-line-dark)',
        borderRadius: 18, padding: '18px 18px', marginBottom: 16,
        position: 'relative', zIndex: 3,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <button style={{
            width: 48, height: 48, borderRadius: 24, background: 'var(--dep-yellow)',
            color: 'var(--dep-black)', border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <svg width="14" height="16" viewBox="0 0 14 16" fill="currentColor"><path d="M0 0v16l14-8z"/></svg>
          </button>
          <div style={{ flex: 1 }}>
            <DepWaveform active={false} bars={28} height={32} color="var(--dep-yellow)" />
          </div>
          <span className="mono" style={{ fontSize: 12, color: 'var(--dep-grey-3)' }}>00:23</span>
        </div>
      </div>

      {/* Transcription bilingue */}
      <div style={{
        background: 'var(--dep-black-2)', border: '1px solid var(--dep-line-dark)',
        borderRadius: 18, padding: '16px 18px', marginBottom: 16, position: 'relative', zIndex: 3,
      }}>
        <div className="dep-eyebrow dep-eyebrow--on-dark" style={{ marginBottom: 10 }}>
          Transcription · {lang}
        </div>
        <div style={{ fontSize: 16, lineHeight: 1.45, fontWeight: 500, marginBottom: 12, direction: dir, textAlign: dir === 'rtl' ? 'right' : 'left' }}>
          {lang === 'ar' && 'كان واحد التسريب ديال الما تحت السينك ف الحمام ديال الطابق التاني، الباركي تخسر'}
          {lang === 'pl' && 'Pęknięta rura pod umywalką na 2 piętrze, parkiet się zniszczył'}
          {lang === 'fr' && 'Y\'a une fuite d\'eau sous le lavabo au 2e étage, le parquet est foutu'}
        </div>
        <div style={{ height: 1, background: 'var(--dep-line-dark)', margin: '12px 0' }} />
        <div className="dep-eyebrow dep-eyebrow--on-dark" style={{ marginBottom: 8 }}>
          Auto-traduit FR · pour patron
        </div>
        <div style={{ fontSize: 14, color: 'var(--dep-grey-4)', fontStyle: 'italic', direction: 'ltr', textAlign: 'left' }}>
          « Il y a une fuite d'eau sous le lavabo au 2e étage, le parquet est abîmé »
          <DepDot tone="green" size={6} /> <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}> confiance haute</span>
        </div>
      </div>

      {/* Tag auto */}
      <div style={{ marginBottom: 14, position: 'relative', zIndex: 3 }}>
        <div className="dep-eyebrow dep-eyebrow--on-dark" style={{ marginBottom: 10 }}>{t.tagAuto}</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {t.tags.map((tag, i) => (
            <span key={tag} style={{
              padding: '7px 12px', borderRadius: 999, fontSize: 13, fontWeight: 500,
              background: i === 1 ? 'var(--dep-yellow)' : 'transparent',
              color: i === 1 ? 'var(--dep-black)' : 'var(--dep-grey-3)',
              border: i === 1 ? 'none' : '1px solid var(--dep-line-dark)',
              cursor: 'pointer',
            }}>{tag}</span>
          ))}
        </div>
      </div>

      {/* Note */}
      <div style={{
        background: 'var(--dep-black-2)', border: '1px solid var(--dep-line-dark)',
        borderRadius: 14, padding: '12px 14px', marginBottom: 16,
        display: 'flex', alignItems: 'center', gap: 10,
        position: 'relative', zIndex: 3,
      }}>
        <span style={{ flex: 1, fontSize: 14, color: 'var(--dep-grey-3)' }}>{t.addNote}</span>
        <button style={{
          width: 36, height: 36, borderRadius: 18, background: 'var(--dep-yellow)',
          color: 'var(--dep-black)', border: 'none', cursor: 'pointer',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}><DepIcon.mic style={{ width: 16, height: 16 }} /></button>
      </div>

      {/* Sticky send */}
      <div style={{ marginTop: 'auto', position: 'relative', zIndex: 3 }}>
        <DepMagnetic strength={0.15}>
          <button className="dep-btn dep-btn--primary" style={{ width: '100%', padding: '20px', fontSize: 17 }}>
            {t.send}
            <DepIcon.send style={{ width: 18, height: 18, transform: dir === 'rtl' ? 'scaleX(-1)' : 'none' }} />
          </button>
        </DepMagnetic>
      </div>
    </div>
  );
}

function IncidentScreen3({ t, lang }) {
  const dir = lang === 'ar' ? 'rtl' : 'ltr';
  return (
    <div dir={dir} className="dep dep--dark" style={{
      width: '100%', height: '100%', padding: '20px 20px 28px',
      background: 'var(--dep-black)', color: 'var(--dep-paper)',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      position: 'relative', overflow: 'hidden', textAlign: 'center',
    }}>
      <DepNoise />
      <div style={{ marginTop: 80, position: 'relative', zIndex: 3 }}>
        <div style={{
          width: 100, height: 100, borderRadius: 50, background: 'rgba(16,185,129,0.1)',
          border: '2px solid var(--dep-green)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 28px', position: 'relative',
        }}>
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
            <path d="M14 24 L22 32 L36 16" stroke="var(--dep-green)" strokeWidth="4"
                  strokeLinecap="round" strokeLinejoin="round"
                  strokeDasharray="60" strokeDashoffset="0"
                  style={{ animation: 'check-draw 0.6s ease forwards' }} />
          </svg>
          <style>{`@keyframes check-draw { from { stroke-dashoffset: 60; } to { stroke-dashoffset: 0; } }`}</style>
        </div>
        <h1 style={{ fontSize: 32, fontWeight: 700, letterSpacing: '-0.03em', marginBottom: 10 }}>{t.sent}</h1>
        <p style={{ fontSize: 14, color: 'var(--dep-grey-3)', maxWidth: 260, margin: '0 auto 8px' }}>
          {t.sentSub}
        </p>
        <p style={{ fontSize: 12, color: 'var(--dep-grey-2)', fontStyle: 'italic', maxWidth: 260, margin: '0 auto', direction: 'ltr' }}>
          {lang !== 'fr' && '« Envoyé au patron »'}
        </p>

        {/* Receipt mock */}
        <div style={{
          marginTop: 28, padding: 16, borderRadius: 14,
          background: 'rgba(255,255,255,0.04)', border: '1px solid var(--dep-line-dark)',
          fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--dep-grey-3)',
          textAlign: 'left', direction: 'ltr',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span>ID</span><span style={{ color: 'var(--dep-paper)' }}>INC-2026-0073</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span>Chantier</span><span style={{ color: 'var(--dep-paper)' }}>Bagnolet</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Vu par patron</span><span style={{ color: 'var(--dep-green)' }}>—</span>
          </div>
        </div>
      </div>

      <div style={{ marginTop: 'auto', width: '100%', display: 'flex', flexDirection: 'column', gap: 10, position: 'relative', zIndex: 3 }}>
        <button className="dep-btn dep-btn--primary" style={{ width: '100%', padding: '16px' }}>
          {t.seeAll}
          <DepIcon.arrow style={{ width: 16, height: 16, transform: dir === 'rtl' ? 'scaleX(-1)' : 'none' }} />
        </button>
        <button className="dep-btn dep-btn--ghost-dark" style={{ width: '100%' }}>{t.back}</button>
      </div>
    </div>
  );
}

export default function Incidents() {
  // Show the 3-step flow in 3 phones, each in a different language to
  // demonstrate i18n + RTL handling.
  return (
    <div style={{
      width: '100%', minHeight: '100%', background: '#1a1916',
      padding: '48px 56px 32px', position: 'relative',
    }} className="dep dep--dark">
      <div className="mono" style={{
        fontSize: 11, letterSpacing: '0.16em', color: 'rgba(255,255,255,0.4)',
        textTransform: 'uppercase', marginBottom: 28,
      }}>
        03 — Incidents mobile · 3 écrans · 3 langues côte à côte
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 32, justifyItems: 'center', alignItems: 'start' }}>
        <PhoneWithLabel label="01 · Accueil incident" sublabel="Darija (ar-MA) · RTL">
          <IncidentScreen1 t={INCIDENT_I18N.ar} lang="ar" />
        </PhoneWithLabel>
        <PhoneWithLabel label="02 · Capture · transcription" sublabel="Polski (pl)">
          <IncidentScreen2 t={INCIDENT_I18N.pl} lang="pl" />
        </PhoneWithLabel>
        <PhoneWithLabel label="03 · Confirmation" sublabel="Français (fr)">
          <IncidentScreen3 t={INCIDENT_I18N.fr} lang="fr" />
        </PhoneWithLabel>
      </div>

      
    </div>
  );
}

function PhoneWithLabel({ label, sublabel, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
      <div style={{ textAlign: 'center' }}>
        <div className="mono" style={{ fontSize: 11, color: 'var(--dep-yellow)', letterSpacing: '0.16em', textTransform: 'uppercase', marginBottom: 4 }}>
          {label}
        </div>
        <div style={{ fontSize: 12, color: 'var(--dep-grey-3)' }}>{sublabel}</div>
      </div>
      <>
        <div style={{ position: 'absolute', inset: 0, top: 44 }}>{children}</div>
      </>
    </div>
  );
}


