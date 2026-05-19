// Generated types — to refresh:
//   pnpm dlx supabase gen types typescript --project-id bxveolgqxtnybscfriyy --schema public > src/lib/supabase/database.types.ts
// Stub minimal for now.
export type Json = string | number | boolean | null | { [k: string]: Json } | Json[]

export interface Database {
  public: {
    Tables: {
      orgs: { Row: OrgRow; Insert: Partial<OrgRow>; Update: Partial<OrgRow> }
      profiles: { Row: ProfileRow; Insert: Partial<ProfileRow>; Update: Partial<ProfileRow> }
      clients: { Row: ClientRow; Insert: Partial<ClientRow>; Update: Partial<ClientRow> }
      articles: { Row: ArticleRow; Insert: Partial<ArticleRow>; Update: Partial<ArticleRow> }
      devis: { Row: DevisRow; Insert: Partial<DevisRow>; Update: Partial<DevisRow> }
      devis_items: { Row: DevisItemRow; Insert: Partial<DevisItemRow>; Update: Partial<DevisItemRow> }
      factures: { Row: FactureRow; Insert: Partial<FactureRow>; Update: Partial<FactureRow> }
      paiements: { Row: PaiementRow; Insert: Partial<PaiementRow>; Update: Partial<PaiementRow> }
      relances: { Row: RelanceRow; Insert: Partial<RelanceRow>; Update: Partial<RelanceRow> }
      audio_transcriptions: { Row: AudioRow; Insert: Partial<AudioRow>; Update: Partial<AudioRow> }
      text_corrections: { Row: TextCorrRow; Insert: Partial<TextCorrRow>; Update: Partial<TextCorrRow> }
      audit_logs: { Row: AuditRow; Insert: Partial<AuditRow>; Update: Partial<AuditRow> }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: {
      user_role: "owner" | "slave" | "admin_dep"
      devis_statut: "brouillon" | "en_attente_validation" | "signe_non_paye" | "facture_en_attente" | "facture_payee" | "facture_abandonnee"
      subscription_status: "trialing" | "active" | "past_due" | "canceled" | "incomplete" | "paused"
      relance_type: "hebdo" | "quotidienne" | "finale" | "manuelle"
    }
  }
}

export type UserRole = Database["public"]["Enums"]["user_role"]
export type DevisStatut = Database["public"]["Enums"]["devis_statut"]
export type SubscriptionStatus = Database["public"]["Enums"]["subscription_status"]

export interface OrgRow {
  id: string; nom: string; siret: string | null; logo_url: string | null;
  adresse: string | null; ville: string | null; cp: string | null; pays: string | null;
  tel: string | null; email: string | null;
  iban: string | null; bic: string | null; rcs: string | null;
  capital_social: string | null; forme_juridique: string | null; tva_intracommunautaire: string | null;
  taux_horaire_default: number; tva_default: number;
  stripe_customer_id: string | null; stripe_subscription_id: string | null; stripe_price_id: string | null;
  subscription_status: SubscriptionStatus;
  trial_ends_at: string | null; current_period_end: string | null;
  slave_seats: number;
  relance_hebdo_jours: number; relance_quotidienne_after: number;
  created_at: string; updated_at: string
}

export interface ProfileRow {
  id: string; org_id: string | null; role: UserRole;
  full_name: string | null; email: string | null; avatar_url: string | null;
  invited_by: string | null; created_at: string; updated_at: string
}

export interface ClientRow {
  id: string; org_id: string;
  nom: string; prenom: string | null; raison_sociale: string | null;
  email: string | null; telephone: string | null;
  adresse: string | null; ville: string | null; cp: string | null; pays: string | null;
  notes: string | null; archived: boolean;
  created_at: string; updated_at: string
}

export interface ArticleRow {
  id: string; org_id: string;
  ref: string | null; nom: string; description: string | null;
  unite: string | null; prix_unitaire_ht: number | null;
  categorie: string | null;
  usage_count: number; last_used_at: string | null;
  archived: boolean;
  created_at: string; updated_at: string
}

export interface DevisRow {
  id: string; org_id: string; client_id: string;
  numero: string | null; statut: DevisStatut;
  objet: string | null; chantier_adresse: string | null;
  notes_internes: string | null; notes_client: string | null;
  taux_horaire: number | null; heures_main_oeuvre: number;
  cout_main_oeuvre_ht: number; total_articles_ht: number;
  total_ht: number; tva_taux: number; tva_montant: number; total_ttc: number;
  acompte_pct: number | null;
  date_emission: string; date_validite: string | null;
  date_signature: string | null; signature_client_url: string | null;
  signature_ip: string | null; signature_token: string | null;
  date_envoi_email: string | null; pdf_url: string | null;
  created_by: string | null;
  created_at: string; updated_at: string
}

export interface DevisItemRow {
  id: string; devis_id: string; article_id: string | null;
  ordre: number; description: string;
  quantite: number; unite: string | null;
  prix_unitaire_ht: number; total_ht: number;
  created_at: string
}

export interface FactureRow {
  id: string; org_id: string; devis_id: string | null; client_id: string;
  numero: string | null; statut: string;
  total_ht: number; tva_montant: number; total_ttc: number;
  date_emission: string; date_echeance: string | null; date_paiement: string | null;
  montant_paye: number; pdf_url: string | null;
  date_envoi_email: string | null; reason_abandon: string | null;
  relances_count: number; last_relance_at: string | null; next_relance_at: string | null;
  created_at: string; updated_at: string
}

export interface PaiementRow {
  id: string; facture_id: string;
  montant: number; methode: string | null; reference: string | null;
  date_paiement: string; notes: string | null; created_at: string
}

export interface RelanceRow {
  id: string; facture_id: string;
  type: Database["public"]["Enums"]["relance_type"];
  email_to: string; sujet: string | null; body_html: string | null;
  sent_at: string; status: string | null; provider_message_id: string | null
}

export interface AudioRow {
  id: string; org_id: string; user_id: string | null; devis_id: string | null;
  audio_url: string | null; audio_size_bytes: number | null;
  duration_s: number | null; lang_detected: string | null;
  text_brut: string | null; text_corrige: string | null; text_traduit: string | null;
  articles_extracts: Json | null; llm_used: string | null; cost_eur: number | null;
  created_at: string
}

export interface TextCorrRow {
  id: string; org_id: string; user_id: string | null;
  raw: string; corrected: string; llm_used: string | null; created_at: string
}

export interface AuditRow {
  id: number; org_id: string | null; user_id: string | null;
  action: string; entity_type: string | null; entity_id: string | null;
  diff: Json | null; ip: string | null; user_agent: string | null;
  created_at: string
}
