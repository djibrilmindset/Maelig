# AGENTS.md — Guide pour les agents (Claude Code, Codex, etc.)

> Contexte de travail pour tout agent IA qui contribue au projet **DEP — Plateforme de gestion électrique**.

## Périmètre

DEP est un SaaS B2B français pour électriciens (et artisans BTP). Le client cible n'est pas développeur, n'aime pas les interfaces compliquées, et veut juste un outil qui :

1. Transforme un vocal en devis prêt à signer (< 2 min).
2. Mémorise tout pour aller toujours plus vite.
3. Relance les clients tout seul.

Le code est **français** côté UI et **anglais** côté logique technique. Aucun jargon technique exposé à l'utilisateur final.

## Stack & conventions

- **Next.js 15** app router · Server components par défaut · Client components UNIQUEMENT pour interactivité.
- **Tailwind v4** via `@theme inline`. Tokens couleur dans `globals.css` (préfixes `electric`, `wire-*`, `surface*`).
- **shadcn/ui patterns** mais pas le package — primitives custom dans `src/components/ui/`.
- **Framer Motion** parcimonieux (entrée + interactions). Pas d'animation sur listes longues.
- **Supabase JS** via 3 clients :
  - `createSupabaseBrowserClient()` (Client Components)
  - `createSupabaseServerClient()` (Server Components / Server Actions / API routes)
  - `supabaseAdmin()` (service role, server-only, **JAMAIS** côté browser)
- **RLS multi-tenant** strict par `org_id`. Helpers `current_org_id()`, `is_owner()`, `is_admin_dep()`.

## Anti-patterns interdits (CLAUDE.md user)

- Tiret demi-cadratin `—` ou cadratin `---` ou double `--` → utiliser virgule/point.
- Point final sur message court de fin (UI assistant). Sur copy marketing, OK.
- API Anthropic directe. Tous les LLMs chinois passent par DashScope/DeepSeek/Moonshot/Zhipu natifs.
- Spawn Agent Claude Code en récursif sans nécessité.

## Routing des LLMs (Djibril Chinois v1.2)

| Besoin | Modèle | Endpoint |
| --- | --- | --- |
| ASR (transcription vocale) | `paraformer-v2` | DashScope async |
| Correction FR + traduction | `qwen-turbo` | DashScope OpenAI-compat |
| Extraction structurée (articles JSON) | `qwen-plus` | DashScope OpenAI-compat |
| Reasoning complexe (opt.) | `deepseek-v4-pro` ou `kimi-k2.6` | endpoints natifs |

## Sécurité (à respecter)

- Pas d'output HTML utilisateur dans des `dangerouslySetInnerHTML` sans sanitize (DOMPurify).
- Toutes les actions mutantes sont **server actions** (`use server`) authentifiées.
- Service role uniquement côté serveur. Vérifié dans `src/lib/supabase/admin.ts`.
- Storage : convention `{org_id}/{file}` pour les policies RLS sur les buckets privés.
- Pas de secrets dans les commits. `.env.local` est `.gitignore`-d.

## Comment ajouter une fonctionnalité

1. Schéma DB → migration SQL dans `web/supabase/migrations/`. Appliquer via psql.
2. Types TS → régénérer `src/lib/supabase/database.types.ts` (cmd dans le fichier).
3. Server action ou API route → `src/lib/actions/` ou `src/app/api/`.
4. Composant client / UI → `src/components/`.
5. Page → `src/app/(group)/route/page.tsx`.

## Tests visuels

- `pnpm dev` puis http://localhost:3000 (landing publique).
- `/connexion` → essayer Maelig email + magic link.
- Compte admin transversal : `ayouneslead@gmail.com` ou `djibrilmindset@gmail.com`.
