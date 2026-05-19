-- DEP — Vues admin spécifiques par rôle
-- v_admin_patrons (owners)
-- v_admin_employes (slaves) avec parent owner
-- v_admin_admins (admin_dep)
-- Stats agrégées par rôle

-- Patrons : chefs d'entreprise avec org + agrégats biz
create or replace view v_admin_patrons as
select
  s.id                       as signup_id,
  s.user_id,
  s.email,
  s.full_name,
  s.company,
  s.provider,
  (s.email_confirmed_at is not null) as is_email_confirmed,
  s.email_confirmed_at,
  s.signed_up_at,
  u.last_sign_in_at,
  o.id                       as org_id,
  o.nom                      as org_nom,
  o.subscription_status,
  o.trial_ends_at,
  o.logo_url,
  o.created_at               as org_created_at,
  -- Agrégats biz
  (select count(*) from profiles pp where pp.org_id = o.id and pp.role = 'slave')::int as employes_count,
  (select count(*) from devis d where d.org_id = o.id)::int as devis_total,
  (select count(*) from devis d where d.org_id = o.id and d.statut = 'signe_non_paye')::int as devis_signes,
  (select count(*) from factures f where f.org_id = o.id and f.statut = 'payee')::int as factures_payees,
  (select coalesce(sum(f.total_ttc), 0) from factures f where f.org_id = o.id and f.statut = 'payee')::numeric as ca_encaisse,
  (select coalesce(sum(f.total_ttc), 0) from factures f where f.org_id = o.id and f.statut in ('en_attente','partielle'))::numeric as ca_en_attente,
  (select count(*) from incidents i where i.org_id = o.id and i.statut in ('ouvert','en_cours','escalade'))::int as incidents_ouverts,
  -- État compte
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
left join profiles p on p.id = s.user_id
left join orgs o on o.id = p.org_id
where p.role = 'owner'
order by s.signed_up_at desc;

grant select on v_admin_patrons to authenticated;

-- Employés : slaves avec leur patron + agrégats activité
create or replace view v_admin_employes as
select
  s.id                       as signup_id,
  s.user_id,
  s.email,
  s.full_name,
  s.provider,
  (s.email_confirmed_at is not null) as is_email_confirmed,
  s.email_confirmed_at,
  s.signed_up_at,
  u.last_sign_in_at,
  o.id                       as org_id,
  o.nom                      as org_nom,
  o.subscription_status,
  -- Patron parent
  owner_p.id                 as owner_user_id,
  owner_p.full_name          as owner_full_name,
  owner_p.email              as owner_email,
  -- Activité employé
  (select count(*) from incidents i where i.sender_id = s.user_id)::int as incidents_signales,
  (select count(*) from incidents i where i.sender_id = s.user_id and i.statut in ('ouvert','en_cours','escalade'))::int as incidents_ouverts,
  (select count(*) from devis d where d.created_by = s.user_id)::int as devis_crees,
  (select count(*) from devis d where d.created_by = s.user_id and d.statut = 'en_attente_validation_patron')::int as devis_a_valider,
  (select max(i.created_at) from incidents i where i.sender_id = s.user_id) as last_incident_at
from signup_events s
left join auth.users u on u.id = s.user_id
left join profiles p on p.id = s.user_id
left join orgs o on o.id = p.org_id
left join profiles owner_p on owner_p.org_id = o.id and owner_p.role = 'owner'
where p.role = 'slave'
order by s.signed_up_at desc;

grant select on v_admin_employes to authenticated;

-- Admins DEP (super-utilisateurs Maelig/Djibril)
create or replace view v_admin_admins as
select
  s.id                       as signup_id,
  s.user_id,
  s.email,
  s.full_name,
  s.provider,
  (s.email_confirmed_at is not null) as is_email_confirmed,
  s.email_confirmed_at,
  s.signed_up_at,
  u.last_sign_in_at,
  o.id                       as org_id,
  o.nom                      as org_nom,
  (select count(*) from email_test_log etl where etl.sender_user_id = s.user_id)::int as tests_envoyes,
  (select max(etl.sent_at) from email_test_log etl where etl.sender_user_id = s.user_id) as last_test_at
from signup_events s
left join auth.users u on u.id = s.user_id
left join profiles p on p.id = s.user_id
left join orgs o on o.id = p.org_id
where p.role = 'admin_dep'
order by s.signed_up_at desc;

grant select on v_admin_admins to authenticated;

-- Stats par rôle (pour l'overview)
create or replace view v_admin_role_stats as
select
  (select count(*) from profiles where role = 'owner')::int as total_patrons,
  (select count(*) from profiles where role = 'slave')::int as total_employes,
  (select count(*) from profiles where role = 'admin_dep')::int as total_admins,
  (select count(*) from orgs where subscription_status = 'trialing')::int as orgs_trialing,
  (select count(*) from orgs where subscription_status = 'active')::int as orgs_paying,
  (select count(*) from orgs where subscription_status = 'past_due')::int as orgs_past_due,
  (select coalesce(sum(f.total_ttc), 0) from factures f where f.statut = 'payee')::numeric as ca_total,
  (select count(*) from devis where statut = 'signe_non_paye')::int as devis_signes_total,
  (select count(*) from incidents where statut in ('ouvert','en_cours','escalade'))::int as incidents_ouverts_total,
  (select count(*) from signup_events where signed_up_at >= now() - interval '24 hours')::int as nouveaux_24h,
  (select count(*) from signup_events where signed_up_at >= now() - interval '7 days')::int as nouveaux_7d;

grant select on v_admin_role_stats to authenticated;
