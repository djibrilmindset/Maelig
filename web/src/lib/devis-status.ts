import type { DevisStatut } from "@/lib/supabase/database.types"

export const STATUT_META: Record<
  DevisStatut,
  { label: string; tone: "neutral" | "electric" | "info" | "warning" | "success" | "danger"; description: string }
> = {
  brouillon: {
    label: "Brouillon",
    tone: "neutral",
    description: "Pas encore envoyé au client.",
  },
  en_attente_validation: {
    label: "Envoyé · en attente",
    tone: "info",
    description: "Le client n'a pas encore signé.",
  },
  signe_non_paye: {
    label: "Signé · non payé",
    tone: "warning",
    description: "Devis accepté, en attente de facturation/paiement.",
  },
  facture_en_attente: {
    label: "Facture en attente",
    tone: "electric",
    description: "Facture envoyée, en attente de paiement.",
  },
  facture_payee: {
    label: "Payée",
    tone: "success",
    description: "C'est dans la poche 💰",
  },
  facture_abandonnee: {
    label: "Abandonnée",
    tone: "danger",
    description: "Facture passée en perte.",
  },
}

export const RUBRIQUES: Array<{
  slug: string
  label: string
  description: string
  statuts: DevisStatut[]
  icon: string
}> = [
  {
    slug: "creer",
    label: "Créer un devis",
    description: "Vocal, mémoire articles, prêt en 2 minutes",
    statuts: [],
    icon: "Plus",
  },
  {
    slug: "attente-validation",
    label: "En attente de validation",
    description: "Envoyés, pas encore signés",
    statuts: ["en_attente_validation"],
    icon: "Hourglass",
  },
  {
    slug: "signes",
    label: "Signés · pas encore payés",
    description: "Devis signés, en attente de paiement",
    statuts: ["signe_non_paye"],
    icon: "FileCheck",
  },
  {
    slug: "factures-en-attente",
    label: "Factures en attente",
    description: "Factures envoyées, à encaisser",
    statuts: ["facture_en_attente"],
    icon: "Receipt",
  },
  {
    slug: "archives",
    label: "Payées · abandonnées",
    description: "Historique complet",
    statuts: ["facture_payee", "facture_abandonnee"],
    icon: "Archive",
  },
]
