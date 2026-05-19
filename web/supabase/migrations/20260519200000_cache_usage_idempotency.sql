-- =====================================================================
-- DEP — Migration 0005 : cache LLM + tracking coût + idempotency Stripe
-- =====================================================================

-- ---------- 1) Cache SHA256 résultats LLM ----------
-- Évite de re-appeler DashScope pour un même input.
-- Économie estimée : -70% de consommation sur les corrections + traductions répétées.
create table if not exists llm_cache (
  hash text primary key,                 -- sha256(model || ":" || prompt || ":" || input)
  model text not null,
  task text not null,                    -- 'correct_fr' | 'translate' | 'extract' | 'clarify' | 'analyze_incident' | 'asr'
  input_preview text,                    -- 200 premiers chars pour debug
  output_json jsonb not null,            -- résultat structuré
  hit_count int default 1,
  cost_saved_eur numeric(10,4) default 0,
  expires_at timestamptz default (now() + interval '30 days'),
  created_at timestamptz default now(),
  last_hit_at timestamptz default now()
);
create index if not exists llm_cache_task_idx on llm_cache(task);
create index if not exists llm_cache_expires_idx on llm_cache(expires_at);

-- Auto-purge des entrées expirées (à appeler depuis cron)
create or replace function purge_expired_llm_cache() returns int language plpgsql as $$
declare n int;
begin
  delete from llm_cache where expires_at < now();
  get diagnostics n = row_count;
  return n;
end;$$;

-- ---------- 2) Tracking coût LLM par org ----------
create table if not exists llm_usage (
  id bigserial primary key,
  org_id uuid references orgs(id) on delete cascade,
  user_id uuid references profiles(id) on delete set null,
  model text not null,
  task text not null,
  cache_hit boolean default false,
  input_tokens int default 0,
  output_tokens int default 0,
  duration_ms int,
  cost_eur numeric(10,5) default 0,
  created_at timestamptz default now()
);
create index if not exists llm_usage_org_idx on llm_usage(org_id, created_at desc);

-- Cap mensuel par org (alert si > X EUR)
alter table orgs add column if not exists llm_budget_eur_monthly numeric(10,2) default 50.00;
alter table orgs add column if not exists llm_spent_eur_month numeric(10,4) default 0;
alter table orgs add column if not exists llm_spent_month_started timestamptz default date_trunc('month', now());

-- Helper : ajoute du coût et reset le compteur mensuel automatiquement
create or replace function track_llm_cost(p_org_id uuid, p_cost numeric) returns void language plpgsql as $$
begin
  update orgs set
    llm_spent_eur_month = case
      when llm_spent_month_started < date_trunc('month', now()) then p_cost
      else coalesce(llm_spent_eur_month, 0) + p_cost
    end,
    llm_spent_month_started = case
      when llm_spent_month_started < date_trunc('month', now()) then date_trunc('month', now())
      else llm_spent_month_started
    end
  where id = p_org_id;
end;$$;

-- ---------- 3) Idempotency Stripe webhook ----------
create table if not exists stripe_events (
  id text primary key,                   -- event id de Stripe (evt_...)
  type text not null,
  livemode boolean default false,
  payload jsonb,
  processed_at timestamptz default now()
);
create index if not exists stripe_events_type_idx on stripe_events(type, processed_at desc);

-- ---------- 4) RLS ----------
alter table llm_cache enable row level security;
alter table llm_usage enable row level security;
alter table stripe_events enable row level security;

-- llm_cache : lecture globale (cache partagé entre orgs OK car les inputs sont déjà déterministes),
-- mais écriture uniquement par service role
drop policy if exists "llm_cache read all" on llm_cache;
create policy "llm_cache read all" on llm_cache for select using (true);
-- pas de policy insert/update/delete → service_role only

-- llm_usage : lecture owner uniquement (factu visibility)
drop policy if exists "llm_usage owner read" on llm_usage;
create policy "llm_usage owner read" on llm_usage for select
  using ((org_id = current_org_id() and is_owner()) or is_admin_dep());

-- stripe_events : service_role only
drop policy if exists "stripe_events admin" on stripe_events;
create policy "stripe_events admin" on stripe_events for select using (is_admin_dep());
