-- DEP — Recensement signups + Délivrabilité email
-- Source of truth: auth.users + auth.identities (provider) + profiles + orgs
-- Visible UNIQUEMENT par admin_dep (ayouneslead@ / djibrilmindset@ / maelig)

-- ─────────── signup_events ───────────
-- 1 ligne par création de compte. Append-only.
create table if not exists signup_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  email text not null,
  provider text not null default 'email',  -- email | google | apple | other
  full_name text,
  company text,
  org_id uuid references orgs(id) on delete set null,
  invited_org_id uuid,
  user_agent text,
  ip_addr inet,
  email_confirmed_at timestamptz,
  signed_up_at timestamptz not null default now(),
  raw_meta jsonb default '{}'::jsonb
);
create index if not exists idx_signup_events_signed_up_at on signup_events(signed_up_at desc);
create index if not exists idx_signup_events_email on signup_events(lower(email));
create index if not exists idx_signup_events_provider on signup_events(provider);

-- Trigger sur auth.users : insert new row dans signup_events
create or replace function track_signup_event() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_provider text := 'email';
  v_meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_app_meta jsonb := coalesce(new.raw_app_meta_data, '{}'::jsonb);
begin
  -- provider depuis raw_app_meta_data (Supabase remplit ce champ sur OAuth)
  if v_app_meta ? 'provider' then
    v_provider := v_app_meta->>'provider';
  end if;

  insert into signup_events (
    user_id, email, provider, full_name, company, invited_org_id,
    email_confirmed_at, signed_up_at, raw_meta
  ) values (
    new.id,
    new.email,
    v_provider,
    coalesce(v_meta->>'full_name', v_meta->>'name'),
    v_meta->>'company',
    nullif(v_meta->>'invited_org_id', '')::uuid,
    new.email_confirmed_at,
    new.created_at,
    v_meta
  )
  on conflict do nothing;

  return new;
end;$$;

drop trigger if exists on_auth_user_track_signup on auth.users;
create trigger on_auth_user_track_signup
  after insert on auth.users
  for each row execute function track_signup_event();

-- Trigger UPDATE auth.users pour MAJ email_confirmed_at + org_id quand profile créé
create or replace function sync_signup_event_confirmation() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.email_confirmed_at is distinct from old.email_confirmed_at then
    update signup_events
    set email_confirmed_at = new.email_confirmed_at
    where user_id = new.id;
  end if;
  return new;
end;$$;

drop trigger if exists on_auth_user_confirm_sync on auth.users;
create trigger on_auth_user_confirm_sync
  after update on auth.users
  for each row execute function sync_signup_event_confirmation();

-- Sync org_id quand profile est créé (depuis handle_new_user existant)
create or replace function sync_signup_event_org() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update signup_events set org_id = new.org_id where user_id = new.id and org_id is null;
  return new;
end;$$;

drop trigger if exists on_profile_link_org on profiles;
create trigger on_profile_link_org
  after insert on profiles
  for each row execute function sync_signup_event_org();

-- Backfill : remplir signup_events depuis les users déjà existants
insert into signup_events (user_id, email, provider, email_confirmed_at, signed_up_at, raw_meta)
select
  u.id,
  u.email,
  coalesce(u.raw_app_meta_data->>'provider', 'email'),
  u.email_confirmed_at,
  u.created_at,
  coalesce(u.raw_user_meta_data, '{}'::jsonb)
from auth.users u
where not exists (select 1 from signup_events s where s.user_id = u.id)
  and u.email is not null;

-- Sync org_id pour les backfills
update signup_events s
set org_id = p.org_id
from profiles p
where p.id = s.user_id and s.org_id is null;

-- ─────────── email_test_log ───────────
-- Track les tests de délivrabilité (admin only)
create table if not exists email_test_log (
  id uuid primary key default gen_random_uuid(),
  sender_user_id uuid references auth.users(id) on delete set null,
  recipient_email text not null,
  template text not null,           -- confirmation | magic_link | invite | reset_password | test_transactional
  provider text,                    -- supabase_smtp | resend | postmark | other
  status text not null,             -- sent | failed | bounced | delivered | opened
  error_message text,
  request_payload jsonb default '{}'::jsonb,
  response_payload jsonb default '{}'::jsonb,
  sent_at timestamptz not null default now(),
  delivered_at timestamptz,
  opened_at timestamptz
);
create index if not exists idx_email_test_log_sent_at on email_test_log(sent_at desc);
create index if not exists idx_email_test_log_recipient on email_test_log(lower(recipient_email));
create index if not exists idx_email_test_log_status on email_test_log(status);

-- ─────────── RLS admin_dep ───────────
alter table signup_events enable row level security;
alter table email_test_log enable row level security;

drop policy if exists "admin_dep read signups" on signup_events;
create policy "admin_dep read signups" on signup_events
  for select using (is_admin_dep());

drop policy if exists "admin_dep read email_test_log" on email_test_log;
create policy "admin_dep read email_test_log" on email_test_log
  for select using (is_admin_dep());

drop policy if exists "admin_dep insert email_test_log" on email_test_log;
create policy "admin_dep insert email_test_log" on email_test_log
  for insert with check (is_admin_dep() and sender_user_id = auth.uid());

-- ─────────── Vue lisible admin ───────────
create or replace view v_admin_signups as
select
  s.id,
  s.user_id,
  s.email,
  s.provider,
  s.full_name,
  s.company,
  s.org_id,
  o.nom as org_nom,
  o.subscription_status,
  o.trial_ends_at,
  s.email_confirmed_at is not null as is_email_confirmed,
  s.email_confirmed_at,
  s.signed_up_at,
  u.last_sign_in_at,
  p.role,
  case
    when s.email_confirmed_at is null and s.provider = 'email' then 'pending_email_confirm'
    when o.subscription_status::text = 'trialing' then 'trialing'
    when o.subscription_status::text = 'active' then 'paying'
    when o.subscription_status::text = 'past_due' then 'past_due'
    when o.subscription_status::text = 'canceled' then 'canceled'
    else 'unknown'
  end as account_state
from signup_events s
left join auth.users u on u.id = s.user_id
left join orgs o on o.id = s.org_id
left join profiles p on p.id = s.user_id
order by s.signed_up_at desc;

grant select on v_admin_signups to authenticated;

-- Stats agrégées
create or replace view v_admin_signups_stats as
select
  count(*)::int as total_signups,
  count(*) filter (where email_confirmed_at is not null)::int as confirmed,
  count(*) filter (where email_confirmed_at is null and provider = 'email')::int as pending_email,
  count(*) filter (where provider = 'google')::int as via_google,
  count(*) filter (where provider = 'apple')::int as via_apple,
  count(*) filter (where provider = 'email')::int as via_email,
  count(*) filter (where signed_up_at >= now() - interval '24 hours')::int as last_24h,
  count(*) filter (where signed_up_at >= now() - interval '7 days')::int as last_7d,
  count(*) filter (where signed_up_at >= now() - interval '30 days')::int as last_30d
from signup_events;

grant select on v_admin_signups_stats to authenticated;
