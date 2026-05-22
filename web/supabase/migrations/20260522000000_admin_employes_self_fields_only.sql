-- Demande user 2026-05-22 : côté admin employés, ne garder que les champs
-- que l'employé renseigne lui-même (full_name, email, telephone,
-- langue_maternelle, titre_poste). Drop tout le reste (provider, agrégats
-- incidents/devis, patron rattaché, dates système).

-- DROP requis : CREATE OR REPLACE VIEW ne peut pas supprimer des colonnes.
drop view if exists v_admin_employes;

create view v_admin_employes as
select
  s.id                       as signup_id,
  s.user_id,
  s.email,
  p.full_name,
  p.telephone,
  p.langue_maternelle,
  p.titre_poste,
  s.signed_up_at
from signup_events s
left join profiles p on p.id = s.user_id
where p.role = 'slave'
order by s.signed_up_at desc;

-- Reapply security pattern from 20260520160000_secure_admin_views_p0.sql :
-- create or replace reset grants → on revoque ré-explicitement à authenticated
-- (lecture admin via supabaseAdmin() service_role uniquement) + security_invoker.
revoke select on v_admin_employes from authenticated;
alter view v_admin_employes set (security_invoker = on);
