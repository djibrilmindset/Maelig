-- DEP — Security hardening migration
-- 1) Strict price-lock for slaves on devis_items (prevent slaves from inserting items with arbitrary prices)
-- 2) Audit trigger on key tables (devis, factures, paiements, orgs)

-- ============================================================
-- 1) Price-lock for slaves
-- A slave can only insert devis_items if the price matches the article's current price.
-- ============================================================
create or replace function enforce_slave_price_lock() returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_role user_role;
  v_article_price numeric;
begin
  -- Service role bypass: auth.uid() IS NULL when using service_role key
  if auth.uid() is null then
    return new;
  end if;

  select role into v_role from profiles where id = auth.uid();
  if v_role in ('owner','admin_dep') then
    return new;
  end if;
  -- slaves: if article_id set, force price from the article catalog
  if new.article_id is not null then
    select prix_unitaire_ht into v_article_price from articles where id = new.article_id;
    if v_article_price is not null and abs(new.prix_unitaire_ht - v_article_price) > 0.001 then
      raise exception 'Esclave : prix unitaire bloqué sur le catalogue (% attendu, % reçu)', v_article_price, new.prix_unitaire_ht;
    end if;
  else
    -- slaves cannot create ad-hoc priced items
    if new.prix_unitaire_ht > 0 then
      raise exception 'Esclave : seul le patron peut créer un article avec prix';
    end if;
  end if;
  return new;
end;$$;

drop trigger if exists devis_items_slave_lock on devis_items;
create trigger devis_items_slave_lock
  before insert or update on devis_items
  for each row execute function enforce_slave_price_lock();

-- ============================================================
-- 2) Audit log helper + triggers
-- ============================================================
create or replace function log_audit() returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_org uuid;
begin
  v_org := coalesce(new.org_id, old.org_id);
  insert into audit_logs(org_id, user_id, action, entity_type, entity_id, diff)
  values(
    v_org,
    auth.uid(),
    tg_op,
    tg_table_name,
    coalesce(new.id, old.id),
    case
      when tg_op = 'INSERT' then to_jsonb(new)
      when tg_op = 'UPDATE' then jsonb_build_object('before', to_jsonb(old), 'after', to_jsonb(new))
      when tg_op = 'DELETE' then to_jsonb(old)
    end
  );
  return coalesce(new, old);
end;$$;

drop trigger if exists devis_audit on devis;
create trigger devis_audit after insert or update or delete on devis for each row execute function log_audit();

drop trigger if exists factures_audit on factures;
create trigger factures_audit after insert or update or delete on factures for each row execute function log_audit();

drop trigger if exists paiements_audit_pseudo on paiements;
-- paiements has facture_id not org_id, so we trace via fixed table name and join later
create or replace function log_audit_paiement() returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_org uuid;
begin
  select org_id into v_org from factures where id = coalesce(new.facture_id, old.facture_id);
  insert into audit_logs(org_id, user_id, action, entity_type, entity_id, diff)
  values(
    v_org, auth.uid(), tg_op, 'paiements', coalesce(new.id, old.id),
    case
      when tg_op = 'INSERT' then to_jsonb(new)
      when tg_op = 'UPDATE' then jsonb_build_object('before', to_jsonb(old), 'after', to_jsonb(new))
      when tg_op = 'DELETE' then to_jsonb(old)
    end
  );
  return coalesce(new, old);
end;$$;
create trigger paiements_audit_pseudo after insert or update or delete on paiements for each row execute function log_audit_paiement();

drop trigger if exists orgs_audit on orgs;
create or replace function log_audit_org() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into audit_logs(org_id, user_id, action, entity_type, entity_id, diff)
  values(coalesce(new.id, old.id), auth.uid(), tg_op, 'orgs', coalesce(new.id, old.id),
    jsonb_build_object('before', to_jsonb(old), 'after', to_jsonb(new)));
  return coalesce(new, old);
end;$$;
create trigger orgs_audit after update on orgs for each row execute function log_audit_org();
