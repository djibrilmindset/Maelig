"use client"
import { useMemo, useState, useTransition } from "react"
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
import { saveDevis, type DevisPayload } from "@/lib/actions/devis"
import { formatEUR } from "@/lib/utils"

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
}

export function DevisEditor({
  orgDefaults,
  knownArticles,
  knownClients,
  initialPayload,
}: {
  orgDefaults: { taux_horaire: number; tva_default: number }
  knownArticles: ArticleLite[]
  knownClients: ClientLite[]
  initialPayload?: Partial<DevisPayload>
}) {
  const router = useRouter()
  const params = useSearchParams()
  const startMicOpen = params.get("source") === "voice"

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
  const [showVoice, setShowVoice] = useState(startMicOpen)
  const [clientSelectorOpen, setClientSelectorOpen] = useState(false)

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

  function applyTranscript(r: { raw: string; corrected: string; language?: string; extracted: { items: Array<{ description: string; quantity: number; unit: string; category?: string }>; heures_main_oeuvre?: number; chantier_adresse?: string; client_hint?: string; notes?: string } }) {
    setTranscript({ raw: r.raw, corrected: r.corrected, language: r.language })
    // Map items into devis items with article auto-match
    const additions: DevisPayload["items"] = r.extracted.items.map((it) => {
      const match = knownArticles.find((a) => a.nom.toLowerCase() === it.description.toLowerCase())
      return {
        description: it.description,
        quantite: it.quantity,
        unite: it.unit,
        prix_unitaire_ht: match?.prix_unitaire_ht ?? 0,
        article_id: match?.id ?? null,
      }
    })
    setItems((prev) => [...prev, ...additions])
    if (r.extracted.heures_main_oeuvre && !heuresMO) setHeuresMO(r.extracted.heures_main_oeuvre)
    if (r.extracted.chantier_adresse && !chantier) setChantier(r.extracted.chantier_adresse)
    if (r.extracted.notes && !notesClient) setNotesClient(r.extracted.notes)
    if (r.extracted.client_hint && !client.nom) setClient((c) => ({ ...c, nom: r.extracted.client_hint! }))
    toast.success(`${additions.length} ligne(s) ajoutées depuis votre vocal`, {
      description: r.language && r.language !== "fr" ? `Détecté : ${r.language} → traduit en français` : undefined,
    })
    setShowVoice(false)
  }

  function addLine() {
    setItems((p) => [...p, { description: "", quantite: 1, unite: "u", prix_unitaire_ht: 0 }])
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
    })
    setClientSelectorOpen(false)
  }

  async function submit(action: "draft" | "send") {
    if (!client.nom?.trim()) { toast.error("Renseignez d'abord le client"); setStep(0); return }
    if (heuresMO > 0 && !tauxHoraire) { toast.error("Indiquez votre taux horaire pour la main-d'œuvre"); setStep(2); return }
    if (action === "send" && items.length === 0 && heuresMO === 0) { toast.error("Aucune ligne à envoyer"); setStep(2); return }

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
      <div className="flex items-end justify-between gap-3">
        <div>
          <span className="text-xs uppercase tracking-[0.18em] text-muted">Nouveau devis</span>
          <h1 className="mt-1 font-display text-3xl font-bold tracking-tight">Décrivez votre chantier</h1>
        </div>
        <Button variant="ghost" onClick={() => setShowVoice((v) => !v)} className="gap-2">
          <Mic className="h-4 w-4 text-electric" /> {showVoice ? "Saisie classique" : "Saisie vocale"}
        </Button>
      </div>

      {/* Stepper */}
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

      {/* Voice panel */}
      <AnimatePresence>
        {showVoice && (
          <motion.div
            initial={{ opacity: 0, y: -8, height: 0 }}
            animate={{ opacity: 1, y: 0, height: "auto" }}
            exit={{ opacity: 0, y: -8, height: 0 }}
            className="overflow-hidden"
          >
            <Card className="border-electric/40 glow-electric">
              <div className="grid md:grid-cols-[auto,1fr] items-center gap-6">
                <VoiceRecorder onResult={applyTranscript} />
                <div>
                  <CardTitle>Astuce</CardTitle>
                  <p className="mt-1 text-sm text-muted">
                    Listez le matériel en parlant naturellement : <em className="text-foreground/80">&ldquo;Trois prises 16 ampères dans le salon, un disjoncteur différentiel 40 ampères, et 8 heures de pose chez Madame Martin au 12 rue de la Gare à Brest.&rdquo;</em>
                  </p>
                  {transcript ? (
                    <div className="mt-4 rounded-lg border border-border bg-surface-2 p-3">
                      <div className="text-[10px] uppercase tracking-[0.18em] text-muted mb-1 flex items-center gap-2">
                        <Languages className="h-3 w-3 text-electric" /> Texte corrigé · langue: {transcript.language ?? "auto"}
                      </div>
                      <p className="text-sm text-foreground/90 italic">&ldquo;{transcript.corrected}&rdquo;</p>
                    </div>
                  ) : null}
                </div>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Step content */}
      {step === 0 && (
        <Card>
          <div className="flex items-center justify-between gap-4 mb-4">
            <CardTitle>1. Pour quel client ?</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => setClientSelectorOpen((v) => !v)}>
              <User className="h-4 w-4" /> {clientSelectorOpen ? "Saisir manuellement" : "Choisir un client existant"}
            </Button>
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
                    {c.raison_sociale || [c.prenom, c.nom].filter(Boolean).join(" ")}
                  </div>
                  <div className="text-xs text-muted">{c.email ?? "—"}</div>
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
