"use client"
import { Suspense, useMemo, useState, useTransition } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import {
  Plus, Trash2, Save, Send, ChevronRight, ChevronLeft, Mic, Sparkles,
  CheckCircle2, AlertCircle, User, MapPin, Languages, Clock,
} from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input, Label, Textarea, FieldError } from "@/components/ui/input"
import { Card, CardTitle, Badge } from "@/components/ui/card"
import { VoiceRecorder } from "@/components/voice/voice-recorder"
import { SmartTextarea } from "@/components/voice/smart-textarea"
import { ClarifyCard } from "@/components/voice/clarify-card"
import { saveDevis, type DevisPayload } from "@/lib/actions/devis"
import { saveClient } from "@/lib/actions/clients"
import { formatEUR } from "@/lib/utils"
import type { Clarification } from "@/lib/llm/clarify"

interface ArticleLite {
  id: string
  nom: string
  prix_unitaire_ht: number | null
  unite: string | null
  usage_count: number
}
interface ClientLite {
  id: string
  nom: string
  prenom: string | null
  raison_sociale: string | null
  email: string | null
  telephone: string | null
  adresse: string | null
  ville: string | null
  cp: string | null
}

interface DevisEditorProps {
  orgDefaults: { taux_horaire: number; tva_default: number }
  knownArticles: ArticleLite[]
  knownClients: ClientLite[]
  initialPayload?: Partial<DevisPayload>
}

export function DevisEditor(props: DevisEditorProps) {
  return (
    <Suspense fallback={<div className="p-6 text-muted">Chargement…</div>}>
      <DevisEditorInner {...props} />
    </Suspense>
  )
}

function DevisEditorInner({
  orgDefaults,
  knownArticles,
  knownClients,
  initialPayload,
}: DevisEditorProps) {
  const router = useRouter()
  const params = useSearchParams()
  // Par défaut, on ouvre directement le panel vocal — c'est le mode principal de saisie.
  // L'user peut basculer en saisie classique via le toggle en haut.
  const skipVoiceParam = params.get("manual") === "1"

  const [step, setStep] = useState<0 | 1 | 2 | 3>(0)
  const [pending, startTransition] = useTransition()

  const [client, setClient] = useState<DevisPayload["client"]>(
    initialPayload?.client ?? { nom: "", prenom: "", raison_sociale: "", email: "", telephone: "", adresse: "", ville: "", cp: "" },
  )
  const [objet, setObjet] = useState(initialPayload?.objet ?? "")
  const [chantier, setChantier] = useState(initialPayload?.chantier_adresse ?? "")
  const [notesClient, setNotesClient] = useState(initialPayload?.notes_client ?? "")
  const [items, setItems] = useState<DevisPayload["items"]>(initialPayload?.items ?? [])
  const [tauxHoraire, setTauxHoraire] = useState<number>(initialPayload?.taux_horaire ?? orgDefaults.taux_horaire)
  const [heuresMO, setHeuresMO] = useState<number>(initialPayload?.heures_main_oeuvre ?? 0)
  const [tvaTaux, setTvaTaux] = useState<number>(initialPayload?.tva_taux ?? orgDefaults.tva_default)
  const [transcript, setTranscript] = useState<{ raw: string; corrected: string; language?: string } | null>(null)
  // Voice prominent par défaut sauf si user a déjà des items ou client OU ?manual=1.
  const [showVoice, setShowVoice] = useState(
    !skipVoiceParam && !(initialPayload?.items?.length) && !(initialPayload?.client?.nom),
  )
  const [clientSelectorOpen, setClientSelectorOpen] = useState(false)
  // Banner violet "Relisez !" — affiché après injection vocale jusqu'à dismiss.
  const [reviewNeeded, setReviewNeeded] = useState(false)

  // Clarification flow : when voice returns, we show ClarifyCard BEFORE applying anything.
  type VoiceData = {
    raw: string
    corrected: string
    language?: string
    extracted: {
      items: Array<{ description: string; quantity: number; unit: string; category?: string }>
      heures_main_oeuvre?: number
      chantier_adresse?: string
      chantier_objet?: string
      client_nom?: string
      client_prenom?: string
      client_telephone?: string
      client_email?: string
      client_adresse?: string
      client_ville?: string
      client_cp?: string
      notes?: string
    }
    clarification?: Clarification | null
    _diagnostic?: {
      pipeline?: string
      extract_error?: string | null
      extract_fallback_used?: boolean
      clarify_error?: string | null
    }
  }
  const [pendingVoice, setPendingVoice] = useState<VoiceData | null>(null)

  const totalArticles = useMemo(
    () => items.reduce((s, it) => s + (Number(it.quantite) || 0) * (Number(it.prix_unitaire_ht) || 0), 0),
    [items],
  )
  const totalMO = (tauxHoraire || 0) * (heuresMO || 0)
  const totalHT = totalArticles + totalMO
  const tvaMontant = (totalHT * tvaTaux) / 100
  const totalTTC = totalHT + tvaMontant

  const canNext = (s: number) => {
    if (s === 0) return Boolean(client.nom?.trim())
    if (s === 1) return true
    if (s === 2) return items.length > 0 || heuresMO > 0
    return true
  }

  // UX 2026-05-25 v2 : injection DIRECTE dans les champs, pas de ClarifyCard.
  // Le LLM classe les infos dans les bons champs (nom, adresse, CP, téléphone...)
  // et l'user peut corriger après dans le formulaire.
  // FIX 2026-05-26 : ajout taux_horaire, chantier_objet, plus d'infos client,
  // suppression des guards "!client.nom" pour permettre mises à jour multiples.
  function handleVoiceResult(r: VoiceData) {
    setTranscript({ raw: r.raw, corrected: r.corrected, language: r.language })
    setShowVoice(false)

    // ── Articles ──
    const additions: DevisPayload["items"] = (r.extracted.items ?? []).map((it) => {
      const match = knownArticles.find((a) => a.nom.toLowerCase() === it.description.toLowerCase())
      return {
        description: it.description,
        quantite: it.quantity,
        unite: it.unit,
        prix_unitaire_ht: match?.prix_unitaire_ht ?? 0,
        article_id: match?.id ?? null,
      }
    })
    if (additions.length > 0) setItems((prev) => [...prev, ...additions])

    // ── Taux horaire (NOUVEAU) ──
    // On accepte l'extraction même si déjà rempli (le LLM peut préciser)
    const ext = r.extracted
    if (typeof ext.taux_horaire === "number" && ext.taux_horaire > 0) {
      setTauxHoraire(ext.taux_horaire)
    }

    // ── Heures main-d'œuvre ──
    if (typeof ext.heures_main_oeuvre === "number" && ext.heures_main_oeuvre > 0) {
      setHeuresMO(ext.heures_main_oeuvre)
    }

    // ── Chantier & objet ──
    if (ext.chantier_objet) setObjet(ext.chantier_objet)
    if (ext.chantier_adresse) setChantier(ext.chantier_adresse)
    if (ext.notes) setNotesClient(ext.notes)

    // ── Client — champs dédiés d'abord, fallback client_hint ──
    if (ext.client_nom || ext.client_hint) {
      setClient((prev) => {
        const next = { ...prev }
        // Champs dédiés (extraction enrichie)
        if (ext.client_nom) next.nom = ext.client_nom
        if (ext.client_prenom) next.prenom = ext.client_prenom
        if (ext.client_telephone) next.telephone = ext.client_telephone
        if (ext.client_email) next.email = ext.client_email
        if (ext.client_adresse) next.adresse = ext.client_adresse
        if (ext.client_ville) next.ville = ext.client_ville
        if (ext.client_cp) next.cp = ext.client_cp
        // Fallback : si pas de client_nom mais un client_hint, essaye de split
        if (!ext.client_nom && ext.client_hint && !prev.nom) {
          const hint = ext.client_hint.trim()
          // "Madame Martin" → nom: "Martin", prénom: ""
          // "Jean Dupont" → prénom: "Jean", nom: "Dupont"
          const prefixes = ["monsieur", "madame", "m.", "mme", "mr", "m.", "sarl", "sa", "ei", "eurl"]
          const cleaned = prefixes.reduce((s, p) => {
            const re = new RegExp(`^${p}\\s+`, "i")
            return re.test(s) ? s.replace(re, "") : s
          }, hint)
          const parts = cleaned.split(/\s+/)
          if (parts.length === 1) {
            next.nom = parts[0]
          } else if (parts.length >= 2) {
            next.prenom = parts[0]
            next.nom = parts.slice(1).join(" ")
          }
        }
        return next
      })
    }

    setReviewNeeded(true)

    // Toast contextuel : articles ajoutés ? infos client ? les deux ?
    const hasClientFields = Boolean(ext.client_nom || ext.client_prenom || ext.client_telephone || ext.client_adresse)
    const rawPreview = (r.raw || "").slice(0, 120)
    toast.success(
      additions.length > 0 && hasClientFields
        ? `${additions.length} article(s) + client mis à jour`
        : additions.length > 0
          ? `${additions.length} ligne(s) ajoutées`
          : hasClientFields
            ? "Infos client détectées"
            : "Aucun article détecté",
      {
        description: rawPreview
          ? `Transcription : « ${rawPreview}${r.raw.length > 120 ? "…" : ""} »`
          : undefined,
        duration: 8000,
      },
    )
  }

  function discardPendingVoice() {
    setPendingVoice(null)
    setTranscript(null)
    setShowVoice(true)
  }

  function addLine() {
    setItems((p) => [...p, { description: "", quantite: 1, unite: "u", prix_unitaire_ht: 0 }])
  }

  function addSection() {
    setItems((p) => [...p, { description: "", quantite: 1, unite: "", prix_unitaire_ht: 0, is_section: true }])
  }

  function updateLine(idx: number, patch: Partial<DevisPayload["items"][number]>) {
    setItems((p) => p.map((it, i) => (i === idx ? { ...it, ...patch } : it)))
  }

  function removeLine(idx: number) {
    setItems((p) => p.filter((_, i) => i !== idx))
  }

  function selectArticle(idx: number, article: ArticleLite) {
    updateLine(idx, {
      description: article.nom,
      unite: article.unite ?? "u",
      prix_unitaire_ht: Number(article.prix_unitaire_ht ?? 0),
      article_id: article.id,
    })
  }

  function pickClient(c: ClientLite) {
    setClient({
      id: c.id,
      nom: c.nom,
      prenom: c.prenom ?? "",
      raison_sociale: c.raison_sociale ?? "",
      email: c.email ?? "",
      telephone: c.telephone ?? "",
      adresse: c.adresse ?? "",
      ville: c.ville ?? "",
      cp: c.cp ?? "",
    })
    setClientSelectorOpen(false)
  }

  async function submit(action: "draft" | "send") {
    if (!client.nom?.trim()) { toast.error("Renseignez d'abord le client"); setStep(0); return }
    if (heuresMO > 0 && !tauxHoraire) { toast.error("Indiquez votre taux horaire pour la main-d'œuvre"); setStep(2); return }
    if (action === "send" && items.length === 0 && heuresMO === 0) { toast.error("Aucune ligne à envoyer"); setStep(2); return }
    // Vérifie que toutes les lignes ont une description
    const emptyLines = items.filter((it) => !it.description?.trim())
    if (emptyLines.length > 0) {
      toast.error(`${emptyLines.length} ligne(s) sans description`, { description: "Remplissez ou supprimez les lignes vides." })
      setStep(2)
      return
    }

    const payload: DevisPayload = {
      id: initialPayload?.id,
      client,
      objet, chantier_adresse: chantier,
      notes_internes: "",
      notes_client: notesClient,
      taux_horaire: tauxHoraire,
      heures_main_oeuvre: heuresMO,
      tva_taux: tvaTaux,
      items,
    }
    startTransition(async () => {
      try {
        const res = await saveDevis(payload, action)
        toast.success(action === "send" ? "Devis envoyé 🚀" : "Brouillon enregistré ✅")
        router.push(action === "send" ? `/app/devis/attente-validation` : `/app/devis/${res.devisId}`)
      } catch (e) {
        toast.error("Erreur", { description: e instanceof Error ? e.message : String(e) })
      }
    })
  }

  return (
    <div className="max-w-5xl mx-auto p-6 sm:p-10 space-y-6">
      {/* Header */}
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <span className="text-xs uppercase tracking-[0.18em] text-muted">Nouveau devis</span>
          <h1 className="mt-1 font-display text-3xl font-bold tracking-tight">
            {showVoice ? "Parlez votre chantier" : "Décrivez votre chantier"}
          </h1>
        </div>
        <Button variant={showVoice ? "ghost" : "primary"} onClick={() => setShowVoice((v) => !v)} className="gap-2">
          <Mic className="h-4 w-4" /> {showVoice ? "Saisie clavier" : "Repasser en vocal"}
        </Button>
      </div>

      {/* HERO Voice (default visible, big mic button) */}
      <AnimatePresence>
        {showVoice && !pendingVoice && (
          <motion.div
            key="voice-hero"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8, height: 0 }}
            className="overflow-hidden"
          >
            <Card className="relative border-electric/50 glow-electric overflow-hidden">
              {/* Background glow décoratif */}
              <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-electric/20 blur-3xl pointer-events-none" />
              <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-wire-blue/15 blur-3xl pointer-events-none" />

              <div className="relative grid lg:grid-cols-[1fr,auto,1fr] items-center gap-8 py-6">
                {/* Left : titre + exemple */}
                <div className="lg:text-right space-y-3">
                  <span className="inline-flex items-center gap-2 rounded-full border border-electric/30 bg-electric/10 px-3 py-1 text-xs font-semibold tracking-wide text-electric uppercase">
                    <Sparkles className="h-3 w-3" /> Méthode la plus rapide
                  </span>
                  <h2 className="font-display text-2xl sm:text-3xl font-bold leading-tight">
                    Appuyez et <span className="text-electric">parlez</span><br />comme à un collègue.
                  </h2>
                  <p className="text-sm text-muted leading-relaxed">
                    DEP transcrit, traduit si besoin, structure les articles, prix et heures automatiquement.
                  </p>
                </div>

                {/* Center : BIG MIC */}
                <div className="flex flex-col items-center">
                  <VoiceRecorder onResult={handleVoiceResult} />
                </div>

                {/* Right : exemple concret */}
                <div className="space-y-3 lg:text-left">
                  <p className="text-xs uppercase tracking-[0.16em] text-muted">Exemple</p>
                  <blockquote className="rounded-lg border-l-4 border-electric bg-surface-2 px-4 py-3 text-sm italic text-foreground/90 leading-relaxed">
                    « Trois prises 16A dans le salon, un disjoncteur différentiel 40A, et 8 heures de pose chez Madame Martin au 12 rue de la Gare à Brest. »
                  </blockquote>
                  <p className="text-xs text-muted inline-flex items-center gap-1.5">
                    <Languages className="h-3.5 w-3.5 text-electric" />
                    Arabe · portugais · wolof · bambara · espagnol — DEP traduit en FR propre.
                  </p>
                </div>
              </div>
            </Card>
          </motion.div>
        )}

      </AnimatePresence>

      {/* Banner VIOLET après injection vocale — relire avant d'envoyer */}
      <AnimatePresence>
        {reviewNeeded && !showVoice && (
          <motion.div
            key="review-banner"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="relative rounded-[var(--radius)] border-2 border-purple-500 bg-gradient-to-r from-purple-600/15 via-purple-500/10 to-fuchsia-500/15 p-4 shadow-[0_0_24px_-8px_rgba(168,85,247,0.6)]"
          >
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-purple-500 text-white text-lg">
                ⚠️
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-display text-base font-bold text-purple-200">
                  Relisez avant d&apos;envoyer
                </p>
                <p className="mt-0.5 text-sm text-purple-100/90 leading-relaxed">
                  Surtout les <strong className="text-white">mots techniques</strong> (références, ampérages, marques) — l&apos;IA peut s&apos;être trompée.
                </p>
              </div>
              <button
                onClick={() => setReviewNeeded(false)}
                className="text-purple-200/70 hover:text-white text-xl leading-none px-2"
                aria-label="Fermer l'avertissement"
              >
                ×
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stepper (always visible, even with voice — pour permettre saisie complémentaire) */}
      {!showVoice && (
        <div className="glass rounded-[var(--radius)] border border-border p-2">
          <ol className="grid grid-cols-4">
            {["Client", "Chantier", "Articles", "Validation"].map((label, i) => (
              <li key={label}>
                <button
                  onClick={() => canNext(i - 1) && setStep(i as 0 | 1 | 2 | 3)}
                  className={`flex flex-col items-center gap-1 px-2 py-2 w-full rounded-md ${
                    step === i ? "bg-electric/10 text-electric" : "text-muted hover:text-foreground"
                  }`}
                >
                  <span className="text-[10px] uppercase tracking-[0.16em]">Étape {i + 1}</span>
                  <span className="text-sm font-medium">{label}</span>
                </button>
              </li>
            ))}
          </ol>
        </div>
      )}

      <AnimatePresence>
        {pendingVoice && (
          <motion.div
            key="clarify-panel"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="overflow-hidden"
          >
            <ClarifyCard
              clarification={
                pendingVoice.clarification ?? {
                  summary: pendingVoice.corrected || pendingVoice.raw,
                  items: pendingVoice.extracted.items.map((it) => ({
                    label: it.description,
                    qty: it.quantity,
                    unit: it.unit,
                    confidence: "medium" as const,
                  })),
                  client: pendingVoice.extracted.client_hint ?? null,
                  site: pendingVoice.extracted.chantier_adresse ?? null,
                  labor_hours: pendingVoice.extracted.heures_main_oeuvre ?? null,
                  questions: [],
                }
              }
              language={pendingVoice.language}
              onConfirm={applyPendingVoice}
              onEdit={() => { setPendingVoice(null); setShowVoice(true) }}
              onCancel={discardPendingVoice}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Step content */}
      {step === 0 && (
        <Card>
          <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
            <CardTitle>1. Pour quel client ?</CardTitle>
            <div className="flex items-center gap-2">
              {/* Bouton Enregistrer/Créer le client dans la base */}
              {client.nom?.trim() && !clientSelectorOpen && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={async () => {
                    try {
                      await saveClient(client)
                      toast.success(client.id ? "Client mis à jour ✅" : "Client créé ✅")
                    } catch (e) {
                      toast.error("Erreur", { description: e instanceof Error ? e.message : String(e) })
                    }
                  }}
                >
                  {client.id ? "💾 Enregistrer" : "💾 Créer le client"}
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={() => setClientSelectorOpen((v) => !v)}>
              <User className="h-4 w-4" /> {clientSelectorOpen ? "Saisir manuellement" : "Choisir un client existant"}
            </Button>
            </div>
          </div>
          {clientSelectorOpen ? (
            <div className="grid sm:grid-cols-2 gap-2">
              {knownClients.length === 0 ? (
                <p className="text-sm text-muted">Pas encore de client. Saisissez-le ci-dessous.</p>
              ) : knownClients.map((c) => (
                <button
                  key={c.id}
                  onClick={() => pickClient(c)}
                  className="text-left rounded-md border border-border bg-surface-2 px-3 py-2.5 hover:border-border-strong hover:bg-surface-3 transition-colors"
                >
                  <div className="text-sm font-medium">
                    {c.raison_sociale || [c.prenom, c.nom].filter(Boolean).join(" \u00b7 ")}
                  </div>
                  <div className="text-xs text-muted mt-0.5">{c.email ? c.email : "\u2014"}</div>
                  {(c.telephone || c.adresse) && (
                    <div className="text-[11px] text-muted-2 mt-0.5 truncate">
                      {[c.telephone, c.adresse].filter(Boolean).join(" \u2022 ")}
                    </div>
                  )}
                </button>
              ))}
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="client-nom">Nom *</Label>
                <Input id="client-nom" className="mt-2" value={client.nom} onChange={(e) => setClient((c) => ({ ...c, nom: e.target.value }))} placeholder="Dupont" />
              </div>
              <div>
                <Label htmlFor="client-prenom">Prénom</Label>
                <Input id="client-prenom" className="mt-2" value={client.prenom ?? ""} onChange={(e) => setClient((c) => ({ ...c, prenom: e.target.value }))} placeholder="Jean" />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="client-raison">Société (si pro)</Label>
                <Input id="client-raison" className="mt-2" value={client.raison_sociale ?? ""} onChange={(e) => setClient((c) => ({ ...c, raison_sociale: e.target.value }))} placeholder="Boulangerie Dupont SARL" />
              </div>
              <div>
                <Label htmlFor="client-email">Email</Label>
                <Input id="client-email" type="email" className="mt-2" value={client.email ?? ""} onChange={(e) => setClient((c) => ({ ...c, email: e.target.value }))} placeholder="contact@…" />
              </div>
              <div>
                <Label htmlFor="client-tel">Téléphone</Label>
                <Input id="client-tel" type="tel" className="mt-2" value={client.telephone ?? ""} onChange={(e) => setClient((c) => ({ ...c, telephone: e.target.value }))} placeholder="06 …" />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="client-adresse">Adresse</Label>
                <Input id="client-adresse" className="mt-2" value={client.adresse ?? ""} onChange={(e) => setClient((c) => ({ ...c, adresse: e.target.value }))} placeholder="12 rue de la Gare" />
              </div>
              <div>
                <Label htmlFor="client-cp">Code postal</Label>
                <Input id="client-cp" className="mt-2" value={client.cp ?? ""} onChange={(e) => setClient((c) => ({ ...c, cp: e.target.value }))} placeholder="29200" />
              </div>
              <div>
                <Label htmlFor="client-ville">Ville</Label>
                <Input id="client-ville" className="mt-2" value={client.ville ?? ""} onChange={(e) => setClient((c) => ({ ...c, ville: e.target.value }))} placeholder="Brest" />
              </div>
            </div>
          )}
        </Card>
      )}

      {step === 1 && (
        <Card>
          <CardTitle>2. Le chantier</CardTitle>
          <div className="mt-4 grid gap-4">
            <div>
              <Label htmlFor="objet">Objet du devis</Label>
              <Input id="objet" className="mt-2" value={objet} onChange={(e) => setObjet(e.target.value)} placeholder="Rénovation électrique appartement" />
            </div>
            <div>
              <Label htmlFor="chantier"><MapPin className="inline h-3 w-3 mr-1" /> Adresse du chantier</Label>
              <Input id="chantier" className="mt-2" value={chantier} onChange={(e) => setChantier(e.target.value)} placeholder="12 rue de la Gare, 29200 Brest" />
            </div>
            <div>
              <Label htmlFor="notes-client">Notes au client (visible sur le devis)</Label>
              <SmartTextarea id="notes-client" value={notesClient} onChange={setNotesClient} placeholder="Délai d'intervention 2 semaines, déchets emportés…" />
              <p className="mt-1 text-xs text-muted-2">
                <Sparkles className="inline h-3 w-3 text-electric" /> Cliquez sur l&apos;étincelle pour corriger l&apos;orthographe automatiquement.
              </p>
            </div>
          </div>
        </Card>
      )}

      {step === 2 && (
        <>
          <Card>
            <div className="flex items-center justify-between mb-3">
              <CardTitle>3. Articles & matériel</CardTitle>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={() => setShowVoice(true)}>
                  <Mic className="h-4 w-4 text-electric" /> Dicter
                </Button>
                <Button variant="secondary" size="sm" onClick={addLine}>
                  <Plus className="h-4 w-4" /> Ligne
                </Button>
                <Button variant="ghost" size="sm" onClick={addSection} className="text-wire-blue">
                  <Plus className="h-4 w-4" /> Section
                </Button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs uppercase tracking-wider text-muted">
                  <tr className="border-b border-border">
                    <th className="text-left py-2 pr-2">Description</th>
                    <th className="text-right py-2 px-2 w-20">Qté</th>
                    <th className="text-left py-2 px-2 w-20">Unité</th>
                    <th className="text-right py-2 px-2 w-32">PU HT</th>
                    <th className="text-right py-2 px-2 w-32">Total HT</th>
                    <th className="w-8"></th>
                  </tr>
                </thead>
                <tbody>
                  {items.length === 0 && (
                    <tr><td colSpan={6} className="py-6 text-center text-muted">Aucune ligne. Dictez ou cliquez sur &ldquo;Ligne&rdquo;.</td></tr>
                  )}
                  {items.map((it, i) => {
                    const total = (Number(it.quantite) || 0) * (Number(it.prix_unitaire_ht) || 0)
                    if (it.is_section) {
                      return (
                        <tr key={i} className="border-b border-border/40">
                          <td colSpan={6} className="py-2 pr-2">
                            <div className="flex items-center gap-2">
                              <Input
                                value={it.description}
                                onChange={(e) => updateLine(i, { description: e.target.value })}
                                placeholder="Nom de la section (ex: SALON)"
                                className="font-bold text-base border-electric/30 bg-electric/5"
                              />
                              <button onClick={() => removeLine(i)} aria-label="Supprimer" className="grid h-8 w-8 place-items-center rounded text-muted hover:text-danger shrink-0">
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    }
                    return (
                      <tr key={i} className="border-b border-border/60">
                        <td className="py-2 pr-2">
                          <Input
                            value={it.description}
                            onChange={(e) => updateLine(i, { description: e.target.value, article_id: null })}
                            placeholder="ex: Prise 16A étanche IP44"
                            list={`articles-suggest-${i}`}
                          />
                          <datalist id={`articles-suggest-${i}`}>
                            {knownArticles.slice(0, 40).map((a) => (
                              <option key={a.id} value={a.nom} data-id={a.id} label={`${formatEUR(a.prix_unitaire_ht ?? 0)}`} />
                            ))}
                          </datalist>
                          {it.article_id && (
                            <Badge tone="electric" className="mt-1">mémoire</Badge>
                          )}
                          {/* Quick picker */}
                          {!it.article_id && it.description.length >= 2 && (
                            <ArticlePicker
                              query={it.description}
                              all={knownArticles}
                              onPick={(a) => selectArticle(i, a)}
                            />
                          )}
                        </td>
                        <td className="py-2 px-2">
                          <Input type="number" step="0.01" min="0" value={it.quantite} className="text-right" onChange={(e) => updateLine(i, { quantite: Number(e.target.value) })} />
                        </td>
                        <td className="py-2 px-2">
                          <Input value={it.unite} onChange={(e) => updateLine(i, { unite: e.target.value })} placeholder="u" />
                        </td>
                        <td className="py-2 px-2">
                          <Input type="number" step="0.01" min="0" value={it.prix_unitaire_ht} className="text-right" onChange={(e) => updateLine(i, { prix_unitaire_ht: Number(e.target.value) })} />
                        </td>
                        <td className="py-2 px-2 text-right font-mono">{formatEUR(total)}</td>
                        <td className="py-2">
                          <button onClick={() => removeLine(i)} aria-label="Supprimer" className="grid h-8 w-8 place-items-center rounded text-muted hover:text-danger">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </Card>

          <Card>
            <CardTitle>Main-d&apos;œuvre & TVA</CardTitle>
            <div className="mt-4 grid sm:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="taux">Taux horaire (€/h)</Label>
                <Input id="taux" type="number" step="0.01" min="0" className="mt-2" value={tauxHoraire} onChange={(e) => setTauxHoraire(Number(e.target.value))} />
              </div>
              <div>
                <Label htmlFor="heures"><Clock className="inline h-3 w-3 mr-1" /> Heures de pose</Label>
                <Input id="heures" type="number" step="0.5" min="0" className="mt-2" value={heuresMO} onChange={(e) => setHeuresMO(Number(e.target.value))} />
              </div>
              <div>
                <Label htmlFor="tva">TVA (%)</Label>
                <Input id="tva" type="number" step="0.5" min="0" max="30" className="mt-2" value={tvaTaux} onChange={(e) => setTvaTaux(Number(e.target.value))} />
              </div>
            </div>
            {heuresMO > 0 && (
              <p className="mt-3 text-xs text-muted">
                Main-d&apos;œuvre = {heuresMO}h × {formatEUR(tauxHoraire)} = <span className="text-foreground font-medium">{formatEUR(totalMO)}</span>
              </p>
            )}
          </Card>
        </>
      )}

      {step === 3 && (
        <Card>
          <CardTitle>Récapitulatif</CardTitle>
          <dl className="mt-6 space-y-2 text-sm">
            <Row label="Client">{[client.raison_sociale, client.nom, client.prenom].filter(Boolean).join(" · ") || "—"}</Row>
            <Row label="Chantier">{chantier || "—"}</Row>
            <Row label="Objet">{objet || "—"}</Row>
            <Row label="Articles">{items.length} ligne(s)</Row>
            <Row label="Main-d'œuvre">{heuresMO}h × {formatEUR(tauxHoraire)}</Row>
            <Row label="Total HT articles">{formatEUR(totalArticles)}</Row>
            <Row label="Total HT main-d'œuvre">{formatEUR(totalMO)}</Row>
            <div className="my-4 border-t border-border" />
            <Row label="Total HT" bold>{formatEUR(totalHT)}</Row>
            <Row label={`TVA (${tvaTaux}%)`}>{formatEUR(tvaMontant)}</Row>
            <Row label="Total TTC" bold accent>{formatEUR(totalTTC)}</Row>
          </dl>
          <p className="mt-6 text-xs text-muted-2">
            Lors de l&apos;envoi, le client reçoit un email avec le PDF du devis et un lien pour signer en ligne.
          </p>
        </Card>
      )}

      {/* Footer actions sticky */}
      <div className="sticky bottom-4 z-30">
        <div className="glass border border-border rounded-[var(--radius-lg)] p-3 flex items-center justify-between gap-3">
          <div className="text-sm">
            <span className="text-muted">Total TTC :</span>{" "}
            <span className="font-display text-lg font-semibold">{formatEUR(totalTTC)}</span>
          </div>
          <div className="flex items-center gap-2">
            {step > 0 && (
              <Button variant="ghost" onClick={() => setStep((s) => (s - 1) as 0 | 1 | 2 | 3)}>
                <ChevronLeft className="h-4 w-4" /> Précédent
              </Button>
            )}
            {step < 3 ? (
              <Button onClick={() => canNext(step) && setStep((s) => (s + 1) as 0 | 1 | 2 | 3)} disabled={!canNext(step)}>
                Suivant <ChevronRight className="h-4 w-4" />
              </Button>
            ) : (
              <>
                <Button variant="secondary" loading={pending} onClick={() => submit("draft")}>
                  <Save className="h-4 w-4" /> Brouillon
                </Button>
                <Button loading={pending} onClick={() => submit("send")}>
                  <Send className="h-4 w-4" /> Envoyer au client
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* helpers */}
      {!canNext(step) && step === 0 && (
        <p className="text-xs text-warning inline-flex items-center gap-2">
          <AlertCircle className="h-3.5 w-3.5" /> Le nom du client est requis pour continuer.
        </p>
      )}
      {step === 3 && totalTTC > 0 && (
        <p className="text-xs text-success inline-flex items-center gap-2">
          <CheckCircle2 className="h-3.5 w-3.5" /> Prêt à envoyer.
        </p>
      )}
    </div>
  )
}

function Row({ label, children, bold, accent }: { label: string; children: React.ReactNode; bold?: boolean; accent?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className={accent ? "text-electric uppercase tracking-wider text-xs font-semibold" : "text-muted text-xs uppercase tracking-wider"}>{label}</dt>
      <dd className={accent ? "font-display text-xl font-bold text-electric" : bold ? "font-display font-semibold" : ""}>{children}</dd>
    </div>
  )
}

function ArticlePicker({
  query,
  all,
  onPick,
}: {
  query: string
  all: ArticleLite[]
  onPick: (a: ArticleLite) => void
}) {
  const q = query.toLowerCase()
  const matches = all
    .filter((a) => a.nom.toLowerCase().includes(q) && a.nom.toLowerCase() !== q)
    .slice(0, 4)
  if (matches.length === 0) return null
  return (
    <div className="mt-1 flex flex-wrap gap-1">
      {matches.map((a) => (
        <button
          key={a.id}
          type="button"
          onClick={() => onPick(a)}
          className="text-[11px] rounded-full border border-border bg-surface-2 px-2 py-0.5 text-muted hover:text-electric hover:border-electric/60"
        >
          {a.nom} · {formatEUR(a.prix_unitaire_ht ?? 0)}
        </button>
      ))}
    </div>
  )
}
