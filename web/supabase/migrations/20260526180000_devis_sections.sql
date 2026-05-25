-- Ajout support sections dans devis_items
-- Une section = ligne titre en gras, sans prix, qui groupe les articles en dessous

alter table devis_items
  add column if not exists is_section boolean not null default false;

-- Les sections ont quantite=1, prix_unitaire_ht=0 (déjà valide avec les check existants)
-- La colonne `description` sert de titre de section
