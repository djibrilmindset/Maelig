-- =====================================================================
-- DEP - Plateforme de gestion électrique
-- Migration 0001 : schéma initial multi-tenant
-- =====================================================================

-- ---------- EXTENSIONS ----------
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";
create extension if not exists "pg_trgm";
create extension if not exists "unaccent";

-- ---------- ENUMS ----------
do $$ begin
  create type user_role as enum ('owner', 'slave', 'admin_dep');
exception when duplicate_object then null; end $$;

do $$ begin
  create type devis_statut as enum (
    'brouillon',
    'en_attente_validation',
    'signe_non_paye',
    'facture_en_attente',
    'facture_payee',
    'facture_abandonnee'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type subscription_status as enum (
    'trialing','active','past_due','canceled','incomplete','paused'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type relance_type as enum ('hebdo','quotidienne','finale','manuelle');
exception when duplicate_object then null; end $$;

-- ---------- ORGS ----------
create table if not exists orgs (
  id uuid primary key default uuid_generate_v4(),
  nom text not null,
  siret text,
  logo_url text,
  adresse text,
  ville text,
  cp text,
  pays text default 'France',
  tel text,
  email text,
  iban text,
  bic text,
  rcs text,
  capital_social text,
  forme_juridique text,
  tva_intracommunautaire text,
  taux_horaire_default numeric(10,2) default 45.00,
  tva_default numeric(4,2) default 20.00,
  stripe_customer_id text,
  stripe_subscription_id text,
  stripe_price_id text,
  subscription_status subscription_status not null default 'trialing',
  trial_ends_at timestamptz default (now() + interval '14 days'),
  current_period_end timestamptz,
  slave_seats integer default 0 check (slave_seats >= 0),
  relance_hebdo_jours int default 7,
  relance_quotidienne_after int default 30,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ---------- PROFILES ----------
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  org_id uuid references orgs(id) on delete cascade,
  role user_role not null default 'owner',
  full_name text,
  email text,
  avatar_url text,
  invited_by uuid references auth.users(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists profiles_org_id_idx on profiles(org_id);
create index if not exists profiles_email_idx on profiles(lower(email));

-- ---------- CLIENTS ----------
create table if not exists clients (
  id uuid primary key default uuid_generate_v4(),
  org_id uuid not null references orgs(id) on delete cascade,
  nom text not null,
  prenom text,
  raison_sociale text,
  email text,
  telephone text,
  adresse text,
  ville text,
  cp text,
  pays text default 'France',
  notes text,
  archived boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists clients_org_id_idx on clients(org_id);
create index if not exists clients_search_idx on clients using gin (
  (coalesce(nom,'') || ' ' || coalesce(prenom,'') || ' ' || coalesce(raison_sociale,'') || ' ' || coalesce(email,'')) gin_trgm_ops
);

-- ---------- ARTICLES (catalog with auto-memory) ----------
create table if not exists articles (
  id uuid primary key default uuid_generate_v4(),
  org_id uuid not null references orgs(id) on delete cascade,
  ref text,
  nom text not null,
  description text,
  unite text default 'u',
  prix_unitaire_ht numeric(10,2),
  categorie text,
  usage_count integer default 0,
  last_used_at timestamptz,
  search_vector tsvector generated always as (
    to_tsvector('french', coalesce(nom,'') || ' ' || coalesce(description,'') || ' ' || coalesce(categorie,''))
  ) stored,
  archived boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists articles_org_id_idx on articles(org_id);
create index if not exists articles_search_idx on articles using gin(search_vector);
create unique index if not exists articles_unique_per_org on articles(org_id, lower(nom)) where archived = false;
create index if not exists articles_usage_idx on articles(org_id, usage_count desc, last_used_at desc nulls last);

-- ---------- DEVIS ----------
create table if not exists devis (
  id uuid primary key default uuid_generate_v4(),
  org_id uuid not null references orgs(id) on delete cascade,
  client_id uuid not null references clients(id) on delete restrict,
  numero text,
  statut devis_statut not null default 'brouillon',
  objet text,
  chantier_adresse text,
  notes_internes text,
  notes_client text,
  taux_horaire numeric(10,2),
  heures_main_oeuvre numeric(10,2) default 0,
  cout_main_oeuvre_ht numeric(12,2) default 0,
  total_articles_ht numeric(12,2) default 0,
  total_ht numeric(12,2) default 0,
  tva_taux numeric(4,2) default 20.00,
  tva_montant numeric(12,2) default 0,
  total_ttc numeric(12,2) default 0,
  acompte_pct numeric(4,2),
  date_emission date default current_date,
  date_validite date default (current_date + interval '30 days'),
  date_signature timestamptz,
  signature_client_url text,
  signature_ip inet,
  signature_token text,
  date_envoi_email timestamptz,
  pdf_url text,
  created_by uuid references profiles(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists devis_org_id_idx on devis(org_id);
create index if not exists devis_statut_idx on devis(statut);
create index if not exists devis_client_id_idx on devis(client_id);
create unique index if not exists devis_numero_org on devis(org_id, numero) where numero is not null;

-- ---------- DEVIS_ITEMS ----------
create table if not exists devis_items (
  id uuid primary key default uuid_generate_v4(),
  devis_id uuid not null references devis(id) on delete cascade,
  article_id uuid references articles(id),
  ordre integer not null default 0,
  description text not null,
  quantite numeric(10,3) not null default 1 check (quantite > 0),
  unite text default 'u',
  prix_unitaire_ht numeric(10,2) not null default 0 check (prix_unitaire_ht >= 0),
  total_ht numeric(12,2) generated always as (round(quantite * prix_unitaire_ht, 2)) stored,
  created_at timestamptz default now()
);
create index if not exists devis_items_devis_idx on devis_items(devis_id);
create index if not exists devis_items_article_idx on devis_items(article_id);

-- ---------- FACTURES ----------
create table if not exists factures (
  id uuid primary key default uuid_generate_v4(),
  org_id uuid not null references orgs(id) on delete cascade,
  devis_id uuid references devis(id),
  client_id uuid not null references clients(id),
  numero text,
  statut text not null default 'en_attente',
  total_ht numeric(12,2) not null,
  tva_montant numeric(12,2) not null,
  total_ttc numeric(12,2) not null,
  date_emission date default current_date,
  date_echeance date default (current_date + interval '30 days'),
  date_paiement date,
  montant_paye numeric(12,2) default 0,
  pdf_url text,
  date_envoi_email timestamptz,
  reason_abandon text,
  relances_count integer default 0,
  last_relance_at timestamptz,
  next_relance_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists factures_org_idx on factures(org_id);
create index if not exists factures_statut_idx on factures(statut);
create unique index if not exists factures_numero_org on factures(org_id, numero) where numero is not null;
create index if not exists factures_next_relance_idx on factures(next_relance_at) where statut = 'en_attente';

-- ---------- PAIEMENTS ----------
create table if not exists paiements (
  id uuid primary key default uuid_generate_v4(),
  facture_id uuid not null references factures(id) on delete cascade,
  montant numeric(12,2) not null check (montant > 0),
  methode text,
  reference text,
  date_paiement date default current_date,
  notes text,
  created_at timestamptz default now()
);
create index if not exists paiements_facture_idx on paiements(facture_id);

-- ---------- RELANCES ----------
create table if not exists relances (
  id uuid primary key default uuid_generate_v4(),
  facture_id uuid not null references factures(id) on delete cascade,
  type relance_type not null,
  email_to text not null,
  sujet text,
  body_html text,
  sent_at timestamptz default now(),
  status text default 'sent',
  provider_message_id text
);
create index if not exists relances_facture_idx on relances(facture_id, sent_at desc);

-- ---------- AUDIO TRANSCRIPTIONS ----------
create table if not exists audio_transcriptions (
  id uuid primary key default uuid_generate_v4(),
  org_id uuid not null references orgs(id) on delete cascade,
  user_id uuid references profiles(id),
  devis_id uuid references devis(id) on delete set null,
  audio_url text,
  audio_size_bytes int,
  duration_s numeric(6,2),
  lang_detected text,
  text_brut text,
  text_corrige text,
  text_traduit text,
  articles_extracts jsonb,
  llm_used text,
  cost_eur numeric(10,4),
  created_at timestamptz default now()
);
create index if not exists audio_org_idx on audio_transcriptions(org_id, created_at desc);

-- ---------- TEXT CORRECTIONS ----------
create table if not exists text_corrections (
  id uuid primary key default uuid_generate_v4(),
  org_id uuid not null references orgs(id) on delete cascade,
  user_id uuid references profiles(id),
  raw text not null,
  corrected text not null,
  llm_used text,
  created_at timestamptz default now()
);
create index if not exists text_corr_org_idx on text_corrections(org_id, created_at desc);

-- ---------- AUDIT LOGS ----------
create table if not exists audit_logs (
  id bigserial primary key,
  org_id uuid references orgs(id) on delete set null,
  user_id uuid references profiles(id) on delete set null,
  action text not null,
  entity_type text,
  entity_id uuid,
  diff jsonb,
  ip inet,
  user_agent text,
  created_at timestamptz default now()
);
create index if not exists audit_logs_org_idx on audit_logs(org_id, created_at desc);
create index if not exists audit_logs_entity_idx on audit_logs(entity_type, entity_id);

-- =====================================================================
-- TRIGGERS
-- =====================================================================
create or replace function set_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;$$;

drop trigger if exists orgs_updated_at on orgs;
create trigger orgs_updated_at before update on orgs for each row execute function set_updated_at();
drop trigger if exists profiles_updated_at on profiles;
create trigger profiles_updated_at before update on profiles for each row execute function set_updated_at();
drop trigger if exists clients_updated_at on clients;
create trigger clients_updated_at before update on clients for each row execute function set_updated_at();
drop trigger if exists articles_updated_at on articles;
create trigger articles_updated_at before update on articles for each row execute function set_updated_at();
drop trigger if exists devis_updated_at on devis;
create trigger devis_updated_at before update on devis for each row execute function set_updated_at();
drop trigger if exists factures_updated_at on factures;
create trigger factures_updated_at before update on factures for each row execute function set_updated_at();

-- Recompute devis totals
create or replace function recalc_devis_totals() returns trigger language plpgsql as $$
declare
  v_devis_id uuid;
  v_articles numeric;
  v_taux numeric;
  v_heures numeric;
  v_mo numeric;
  v_ht numeric;
  v_tva_taux numeric;
  v_tva numeric;
  v_ttc numeric;
begin
  v_devis_id := coalesce(new.devis_id, old.devis_id, new.id, old.id);
  select coalesce(sum(total_ht),0) into v_articles from devis_items where devis_id = v_devis_id;
  select taux_horaire, heures_main_oeuvre, tva_taux into v_taux, v_heures, v_tva_taux from devis where id = v_devis_id;
  v_mo := coalesce(v_taux,0) * coalesce(v_heures,0);
  v_ht := v_articles + v_mo;
  v_tva := round(v_ht * coalesce(v_tva_taux,20)/100, 2);
  v_ttc := v_ht + v_tva;
  update devis
    set total_articles_ht = v_articles,
        cout_main_oeuvre_ht = v_mo,
        total_ht = v_ht,
        tva_montant = v_tva,
        total_ttc = v_ttc
  where id = v_devis_id;
  return coalesce(new, old);
end;$$;

drop trigger if exists devis_items_recalc on devis_items;
create trigger devis_items_recalc after insert or update or delete on devis_items
  for each row execute function recalc_devis_totals();

drop trigger if exists devis_self_recalc on devis;
create trigger devis_self_recalc after update of taux_horaire, heures_main_oeuvre, tva_taux on devis
  for each row execute function recalc_devis_totals();

-- Sequences for numerotation
create sequence if not exists devis_seq;
create sequence if not exists factures_seq;

create or replace function generate_devis_numero() returns trigger language plpgsql as $$
declare year_str text; n int;
begin
  if new.numero is null or new.numero = '' then
    year_str := to_char(now(), 'YYYY');
    n := nextval('devis_seq');
    new.numero := 'DEV-' || year_str || '-' || lpad(n::text, 5, '0');
  end if;
  return new;
end;$$;
drop trigger if exists devis_numero_auto on devis;
create trigger devis_numero_auto before insert on devis for each row execute function generate_devis_numero();

create or replace function generate_facture_numero() returns trigger language plpgsql as $$
declare year_str text; n int;
begin
  if new.numero is null or new.numero = '' then
    year_str := to_char(now(), 'YYYY');
    n := nextval('factures_seq');
    new.numero := 'FAC-' || year_str || '-' || lpad(n::text, 5, '0');
  end if;
  return new;
end;$$;
drop trigger if exists factures_numero_auto on factures;
create trigger factures_numero_auto before insert on factures for each row execute function generate_facture_numero();

-- Article usage tracking
create or replace function bump_article_usage() returns trigger language plpgsql as $$
begin
  if new.article_id is not null then
    update articles
      set usage_count = usage_count + 1,
          last_used_at = now(),
          prix_unitaire_ht = new.prix_unitaire_ht
    where id = new.article_id;
  end if;
  return new;
end;$$;
drop trigger if exists devis_items_bump_article on devis_items;
create trigger devis_items_bump_article after insert on devis_items for each row execute function bump_article_usage();

-- Update facture montant_paye on paiements
create or replace function update_facture_after_paiement() returns trigger language plpgsql as $$
declare v_total numeric; v_paye numeric; v_facture_id uuid;
begin
  v_facture_id := coalesce(new.facture_id, old.facture_id);
  select sum(montant) into v_paye from paiements where facture_id = v_facture_id;
  select total_ttc into v_total from factures where id = v_facture_id;
  update factures
    set montant_paye = coalesce(v_paye, 0),
        statut = case
          when coalesce(v_paye,0) >= v_total then 'payee'
          when coalesce(v_paye,0) > 0 then 'partielle'
          else statut
        end,
        date_paiement = case when coalesce(v_paye,0) >= v_total then current_date else date_paiement end
  where id = v_facture_id;
  return coalesce(new, old);
end;$$;
drop trigger if exists paiements_update_facture on paiements;
create trigger paiements_update_facture after insert or update or delete on paiements
  for each row execute function update_facture_after_paiement();

-- =====================================================================
-- AUTH USER -> PROFILE BOOTSTRAP
-- =====================================================================
create or replace function handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_org_id uuid;
  v_invited_org uuid;
  v_role user_role := 'owner';
  v_meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
begin
  -- Admin DEP : email Djibril
  if lower(new.email) in ('ayouneslead@gmail.com','djibrilmindset@gmail.com') then
    v_role := 'admin_dep';
  end if;

  -- Invite slave : metadata.invited_org_id
  if v_meta ? 'invited_org_id' then
    v_invited_org := (v_meta->>'invited_org_id')::uuid;
  end if;

  if v_invited_org is not null then
    insert into profiles (id, org_id, role, full_name, email)
      values (new.id, v_invited_org, 'slave', coalesce(v_meta->>'full_name', new.email), new.email);
  elsif v_role = 'admin_dep' then
    -- Admin DEP : own org (admin sandbox)
    insert into orgs (nom, email) values ('DEP Admin', new.email) returning id into v_org_id;
    insert into profiles (id, org_id, role, full_name, email)
      values (new.id, v_org_id, 'admin_dep', coalesce(v_meta->>'full_name', 'Admin DEP'), new.email);
  else
    insert into orgs (nom, email)
      values (coalesce(v_meta->>'company', 'Mon entreprise'), new.email) returning id into v_org_id;
    insert into profiles (id, org_id, role, full_name, email)
      values (new.id, v_org_id, 'owner', coalesce(v_meta->>'full_name', new.email), new.email);
  end if;

  return new;
end;$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- =====================================================================
-- RLS POLICIES
-- =====================================================================
alter table orgs                  enable row level security;
alter table profiles              enable row level security;
alter table clients               enable row level security;
alter table articles              enable row level security;
alter table devis                 enable row level security;
alter table devis_items           enable row level security;
alter table factures              enable row level security;
alter table paiements             enable row level security;
alter table relances              enable row level security;
alter table audio_transcriptions  enable row level security;
alter table text_corrections      enable row level security;
alter table audit_logs            enable row level security;

create or replace function current_org_id() returns uuid language sql stable security definer set search_path = public as $$
  select org_id from profiles where id = auth.uid();
$$;

create or replace function current_role_dep() returns user_role language sql stable security definer set search_path = public as $$
  select role from profiles where id = auth.uid();
$$;

create or replace function is_admin_dep() returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select role from profiles where id = auth.uid()) = 'admin_dep', false);
$$;

create or replace function is_owner() returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select role from profiles where id = auth.uid()) in ('owner','admin_dep'), false);
$$;

-- ORGS
drop policy if exists "orgs select" on orgs;
create policy "orgs select" on orgs for select using (id = current_org_id() or is_admin_dep());
drop policy if exists "orgs update owner" on orgs;
create policy "orgs update owner" on orgs for update using ((id = current_org_id() and is_owner()) or is_admin_dep()) with check (true);

-- PROFILES
drop policy if exists "profiles select" on profiles;
create policy "profiles select" on profiles for select using (org_id = current_org_id() or id = auth.uid() or is_admin_dep());
drop policy if exists "profiles update self" on profiles;
create policy "profiles update self" on profiles for update using (id = auth.uid() or is_admin_dep());
drop policy if exists "profiles delete owner" on profiles;
create policy "profiles delete owner" on profiles for delete using ((org_id = current_org_id() and is_owner()) or is_admin_dep());
drop policy if exists "profiles insert owner" on profiles;
create policy "profiles insert owner" on profiles for insert with check ((org_id = current_org_id() and is_owner()) or is_admin_dep());

-- CLIENTS
drop policy if exists "clients all" on clients;
create policy "clients all" on clients for all
  using (org_id = current_org_id() or is_admin_dep())
  with check (org_id = current_org_id() or is_admin_dep());

-- ARTICLES (slaves can read, only owner can write)
drop policy if exists "articles select" on articles;
create policy "articles select" on articles for select using (org_id = current_org_id() or is_admin_dep());
drop policy if exists "articles write owner" on articles;
create policy "articles write owner" on articles for insert with check ((org_id = current_org_id() and is_owner()) or is_admin_dep());
drop policy if exists "articles update owner" on articles;
create policy "articles update owner" on articles for update using ((org_id = current_org_id() and is_owner()) or is_admin_dep()) with check ((org_id = current_org_id() and is_owner()) or is_admin_dep());
drop policy if exists "articles delete owner" on articles;
create policy "articles delete owner" on articles for delete using ((org_id = current_org_id() and is_owner()) or is_admin_dep());

-- DEVIS
drop policy if exists "devis select" on devis;
create policy "devis select" on devis for select using (org_id = current_org_id() or is_admin_dep());
drop policy if exists "devis insert" on devis;
create policy "devis insert" on devis for insert with check (org_id = current_org_id() or is_admin_dep());
drop policy if exists "devis update" on devis;
create policy "devis update" on devis for update using (org_id = current_org_id() or is_admin_dep()) with check (org_id = current_org_id() or is_admin_dep());
drop policy if exists "devis delete owner" on devis;
create policy "devis delete owner" on devis for delete using ((org_id = current_org_id() and is_owner()) or is_admin_dep());

-- DEVIS_ITEMS
drop policy if exists "devis_items all" on devis_items;
create policy "devis_items all" on devis_items for all
  using (exists (select 1 from devis d where d.id = devis_id and (d.org_id = current_org_id() or is_admin_dep())))
  with check (exists (select 1 from devis d where d.id = devis_id and (d.org_id = current_org_id() or is_admin_dep())));

-- FACTURES (owner only writes, slave reads)
drop policy if exists "factures select" on factures;
create policy "factures select" on factures for select using (org_id = current_org_id() or is_admin_dep());
drop policy if exists "factures write owner" on factures;
create policy "factures write owner" on factures for insert with check ((org_id = current_org_id() and is_owner()) or is_admin_dep());
drop policy if exists "factures update owner" on factures;
create policy "factures update owner" on factures for update using ((org_id = current_org_id() and is_owner()) or is_admin_dep()) with check ((org_id = current_org_id() and is_owner()) or is_admin_dep());
drop policy if exists "factures delete owner" on factures;
create policy "factures delete owner" on factures for delete using ((org_id = current_org_id() and is_owner()) or is_admin_dep());

-- PAIEMENTS (owner only)
drop policy if exists "paiements all owner" on paiements;
create policy "paiements all owner" on paiements for all
  using (exists (select 1 from factures f where f.id = facture_id and ((f.org_id = current_org_id() and is_owner()) or is_admin_dep())))
  with check (exists (select 1 from factures f where f.id = facture_id and ((f.org_id = current_org_id() and is_owner()) or is_admin_dep())));

-- RELANCES (org members read, owner writes)
drop policy if exists "relances select" on relances;
create policy "relances select" on relances for select using (
  exists (select 1 from factures f where f.id = facture_id and (f.org_id = current_org_id() or is_admin_dep()))
);
drop policy if exists "relances write" on relances;
create policy "relances write" on relances for insert with check (
  exists (select 1 from factures f where f.id = facture_id and ((f.org_id = current_org_id() and is_owner()) or is_admin_dep()))
);

-- AUDIO TRANSCRIPTIONS
drop policy if exists "audio all" on audio_transcriptions;
create policy "audio all" on audio_transcriptions for all
  using (org_id = current_org_id() or is_admin_dep())
  with check (org_id = current_org_id() or is_admin_dep());

-- TEXT CORRECTIONS
drop policy if exists "text_corrections all" on text_corrections;
create policy "text_corrections all" on text_corrections for all
  using (org_id = current_org_id() or is_admin_dep())
  with check (org_id = current_org_id() or is_admin_dep());

-- AUDIT LOGS (owner read only)
drop policy if exists "audit read owner" on audit_logs;
create policy "audit read owner" on audit_logs for select using ((org_id = current_org_id() and is_owner()) or is_admin_dep());
drop policy if exists "audit write" on audit_logs;
create policy "audit write" on audit_logs for insert with check (org_id = current_org_id() or is_admin_dep());

-- =====================================================================
-- STORAGE BUCKETS (logos, devis pdf, audio, signatures)
-- =====================================================================
insert into storage.buckets (id, name, public)
values
  ('logos','logos', true),
  ('devis-pdf','devis-pdf', false),
  ('factures-pdf','factures-pdf', false),
  ('signatures','signatures', false),
  ('audio','audio', false)
on conflict (id) do nothing;

-- Storage policies (logos public read; per-org write; other buckets per-org read+write)
drop policy if exists "logos public read" on storage.objects;
create policy "logos public read" on storage.objects for select using (bucket_id = 'logos');

drop policy if exists "logos org write" on storage.objects;
create policy "logos org write" on storage.objects for insert with check (
  bucket_id = 'logos' and (split_part(name, '/', 1) = current_org_id()::text or is_admin_dep())
);

drop policy if exists "logos org update" on storage.objects;
create policy "logos org update" on storage.objects for update using (
  bucket_id = 'logos' and (split_part(name, '/', 1) = current_org_id()::text or is_admin_dep())
);

drop policy if exists "private buckets read" on storage.objects;
create policy "private buckets read" on storage.objects for select using (
  bucket_id in ('devis-pdf','factures-pdf','signatures','audio')
  and (split_part(name, '/', 1) = current_org_id()::text or is_admin_dep())
);

drop policy if exists "private buckets write" on storage.objects;
create policy "private buckets write" on storage.objects for insert with check (
  bucket_id in ('devis-pdf','factures-pdf','signatures','audio')
  and (split_part(name, '/', 1) = current_org_id()::text or is_admin_dep())
);

drop policy if exists "private buckets update" on storage.objects;
create policy "private buckets update" on storage.objects for update using (
  bucket_id in ('devis-pdf','factures-pdf','signatures','audio')
  and (split_part(name, '/', 1) = current_org_id()::text or is_admin_dep())
);
