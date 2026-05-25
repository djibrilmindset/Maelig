-- Ajout conditions de règlement modifiables par org
alter table orgs
  add column if not exists conditions_reglement text default 'Paiement à réception de facture. Acompte à la commande : 30%. Solde à la livraison : 70%. Pénalités de retard : 3 fois le taux d''intérêt légal. Indemnité forfaitaire pour frais de recouvrement : 40€.';
