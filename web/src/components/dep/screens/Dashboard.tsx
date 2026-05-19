"use client"
// @ts-nocheck — design v2 prototype port, types ajoutés progressivement

import { useState as useDState } from "react"
import Image from "next/image"
import { DepReveal, DepDot, DepSpark, DepIcon } from "../primitives"
/* DEP — Dashboard "Là, maintenant" (Control Tower).
   Desktop 1440 × 1000. Sidebar nav + topbar + 3 zones (Là maintenant, KPIs, Detail). */

const ACTIONS_NOW = [
  {
    id: 1, urgency: 'red', icon: '🚨', emoji: 'warning',
    title: 'Incident urgent · Karim a remonté un dégât eau il y a 12 min',
    sub: 'Chantier Bagnolet · vocal traduit FR + photo plomberie',
    cta: 'Voir l\'incident', when: '12 min',
  },
  {
    id: 2, urgency: 'amber', icon: '💰', emoji: 'euro',
    title: 'Devis 23 000 € attente client depuis 8 jours',
    sub: 'Cabinet Bouygues SARL · relance auto demain 9h, ou maintenant ?',
    cta: 'Relancer', when: 'depuis 8 j',
  },
  {
    id: 3, urgency: 'yellow', icon: '✍️', emoji: 'check',
    title: '2 devis prêts à valider par toi',
    sub: 'Aïcha les a montés ce matin · 4 200 € et 1 800 € HT',
    cta: 'Ouvrir', when: 'ce matin',
  },
  {
    id: 4, urgency: 'grey', icon: '📅', emoji: 'truck',
    title: 'Rendez-vous client 14h Nanterre',
    sub: 'M. Lefèvre · diagnostic dépannage · itinéraire prêt 22 min',
    cta: 'GPS', when: '14:00',
  },
];

const KPIS = [
  { label: 'Cash-in 30j',     value: '12 450', unit: '€',  delta: '+18%', tone: 'green',  spark: [3,5,4,7,6,9,8,12,11,14,13,15] },
  { label: 'Cash-out 30j',    value: '4 200',  unit: '€',  delta: '−5%',  tone: 'green',  spark: [8,7,7,6,7,6,5,5,4,5,4,4]      },
  { label: 'Devis envoyés',   value: '7',      unit: 'semaine',  delta: '+2',  tone: 'green',  spark: [2,3,2,4,5,3,5,6,4,7,6,7]      },
  { label: 'Devis en attente client', value: '4', unit: '· 38 200 €', delta: '+1', tone: 'amber', spark: [1,2,2,3,3,3,4,4,4,4,4,4] },
  { label: 'Factures impayées', value: '2',    unit: '· 6 800 €',  delta: 'retard 12j', tone: 'red',  spark: [4,3,3,2,2,2,2,2,2,2,2,2]   },
  { label: 'Incidents 7j',    value: '3',      unit: '· 2 résolus', delta: '+1', tone: 'amber', spark: [0,1,0,2,1,3,2,3,1,2,1,3] },
];

const FLUX = [
  { who: 'Aïcha',  what: 'a créé un devis brouillon · 4 200 €',    when: 'il y a 14 min', tone: 'amber' },
  { who: 'Karim',  what: 'a remonté un incident urgent · Bagnolet', when: 'il y a 12 min', tone: 'red' },
  { who: 'Maelig', what: 'a envoyé la facture FAC-2026-0089 · 1 850 €', when: 'il y a 1h', tone: 'green' },
  { who: 'Client', what: 'Cabinet Bouygues SARL a signé devis DEV-0142', when: 'il y a 2h', tone: 'green' },
  { who: 'Système', what: 'relance auto envoyée à M. Lefèvre · 1 400 €', when: 'il y a 5h', tone: 'grey' },
  { who: 'Mohamed', what: 'a pointé 7h45 sur chantier La Défense', when: 'hier 18:22', tone: 'grey' },
  { who: 'Maelig', what: 'a créé un devis vocal · 4 min 11s · 2 300 € TTC', when: 'hier 14:08', tone: 'yellow' },
];

function Sidebar() {
  const items = [
    { label: 'Dashboard',   icon: 'home', active: true },
    { label: 'Devis',       icon: 'doc', n: 2 },
    { label: 'Factures',    icon: 'euro' },
    { label: 'Incidents',   icon: 'warn', n: 1 },
    { label: 'Clients',     icon: 'user' },
    { label: 'Catalogue',   icon: 'box' },
    { label: 'Équipe',      icon: 'team' },
    { label: 'Paramètres',  icon: 'gear' },
  ];
  return (
    <aside style={{
      width: 232, height: '100%', flexShrink: 0,
      background: 'var(--dep-black)', color: 'var(--dep-paper)',
      borderRight: '1px solid var(--dep-line-dark)',
      padding: '20px 14px', display: 'flex', flexDirection: 'column',
      position: 'relative', overflow: 'hidden',
    }} className="dep-noise">
      <div style={{ padding: '6px 8px 24px', position: 'relative', zIndex: 3 }}>
        <Image src="/dep-logo.png" alt="DEP" width={120} height={40} priority style={{ width: "auto", height: 40 }} />
      </div>
      <nav style={{ display: 'flex', flexDirection: 'column', gap: 4, position: 'relative', zIndex: 3 }}>
        {items.map(it => (
          <a key={it.label} href="#" style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '10px 12px', borderRadius: 10,
            background: it.active ? 'rgba(245,197,24,0.12)' : 'transparent',
            color: it.active ? 'var(--dep-yellow)' : 'var(--dep-grey-3)',
            textDecoration: 'none', fontSize: 14, fontWeight: 500,
          }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <SideIcon name={it.icon} />
              {it.label}
            </span>
            {it.n && (
              <span style={{
                background: 'var(--dep-red)', color: 'white', fontSize: 10, fontWeight: 700,
                padding: '2px 6px', borderRadius: 999, minWidth: 18, textAlign: 'center',
              }}>{it.n}</span>
            )}
          </a>
        ))}
      </nav>
      <div style={{ marginTop: 'auto', padding: '14px 12px', borderTop: '1px solid var(--dep-line-dark)', position: 'relative', zIndex: 3 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 16, background: 'var(--dep-yellow)',
            color: 'var(--dep-black)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 700, fontFamily: 'var(--font-display)',
          }}>M</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600 }}>Maelig</div>
            <div className="mono" style={{ fontSize: 10, color: 'var(--dep-grey-3)' }}>DEP Pro · 1 patron + 3 emp.</div>
          </div>
        </div>
      </div>
    </aside>
  );
}

function SideIcon({ name }) {
  const s = { width: 16, height: 16, strokeWidth: 1.8, stroke: 'currentColor', fill: 'none', strokeLinecap: 'round' };
  switch (name) {
    case 'home': return <svg {...s} viewBox="0 0 16 16"><path d="M2 8l6-6 6 6"/><path d="M4 8v6h8V8"/></svg>;
    case 'doc':  return <svg {...s} viewBox="0 0 16 16"><path d="M3 2h7l3 3v9H3z"/><path d="M10 2v3h3"/></svg>;
    case 'euro': return <svg {...s} viewBox="0 0 16 16"><path d="M13 4a5 5 0 1 0 0 8"/><path d="M2 7h7M2 9h7"/></svg>;
    case 'warn': return <svg {...s} viewBox="0 0 16 16"><path d="M8 2l6.5 12H1.5z"/><path d="M8 6v4M8 12v.5"/></svg>;
    case 'user': return <svg {...s} viewBox="0 0 16 16"><circle cx="8" cy="6" r="3"/><path d="M2 14c0-3 2.5-5 6-5s6 2 6 5"/></svg>;
    case 'box':  return <svg {...s} viewBox="0 0 16 16"><path d="M2 5l6-3 6 3v6l-6 3-6-3z"/><path d="M2 5l6 3 6-3M8 8v6"/></svg>;
    case 'team': return <svg {...s} viewBox="0 0 16 16"><circle cx="5" cy="6" r="2"/><circle cx="11" cy="6" r="2"/><path d="M2 14c0-2 1.5-3.5 3-3.5s3 1.5 3 3.5"/><path d="M8 14c0-2 1.5-3.5 3-3.5s3 1.5 3 3.5"/></svg>;
    default:     return <svg {...s} viewBox="0 0 16 16"><circle cx="8" cy="8" r="2"/><path d="M8 1v2M8 13v2M1 8h2M13 8h2M3 3l1.5 1.5M12.5 12.5L14 14M3 13l1.5-1.5M12.5 4.5L14 3"/></svg>;
  }
}

function Topbar() {
  return (
    <div style={{
      height: 64, padding: '0 32px', display: 'flex', alignItems: 'center', gap: 16,
      borderBottom: '1px solid var(--dep-line-light)', background: 'var(--dep-paper)',
    }}>
      <div style={{
        flex: 1, maxWidth: 400, display: 'flex', alignItems: 'center', gap: 10,
        padding: '8px 14px', background: 'var(--dep-white)',
        border: '1px solid var(--dep-line-light)', borderRadius: 10,
      }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--dep-grey-2)" strokeWidth="2"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4-4"/></svg>
        <input placeholder="Cherche un client, un devis, un article" style={{
          border: 'none', outline: 'none', flex: 1, background: 'transparent',
          fontFamily: 'inherit', fontSize: 14,
        }} />
        <span style={{
          padding: '2px 6px', background: 'var(--dep-paper-2)', borderRadius: 4,
          fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--dep-grey-2)',
        }}>⌘ K</span>
      </div>
      <div style={{ flex: 1 }} />
      <button style={{
        width: 38, height: 38, borderRadius: 19, background: 'var(--dep-white)',
        border: '1px solid var(--dep-line-light)', cursor: 'pointer', position: 'relative',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10 21a2 2 0 0 0 4 0"/>
        </svg>
        <span style={{ position: 'absolute', top: 8, right: 9, width: 8, height: 8, borderRadius: '50%', background: 'var(--dep-red)',
          boxShadow: '0 0 0 0 rgba(220,38,38,0.45)', animation: 'dep-pulse-rec 1.5s ease-out infinite',
        }} />
      </button>
      <button style={{
        height: 38, padding: '0 14px', borderRadius: 19,
        background: 'var(--dep-black)', color: 'var(--dep-yellow)', border: 'none',
        cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8,
        fontFamily: 'inherit', fontWeight: 600, fontSize: 13,
      }}>
        <DepIcon.mic style={{ width: 14, height: 14 }} />
        Nouveau devis
      </button>
    </div>
  );
}

function ActionCard({ a }) {
  const tone = {
    red:    { bd: 'var(--dep-red)',    bg: 'rgba(220,38,38,0.04)' },
    amber:  { bd: 'var(--dep-amber)',  bg: 'rgba(245,158,11,0.04)' },
    yellow: { bd: 'var(--dep-yellow)', bg: 'rgba(245,197,24,0.05)' },
    grey:   { bd: 'var(--dep-grey-3)', bg: 'transparent' },
  }[a.urgency];
  const Icon = DepIcon[a.emoji] || DepIcon.bolt;
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 18,
      padding: '20px 22px', borderRadius: 16,
      background: tone.bg, border: '1px solid var(--dep-line-light)',
      borderLeft: `4px solid ${tone.bd}`,
      transition: 'transform 0.18s ease, box-shadow 0.18s ease',
    }}
    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 18px 40px -16px rgba(0,0,0,0.18)'; }}
    onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; }}
    >
      <span style={{
        width: 44, height: 44, borderRadius: 10,
        background: 'var(--dep-black)', color: tone.bd,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        <Icon style={{ width: 22, height: 22 }} />
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 16, fontWeight: 600, letterSpacing: '-0.015em', color: 'var(--dep-black)', marginBottom: 4 }}>{a.title}</div>
        <div style={{ fontSize: 13, color: 'var(--dep-grey-1)' }}>{a.sub}</div>
      </div>
      <span className="mono" style={{ fontSize: 11, color: 'var(--dep-grey-2)', letterSpacing: '0.06em', flexShrink: 0 }}>{a.when}</span>
      <button style={{
        padding: '10px 16px', borderRadius: 10,
        background: a.urgency === 'red' ? 'var(--dep-red)' : 'var(--dep-black)',
        color: a.urgency === 'red' ? 'var(--dep-paper)' : 'var(--dep-yellow)',
        border: 'none', cursor: 'pointer',
        fontFamily: 'inherit', fontWeight: 600, fontSize: 14, flexShrink: 0,
        display: 'inline-flex', alignItems: 'center', gap: 6,
      }}>
        {a.cta}
        <DepIcon.arrow style={{ width: 14, height: 14 }} />
      </button>
      <button title="Reporter d'1h" style={{
        background: 'transparent', border: 'none', padding: 6, cursor: 'pointer',
        color: 'var(--dep-grey-2)', flexShrink: 0,
      }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>
      </button>
    </div>
  );
}

function KpiCard({ k }) {
  const toneMap = {
    green: 'var(--dep-green)', red: 'var(--dep-red)', amber: 'var(--dep-amber)',
  };
  return (
    <div style={{
      padding: '18px 20px', background: 'var(--dep-white)',
      border: '1px solid var(--dep-line-light)', borderRadius: 14,
      display: 'flex', flexDirection: 'column', gap: 6,
    }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 12, color: 'var(--dep-grey-1)', fontWeight: 500 }}>{k.label}</span>
        <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: toneMap[k.tone] || 'var(--dep-grey-2)', fontWeight: 600 }}>{k.delta}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
        <span className="mono tnum" style={{ fontSize: 32, fontWeight: 700, letterSpacing: '-0.04em', color: 'var(--dep-black)' }}>{k.value}</span>
        <span style={{ fontSize: 11, color: 'var(--dep-grey-2)', alignSelf: 'flex-end', marginBottom: 6 }}>{k.unit}</span>
      </div>
      <div style={{ marginTop: 2 }}>
        <DepSpark data={k.spark} color={toneMap[k.tone] || 'var(--dep-yellow)'} width={140} height={28} />
      </div>
    </div>
  );
}

function CashFlowChart() {
  // Simple SVG cash-flow: bars cash-in/out per 30 days
  const ins  = [3.2, 4.1, 5.8, 4.2, 6.0, 7.4, 5.8, 9.1, 7.6, 11.2, 9.8, 12.4];
  const outs = [1.2, 1.8, 1.5, 2.1, 1.6, 2.2, 1.4, 2.6, 1.8, 2.9, 1.9, 4.2];
  const W = 720, H = 200, bw = 24, gap = 12, pad = 40;
  const max = Math.max(...ins, ...outs);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: H, display: 'block' }}>
      {[0, 0.25, 0.5, 0.75, 1].map(t => (
        <line key={t} x1={pad} x2={W - 16} y1={H - 30 - (H - 60) * t} y2={H - 30 - (H - 60) * t}
              stroke="var(--dep-line-light)" strokeDasharray={t === 0 ? '' : '3 5'} />
      ))}
      {ins.map((v, i) => {
        const x = pad + i * (bw + gap);
        const inH = ((H - 60) * v) / max;
        const ouH = ((H - 60) * outs[i]) / max;
        return (
          <g key={i}>
            <rect x={x} y={H - 30 - inH} width={bw} height={inH} fill="var(--dep-yellow)" rx="2" />
            <rect x={x + bw - 6} y={H - 30 - ouH} width={6} height={ouH} fill="var(--dep-red)" opacity="0.7" />
            <text x={x + bw / 2} y={H - 12} textAnchor="middle" fontFamily="var(--font-mono)" fontSize="9" fill="var(--dep-grey-2)">{`S-${ins.length - i}`}</text>
          </g>
        );
      })}
      <polyline points={ins.map((v, i) => `${pad + i*(bw+gap) + bw/2},${H - 30 - ((H-60)*v)/max}`).join(' ')}
                fill="none" stroke="var(--dep-black)" strokeWidth="1.5" />
    </svg>
  );
}

function FluxTimeline() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {FLUX.map((f, i) => (
        <div key={i} style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '12px 0', borderTop: i ? '1px solid var(--dep-line-light)' : 'none',
        }}>
          <DepDot tone={f.tone === 'yellow' ? 'amber' : f.tone} />
          <div style={{ flex: 1, fontSize: 13 }}>
            <span style={{ fontWeight: 600, color: 'var(--dep-black)' }}>{f.who}</span>
            <span style={{ color: 'var(--dep-grey-1)' }}> {f.what}</span>
          </div>
          <span className="mono" style={{ fontSize: 11, color: 'var(--dep-grey-2)', letterSpacing: '0.04em', flexShrink: 0 }}>{f.when}</span>
        </div>
      ))}
    </div>
  );
}

export default function Dashboard() {
  return (
    <div className="dep" style={{
      width: '100%', height: '100%',
      display: 'flex', overflow: 'hidden', background: 'var(--dep-paper)',
    }}>
      <Sidebar />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <Topbar />
        <div style={{ flex: 1, overflowY: 'auto', padding: '28px 32px' }}>
          {/* Hero salut */}
          <div style={{ marginBottom: 28, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--dep-grey-2)', letterSpacing: '0.16em', textTransform: 'uppercase', marginBottom: 8 }}>
                Lundi 19 mai · 8:17
              </div>
              <h1 style={{ fontSize: 38, letterSpacing: '-0.03em', fontWeight: 700, marginBottom: 6 }}>
                Salut <span style={{ color: 'var(--dep-yellow)', fontStyle: 'italic' }}>Maelig</span>
              </h1>
              <p style={{ fontSize: 16, color: 'var(--dep-grey-1)' }}>Tu as 3 actions chaudes et 1 rendez-vous client cet après-midi</p>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button style={{
                padding: '10px 14px', borderRadius: 10, border: '1px solid var(--dep-line-light)',
                background: 'var(--dep-white)', fontFamily: 'inherit', fontSize: 13, fontWeight: 500, cursor: 'pointer',
                display: 'inline-flex', alignItems: 'center', gap: 6,
              }}>30 jours</button>
              <button style={{
                padding: '10px 14px', borderRadius: 10, border: '1px solid var(--dep-line-light)',
                background: 'var(--dep-white)', fontFamily: 'inherit', fontSize: 13, fontWeight: 500, cursor: 'pointer',
              }}>Exporter</button>
            </div>
          </div>

          {/* Là, maintenant */}
          <section style={{ marginBottom: 32 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span className="dep-cable" />
                <h2 style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.025em' }}>Là, maintenant</h2>
              </div>
              <span className="mono" style={{ fontSize: 11, color: 'var(--dep-grey-2)', letterSpacing: '0.14em', textTransform: 'uppercase' }}>
                Trié par urgence
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {ACTIONS_NOW.map((a, i) => (
                <DepReveal key={a.id} delay={i * 60}>
                  <ActionCard a={a} />
                </DepReveal>
              ))}
            </div>
          </section>

          {/* KPIs */}
          <section style={{ marginBottom: 32 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
              <span className="dep-cable" />
              <h2 style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.025em' }}>Chiffres clés · 30 jours</h2>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
              {KPIS.map(k => <KpiCard key={k.label} k={k} />)}
            </div>
          </section>

          {/* Detail */}
          <section style={{ display: 'grid', gridTemplateColumns: '1.7fr 1fr', gap: 16, marginBottom: 24 }}>
            <div style={{
              background: 'var(--dep-white)', borderRadius: 16,
              border: '1px solid var(--dep-line-light)', padding: 20,
            }}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 16 }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, letterSpacing: '-0.02em' }}>Cash-flow · 90 jours</h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, fontSize: 11, color: 'var(--dep-grey-1)', fontFamily: 'var(--font-mono)' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ width: 10, height: 10, borderRadius: 2, background: 'var(--dep-yellow)' }} /> Cash-in
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ width: 4, height: 10, borderRadius: 1, background: 'var(--dep-red)', opacity: 0.7 }} /> Cash-out
                  </span>
                </div>
              </div>
              <CashFlowChart />
            </div>
            <div style={{
              background: 'var(--dep-white)', borderRadius: 16,
              border: '1px solid var(--dep-line-light)', padding: 20,
              display: 'flex', flexDirection: 'column',
            }}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 12 }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, letterSpacing: '-0.02em' }}>Flux récent</h3>
                <a href="#" style={{ fontSize: 12, color: 'var(--dep-grey-1)', textDecoration: 'none' }}>Tout voir →</a>
              </div>
              <FluxTimeline />
            </div>
          </section>

          
        </div>
      </div>
    </div>
  );
}


