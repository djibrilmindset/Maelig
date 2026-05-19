"use client"
// @ts-nocheck — design v2 prototype port, types ajoutés progressivement

import { useState as useVState, useEffect as useVEffect, useRef as useVRef } from "react"
import { DepMagnetic, DepReveal, DepDot, DepIcon, DepWaveform } from "../primitives"
/* DEP — Vocal Devis Editor (mobile, 4 étapes interactives). */

const ARTICLES_DEMO = [
  { id: 1, name: 'Tableau électrique 13 modules Hager', qty: 1, pu: 800, total: 800, conf: 'high' },
  { id: 2, name: 'Prises encastrées Legrand Céliane', qty: 12, pu: 35, total: 420, conf: 'high' },
  { id: 3, name: 'Disjoncteur différentiel 30mA type AC', qty: 4, pu: 68, total: 272, conf: 'medium' },
  { id: 4, name: 'Main d\'œuvre pose tableau', qty: 4, pu: 70, total: 280, conf: 'high' },
  { id: 5, name: 'Câblage rigide H07V-K 2.5mm² noir', qty: 1, pu: 145, total: 145, conf: 'low' },
];

function StepProgress({ step, steps }) {
  return (
    <div style={{
      position: 'sticky', top: 0, zIndex: 5,
      background: 'rgba(250,250,247,0.92)', backdropFilter: 'blur(12px)',
      padding: '12px 20px', borderBottom: '1px solid var(--dep-line-light)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <button style={{ background: 'transparent', border: 'none', padding: 0, cursor: 'pointer' }}>
          <DepIcon.back style={{ width: 22, height: 22, color: 'var(--dep-grey-1)' }} />
        </button>
        <div className="mono" style={{ fontSize: 11, color: 'var(--dep-grey-2)', letterSpacing: '0.14em', textTransform: 'uppercase' }}>
          Nouveau devis · étape {step + 1}/{steps.length}
        </div>
        <span style={{ flex: 1 }} />
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--dep-grey-2)' }}>
          <DepDot tone="green" size={6} /> auto-sauvé
        </span>
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        {steps.map((_, i) => (
          <div key={i} style={{
            flex: 1, height: 4, borderRadius: 2,
            background: i <= step ? 'var(--dep-yellow)' : 'var(--dep-line-light)',
            transition: 'background 0.3s',
          }} />
        ))}
      </div>
    </div>
  );
}

function VocalStepClient({ onNext }) {
  const [selected, setSelected] = useVState('cabinet-bouygues');
  const clients = [
    { id: 'cabinet-bouygues', name: 'Cabinet Bouygues SARL', addr: '12 rue de la Paix 75002 Paris', tag: 'Récurrent' },
    { id: 'mme-dupont',       name: 'Mme Dupont Sophie',   addr: '4 rue Lecourbe 92140 Clamart',   tag: 'Particulier' },
    { id: 'syndic-haussmann', name: 'Syndic Haussmann',     addr: '88 bd Haussmann 75008 Paris',   tag: 'Pro' },
  ];
  return (
    <div style={{ padding: '20px 20px 120px' }}>
      <h1 style={{ fontSize: 28, letterSpacing: '-0.03em', fontWeight: 700, marginBottom: 8 }}>Pour quel client ?</h1>
      <p style={{ fontSize: 14, color: 'var(--dep-grey-1)', marginBottom: 24 }}>Choisis dans ton carnet ou crée un nouveau</p>

      <div style={{
        background: 'var(--dep-white)', border: '1px solid var(--dep-line-light)',
        borderRadius: 14, padding: '12px 14px',
        display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16,
      }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--dep-grey-2)" strokeWidth="2"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4-4"/></svg>
        <input placeholder="Chercher un client" style={{
          border: 'none', outline: 'none', flex: 1, fontFamily: 'inherit', fontSize: 15, background: 'transparent',
        }} />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {clients.map(c => (
          <button key={c.id} onClick={() => setSelected(c.id)} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
            padding: '14px 16px', borderRadius: 14,
            background: 'var(--dep-white)',
            border: '1.5px solid', borderColor: selected === c.id ? 'var(--dep-yellow)' : 'var(--dep-line-light)',
            fontFamily: 'inherit', cursor: 'pointer', textAlign: 'left',
            transition: 'border-color 0.15s',
          }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 4, color: 'var(--dep-black)' }}>{c.name}</div>
              <div style={{ fontSize: 12, color: 'var(--dep-grey-2)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.addr}</div>
            </div>
            <span className="dep-pill dep-pill--on-light" style={{ flexShrink: 0 }}>{c.tag}</span>
          </button>
        ))}
      </div>

      <button style={{
        marginTop: 16, padding: '14px 16px', borderRadius: 14,
        border: '1.5px dashed var(--dep-line-light)',
        background: 'transparent', width: '100%', textAlign: 'left',
        fontFamily: 'inherit', fontSize: 15, color: 'var(--dep-grey-1)',
        cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <span style={{
          width: 28, height: 28, borderRadius: 8, background: 'var(--dep-yellow)',
          color: 'var(--dep-black)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 18,
        }}>+</span>
        Nouveau client
      </button>

      <BottomNext label="Continuer · chantier" onClick={onNext} disabled={!selected} />
    </div>
  );
}

function VocalStepChantier({ onNext }) {
  const types = ['Rénovation', 'Neuf', 'Dépannage', 'Maintenance'];
  const [type, setType] = useVState('Rénovation');
  return (
    <div style={{ padding: '20px 20px 120px' }}>
      <h1 style={{ fontSize: 28, letterSpacing: '-0.03em', fontWeight: 700, marginBottom: 8 }}>Le chantier</h1>
      <p style={{ fontSize: 14, color: 'var(--dep-grey-1)', marginBottom: 24 }}>Adresse et type, on enchaîne</p>

      <FormField label="Adresse chantier">
        <div style={{ position: 'relative' }}>
          <input defaultValue="12 rue de la Paix 75002 Paris" style={fieldInput} />
          <button style={{
            position: 'absolute', right: 6, top: 6, padding: '7px 10px',
            background: 'var(--dep-black)', color: 'var(--dep-paper)', border: 'none',
            borderRadius: 8, fontFamily: 'inherit', fontSize: 12, fontWeight: 600, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="10" r="3"/><path d="M12 2c-5 0-8 4-8 8 0 6 8 12 8 12s8-6 8-12c0-4-3-8-8-8z"/></svg>
            GPS
          </button>
        </div>
      </FormField>

      <FormField label="Type de chantier">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {types.map(t => (
            <button key={t} onClick={() => setType(t)} style={{
              padding: '14px 12px', borderRadius: 12,
              background: type === t ? 'var(--dep-black)' : 'var(--dep-white)',
              color: type === t ? 'var(--dep-yellow)' : 'var(--dep-black)',
              border: '1.5px solid', borderColor: type === t ? 'var(--dep-black)' : 'var(--dep-line-light)',
              fontFamily: 'inherit', fontSize: 15, fontWeight: 600, cursor: 'pointer',
            }}>{t}</button>
          ))}
        </div>
      </FormField>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <FormField label="Surface m²">
          <input defaultValue="64" style={{ ...fieldInput, fontFamily: 'var(--font-mono)' }} />
        </FormField>
        <FormField label="Étage / accès">
          <input defaultValue="3e étage · ascenseur" style={fieldInput} />
        </FormField>
      </div>

      <FormField label="Contexte" hint="Tu peux le dicter">
        <div style={{ position: 'relative' }}>
          <textarea defaultValue="Appartement haussmannien, faux plafonds à conserver, accès matin uniquement entre 8h et 12h" rows={3}
            style={{ ...fieldInput, height: 92, resize: 'none', paddingRight: 44 }} />
          <button style={{
            position: 'absolute', right: 8, top: 8, width: 32, height: 32, borderRadius: 16,
            background: 'var(--dep-yellow)', color: 'var(--dep-black)', border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}><DepIcon.mic style={{ width: 16, height: 16 }} /></button>
        </div>
      </FormField>

      <BottomNext label="Continuer · dicter les articles" onClick={onNext} />
    </div>
  );
}

function VocalStepArticles({ onNext }) {
  // State machine: idle → recording → processing → results
  const [phase, setPhase] = useVState('idle');
  const [seconds, setSeconds] = useVState(0);
  const [articles, setArticles] = useVState([]);
  const timer = useVRef(null);

  useVEffect(() => {
    if (phase !== 'recording') return;
    timer.current = setInterval(() => setSeconds(s => s + 1), 1000);
    return () => clearInterval(timer.current);
  }, [phase]);

  const fmt = (s) => `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;

  const startRec = () => {
    if (navigator.vibrate) navigator.vibrate(20);
    setSeconds(0); setPhase('recording');
  };
  const stopRec = () => {
    if (navigator.vibrate) navigator.vibrate([10, 50, 10]);
    setPhase('processing');
    setTimeout(() => { setArticles(ARTICLES_DEMO); setPhase('results'); }, 1900);
  };

  const total = articles.reduce((s, a) => s + a.total, 0);

  return (
    <div style={{ padding: '20px 20px 140px' }}>
      <h1 style={{ fontSize: 28, letterSpacing: '-0.03em', fontWeight: 700, marginBottom: 8 }}>Dicte tes articles</h1>
      <p style={{ fontSize: 14, color: 'var(--dep-grey-1)', marginBottom: 22 }}>
        Parle naturellement. Mon IA structure derrière
      </p>

      {/* Mic zone */}
      <div style={{
        background: phase === 'recording' ? 'var(--dep-black)' : 'var(--dep-white)',
        color: phase === 'recording' ? 'var(--dep-paper)' : 'var(--dep-black)',
        border: '1px solid', borderColor: phase === 'recording' ? 'var(--dep-black)' : 'var(--dep-line-light)',
        borderRadius: 24, padding: 28, textAlign: 'center', marginBottom: 24,
        position: 'relative', overflow: 'hidden',
        transition: 'all 0.25s ease',
      }}>
        {phase === 'idle' && (
          <>
            <button onClick={startRec} aria-label="Démarrer la dictée" style={{
              width: 160, height: 160, borderRadius: '50%',
              background: 'var(--dep-yellow)', color: 'var(--dep-black)',
              border: 'none', cursor: 'pointer', margin: '8px auto 20px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 18px 40px -12px rgba(245,197,24,0.5), inset 0 -4px 0 rgba(0,0,0,0.12)',
              transition: 'transform 0.15s ease',
            }}><DepIcon.mic style={{ width: 64, height: 64, strokeWidth: 2.4 }} /></button>
            <div style={{ fontSize: 14, color: 'var(--dep-grey-1)', maxWidth: 280, margin: '0 auto', lineHeight: 1.5 }}>
              Appuie pour dicter. Exemple : « tableau électrique 13 modules 800 euros, prises encastrées x12 à 35 € chacune, main d'œuvre 4h »
            </div>
          </>
        )}
        {phase === 'recording' && (
          <>
            <div style={{
              position: 'relative', width: 160, height: 160, margin: '8px auto 20px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <span style={{
                position: 'absolute', inset: 0, borderRadius: '50%',
                background: 'var(--dep-red)', opacity: 0.18,
                animation: 'dep-pulse-rec 1.4s ease-out infinite',
              }} />
              <button onClick={stopRec} aria-label="Arrêter" style={{
                width: 160, height: 160, borderRadius: '50%',
                background: 'var(--dep-red)', color: 'var(--dep-paper)',
                border: 'none', cursor: 'pointer', position: 'relative', zIndex: 2,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <span style={{ width: 36, height: 36, background: 'var(--dep-paper)', borderRadius: 6 }} />
              </button>
            </div>
            <div className="mono" style={{ fontSize: 32, fontWeight: 600, letterSpacing: '-0.03em', marginBottom: 10 }}>{fmt(seconds)}</div>
            <DepWaveform active />
            <div style={{ fontSize: 13, color: 'var(--dep-grey-3)', marginTop: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <span className="dep-rec-dot" style={{ width: 8, height: 8 }} /> J'écoute. Appuie pour arrêter
            </div>
          </>
        )}
        {phase === 'processing' && (
          <>
            <div style={{
              width: 160, height: 160, margin: '8px auto 20px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              borderRadius: '50%', background: 'var(--dep-paper-2)',
              position: 'relative', overflow: 'hidden',
            }}>
              <svg viewBox="0 0 64 64" width="80" height="80" style={{ animation: 'spin 1.6s linear infinite' }}>
                <circle cx="32" cy="32" r="28" fill="none" stroke="var(--dep-yellow)" strokeWidth="4" strokeDasharray="40 130" strokeLinecap="round"/>
              </svg>
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
            <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 6 }}>Mon IA réfléchit</div>
            <div style={{ fontSize: 13, color: 'var(--dep-grey-1)' }}>J'extrais tes articles, ça prend 2 secondes</div>
          </>
        )}
        {phase === 'results' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{
                  width: 36, height: 36, borderRadius: 18, background: 'var(--dep-green)',
                  color: 'white', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                }}><DepIcon.check style={{ width: 18, height: 18 }} /></span>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontWeight: 700, fontSize: 18, letterSpacing: '-0.02em' }}>Voici ce que j'ai compris</div>
                  <div style={{ fontSize: 12, color: 'var(--dep-grey-1)' }}>5 articles · dictée 1:42 · cache local OK</div>
                </div>
              </div>
              <button onClick={() => setPhase('idle')} style={{
                padding: '8px 12px', borderRadius: 10, border: '1px solid var(--dep-line-light)',
                background: 'transparent', fontFamily: 'inherit', fontSize: 13, fontWeight: 500, cursor: 'pointer',
              }}>Re-dicter</button>
            </div>
          </div>
        )}
      </div>

      {phase === 'results' && (
        <>
          <div className="dep-eyebrow" style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>Articles extraits</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10, color: 'var(--dep-grey-2)' }}>
              <DepDot tone="green" size={6} /> haute
              <DepDot tone="amber" size={6} /> moyenne
              <DepDot tone="red"   size={6} /> à vérifier
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {articles.map((a, idx) => (
              <DepReveal key={a.id} delay={idx * 80}>
                <ArticleCard article={a} />
              </DepReveal>
            ))}
          </div>

          <div style={{
            marginTop: 18, padding: 16, borderRadius: 14,
            background: 'var(--dep-black)', color: 'var(--dep-paper)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div>
              <div style={{ fontSize: 12, color: 'var(--dep-grey-3)', textTransform: 'uppercase', letterSpacing: '0.14em' }}>Total HT estimé</div>
              <div className="mono tnum" style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.03em', marginTop: 2 }}>{total.toLocaleString('fr-FR')} €</div>
            </div>
            <span className="dep-pill" style={{ borderColor: 'var(--dep-yellow)', color: 'var(--dep-yellow)' }}>+ Article</span>
          </div>

          <BottomNext label="Continuer · valider et envoyer" onClick={onNext} />
        </>
      )}
    </div>
  );
}

function ArticleCard({ article }) {
  const confMap = {
    high:   { border: 'var(--dep-line-light)', tone: 'green',  hint: null },
    medium: { border: 'var(--dep-amber)',      tone: 'amber',  hint: 'Vérifie la quantité' },
    low:    { border: 'var(--dep-blush)',      tone: 'red',    hint: 'Je n\'étais pas sûr ici, re-jouer l\'audio', dashed: true },
  };
  const c = confMap[article.conf];
  const nameStyle = article.conf === 'low'
    ? { fontStyle: 'italic', color: 'var(--dep-grey-2)' }
    : article.conf === 'medium'
    ? { color: 'var(--dep-black)' }
    : { color: 'var(--dep-black)' };
  return (
    <div style={{
      padding: 14, borderRadius: 14,
      background: 'var(--dep-white)',
      border: `1.5px ${c.dashed ? 'dashed' : 'solid'} ${c.border}`,
      position: 'relative',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <DepDot tone={c.tone} size={8} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 600, letterSpacing: '-0.01em', lineHeight: 1.3, ...nameStyle }}>
            {article.conf === 'low' ? `‹ ${article.name} ›` : article.name}
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 16, marginTop: 8, fontFamily: 'var(--font-mono)', fontSize: 13 }}>
            <span><span style={{ color: 'var(--dep-grey-2)' }}>qté </span><span style={{ fontWeight: 600 }}>{article.qty}</span></span>
            <span><span style={{ color: 'var(--dep-grey-2)' }}>PU </span><span style={{ fontWeight: 600 }}>{article.pu} €</span></span>
            <span style={{ marginLeft: 'auto', fontWeight: 700, fontSize: 16 }}>{article.total.toLocaleString('fr-FR')} €</span>
          </div>
          {c.hint && (
            <div style={{ fontSize: 12, color: 'var(--dep-grey-2)', marginTop: 8, fontStyle: 'italic' }}>
              {c.hint}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function VocalStepValidation({ onSend }) {
  return (
    <div style={{ padding: '20px 20px 140px' }}>
      <h1 style={{ fontSize: 28, letterSpacing: '-0.03em', fontWeight: 700, marginBottom: 8 }}>Récap avant envoi</h1>
      <p style={{ fontSize: 14, color: 'var(--dep-grey-1)', marginBottom: 22 }}>Relis 30 secondes, on envoie au client</p>

      <div style={{
        background: 'var(--dep-white)', borderRadius: 16,
        border: '1px solid var(--dep-line-light)', overflow: 'hidden',
      }}>
        <div style={{ padding: '16px 18px', borderBottom: '1px solid var(--dep-line-light)' }}>
          <div className="dep-eyebrow" style={{ marginBottom: 4 }}>Client</div>
          <div style={{ fontWeight: 600, fontSize: 15 }}>Cabinet Bouygues SARL</div>
          <div style={{ fontSize: 12, color: 'var(--dep-grey-1)', marginTop: 2 }}>12 rue de la Paix 75002 Paris</div>
        </div>
        <div style={{ padding: '16px 18px', borderBottom: '1px solid var(--dep-line-light)' }}>
          <div className="dep-eyebrow" style={{ marginBottom: 8 }}>5 articles dictés</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontFamily: 'var(--font-mono)', fontSize: 13 }}>
            {ARTICLES_DEMO.map(a => (
              <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ flex: 1, color: 'var(--dep-grey-1)' }}>{a.qty} × {a.name.slice(0,28)}…</span>
                <span className="tnum" style={{ fontWeight: 600, color: 'var(--dep-black)' }}>{a.total} €</span>
              </div>
            ))}
          </div>
        </div>
        <div style={{ padding: '18px 18px', display: 'flex', flexDirection: 'column', gap: 8, fontFamily: 'var(--font-mono)', fontSize: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--dep-grey-1)' }}>Total HT</span><span className="tnum" style={{ fontWeight: 600 }}>1 917,00 €</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--dep-grey-1)' }}>TVA 20%</span><span className="tnum" style={{ fontWeight: 600 }}>383,40 €</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--dep-line-light)', paddingTop: 10, marginTop: 2 }}>
            <span style={{ fontWeight: 700, color: 'var(--dep-black)' }}>Total TTC</span>
            <span className="tnum" style={{ fontWeight: 700, fontSize: 20 }}>2 300,40 €</span>
          </div>
        </div>
      </div>

      <div style={{ marginTop: 18, display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13 }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <input type="checkbox" defaultChecked style={{ accentColor: 'var(--dep-yellow)', width: 18, height: 18 }} />
          Paiement 30 jours net (défaut)
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <input type="checkbox" defaultChecked style={{ accentColor: 'var(--dep-yellow)', width: 18, height: 18 }} />
          Format Factur-X 2026 PDF/A-3
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <input type="checkbox" style={{ accentColor: 'var(--dep-yellow)', width: 18, height: 18 }} />
          Signature électronique demandée
        </label>
      </div>

      <BottomActions onSend={onSend} />
    </div>
  );
}

function VocalStepSent({ onReset }) {
  return (
    <div style={{ padding: '60px 28px', textAlign: 'center', minHeight: 600 }}>
      <div style={{
        width: 92, height: 92, borderRadius: 46, margin: '0 auto 28px',
        background: 'var(--dep-yellow)', color: 'var(--dep-black)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <DepIcon.check style={{ width: 44, height: 44, strokeWidth: 3 }} />
      </div>
      <h1 style={{ fontSize: 32, letterSpacing: '-0.03em', fontWeight: 700, marginBottom: 12 }}>Devis envoyé</h1>
      <p style={{ fontSize: 15, color: 'var(--dep-grey-1)', lineHeight: 1.5, marginBottom: 28, maxWidth: 280, margin: '0 auto 28px' }}>
        Cabinet Bouygues SARL reçoit ton devis 2 300,40 € TTC. Relance auto à J+8 si pas de réponse
      </p>

      <div style={{
        background: 'var(--dep-white)', borderRadius: 16,
        border: '1px solid var(--dep-line-light)', padding: 18, marginBottom: 22,
        textAlign: 'left', fontFamily: 'var(--font-mono)', fontSize: 12,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
          <span style={{ color: 'var(--dep-grey-1)' }}>N° devis</span><span className="tnum">DEP-2026-0142</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
          <span style={{ color: 'var(--dep-grey-1)' }}>Envoyé</span><span>Aujourd'hui 11:42</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: 'var(--dep-grey-1)' }}>Temps total</span><span>4 min 11 s</span>
        </div>
      </div>

      <button onClick={onReset} className="dep-btn dep-btn--primary" style={{ width: '100%' }}>
        Nouveau devis
        <DepIcon.arrow style={{ width: 16, height: 16 }} />
      </button>
      <button style={{
        marginTop: 10, width: '100%', padding: '14px',
        background: 'transparent', border: '1px solid var(--dep-line-light)',
        borderRadius: 12, fontFamily: 'inherit', fontWeight: 500, fontSize: 14, cursor: 'pointer',
      }}>Retour au tableau de bord</button>
    </div>
  );
}

function FormField({ label, hint, children }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--dep-black)' }}>{label}</span>
        {hint && <span style={{ fontSize: 12, color: 'var(--dep-grey-2)' }}>{hint}</span>}
      </div>
      {children}
    </div>
  );
}
const fieldInput = {
  width: '100%', padding: '14px 14px', borderRadius: 12,
  border: '1.5px solid var(--dep-line-light)', background: 'var(--dep-white)',
  fontFamily: 'var(--font-display)', fontSize: 15, outline: 'none',
  boxSizing: 'border-box',
};

function BottomNext({ label, onClick, disabled }) {
  return (
    <div style={{
      position: 'absolute', left: 0, right: 0, bottom: 0,
      padding: '16px 20px 24px',
      background: 'linear-gradient(to top, var(--dep-paper) 75%, rgba(250,250,247,0))',
    }}>
      <button onClick={onClick} disabled={disabled} className="dep-btn dep-btn--primary" style={{
        width: '100%', padding: '18px', fontSize: 16, opacity: disabled ? 0.5 : 1,
      }}>
        {label}
        <DepIcon.arrow style={{ width: 16, height: 16 }} />
      </button>
    </div>
  );
}

function BottomActions({ onSend }) {
  return (
    <div style={{
      position: 'absolute', left: 0, right: 0, bottom: 0,
      padding: '16px 20px 24px', display: 'flex', gap: 10,
      background: 'linear-gradient(to top, var(--dep-paper) 75%, rgba(250,250,247,0))',
    }}>
      <button style={{
        padding: '18px 18px', background: 'transparent', border: '1px solid var(--dep-line-light)',
        borderRadius: 12, fontFamily: 'inherit', fontWeight: 600, fontSize: 14, cursor: 'pointer',
      }}>Brouillon</button>
      <DepMagnetic strength={0.15} style={{ flex: 1 }}>
        <button onClick={onSend} className="dep-btn dep-btn--primary" style={{
          width: '100%', padding: '18px', fontSize: 16,
        }}>
          Envoyer au client
          <DepIcon.send style={{ width: 16, height: 16 }} />
        </button>
      </DepMagnetic>
    </div>
  );
}

export default function VocalEditor() {
  const STEPS = ['client', 'chantier', 'articles', 'validation', 'sent'];
  const [step, setStep] = useVState(0);
  const next = () => setStep(s => Math.min(STEPS.length - 1, s + 1));
  const reset = () => setStep(0);

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      padding: '40px 0', background: '#1a1916',
      minHeight: '100%', position: 'relative',
    }}>
      <div className="mono" style={{
        position: 'absolute', top: 14, left: 24,
        fontSize: 11, letterSpacing: '0.16em', color: 'rgba(255,255,255,0.4)',
        textTransform: 'uppercase',
      }}>02 — Vocal Devis Editor · mobile</div>

      <>
        <div style={{ position: 'absolute', inset: 0, top: 44, display: 'flex', flexDirection: 'column', overflow: 'hidden' }} className="dep">
          {step < 4 && <StepProgress step={step} steps={['client','chantier','articles','validation']} />}
          <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', position: 'relative' }}>
            {step === 0 && <VocalStepClient onNext={next} />}
            {step === 1 && <VocalStepChantier onNext={next} />}
            {step === 2 && <VocalStepArticles onNext={next} />}
            {step === 3 && <VocalStepValidation onSend={next} />}
            {step === 4 && <VocalStepSent onReset={reset} />}
          </div>
        </div>
      </>

      {/* Quick stepper for demo */}
      <div style={{
        marginTop: 28, display: 'flex', gap: 6, padding: 6,
        background: 'rgba(255,255,255,0.06)', borderRadius: 999,
        border: '1px solid rgba(255,255,255,0.08)',
      }}>
        {['Client', 'Chantier', 'Vocal', 'Validation', 'Envoyé'].map((l, i) => (
          <button key={l} onClick={() => setStep(i)} style={{
            padding: '6px 12px', borderRadius: 999,
            background: step === i ? 'var(--dep-yellow)' : 'transparent',
            color: step === i ? 'var(--dep-black)' : 'rgba(255,255,255,0.7)',
            border: 'none', cursor: 'pointer', fontFamily: 'var(--font-display)',
            fontSize: 12, fontWeight: 600,
          }}>{l}</button>
        ))}
      </div>

      
    </div>
  );
}


