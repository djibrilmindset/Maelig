"use client"
// @ts-nocheck — design v2 prototype port, types ajoutés progressivement

import { useState as useCState, useEffect as useCEffect, useRef as useCRef } from "react"
import { DepDot, DepIcon, DepWaveform } from "../primitives"
/* DEP — Chat bilatéral traduit patron ↔ employé.
   Vue patron (FR) et vue employé (darija RTL) côte à côte pour mettre en
   évidence la traduction. */

// Same conversation, expressed from two perspectives.
// `original` is what was actually typed/spoken; `translated` is the
// machine-translated version shown to the other side.
const THREAD = [
  {
    id: 1, author: 'maelig',
    fr: 'Karim, range les disjoncteurs 16A au tableau de droite avant midi',
    ar: 'كريم، رتّب الديجونكتورات 16 أمبير ف التابلو ديك اللي ليمين قبل نصّ النهار',
    when: '10:14', conf: 'high',
  },
  {
    id: 2, author: 'karim', type: 'voice',
    fr: 'C\'est bon, c\'est fait. J\'ai juste un souci avec un des supports, il bouge un peu',
    ar: 'صافي، خدمت. غير عندي مشكل ف واحد البّقي ديال الإيداع، كيهتز شويّة',
    when: '10:32', conf: 'high', duration: '00:18',
  },
  {
    id: 3, author: 'maelig', type: 'photo',
    fr: 'Envoie-moi une photo du support, je regarde',
    ar: 'صيفطلي صورة ديال البّقي، نشوف',
    when: '10:33', conf: 'high',
  },
  {
    id: 4, author: 'karim', type: 'image',
    fr: '',
    ar: '',
    when: '10:36', conf: null, image: true,
  },
  {
    id: 5, author: 'karim',
    fr: 'Là, regarde, le mur est creux derrière',
    ar: 'هنا، شوف، الحيط خاوي من ورا',
    when: '10:37', conf: 'medium',
  },
  {
    id: 6, author: 'maelig',
    fr: 'OK, mets une cheville Molly avec une vis de 5. J\'arrive sur place à 14h',
    ar: 'واخّا، حط شفيل موليي مع فيس ديال 5. غادي نوصل تما ف 2 ديال العشيّة',
    when: '10:38', conf: 'high',
  },
  {
    id: 7, type: 'system',
    fr: 'Karim a marqué cette consigne comme lue',
    ar: 'كريم قرا اللاسالة',
    when: '10:39',
  },
];

function ChatHeader({ partner, statusLabel, langLabel, flag, dir, perspective }) {
  return (
    <header style={{
      padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12,
      borderBottom: '1px solid var(--dep-line-light)',
      background: 'var(--dep-white)',
      direction: dir,
    }}>
      <div style={{
        width: 40, height: 40, borderRadius: 20,
        background: partner === 'Karim' ? '#3a8a73' : '#2A2A2A',
        color: 'var(--dep-paper)', display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontWeight: 700, fontFamily: 'var(--font-display)', fontSize: 16,
        flexShrink: 0,
      }}>{partner[0]}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, letterSpacing: '-0.02em', fontSize: 16, display: 'flex', alignItems: 'center', gap: 6 }}>
          {partner}
          <span style={{
            fontFamily: 'var(--font-mono)', fontSize: 10, padding: '2px 6px',
            borderRadius: 4, background: 'var(--dep-paper-2)', color: 'var(--dep-grey-1)',
            letterSpacing: '0.06em',
          }}>{flag} {langLabel}</span>
        </div>
        <div style={{ fontSize: 11, color: 'var(--dep-grey-2)', display: 'flex', alignItems: 'center', gap: 6 }}>
          <DepDot tone="green" size={6} /> {statusLabel}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        <button style={iconBtn}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 4h4l2 5-3 2c1 2 3 4 5 5l2-3 5 2v4c0 1-1 2-2 2-9 0-16-7-16-16 0-1 1-1 2-1z"/></svg>
        </button>
        <button style={iconBtn}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>
        </button>
      </div>
      <div style={{
        position: 'absolute', top: -22, [dir === 'rtl' ? 'right' : 'left']: 0,
        fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.16em',
        color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase',
      }}>{perspective}</div>
    </header>
  );
}

const iconBtn = {
  width: 34, height: 34, borderRadius: 17,
  background: 'transparent', border: '1px solid var(--dep-line-light)', cursor: 'pointer',
  color: 'var(--dep-grey-1)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  padding: 0,
};

function MsgBubble({ msg, perspective, showOriginal }) {
  // perspective = 'maelig' (patron, lit en FR) | 'karim' (employé, lit en darija)
  if (msg.type === 'system') {
    return (
      <div style={{ textAlign: 'center', padding: '8px 16px', color: 'var(--dep-grey-2)', fontSize: 12, fontStyle: 'italic' }}>
        {perspective === 'maelig' ? msg.fr : msg.ar}
        <span className="mono" style={{ marginLeft: 8, fontSize: 10 }}>{msg.when}</span>
      </div>
    );
  }

  const isMine = msg.author === perspective;
  const myLang = perspective === 'maelig' ? 'fr' : 'ar';
  const dir = perspective === 'maelig' ? 'ltr' : 'rtl';
  const otherDir = perspective === 'maelig' ? 'rtl' : 'ltr';

  // What I see depends on whether the message is mine.
  // - Mine: I see what I typed (in my language), no translation needed
  // - Other's: I see the auto-translated version (in my language), with chevron to original
  const primaryText = isMine ? msg[myLang] : msg[myLang];
  const originalText = isMine ? null : msg[msg.author === 'maelig' ? 'fr' : 'ar'];
  const originalDir = isMine ? null : (msg.author === 'maelig' ? 'ltr' : 'rtl');

  const align = isMine ? (dir === 'rtl' ? 'flex-start' : 'flex-end') : (dir === 'rtl' ? 'flex-end' : 'flex-start');
  const radius = isMine
    ? (dir === 'rtl' ? '20px 20px 20px 4px' : '20px 20px 4px 20px')
    : (dir === 'rtl' ? '20px 20px 4px 20px' : '20px 20px 20px 4px');

  const confColor = msg.conf === 'high' ? 'var(--dep-green)' : msg.conf === 'medium' ? 'var(--dep-amber)' : 'var(--dep-red)';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: align, gap: 4 }}>
      <div style={{
        maxWidth: '78%',
        padding: msg.type === 'image' ? 4 : '10px 14px',
        background: isMine ? 'var(--dep-yellow)' : 'var(--dep-white)',
        color: 'var(--dep-black)',
        border: isMine ? 'none' : '1px solid var(--dep-line-light)',
        borderRadius: radius,
        fontSize: 15.5, fontWeight: 500, lineHeight: 1.4,
        direction: dir, textAlign: dir === 'rtl' ? 'right' : 'left',
        position: 'relative',
      }}>
        {msg.type === 'image' && (
          <div style={{
            width: 200, height: 140, borderRadius: 16, overflow: 'hidden',
            background: 'linear-gradient(135deg, #2A2A2A 0%, #3D3D3D 50%, #6B6B6B 100%)',
            position: 'relative', display: 'flex', alignItems: 'flex-end',
          }}>
            <svg viewBox="0 0 200 140" style={{ position: 'absolute', inset: 0 }}>
              <rect x="0" y="0" width="200" height="140" fill="#3a3530"/>
              <rect x="20" y="40" width="80" height="80" fill="#7a6c5e"/>
              <rect x="100" y="0" width="100" height="140" fill="#5a4f44"/>
              <rect x="56" y="60" width="22" height="34" fill="#222"/>
              <path d="M0 90 Q40 80 100 95 T200 88 V140 H0Z" fill="#26211c"/>
            </svg>
            <span style={{ position: 'relative', zIndex: 2, padding: 8, color: '#fff', fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.1em', textShadow: '0 1px 2px rgba(0,0,0,0.6)' }}>
              IMG_0238.HEIC · 1.4 MB
            </span>
          </div>
        )}
        {msg.type === 'voice' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingTop: 2, paddingBottom: 4 }}>
            <button style={{
              width: 32, height: 32, borderRadius: 16, background: 'var(--dep-black)',
              color: 'var(--dep-yellow)', border: 'none', cursor: 'pointer',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <svg width="10" height="12" viewBox="0 0 10 12" fill="currentColor"><path d="M0 0v12l10-6z"/></svg>
            </button>
            <DepWaveform active={false} bars={14} height={20} color="var(--dep-black)" />
            <span className="mono" style={{ fontSize: 11, color: 'var(--dep-grey-1)' }}>{msg.duration}</span>
          </div>
        )}
        {msg.type !== 'image' && (
          <div>{primaryText}</div>
        )}
      </div>

      {/* Meta: timestamp + chevron 'voir original' */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        fontSize: 11, color: 'var(--dep-grey-2)',
        direction: 'ltr',
      }}>
        {!isMine && msg.conf && (
          <button style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            background: 'transparent', border: 'none', cursor: 'pointer',
            color: 'var(--dep-grey-2)', fontFamily: 'inherit', fontSize: 11, padding: 0,
          }}>
            <DepDot tone={msg.conf === 'high' ? 'green' : msg.conf === 'medium' ? 'amber' : 'red'} size={6} />
            traduit auto
            <svg width="8" height="8" viewBox="0 0 8 8" fill="none" stroke="currentColor" strokeWidth="1.6">
              <path d={showOriginal ? 'M2 3l2 2 2-2' : 'M3 2l2 2-2 2'} />
            </svg>
          </button>
        )}
        <span className="mono">{msg.when}</span>
      </div>

      {/* Show original below */}
      {!isMine && showOriginal && originalText && (
        <div style={{
          maxWidth: '78%', padding: '8px 12px', marginTop: 2,
          background: 'transparent', border: '1px dashed var(--dep-line-light)',
          borderRadius: 12, fontSize: 13, color: 'var(--dep-grey-1)',
          fontStyle: 'italic',
          direction: originalDir, textAlign: originalDir === 'rtl' ? 'right' : 'left',
        }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--dep-grey-2)', display: 'block', marginBottom: 4, fontStyle: 'normal' }}>
            ORIGINAL · {msg.author === 'maelig' ? 'FR' : 'AR-MA'}
          </span>
          {originalText}
        </div>
      )}
    </div>
  );
}

function ChatComposer({ perspective, dir }) {
  const [val, setVal] = useCState('');
  const placeholder = perspective === 'maelig' ? 'Écris en français' : 'كتب بالدارجة';
  return (
    <div style={{
      padding: '12px 14px', background: 'var(--dep-white)',
      borderTop: '1px solid var(--dep-line-light)',
      display: 'flex', alignItems: 'center', gap: 8,
      direction: dir,
    }}>
      <button style={{ ...iconBtn, width: 38, height: 38, borderRadius: 19 }}>
        <DepIcon.camera style={{ width: 16, height: 16 }} />
      </button>
      <div style={{
        flex: 1, background: 'var(--dep-paper-2)', borderRadius: 22,
        display: 'flex', alignItems: 'center', padding: '4px 12px',
      }}>
        <input
          value={val} onChange={e => setVal(e.target.value)}
          placeholder={placeholder}
          dir={dir}
          style={{
            border: 'none', outline: 'none', background: 'transparent',
            flex: 1, padding: '8px 4px', fontFamily: 'inherit', fontSize: 15,
          }}
        />
      </div>
      {val.trim() ? (
        <button style={{
          width: 42, height: 42, borderRadius: 21, background: 'var(--dep-yellow)',
          color: 'var(--dep-black)', border: 'none', cursor: 'pointer',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <DepIcon.send style={{ width: 16, height: 16, transform: dir === 'rtl' ? 'scaleX(-1)' : 'none' }} />
        </button>
      ) : (
        <button style={{
          width: perspective === 'karim' ? 60 : 42, height: 42,
          borderRadius: 21, background: 'var(--dep-yellow)',
          color: 'var(--dep-black)', border: 'none', cursor: 'pointer',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: perspective === 'karim' ? '0 8px 20px -6px rgba(245,197,24,0.5)' : 'none',
        }}>
          <DepIcon.mic style={{ width: perspective === 'karim' ? 22 : 16, height: perspective === 'karim' ? 22 : 16, strokeWidth: 2.4 }} />
        </button>
      )}
    </div>
  );
}

function ChatView({ perspective }) {
  const isPatron = perspective === 'maelig';
  const [showOriginal, setShowOriginal] = useCState(null); // null | msgId
  const [showAll, setShowAll] = useCState(false);
  const dir = isPatron ? 'ltr' : 'rtl';

  const partner = isPatron
    ? { name: 'Karim', status: 'sur chantier Bagnolet · il y a 2 min', flag: '🇲🇦', lang: 'AR-MA' }
    : { name: 'Maelig', status: 'patron · en ligne',                  flag: '🇫🇷', lang: 'FR' };

  return (
    <div style={{
      width: '100%', height: '100%', position: 'relative',
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
      background: 'var(--dep-paper)',
    }} className="dep">
      <ChatHeader
        partner={partner.name}
        statusLabel={partner.status}
        langLabel={partner.lang}
        flag={partner.flag}
        dir={dir}
        perspective={isPatron ? '👔 VUE PATRON · MAELIG (FR)' : '👷 VUE EMPLOYÉ · KARIM (AR-MA, RTL)'}
      />

      {/* Toggle "toujours montrer l'original" */}
      <div style={{
        padding: '8px 18px', background: 'var(--dep-paper-2)',
        borderBottom: '1px solid var(--dep-line-light)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        fontSize: 12, color: 'var(--dep-grey-1)', direction: dir,
      }}>
        <span>Toujours afficher l'original aussi</span>
        <button onClick={() => setShowAll(s => !s)} aria-pressed={showAll} style={{
          width: 36, height: 22, borderRadius: 11, padding: 2,
          background: showAll ? 'var(--dep-yellow)' : 'var(--dep-line-light)',
          border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center',
          justifyContent: showAll ? 'flex-end' : 'flex-start',
          transition: 'all 0.2s ease',
        }}>
          <span style={{ width: 18, height: 18, borderRadius: '50%', background: showAll ? 'var(--dep-black)' : 'var(--dep-grey-3)' }} />
        </button>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '14px 14px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        {THREAD.map(msg => (
          <div key={msg.id} onClick={() => msg.type !== 'system' && msg.author !== perspective && setShowOriginal(showOriginal === msg.id ? null : msg.id)} style={{ cursor: msg.type !== 'system' ? 'pointer' : 'default' }}>
            <MsgBubble msg={msg} perspective={perspective} showOriginal={showAll || showOriginal === msg.id} />
          </div>
        ))}

        {/* Typing indicator */}
        <div style={{ display: 'flex', justifyContent: isPatron ? 'flex-start' : 'flex-end' }}>
          <div style={{
            padding: '12px 16px', background: 'var(--dep-white)',
            border: '1px solid var(--dep-line-light)',
            borderRadius: isPatron ? '20px 20px 20px 4px' : '20px 20px 4px 20px',
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <span style={{
              display: 'inline-flex', gap: 4,
            }}>
              {[0, 0.2, 0.4].map((d, i) => (
                <span key={i} style={{
                  width: 6, height: 6, borderRadius: 3, background: 'var(--dep-grey-2)',
                  animation: `dep-typing 1.2s ${d}s ease-in-out infinite`,
                }} />
              ))}
            </span>
            <span style={{ fontSize: 11, color: 'var(--dep-grey-2)' }}>
              {isPatron ? 'Karim écrit' : 'الباطرون كيكتب'}
            </span>
          </div>
        </div>
        <style>{`@keyframes dep-typing { 0%, 60%, 100% { opacity: 0.3; transform: translateY(0); } 30% { opacity: 1; transform: translateY(-3px); } }`}</style>
      </div>

      <ChatComposer perspective={perspective} dir={dir} />
    </div>
  );
}

export default function Chat() {
  return (
    <div style={{
      width: '100%', minHeight: '100%', background: '#1a1916',
      padding: '60px 56px 32px', position: 'relative',
    }} className="dep dep--dark">
      <div className="mono" style={{
        fontSize: 11, letterSpacing: '0.16em', color: 'rgba(255,255,255,0.4)',
        textTransform: 'uppercase', marginBottom: 28,
      }}>
        05 — Chat bilatéral traduit · vue patron ⇄ vue employé (split)
      </div>

      <div style={{
        display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 32,
        justifyItems: 'center', alignItems: 'start', maxWidth: 1320, margin: '0 auto',
      }}>
        {/* Patron */}
        <PhoneInCanvas perspective="maelig" />

        {/* Center: translation pipeline mockup */}
        <div style={{
          width: 180, marginTop: 80, position: 'relative',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18,
        }}>
          <div style={{
            padding: '12px 14px', borderRadius: 14, background: 'var(--dep-black-2)',
            border: '1px solid var(--dep-line-dark)', textAlign: 'center',
          }}>
            <div className="mono" style={{ fontSize: 9, letterSpacing: '0.18em', color: 'var(--dep-yellow)', marginBottom: 6 }}>
              MOTEUR DEP
            </div>
            <div style={{ fontSize: 11, color: 'var(--dep-grey-3)', lineHeight: 1.45 }}>
              paraformer-v2 → qwen-plus → cache SHA256 30j
            </div>
          </div>
          <svg width="120" height="100" viewBox="0 0 120 100" fill="none">
            <path d="M10 20 Q60 5 110 20" stroke="var(--dep-yellow)" strokeWidth="1.5" fill="none" strokeDasharray="4 4">
              <animate attributeName="stroke-dashoffset" from="0" to="-16" dur="1.5s" repeatCount="indefinite" />
            </path>
            <path d="M10 80 Q60 95 110 80" stroke="var(--dep-yellow)" strokeWidth="1.5" fill="none" strokeDasharray="4 4">
              <animate attributeName="stroke-dashoffset" from="0" to="16" dur="1.5s" repeatCount="indefinite" />
            </path>
            <polygon points="105,15 115,20 105,25" fill="var(--dep-yellow)" />
            <polygon points="15,75 5,80 15,85" fill="var(--dep-yellow)" />
            <text x="60" y="55" textAnchor="middle" fontFamily="var(--font-mono)" fontSize="9" fill="var(--dep-grey-3)" letterSpacing="2">
              FR ⇄ AR-MA
            </text>
          </svg>
          <div className="mono" style={{ fontSize: 10, color: 'var(--dep-grey-3)', textAlign: 'center', lineHeight: 1.5 }}>
            « Tes messages sont traduits par IA, jamais lus par un humain DEP »
          </div>
        </div>

        {/* Karim */}
        <PhoneInCanvas perspective="karim" />
      </div>

      
    </div>
  );
}

function PhoneInCanvas({ perspective }) {
  const isPatron = perspective === 'maelig';
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
      <div className="mono" style={{
        fontSize: 11, letterSpacing: '0.16em',
        color: isPatron ? 'var(--dep-yellow)' : 'var(--dep-green)',
        textTransform: 'uppercase',
      }}>
        {isPatron ? 'Vue Patron · Maelig · FR' : 'Vue Employé · Karim · AR-MA RTL'}
      </div>
      <>
        <div style={{ position: 'absolute', inset: 0, top: 44, display: 'flex', flexDirection: 'column' }}>
          <ChatView perspective={perspective} />
        </div>
      </>
    </div>
  );
}


