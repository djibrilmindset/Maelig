"use client"
/**
 * Panneau de REVUE ÉDITABLE de l'extraction vocale.
 *
 * Pourquoi ce composant existe (nouvelle approche 2026-05-20) :
 *  - L'auto-fill silencieux après vocal était invisible/imprévisible pour les utilisateurs seniors.
 *  - Si l'extraction LLM échoue ou retourne du vide, l'user ne comprend pas pourquoi rien n'arrive.
 *  - On affiche maintenant CE QUI A ÉTÉ COMPRIS, champ par champ, ÉDITABLE,
 *    et un seul gros bouton "Ajouter ces infos au devis" valide tout d'un coup.
 *
 * Avantages :
 *  - Transparent (l'user voit ce qui sera fait avant que ce soit fait)
 *  - Réparable (édite à la main si l'IA s'est trompée)
 *  - Robuste (le push d'état se fait en un seul handler React, batch atomique)
 *  - Diagnostic clair si rien capté → message + bouton "Recommencer"
 */
import { useEffect, useState } from "react"
import { Check, Pencil, RotateCcw, Plus, Trash2, AlertCircle, MapPin, User, Clock, Package } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input, Label } from "@/components/ui/input"
import { parseClientHint, parseAdresse } from "@/lib/devis-voice-mapper"

export interface ReviewItem {
  description: string
  quantity: number
  unit: string
}

export interface ExtractedReview {
  client?: {
    nom?: string
    prenom?: string
    raison_sociale?: string
    adresse?: string
    cp?: string
    ville?: string
  }
  chantier_adresse?: string
  heures_main_oeuvre?: number
  notes?: string
  items: ReviewItem[]
}

/**
 * Convertit le format brut renvoyé par l'API (`extracted` flat) en format
 * normalisé qu'on peut éditer dans le panneau (avec client.* déjà splitté).
 */
export function normalizeExtracted(raw: {
  client_hint?: string
  chantier_adresse?: string
  heures_main_oeuvre?: number
  notes?: string
  items?: Array<{ description: string; quantity: number; unit: string }>
}): ExtractedReview {
  const parsedClient = parseClientHint(raw.client_hint)
  const parsedAdr = parseAdresse(raw.chantier_adresse)
  return {
    client: {
      nom: parsedClient.nom,
      prenom: parsedClient.prenom,
      raison_sociale: parsedClient.raison_sociale,
      adresse: parsedAdr.adresse,
      cp: parsedAdr.cp,
      ville: parsedAdr.ville,
    },
    chantier_adresse: raw.chantier_adresse,
    heures_main_oeuvre: raw.heures_main_oeuvre,
    notes: raw.notes,
    items: (raw.items ?? []).map((it) => ({
      description: it.description,
      quantity: it.quantity,
      unit: it.unit,
    })),
  }
}

function isEmpty(r: ExtractedReview): boolean {
  if (r.items.length > 0) return false
  if (r.client?.nom || r.client?.prenom || r.client?.raison_sociale) return false
  if (r.client?.adresse || r.client?.cp || r.client?.ville) return false
  if (r.chantier_adresse) return false
  if (r.heures_main_oeuvre) return false
  if (r.notes) return false
  return true
}

export function ExtractionReviewPanel({
  initial,
  rawTranscript,
  onApply,
  onRetry,
  onCancel,
}: {
  initial: ExtractedReview
  /** Texte transcrit visible pour debug + confiance utilisateur */
  rawTranscript?: string
  onApply: (data: ExtractedReview) => void
  onRetry: () => void
  onCancel: () => void
}) {
  const [data, setData] = useState<ExtractedReview>(initial)

  // Si une nouvelle extraction arrive (re-dictée), on remplace
  useEffect(() => {
    setData(initial)
  }, [initial])

  const empty = isEmpty(data)
  const updateClient = (patch: Partial<NonNullable<ExtractedReview["client"]>>) =>
    setData((d) => ({ ...d, client: { ...(d.client ?? {}), ...patch } }))
  const updateItem = (idx: number, patch: Partial<ReviewItem>) =>
    setData((d) => ({
      ...d,
      items: d.items.map((it, i) => (i === idx ? { ...it, ...patch } : it)),
    }))
  const removeItem = (idx: number) =>
    setData((d) => ({ ...d, items: d.items.filter((_, i) => i !== idx) }))
  const addItem = () =>
    setData((d) => ({ ...d, items: [...d.items, { description: "", quantity: 1, unit: "u" }] }))

  return (
    <div className="rounded-[var(--radius-lg)] border-2 border-electric/60 bg-gradient-to-br from-electric/5 via-surface to-surface-2 p-5 sm:p-6 shadow-[0_24px_64px_-24px_rgba(255,213,0,0.35)]">
      {/* Header */}
      <div className="flex items-start gap-3 mb-4">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-electric text-black">
          <Pencil className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-display text-xl sm:text-2xl font-bold tracking-tight">
            Voici ce que j&apos;ai compris
          </h3>
          <p className="text-sm text-muted mt-0.5">
            Vérifiez, corrigez si besoin, puis appuyez sur le bouton jaune en bas.
          </p>
        </div>
      </div>

      {/* Transcription brute (rassure l'user : on lui montre ce qu'on a entendu) */}
      {rawTranscript && (
        <details className="mb-4 rounded-md border border-border bg-surface-2/50 px-3 py-2">
          <summary className="text-xs uppercase tracking-[0.16em] text-muted cursor-pointer select-none">
            📝 Texte transcrit
          </summary>
          <p className="mt-2 text-sm italic text-foreground/80 leading-relaxed">
            « {rawTranscript} »
          </p>
        </details>
      )}

      {/* Cas VIDE : extraction n'a rien capté */}
      {empty && (
        <div className="rounded-md border border-warning/40 bg-warning/10 p-4 mb-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-warning">Je n&apos;ai rien pu identifier précisément.</p>
              <p className="text-sm mt-1 text-foreground/80">
                Essayez de redire en précisant : nom du client, adresse du chantier, et liste des articles
                avec leur quantité.
              </p>
              <p className="text-xs mt-2 text-muted">
                Exemple : <em>« Pour Madame Martin au 12 rue de la Gare à Brest : 3 prises 16A, un disjoncteur différentiel 40A, 8 heures de pose. »</em>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* CLIENT */}
      <ReviewSection icon={<User className="h-4 w-4" />} title="Client">
        <div className="grid sm:grid-cols-2 gap-3">
          <ReviewField label="Nom">
            <Input
              value={data.client?.nom ?? ""}
              onChange={(e) => updateClient({ nom: e.target.value })}
              placeholder="Dupont"
            />
          </ReviewField>
          <ReviewField label="Prénom">
            <Input
              value={data.client?.prenom ?? ""}
              onChange={(e) => updateClient({ prenom: e.target.value })}
              placeholder="Jean"
            />
          </ReviewField>
          <ReviewField label="Société (si pro)" full>
            <Input
              value={data.client?.raison_sociale ?? ""}
              onChange={(e) => updateClient({ raison_sociale: e.target.value })}
              placeholder="SARL Dupont"
            />
          </ReviewField>
          <ReviewField label="Adresse" full>
            <Input
              value={data.client?.adresse ?? ""}
              onChange={(e) => updateClient({ adresse: e.target.value })}
              placeholder="12 rue de la Gare"
            />
          </ReviewField>
          <ReviewField label="Code postal">
            <Input
              value={data.client?.cp ?? ""}
              onChange={(e) => updateClient({ cp: e.target.value })}
              placeholder="29200"
              inputMode="numeric"
            />
          </ReviewField>
          <ReviewField label="Ville">
            <Input
              value={data.client?.ville ?? ""}
              onChange={(e) => updateClient({ ville: e.target.value })}
              placeholder="Brest"
            />
          </ReviewField>
        </div>
      </ReviewSection>

      {/* CHANTIER */}
      <ReviewSection icon={<MapPin className="h-4 w-4" />} title="Adresse du chantier">
        <Input
          value={data.chantier_adresse ?? ""}
          onChange={(e) => setData((d) => ({ ...d, chantier_adresse: e.target.value }))}
          placeholder="Idem que client, ou autre adresse"
        />
      </ReviewSection>

      {/* HEURES */}
      <ReviewSection icon={<Clock className="h-4 w-4" />} title="Heures de pose">
        <Input
          type="number"
          step="0.5"
          min="0"
          value={data.heures_main_oeuvre ?? 0}
          onChange={(e) => setData((d) => ({ ...d, heures_main_oeuvre: Number(e.target.value) || 0 }))}
          className="max-w-[12rem]"
        />
      </ReviewSection>

      {/* NOTES */}
      {(data.notes || data.notes === "") && data.notes !== undefined && (
        <ReviewSection icon={<Pencil className="h-4 w-4" />} title="Notes pour le client">
          <Input
            value={data.notes}
            onChange={(e) => setData((d) => ({ ...d, notes: e.target.value }))}
            placeholder="Délais, conditions d'accès…"
          />
        </ReviewSection>
      )}

      {/* ARTICLES */}
      <ReviewSection icon={<Package className="h-4 w-4" />} title={`Articles (${data.items.length})`}>
        {data.items.length === 0 ? (
          <p className="text-sm text-muted">Aucun article détecté. Cliquez « + Ligne » pour en ajouter.</p>
        ) : (
          <ul className="space-y-2">
            {data.items.map((it, idx) => (
              <li key={idx} className="flex items-center gap-2 rounded-md border border-border bg-surface-2 p-2">
                <Input
                  className="flex-1"
                  value={it.description}
                  onChange={(e) => updateItem(idx, { description: e.target.value })}
                  placeholder="Description"
                />
                <Input
                  type="number"
                  step="0.5"
                  min="0"
                  className="w-20 text-right"
                  value={it.quantity}
                  onChange={(e) => updateItem(idx, { quantity: Number(e.target.value) || 0 })}
                  aria-label="Quantité"
                />
                <Input
                  className="w-16"
                  value={it.unit}
                  onChange={(e) => updateItem(idx, { unit: e.target.value })}
                  aria-label="Unité"
                />
                <button
                  type="button"
                  onClick={() => removeItem(idx)}
                  className="grid h-8 w-8 place-items-center rounded text-muted hover:text-danger"
                  aria-label="Supprimer"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
        <button
          type="button"
          onClick={addItem}
          className="mt-2 inline-flex items-center gap-2 text-sm text-electric hover:underline"
        >
          <Plus className="h-3.5 w-3.5" /> Ajouter une ligne
        </button>
      </ReviewSection>

      {/* ACTIONS — GROS BOUTON D'APPLICATION */}
      <div className="mt-6 flex items-center justify-between gap-3 flex-wrap">
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-md border border-border text-sm hover:bg-surface-2"
        >
          <RotateCcw className="h-4 w-4" /> Re-dicter
        </button>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2.5 rounded-md text-sm text-muted hover:text-foreground"
          >
            Annuler
          </button>
          <Button
            onClick={() => onApply(data)}
            className="px-6 py-3 text-base font-semibold"
            disabled={empty}
          >
            <Check className="h-5 w-5" />
            Ajouter ces infos au devis
          </Button>
        </div>
      </div>
    </div>
  )
}

function ReviewSection({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="mt-4 first:mt-0">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-electric mb-2">
        {icon} {title}
      </div>
      <div>{children}</div>
    </section>
  )
}

function ReviewField({
  label,
  full,
  children,
}: {
  label: string
  full?: boolean
  children: React.ReactNode
}) {
  return (
    <div className={full ? "sm:col-span-2" : ""}>
      <Label className="text-xs">{label}</Label>
      <div className="mt-1">{children}</div>
    </div>
  )
}
