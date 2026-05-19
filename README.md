# DEP — Plateforme de gestion électrique

> **De la voix au virement** — le devis et la facture d'électricien à la voix.
> Conçu pour les chefs d'entreprise qui veulent gagner du temps sans bidouille.

[![Made for Maelig](https://img.shields.io/badge/made%20for-Maelig-FFD500?style=flat-square)](https://github.com/maelig21)
[![Next.js 15](https://img.shields.io/badge/Next.js-15-black?style=flat-square)](https://nextjs.org)
[![Supabase](https://img.shields.io/badge/Supabase-Postgres-3ECF8E?style=flat-square)](https://supabase.com)

## ⚡ Stack

| Couche | Choix |
| --- | --- |
| Front | Next.js 15 (app router) · React 19 · Tailwind v4 · shadcn/ui · Framer Motion |
| Backend | Server actions Next.js · Edge runtime |
| Base de données | Supabase (Postgres 17 · RLS multi-tenant · 5 buckets storage) |
| Auth | Supabase Auth (email/password + magic link + reset) |
| Voice → texte | DashScope `paraformer-v2` (multilingue, ASR async) |
| Correction FR + extraction articles | DashScope `qwen-turbo` + `qwen-plus` (JSON mode) |
| Paiement | Stripe Checkout + Customer Portal (100€/mois, 14j trial, +5€/esclave) |
| Email transactionnel + relances | Resend |
| PDF devis / facture | Puppeteer Edge / @react-pdf/renderer (à venir) |
| Hébergement | Vercel (edge worldwide) |

## 🗂 Structure

```
dep-electrique/
├── _assets/                   logos + visuels source
├── _research/                 analyses concurrentielles (Bright Data, etc.)
├── web/                       application Next.js 15
│   ├── public/                static (logo, favicon)
│   ├── src/
│   │   ├── app/               routes (app router)
│   │   │   ├── (auth)/        connexion · inscription · oubli · reinit
│   │   │   ├── (app)/         tableau de bord · devis · clients · catalogue · paramètres
│   │   │   ├── api/           voice/transcribe · text/correct · auth/signout · stripe/webhook · …
│   │   │   ├── globals.css    design tokens DEP (palette logo)
│   │   │   ├── layout.tsx     root (Inter + Bricolage Grotesque + JetBrains Mono)
│   │   │   └── page.tsx       landing marketing
│   │   ├── components/
│   │   │   ├── brand/         logo DEP
│   │   │   ├── ui/            primitives (button, input, card)
│   │   │   ├── marketing/     hero, features, pricing, marquee, nav
│   │   │   ├── voice/         recorder, smart-textarea (correction live)
│   │   │   ├── devis/         editor, table
│   │   │   └── app/           sidebar, topbar, empty-state
│   │   ├── lib/
│   │   │   ├── supabase/      client + server + admin + types
│   │   │   ├── llm/           dashscope (chat), asr (paraformer)
│   │   │   ├── actions/       server actions (devis, clients, articles)
│   │   │   ├── devis-status.ts
│   │   │   └── utils.ts       cn, formatEUR, formatDateFR
│   │   └── middleware.ts      auth gate + security headers
│   └── supabase/migrations/   schema initial (12 tables + RLS + buckets)
└── README.md (ce fichier)
```

## 🔐 Variables d'environnement (`web/.env.local`)

Toutes les clés sont déjà câblées en local. Pour Vercel, recopiez les variables depuis `.env.example` et complétez :

- `NEXT_PUBLIC_SUPABASE_URL` · `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` · `SUPABASE_SERVICE_ROLE_KEY`
- `DASHSCOPE_API_KEY` (ASR + LLM chinois)
- `STRIPE_SECRET_KEY` · `STRIPE_WEBHOOK_SECRET` · `STRIPE_PRICE_MAIN` · `STRIPE_PRICE_SLAVE`
- `RESEND_API_KEY` · `RESEND_FROM`
- `DEP_ADMIN_EMAILS=ayouneslead@gmail.com` (admin transversal)

## 🚀 Démarrage local

```bash
cd web
pnpm install
pnpm dev
# → http://localhost:3000
```

## 🗄️ Migration Supabase

```bash
PGPASSWORD='…' psql \
  -h aws-0-eu-west-1.pooler.supabase.com -p 5432 \
  -U postgres.bxveolgqxtnybscfriyy -d postgres \
  -f web/supabase/migrations/20260519120000_init_schema.sql
```

## 🧠 Différenciants DEP

1. **Vocal multilingue auto-corrigé** : FR, AR, EN, créole, wolof, bambara → français propre.
2. **Mémoire des articles** : prix saisi 1 fois, ressorti à vie. Plus on l'utilise, plus c'est rapide.
3. **Mode WhatsApp** : zéro friction, 4 étapes max, vocal = devis.
4. **Pilotage patron / employé** : esclave peut faire des devis mais pas toucher aux prix.
5. **Relances qui marchent** : 1/sem pendant 30j puis 1/j jusqu'au paiement.

## 📅 Roadmap

- [x] Schema Supabase multi-tenant + RLS + storage buckets
- [x] Landing marketing copywriting puissant
- [x] Auth (signup/login/forgot/reset) + middleware
- [x] App shell + dashboard
- [x] Voice recorder + transcription DashScope + correction FR
- [x] Devis editor 4 étapes (client, chantier, articles, validation)
- [x] 5 rubriques devis (créer, attente, signés, factures, archives)
- [x] Clients & catalogue + mémoire auto
- [ ] PDF devis/facture + signature électronique
- [ ] Email envoi + relances cron
- [ ] Stripe billing complet
- [ ] Mode esclave (invite + RLS row-level price-lock)
- [ ] Audit log UI
- [ ] Application mobile (PWA puis natif)

## 📝 Licence

Propriété de Maelig. Tous droits réservés.
