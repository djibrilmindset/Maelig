     1|"use client"
     2|import { Suspense, useEffect, useMemo, useRef, useState, useTransition } from "react"
     3|import { useRouter, useSearchParams } from "next/navigation"
     4|import { motion, AnimatePresence } from "framer-motion"
     5|import {
     6|  Plus, Trash2, Save, Send, ChevronRight, ChevronLeft, Mic, Sparkles,
     7|  CheckCircle2, AlertCircle, User, MapPin, Languages, Clock, RotateCcw,
     8|} from "lucide-react"
     9|import { toast } from "sonner"
    10|import { Button } from "@/components/ui/button"
    11|import { Input, Label } from "@/components/ui/input"
    12|import { Card, CardTitle, Badge } from "@/components/ui/card"
    13|import { VoiceRecorder } from "@/components/voice/voice-recorder"
    14|import { SmartTextarea } from "@/components/voice/smart-textarea"
    15|import { saveDevis, type DevisPayload } from "@/lib/actions/devis"
    16|import { formatEUR, cn } from "@/lib/utils"
    17|import type { Clarification } from "@/lib/llm/clarify"
    18|import { deriveObjet } from "@/lib/devis-voice-mapper"
    19|import { useDevisDraft, formatSavedAgo } from "@/lib/use-devis-draft"
    20|import { ExtractionReviewPanel, normalizeExtracted, type ExtractedReview } from "./extraction-review-panel"
    21|
    22|interface ArticleLite {
    23|  id: string
    24|  nom: string
    25|  prix_unitaire_ht: number | null
    26|  unite: string | null
    27|  usage_count: number
    28|}
    29|interface ClientLite {
    30|  id: string
    31|  nom: string
    32|  prenom: string | null
    33|  raison_sociale: string | null
    34|  email: string | null
    35|}
    36|
    37|interface DevisEditorProps {
    38|  orgDefaults: { taux_horaire: number; tva_default: number }
    39|  knownArticles: ArticleLite[]
    40|  knownClients: ClientLite[]
    41|  initialPayload?: Partial<DevisPayload>
    42|}
    43|
    44|export function DevisEditor(props: DevisEditorProps) {
    45|  return (
    46|    <Suspense fallback={<div className="p-6 text-muted">Chargement…</div>}>
    47|      <DevisEditorInner {...props} />
    48|    </Suspense>
    49|  )
    50|}
    51|
    52|function DevisEditorInner({
    53|  orgDefaults,
    54|  knownArticles,
    55|  knownClients,
    56|  initialPayload,
    57|}: DevisEditorProps) {
    58|  const router = useRouter()
    59|  const params = useSearchParams()
    60|  // Par défaut, on ouvre directement le panel vocal — c'est le mode principal de saisie.
    61|  // L'user peut basculer en saisie classique via le toggle en haut.
    62|  const skipVoiceParam = params.get("manual") === "1"
    63|
    64|  const [step, setStep] = useState<0 | 1 | 2 | 3>(0)
    65|  const [pending, startTransition] = useTransition()
    66|
    67|  const [client, setClient] = useState<DevisPayload["client"]>(
    68|    initialPayload?.client ?? { nom: "", prenom: "", raison_sociale: "", email: "", telephone: "", adresse: "", ville: "", cp: "" },
    69|  )
    70|  const [objet, setObjet] = useState(initialPayload?.objet ?? "")
    71|  const [chantier, setChantier] = useState(initialPayload?.chantier_adresse ?? "")
    72|  const [notesClient, setNotesClient] = useState(initialPayload?.notes_client ?? "")
    73|  const [items, setItems] = useState<DevisPayload["items"]>(initialPayload?.items ?? [])
    74|  const [tauxHoraire, setTauxHoraire] = useState<number>(initialPayload?.taux_horaire ?? orgDefaults.taux_horaire)
    75|  const [heuresMO, setHeuresMO] = useState<number>(initialPayload?.heures_main_oeuvre ?? 0)
    76|  const [tvaTaux, setTvaTaux] = useState<number>(initialPayload?.tva_taux ?? orgDefaults.tva_default)
    77|  const [transcript, setTranscript] = useState<{ raw: string; corrected: string; language?: string } | null>(null)
    78|  // Voice prominent par défaut sauf si user a déjà des items ou client OU ?manual=1.
    79|  const [showVoice, setShowVoice] = useState(
    80|    !skipVoiceParam && !(initialPayload?.items?.length) && !(initialPayload?.client?.nom),
    81|  )
    82|  const [clientSelectorOpen, setClientSelectorOpen] = useState(false)
    83|  // Banner violet "Relisez !" — affiché après injection vocale jusqu'à dismiss.
    84|  const [reviewNeeded, setReviewNeeded] = useState(false)
    85|  // Champs récemment auto-remplis par le vocal (pour highlight visuel 6s)
    86|  const [voiceFilled, setVoiceFilled] = useState<Set<string>>(new Set())
    87|  // Champs DONT la VALEUR vient encore exclusivement du vocal (pas modifié par user).
    88|  // Sert au merge progressif : on a le droit d'écraser ces champs avec une version plus complète.
    89|  // Si l'user tape manuellement → on retire le champ du set → on ne le touche plus.
    90|  const voiceOwnedRef = useRef<Set<string>>(new Set())
    91|  // Index dans `items` des lignes ajoutées par la dernière vague partielle (pour pouvoir les remplacer).
    92|  const voicePartialItemKeysRef = useRef<Set<string>>(new Set())
    93|
    94|  // Clarification flow : when voice returns, we show ClarifyCard BEFORE applying anything.
    95|  type VoiceData = {
    96|    raw: string
    97|    corrected: string
    98|    language?: string
    99|    extracted: {
   100|      items: Array<{ description: string; quantity: number; unit: string; category?: string }>
   101|      heures_main_oeuvre?: number
   102|      chantier_adresse?: string
   103|      chantier_objet?: string
   104|      client_nom?: string
   105|      client_prenom?: string
   106|      client_telephone?: string
   107|      client_email?: string
   108|      client_adresse?: string
   109|      client_ville?: string
   110|      client_cp?: string
   111|      notes?: string
   112|    }
   113|    clarification?: Clarification | null
   114|    _diagnostic?: {
   115|      pipeline?: string
   116|      extract_error?: string | null
   117|      extract_fallback_used?: boolean
   118|      clarify_error?: string | null
   119|    }
   120|  }
   121|  // NOUVELLE APPROCHE : data extraite affichée dans le panneau de revue éditable.
   122|  // L'user voit → corrige → 1 clic "Ajouter au devis" pour valider.
   123|  const [reviewData, setReviewData] = useState<ExtractedReview | null>(null)
   124|  const [reviewRawText, setReviewRawText] = useState<string | null>(null)
   125|
   126|  // ===== AUTO-SAVE BROUILLON (localStorage, 800ms debounce, TTL 7j) =====
   127|  // Cible : utilisateurs seniors qui ferment la page par accident, perdent le réseau,
   128|  // ou quittent pour répondre au tél. Au retour : tout est exactement comme avant.
   129|  const draftKey = `dep:devis:draft:${initialPayload?.id ?? "new"}`
   130|  const draftValue = useMemo(
   131|    () => ({ client, objet, chantier, notesClient, items, tauxHoraire, heuresMO, tvaTaux }),
   132|    [client, objet, chantier, notesClient, items, tauxHoraire, heuresMO, tvaTaux],
   133|  )
   134|  const { hydrated, lastSavedAt, clearDraft } = useDevisDraft(draftKey, draftValue, {
   135|    enabled: !initialPayload, // pas d'auto-save si on édite un devis existant (Supabase est la source)
   136|  })
   137|
   138|  // Restauration silencieuse au mount si brouillon trouvé
   139|  useEffect(() => {
   140|    if (!hydrated) return
   141|    setClient(hydrated.client ?? client)
   142|    setObjet(hydrated.objet ?? "")
   143|    setChantier(hydrated.chantier ?? "")
   144|    setNotesClient(hydrated.notesClient ?? "")
   145|    setItems(hydrated.items ?? [])
   146|    setTauxHoraire(hydrated.tauxHoraire ?? orgDefaults.taux_horaire)
   147|    setHeuresMO(hydrated.heuresMO ?? 0)
   148|    setTvaTaux(hydrated.tvaTaux ?? orgDefaults.tva_default)
   149|    // Si on a restauré du contenu réel, on cache le panneau vocal pour aller à l'édition
   150|    if (hydrated.client?.nom || hydrated.items?.length) {
   151|      setShowVoice(false)
   152|    }
   153|    toast.success("Brouillon restauré", {
   154|      description: "Vous reprenez là où vous étiez parti.",
   155|    })
   156|    // eslint-disable-next-line react-hooks/exhaustive-deps
   157|  }, [hydrated])
   158|
   159|  // Helper highlight 6s (anneau electric autour des champs remplis par vocal)
   160|  function markVoiceFilled(keys: string[]) {
   161|    setVoiceFilled(new Set(keys))
   162|    window.setTimeout(() => setVoiceFilled(new Set()), 6000)
   163|  }
   164|
   165|  function resetAll() {
   166|    if (!window.confirm("Effacer tout le devis ? Cette action est irréversible.")) return
   167|    setClient({ nom: "", prenom: "", raison_sociale: "", email: "", telephone: "", adresse: "", ville: "", cp: "" })
   168|    setObjet("")
   169|    setChantier("")
   170|    setNotesClient("")
   171|    setItems([])
   172|    setHeuresMO(0)
   173|    setTvaTaux(orgDefaults.tva_default)
   174|    setTauxHoraire(orgDefaults.taux_horaire)
   175|    setTranscript(null)
   176|    setReviewNeeded(false)
   177|    setVoiceFilled(new Set())
   178|    clearDraft()
   179|    setShowVoice(true)
   180|    setStep(0)
   181|    toast.info("Devis effacé. Vous pouvez recommencer.")
   182|  }
   183|
   184|  const totalArticles = useMemo(
   185|    () => items.reduce((s, it) => s + (Number(it.quantite) || 0) * (Number(it.prix_unitaire_ht) || 0), 0),
   186|    [items],
   187|  )
   188|  const totalMO = (tauxHoraire || 0) * (heuresMO || 0)
   189|  const totalHT = totalArticles + totalMO
   190|  const tvaMontant = (totalHT * tvaTaux) / 100
   191|  const totalTTC = totalHT + tvaMontant
   192|
   193|  const canNext = (s: number) => {
   194|    if (s === 0) return Boolean(client.nom?.trim())
   195|    if (s === 1) return true
   196|    if (s === 2) return items.length > 0 || heuresMO > 0
   197|    return true
   198|  }
   199|
   200|<<<<<<< HEAD
   201|  // UX 2026-05-25 v2 : injection DIRECTE dans les champs, pas de ClarifyCard.
   202|  // Le LLM classe les infos dans les bons champs (nom, adresse, CP, téléphone...)
   203|  // et l'user peut corriger après dans le formulaire.
   204|  function handleVoiceResult(r: VoiceData) {
   205|    setTranscript({ raw: r.raw, corrected: r.corrected, language: r.language })
   206|    setShowVoice(false)
   207|
   208|    const additions: DevisPayload["items"] = (r.extracted.items ?? []).map((it) => {
   209|=======
   210|  // NOUVELLE APPROCHE 2026-05-20 : on n'auto-fill PLUS silencieusement.
   211|  // À la place : on ouvre un panneau de REVUE éditable, l'user voit/corrige/valide en 1 clic.
   212|  // Avantages : transparent, prévisible, fiable (push atomique en handler React),
   213|  // diagnostic immédiat si extraction vide.
   214|  function handleVoiceResult(r: VoiceData) {
   215|    setTranscript({ raw: r.raw, corrected: r.corrected, language: r.language })
   216|    const review = normalizeExtracted(r.extracted)
   217|    setReviewData(review)
   218|    setReviewRawText(r.corrected || r.raw)
   219|    voicePartialItemKeysRef.current = new Set()
   220|    setShowVoice(false)
   221|    if (r.language && r.language !== "fr") {
   222|      toast.info(`Langue détectée : ${r.language} — traduite en français`)
   223|    }
   224|  }
   225|
   226|  // Bouton "Ajouter ces infos au devis" → push tout en BATCH atomique (1 seul re-render).
   227|  function applyReviewedExtraction(data: ExtractedReview) {
   228|    const filledKeys: string[] = []
   229|
   230|    // CLIENT — on n'écrase QUE si user n'a pas déjà rempli manuellement
   231|    setClient((c) => {
   232|      const next = { ...c }
   233|      const dc = data.client ?? {}
   234|      if (dc.nom) { next.nom = dc.nom; filledKeys.push("client-nom") }
   235|      if (dc.prenom) { next.prenom = dc.prenom; filledKeys.push("client-prenom") }
   236|      if (dc.raison_sociale) { next.raison_sociale = dc.raison_sociale; filledKeys.push("client-raison") }
   237|      if (dc.adresse) { next.adresse = dc.adresse; filledKeys.push("client-adresse") }
   238|      if (dc.cp) { next.cp = dc.cp; filledKeys.push("client-cp") }
   239|      if (dc.ville) { next.ville = dc.ville; filledKeys.push("client-ville") }
   240|      return next
   241|    })
   242|
   243|    if (data.chantier_adresse) {
   244|      setChantier(data.chantier_adresse)
   245|      filledKeys.push("chantier")
   246|    }
   247|    if (data.heures_main_oeuvre) {
   248|      setHeuresMO(data.heures_main_oeuvre)
   249|      filledKeys.push("heures")
   250|    }
   251|    if (data.notes !== undefined) {
   252|      setNotesClient(data.notes)
   253|      filledKeys.push("notes-client")
   254|    }
   255|
   256|    // ARTICLES — ajouter aux items existants
   257|    const additions: DevisPayload["items"] = data.items.map((it) => {
   258|>>>>>>> 0f6d818 (mobile: navigation drawer coulissant + barre inférieure BottomNav)
   259|      const match = knownArticles.find((a) => a.nom.toLowerCase() === it.description.toLowerCase())
   260|      return {
   261|        description: it.description,
   262|        quantite: it.quantity,
   263|        unite: it.unit,
   264|        prix_unitaire_ht: match?.prix_unitaire_ht ?? 0,
   265|        article_id: match?.id ?? null,
   266|      }
   267|    })
   268|<<<<<<< HEAD
   269|    setItems((prev) => [...prev, ...additions])
   270|
   271|    if (r.extracted.heures_main_oeuvre && !heuresMO) setHeuresMO(r.extracted.heures_main_oeuvre)
   272|    if (r.extracted.chantier_adresse && !chantier) setChantier(r.extracted.chantier_adresse)
   273|    if (r.extracted.chantier_objet && !objet) setObjet(r.extracted.chantier_objet)
   274|    if (r.extracted.notes && !notesClient) setNotesClient(r.extracted.notes)
   275|
   276|    // Chaque info va dans son champ dédié
   277|    if (r.extracted.client_nom && !client.nom) setClient((c) => ({ ...c, nom: r.extracted.client_nom! }))
   278|    if (r.extracted.client_prenom && !client.prenom) setClient((c) => ({ ...c, prenom: r.extracted.client_prenom! }))
   279|    if (r.extracted.client_telephone && !client.telephone) setClient((c) => ({ ...c, telephone: r.extracted.client_telephone! }))
   280|    if (r.extracted.client_email && !client.email) setClient((c) => ({ ...c, email: r.extracted.client_email! }))
   281|    if (r.extracted.client_adresse && !client.adresse) setClient((c) => ({ ...c, adresse: r.extracted.client_adresse! }))
   282|    if (r.extracted.client_ville && !client.ville) setClient((c) => ({ ...c, ville: r.extracted.client_ville! }))
   283|    if (r.extracted.client_cp && !client.cp) setClient((c) => ({ ...c, cp: r.extracted.client_cp! }))
   284|
   285|    setReviewNeeded(true)
   286|
   287|    const rawPreview = (r.raw || "").slice(0, 120)
   288|    toast.success(
   289|      additions.length > 0
   290|        ? `${additions.length} ligne(s) ajoutées`
   291|        : "Aucun article détecté",
   292|      {
   293|        description: rawPreview
   294|          ? `Transcription : « ${rawPreview}${r.raw.length > 120 ? "…" : ""} »`
   295|          : undefined,
   296|        duration: 8000,
   297|      },
   298|    )
   299|  }
   300|
   301|  function discardPendingVoice() {
   302|    setPendingVoice(null)
   303|    setTranscript(null)
   304|    setShowVoice(true)
   305|=======
   306|    if (additions.length) {
   307|      setItems((prev) => [...prev, ...additions])
   308|      filledKeys.push("items")
   309|    }
   310|
   311|    if (!objet.trim()) {
   312|      const auto = deriveObjet({
   313|        itemsDescriptions: additions.map((a) => a.description),
   314|        chantierAdresse: data.chantier_adresse,
   315|        clientName: data.client?.raison_sociale || [data.client?.prenom, data.client?.nom].filter(Boolean).join(" "),
   316|      })
   317|      if (auto) {
   318|        setObjet(auto)
   319|        filledKeys.push("objet")
   320|      }
   321|    }
   322|
   323|    markVoiceFilled(filledKeys)
   324|    setReviewData(null)
   325|    setReviewRawText(null)
   326|    setReviewNeeded(true)
   327|    setStep(0)
   328|    toast.success(`${filledKeys.length} champ(s) ajouté(s) au devis`, {
   329|      description: "Vérifiez les champs en surbrillance avant d'envoyer.",
   330|    })
   331|  }
   332|
   333|  // STREAMING LIVE : on alimente le panneau de revue en temps réel pendant que l'user parle.
   334|  // L'user voit le panneau se construire mot à mot — quand il a fini de parler il appuie
   335|  // sur "Ajouter ces infos au devis" qui pousse tout en batch atomique.
   336|  // Aucun champ du devis n'est touché tant que l'user n'a pas validé.
   337|  function handleLivePartialResult(p: { text: string; extracted: VoiceData["extracted"] }) {
   338|    const review = normalizeExtracted(p.extracted)
   339|    setReviewData(review)
   340|    setReviewRawText(p.text)
   341|>>>>>>> 0f6d818 (mobile: navigation drawer coulissant + barre inférieure BottomNav)
   342|  }
   343|
   344|  function addLine() {
   345|    setItems((p) => [...p, { description: "", quantite: 1, unite: "u", prix_unitaire_ht: 0 }])
   346|  }
   347|
   348|  function updateLine(idx: number, patch: Partial<DevisPayload["items"][number]>) {
   349|    setItems((p) => p.map((it, i) => (i === idx ? { ...it, ...patch } : it)))
   350|  }
   351|
   352|  function removeLine(idx: number) {
   353|    setItems((p) => p.filter((_, i) => i !== idx))
   354|  }
   355|
   356|  function selectArticle(idx: number, article: ArticleLite) {
   357|    updateLine(idx, {
   358|      description: article.nom,
   359|      unite: article.unite ?? "u",
   360|      prix_unitaire_ht: Number(article.prix_unitaire_ht ?? 0),
   361|      article_id: article.id,
   362|    })
   363|  }
   364|
   365|  // CSS helper : anneau electric pulse sur les champs récemment auto-remplis par voix
   366|  const voiceRing = (key: string) =>
   367|    voiceFilled.has(key)
   368|      ? "ring-2 ring-electric/70 ring-offset-2 ring-offset-background animate-pulse"
   369|      : ""
   370|
   371|  // L'user a tapé manuellement → on retire le champ du set "voice-owned" pour ne plus
   372|  // l'écraser au prochain partial. C'est le respect de l'édit humain.
   373|  const releaseFromVoice = (key: string) => {
   374|    if (voiceOwnedRef.current.has(key)) voiceOwnedRef.current.delete(key)
   375|  }
   376|
   377|  function pickClient(c: ClientLite) {
   378|    setClient({
   379|      id: c.id,
   380|      nom: c.nom,
   381|      prenom: c.prenom ?? "",
   382|      raison_sociale: c.raison_sociale ?? "",
   383|      email: c.email ?? "",
   384|    })
   385|    setClientSelectorOpen(false)
   386|  }
   387|
   388|  async function submit(action: "draft" | "send") {
   389|    if (!client.nom?.trim()) { toast.error("Renseignez d'abord le client"); setStep(0); return }
   390|    if (heuresMO > 0 && !tauxHoraire) { toast.error("Indiquez votre taux horaire pour la main-d'œuvre"); setStep(2); return }
   391|    if (action === "send" && items.length === 0 && heuresMO === 0) { toast.error("Aucune ligne à envoyer"); setStep(2); return }
   392|
   393|    const payload: DevisPayload = {
   394|      id: initialPayload?.id,
   395|      client,
   396|      objet, chantier_adresse: chantier,
   397|      notes_internes: "",
   398|      notes_client: notesClient,
   399|      taux_horaire: tauxHoraire,
   400|      heures_main_oeuvre: heuresMO,
   401|      tva_taux: tvaTaux,
   402|      items,
   403|    }
   404|    startTransition(async () => {
   405|      try {
   406|        const res = await saveDevis(payload, action)
   407|        toast.success(action === "send" ? "Devis envoyé 🚀" : "Brouillon enregistré ✅")
   408|        // Une fois sauvegardé côté Supabase, on nettoie le brouillon localStorage
   409|        clearDraft()
   410|        router.push(action === "send" ? `/app/devis/attente-validation` : `/app/devis/${res.devisId}`)
   411|      } catch (e) {
   412|        toast.error("Erreur", { description: e instanceof Error ? e.message : String(e) })
   413|      }
   414|    })
   415|  }
   416|
   417|  return (
   418|    <div className="max-w-5xl mx-auto p-6 sm:p-10 space-y-6">
   419|      {/* Header */}
   420|      <div className="flex items-end justify-between gap-3 flex-wrap">
   421|        <div>
   422|          <span className="text-xs uppercase tracking-[0.18em] text-muted">Nouveau devis</span>
   423|          <h1 className="mt-1 font-display text-3xl font-bold tracking-tight">
   424|            {showVoice ? "Parlez votre chantier" : "Décrivez votre chantier"}
   425|          </h1>
   426|        </div>
   427|        <Button variant={showVoice ? "ghost" : "primary"} onClick={() => setShowVoice((v) => !v)} className="gap-2">
   428|          <Mic className="h-4 w-4" /> {showVoice ? "Saisie clavier" : "Repasser en vocal"}
   429|        </Button>
   430|      </div>
   431|
   432|      {/* HERO Voice (default visible, big mic button) */}
   433|      <AnimatePresence>
   434|        {showVoice && !reviewData && (
   435|          <motion.div
   436|            key="voice-hero"
   437|            initial={{ opacity: 0, y: -8 }}
   438|            animate={{ opacity: 1, y: 0 }}
   439|            exit={{ opacity: 0, y: -8, height: 0 }}
   440|            className="overflow-hidden"
   441|          >
   442|            <Card className="relative border-electric/50 glow-electric overflow-hidden">
   443|              {/* Background glow décoratif */}
   444|              <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-electric/20 blur-3xl pointer-events-none" />
   445|              <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-wire-blue/15 blur-3xl pointer-events-none" />
   446|
   447|              <div className="relative grid lg:grid-cols-[1fr,auto,1fr] items-center gap-8 py-6">
   448|                {/* Left : titre + exemple */}
   449|                <div className="lg:text-right space-y-3">
   450|                  <span className="inline-flex items-center gap-2 rounded-full border border-electric/30 bg-electric/10 px-3 py-1 text-xs font-semibold tracking-wide text-electric uppercase">
   451|                    <Sparkles className="h-3 w-3" /> Méthode la plus rapide
   452|                  </span>
   453|                  <h2 className="font-display text-2xl sm:text-3xl font-bold leading-tight">
   454|                    Appuyez et <span className="text-electric">parlez</span><br />comme à un collègue.
   455|                  </h2>
   456|                  <p className="text-sm text-muted leading-relaxed">
   457|                    DEP transcrit, traduit si besoin, structure les articles, prix et heures automatiquement.
   458|                  </p>
   459|                </div>
   460|
   461|                {/* Center : BIG MIC */}
   462|                <div className="flex flex-col items-center">
   463|                  <VoiceRecorder onResult={handleVoiceResult} onPartialResult={handleLivePartialResult} />
   464|                </div>
   465|
   466|                {/* Right : exemple concret */}
   467|                <div className="space-y-3 lg:text-left">
   468|                  <p className="text-xs uppercase tracking-[0.16em] text-muted">Exemple</p>
   469|                  <blockquote className="rounded-lg border-l-4 border-electric bg-surface-2 px-4 py-3 text-sm italic text-foreground/90 leading-relaxed">
   470|                    « Trois prises 16A dans le salon, un disjoncteur différentiel 40A, et 8 heures de pose chez Madame Martin au 12 rue de la Gare à Brest. »
   471|                  </blockquote>
   472|                  <p className="text-xs text-muted inline-flex items-center gap-1.5">
   473|                    <Languages className="h-3.5 w-3.5 text-electric" />
   474|                    Arabe · portugais · wolof · bambara · espagnol — DEP traduit en FR propre.
   475|                  </p>
   476|                </div>
   477|              </div>
   478|            </Card>
   479|          </motion.div>
   480|        )}
   481|
   482|      </AnimatePresence>
   483|
   484|      {/* Banner VIOLET après injection vocale — relire avant d'envoyer */}
   485|      <AnimatePresence>
   486|        {reviewNeeded && !showVoice && (
   487|          <motion.div
   488|            key="review-banner"
   489|            initial={{ opacity: 0, y: -8 }}
   490|            animate={{ opacity: 1, y: 0 }}
   491|            exit={{ opacity: 0, y: -8 }}
   492|            className="relative rounded-[var(--radius)] border-2 border-purple-500 bg-gradient-to-r from-purple-600/15 via-purple-500/10 to-fuchsia-500/15 p-4 shadow-[0_0_24px_-8px_rgba(168,85,247,0.6)]"
   493|          >
   494|            <div className="flex items-start gap-3">
   495|              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-purple-500 text-white text-lg">
   496|                ⚠️
   497|              </div>
   498|              <div className="flex-1 min-w-0">
   499|                <p className="font-display text-base font-bold text-purple-200">
   500|                  Relisez avant d&apos;envoyer
   501|                </p>
   502|                <p className="mt-0.5 text-sm text-purple-100/90 leading-relaxed">
   503|                  Surtout les <strong className="text-white">mots techniques</strong> (références, ampérages, marques) — l&apos;IA peut s&apos;être trompée.
   504|                </p>
   505|              </div>
   506|              <button
   507|                onClick={() => setReviewNeeded(false)}
   508|                className="text-purple-200/70 hover:text-white text-xl leading-none px-2"
   509|                aria-label="Fermer l'avertissement"
   510|              >
   511|                ×
   512|              </button>
   513|            </div>
   514|          </motion.div>
   515|        )}
   516|      </AnimatePresence>
   517|
   518|      {/* Stepper (always visible, even with voice — pour permettre saisie complémentaire) */}
   519|      {!showVoice && (
   520|        <div className="glass rounded-[var(--radius)] border border-border p-2">
   521|          <ol className="grid grid-cols-4">
   522|            {["Client", "Chantier", "Articles", "Validation"].map((label, i) => (
   523|              <li key={label}>
   524|                <button
   525|                  onClick={() => canNext(i - 1) && setStep(i as 0 | 1 | 2 | 3)}
   526|                  className={`flex flex-col items-center gap-1 px-2 py-2 w-full rounded-md ${
   527|                    step === i ? "bg-electric/10 text-electric" : "text-muted hover:text-foreground"
   528|                  }`}
   529|                >
   530|                  <span className="text-[10px] uppercase tracking-[0.16em]">Étape {i + 1}</span>
   531|                  <span className="text-sm font-medium">{label}</span>
   532|                </button>
   533|              </li>
   534|            ))}
   535|          </ol>
   536|        </div>
   537|      )}
   538|
   539|      {/* NOUVEAU PANNEAU DE REVUE — éditable, validation explicite par bouton */}
   540|      <AnimatePresence>
   541|        {reviewData && (
   542|          <motion.div
   543|            key="review-panel"
   544|            initial={{ opacity: 0, y: -6 }}
   545|            animate={{ opacity: 1, y: 0 }}
   546|            exit={{ opacity: 0, y: -6 }}
   547|            className="overflow-hidden"
   548|          >
   549|            <ExtractionReviewPanel
   550|              initial={reviewData}
   551|              rawTranscript={reviewRawText ?? undefined}
   552|              onApply={applyReviewedExtraction}
   553|              onRetry={() => { setReviewData(null); setReviewRawText(null); setShowVoice(true) }}
   554|              onCancel={() => { setReviewData(null); setReviewRawText(null) }}
   555|            />
   556|          </motion.div>
   557|        )}
   558|      </AnimatePresence>
   559|
   560|      {/* Step content */}
   561|      {step === 0 && (
   562|        <Card>
   563|          <div className="flex items-center justify-between gap-4 mb-4">
   564|            <CardTitle>1. Pour quel client ?</CardTitle>
   565|            <Button variant="ghost" size="sm" onClick={() => setClientSelectorOpen((v) => !v)}>
   566|              <User className="h-4 w-4" /> {clientSelectorOpen ? "Saisir manuellement" : "Choisir un client existant"}
   567|            </Button>
   568|          </div>
   569|          {clientSelectorOpen ? (
   570|            <div className="grid sm:grid-cols-2 gap-2">
   571|              {knownClients.length === 0 ? (
   572|                <p className="text-sm text-muted">Pas encore de client. Saisissez-le ci-dessous.</p>
   573|              ) : knownClients.map((c) => (
   574|                <button
   575|                  key={c.id}
   576|                  onClick={() => pickClient(c)}
   577|                  className="text-left rounded-md border border-border bg-surface-2 px-3 py-2.5 hover:border-border-strong hover:bg-surface-3 transition-colors"
   578|                >
   579|                  <div className="text-sm font-medium">
   580|                    {c.raison_sociale || [c.prenom, c.nom].filter(Boolean).join(" ")}
   581|                  </div>
   582|                  <div className="text-xs text-muted">{c.email ?? "—"}</div>
   583|                </button>
   584|              ))}
   585|            </div>
   586|          ) : (
   587|            <ClientForm
   588|              client={client}
   589|              setClient={setClient}
   590|              voiceRing={voiceRing}
   591|              releaseFromVoice={releaseFromVoice}
   592|            />
   593|          )}
   594|        </Card>
   595|      )}
   596|
   597|      {step === 1 && (
   598|        <Card>
   599|          <CardTitle>2. Le chantier</CardTitle>
   600|          <div className="mt-4 grid gap-4">
   601|            <div>
   602|              <Label htmlFor="objet">Objet du devis</Label>
   603|              <div className={cn("mt-2 rounded-[var(--radius)]", voiceRing("objet"))}>
   604|                <Input id="objet" value={objet} onChange={(e) => { releaseFromVoice("objet"); setObjet(e.target.value) }} placeholder="Rénovation électrique appartement" />
   605|              </div>
   606|            </div>
   607|            <div>
   608|              <Label htmlFor="chantier"><MapPin className="inline h-3 w-3 mr-1" /> Adresse du chantier</Label>
   609|              <div className={cn("mt-2 rounded-[var(--radius)]", voiceRing("chantier"))}>
   610|                <Input id="chantier" value={chantier} onChange={(e) => { releaseFromVoice("chantier"); setChantier(e.target.value) }} placeholder="12 rue de la Gare, 29200 Brest" />
   611|              </div>
   612|            </div>
   613|            <div>
   614|              <Label htmlFor="notes-client">Notes au client (visible sur le devis)</Label>
   615|              <div className={cn("rounded-[var(--radius)]", voiceRing("notes-client"))}>
   616|                <SmartTextarea id="notes-client" value={notesClient} onChange={(v) => { releaseFromVoice("notes-client"); setNotesClient(v) }} placeholder="Délai d'intervention 2 semaines, déchets emportés…" />
   617|              </div>
   618|              <p className="mt-1 text-xs text-muted-2">
   619|                <Sparkles className="inline h-3 w-3 text-electric" /> Cliquez sur l&apos;étincelle pour corriger l&apos;orthographe automatiquement.
   620|              </p>
   621|            </div>
   622|          </div>
   623|        </Card>
   624|      )}
   625|
   626|      {step === 2 && (
   627|        <>
   628|          <Card>
   629|            <div className="flex items-center justify-between mb-3">
   630|              <CardTitle>3. Articles & matériel</CardTitle>
   631|              <div className="flex gap-2">
   632|                <Button variant="ghost" size="sm" onClick={() => setShowVoice(true)}>
   633|                  <Mic className="h-4 w-4 text-electric" /> Dicter
   634|                </Button>
   635|                <Button variant="secondary" size="sm" onClick={addLine}>
   636|                  <Plus className="h-4 w-4" /> Ligne
   637|                </Button>
   638|              </div>
   639|            </div>
   640|
   641|            <div className="overflow-x-auto">
   642|              <table className="w-full text-sm">
   643|                <thead className="text-xs uppercase tracking-wider text-muted">
   644|                  <tr className="border-b border-border">
   645|                    <th className="text-left py-2 pr-2">Description</th>
   646|                    <th className="text-right py-2 px-2 w-20">Qté</th>
   647|                    <th className="text-left py-2 px-2 w-20">Unité</th>
   648|                    <th className="text-right py-2 px-2 w-32">PU HT</th>
   649|                    <th className="text-right py-2 px-2 w-32">Total HT</th>
   650|                    <th className="w-8"></th>
   651|                  </tr>
   652|                </thead>
   653|                <tbody>
   654|                  {items.length === 0 && (
   655|                    <tr><td colSpan={6} className="py-6 text-center text-muted">Aucune ligne. Dictez ou cliquez sur &ldquo;Ligne&rdquo;.</td></tr>
   656|                  )}
   657|                  {items.map((it, i) => {
   658|                    const total = (Number(it.quantite) || 0) * (Number(it.prix_unitaire_ht) || 0)
   659|                    return (
   660|                      <tr key={i} className="border-b border-border/60">
   661|                        <td className="py-2 pr-2">
   662|                          <Input
   663|                            value={it.description}
   664|                            onChange={(e) => updateLine(i, { description: e.target.value, article_id: null })}
   665|                            placeholder="ex: Prise 16A étanche IP44"
   666|                            list={`articles-suggest-${i}`}
   667|                          />
   668|                          <datalist id={`articles-suggest-${i}`}>
   669|                            {knownArticles.slice(0, 40).map((a) => (
   670|                              <option key={a.id} value={a.nom} data-id={a.id} label={`${formatEUR(a.prix_unitaire_ht ?? 0)}`} />
   671|                            ))}
   672|                          </datalist>
   673|                          {it.article_id && (
   674|                            <Badge tone="electric" className="mt-1">mémoire</Badge>
   675|                          )}
   676|                          {/* Quick picker */}
   677|                          {!it.article_id && it.description.length >= 2 && (
   678|                            <ArticlePicker
   679|                              query={it.description}
   680|                              all={knownArticles}
   681|                              onPick={(a) => selectArticle(i, a)}
   682|                            />
   683|                          )}
   684|                        </td>
   685|                        <td className="py-2 px-2">
   686|                          <Input type="number" step="0.01" min="0" value={it.quantite} className="text-right" onChange={(e) => updateLine(i, { quantite: Number(e.target.value) })} />
   687|                        </td>
   688|                        <td className="py-2 px-2">
   689|                          <Input value={it.unite} onChange={(e) => updateLine(i, { unite: e.target.value })} placeholder="u" />
   690|                        </td>
   691|                        <td className="py-2 px-2">
   692|                          <Input type="number" step="0.01" min="0" value={it.prix_unitaire_ht} className="text-right" onChange={(e) => updateLine(i, { prix_unitaire_ht: Number(e.target.value) })} />
   693|                        </td>
   694|                        <td className="py-2 px-2 text-right font-mono">{formatEUR(total)}</td>
   695|                        <td className="py-2">
   696|                          <button onClick={() => removeLine(i)} aria-label="Supprimer" className="grid h-8 w-8 place-items-center rounded text-muted hover:text-danger">
   697|                            <Trash2 className="h-4 w-4" />
   698|                          </button>
   699|                        </td>
   700|                      </tr>
   701|                    )
   702|                  })}
   703|                </tbody>
   704|              </table>
   705|            </div>
   706|          </Card>
   707|
   708|          <Card>
   709|            <CardTitle>Main-d&apos;œuvre & TVA</CardTitle>
   710|            <div className="mt-4 grid sm:grid-cols-3 gap-4">
   711|              <div>
   712|                <Label htmlFor="taux">Taux horaire (€/h)</Label>
   713|                <Input id="taux" type="number" step="0.01" min="0" className="mt-2" value={tauxHoraire} onChange={(e) => setTauxHoraire(Number(e.target.value))} />
   714|              </div>
   715|              <div>
   716|                <Label htmlFor="heures"><Clock className="inline h-3 w-3 mr-1" /> Heures de pose</Label>
   717|                <div className={cn("mt-2 rounded-[var(--radius)]", voiceRing("heures"))}>
   718|                  <Input id="heures" type="number" step="0.5" min="0" value={heuresMO} onChange={(e) => { releaseFromVoice("heures"); setHeuresMO(Number(e.target.value)) }} />
   719|                </div>
   720|              </div>
   721|              <div>
   722|                <Label htmlFor="tva">TVA (%)</Label>
   723|                <Input id="tva" type="number" step="0.5" min="0" max="30" className="mt-2" value={tvaTaux} onChange={(e) => setTvaTaux(Number(e.target.value))} />
   724|              </div>
   725|            </div>
   726|            {heuresMO > 0 && (
   727|              <p className="mt-3 text-xs text-muted">
   728|                Main-d&apos;œuvre = {heuresMO}h × {formatEUR(tauxHoraire)} = <span className="text-foreground font-medium">{formatEUR(totalMO)}</span>
   729|              </p>
   730|            )}
   731|          </Card>
   732|        </>
   733|      )}
   734|
   735|      {step === 3 && (
   736|        <Card>
   737|          <CardTitle>Récapitulatif</CardTitle>
   738|          <dl className="mt-6 space-y-2 text-sm">
   739|            <Row label="Client">{[client.raison_sociale, client.nom, client.prenom].filter(Boolean).join(" · ") || "—"}</Row>
   740|            <Row label="Chantier">{chantier || "—"}</Row>
   741|            <Row label="Objet">{objet || "—"}</Row>
   742|            <Row label="Articles">{items.length} ligne(s)</Row>
   743|            <Row label="Main-d'œuvre">{heuresMO}h × {formatEUR(tauxHoraire)}</Row>
   744|            <Row label="Total HT articles">{formatEUR(totalArticles)}</Row>
   745|            <Row label="Total HT main-d'œuvre">{formatEUR(totalMO)}</Row>
   746|            <div className="my-4 border-t border-border" />
   747|            <Row label="Total HT" bold>{formatEUR(totalHT)}</Row>
   748|            <Row label={`TVA (${tvaTaux}%)`}>{formatEUR(tvaMontant)}</Row>
   749|            <Row label="Total TTC" bold accent>{formatEUR(totalTTC)}</Row>
   750|          </dl>
   751|          <p className="mt-6 text-xs text-muted-2">
   752|            Lors de l&apos;envoi, le client reçoit un email avec le PDF du devis et un lien pour signer en ligne.
   753|          </p>
   754|        </Card>
   755|      )}
   756|
   757|      {/* Footer actions sticky : indicateur auto-save + navigation + Tout effacer (1 seul bouton) */}
   758|      <div className="sticky bottom-4 z-30">
   759|        <div className="glass border border-border rounded-[var(--radius-lg)] p-3 flex items-center justify-between gap-3 flex-wrap">
   760|          <div className="flex items-center gap-3 min-w-0">
   761|            <div className="text-sm">
   762|              <span className="text-muted">Total TTC :</span>{" "}
   763|              <span className="font-display text-lg font-semibold">{formatEUR(totalTTC)}</span>
   764|            </div>
   765|            {!initialPayload && (
   766|              <span className="inline-flex items-center gap-1.5 text-[11px] text-muted-2 whitespace-nowrap">
   767|                <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
   768|                {lastSavedAt ? `Brouillon sauvegardé ${formatSavedAgo(lastSavedAt)}` : "Sauvegarde auto activée"}
   769|              </span>
   770|            )}
   771|          </div>
   772|          <div className="flex items-center gap-2 flex-wrap">
   773|            {step > 0 && (
   774|              <Button variant="ghost" onClick={() => setStep((s) => (s - 1) as 0 | 1 | 2 | 3)}>
   775|                <ChevronLeft className="h-4 w-4" /> Précédent
   776|              </Button>
   777|            )}
   778|            {step < 3 ? (
   779|              <Button onClick={() => canNext(step) && setStep((s) => (s + 1) as 0 | 1 | 2 | 3)} disabled={!canNext(step)}>
   780|                Suivant <ChevronRight className="h-4 w-4" />
   781|              </Button>
   782|            ) : (
   783|              <>
   784|                <Button variant="secondary" loading={pending} onClick={() => submit("draft")}>
   785|                  <Save className="h-4 w-4" /> Brouillon
   786|                </Button>
   787|                <Button loading={pending} onClick={() => submit("send")}>
   788|                  <Send className="h-4 w-4" /> Envoyer au client
   789|                </Button>
   790|              </>
   791|            )}
   792|            {/* UN SEUL bouton danger pour effacer tout — pas de friction multi-boutons */}
   793|            <button
   794|              type="button"
   795|              onClick={resetAll}
   796|              title="Tout effacer et recommencer"
   797|              aria-label="Tout effacer et recommencer"
   798|              className="grid h-9 w-9 place-items-center rounded-md border border-border text-muted hover:border-danger hover:text-danger hover:bg-danger/5 transition-colors"
   799|            >
   800|              <RotateCcw className="h-4 w-4" />
   801|            </button>
   802|          </div>
   803|        </div>
   804|      </div>
   805|
   806|      {/* helpers */}
   807|      {!canNext(step) && step === 0 && (
   808|        <p className="text-xs text-warning inline-flex items-center gap-2">
   809|          <AlertCircle className="h-3.5 w-3.5" /> Le nom du client est requis pour continuer.
   810|        </p>
   811|      )}
   812|      {step === 3 && totalTTC > 0 && (
   813|        <p className="text-xs text-success inline-flex items-center gap-2">
   814|          <CheckCircle2 className="h-3.5 w-3.5" /> Prêt à envoyer.
   815|        </p>
   816|      )}
   817|    </div>
   818|  )
   819|}
   820|
   821|/**
   822| * ClientForm : version simplifiée senior-friendly.
   823| * - Champs essentiels visibles d'office : Nom, Téléphone, Adresse, Ville
   824| * - "Détails supplémentaires" repliés par défaut : Prénom, Société, Email, CP
   825| *   (mais déployés automatiquement si remplis par le vocal)
   826| * - Plus gros padding, labels explicites, anneau electric sur les champs remplis vocalement
   827| */
   828|function ClientForm({
   829|  client,
   830|  setClient,
   831|  voiceRing,
   832|  releaseFromVoice,
   833|}: {
   834|  client: DevisPayload["client"]
   835|  setClient: React.Dispatch<React.SetStateAction<DevisPayload["client"]>>
   836|  voiceRing: (key: string) => string
   837|  releaseFromVoice: (key: string) => void
   838|}) {
   839|  const hasOptional =
   840|    Boolean(client.prenom) ||
   841|    Boolean(client.raison_sociale) ||
   842|    Boolean(client.email) ||
   843|    Boolean(client.cp)
   844|  const [openDetails, setOpenDetails] = useState(hasOptional)
   845|
   846|  useEffect(() => {
   847|    if (hasOptional) setOpenDetails(true)
   848|  }, [hasOptional])
   849|
   850|  return (
   851|    <div className="grid gap-4">
   852|      {/* Essentiels : 4 champs gros, 1 par ligne sur mobile */}
   853|      <div className="grid sm:grid-cols-2 gap-4">
   854|        <div>
   855|          <Label htmlFor="client-nom">Nom du client *</Label>
   856|          <div className={cn("mt-2 rounded-[var(--radius)]", voiceRing("client-nom"))}>
   857|            <Input
   858|              id="client-nom"
   859|              value={client.nom}
   860|              onChange={(e) => { releaseFromVoice("client-nom"); setClient((c) => ({ ...c, nom: e.target.value })) }}
   861|              placeholder="Dupont"
   862|              autoComplete="family-name"
   863|            />
   864|          </div>
   865|        </div>
   866|        <div>
   867|          <Label htmlFor="client-tel">Téléphone</Label>
   868|          <div className={cn("mt-2 rounded-[var(--radius)]", voiceRing("client-tel"))}>
   869|            <Input
   870|              id="client-tel"
   871|              type="tel"
   872|              value={client.telephone ?? ""}
   873|              onChange={(e) => { releaseFromVoice("client-tel"); setClient((c) => ({ ...c, telephone: e.target.value })) }}
   874|              placeholder="06 12 34 56 78"
   875|              autoComplete="tel"
   876|            />
   877|          </div>
   878|        </div>
   879|        <div className="sm:col-span-2">
   880|          <Label htmlFor="client-adresse">Adresse</Label>
   881|          <div className={cn("mt-2 rounded-[var(--radius)]", voiceRing("client-adresse"))}>
   882|            <Input
   883|              id="client-adresse"
   884|              value={client.adresse ?? ""}
   885|              onChange={(e) => { releaseFromVoice("client-adresse"); setClient((c) => ({ ...c, adresse: e.target.value })) }}
   886|              placeholder="12 rue de la Gare"
   887|              autoComplete="street-address"
   888|            />
   889|          </div>
   890|        </div>
   891|        <div className="sm:col-span-2">
   892|          <Label htmlFor="client-ville">Ville</Label>
   893|          <div className={cn("mt-2 rounded-[var(--radius)]", voiceRing("client-ville"))}>
   894|            <Input
   895|              id="client-ville"
   896|              value={client.ville ?? ""}
   897|              onChange={(e) => { releaseFromVoice("client-ville"); setClient((c) => ({ ...c, ville: e.target.value })) }}
   898|              placeholder="Brest"
   899|              autoComplete="address-level2"
   900|            />
   901|          </div>
   902|        </div>
   903|      </div>
   904|
   905|      {/* Bloc détails : caché par défaut, déployé si rempli ou cliqué */}
   906|      <button
   907|        type="button"
   908|        onClick={() => setOpenDetails((v) => !v)}
   909|        className="flex items-center gap-2 text-sm text-muted hover:text-foreground self-start"
   910|      >
   911|        {openDetails ? <ChevronLeft className="h-4 w-4 rotate-90" /> : <ChevronRight className="h-4 w-4 rotate-90" />}
   912|        {openDetails ? "Cacher les détails" : "Ajouter prénom · société · email · CP"}
   913|      </button>
   914|
   915|      {openDetails && (
   916|        <div className="grid sm:grid-cols-2 gap-4 pl-2 border-l-2 border-border">
   917|          <div>
   918|            <Label htmlFor="client-prenom">Prénom</Label>
   919|            <div className={cn("mt-2 rounded-[var(--radius)]", voiceRing("client-prenom"))}>
   920|              <Input
   921|                id="client-prenom"
   922|                value={client.prenom ?? ""}
   923|                onChange={(e) => { releaseFromVoice("client-prenom"); setClient((c) => ({ ...c, prenom: e.target.value })) }}
   924|                placeholder="Jean"
   925|                autoComplete="given-name"
   926|              />
   927|            </div>
   928|          </div>
   929|          <div>
   930|            <Label htmlFor="client-cp">Code postal</Label>
   931|            <div className={cn("mt-2 rounded-[var(--radius)]", voiceRing("client-cp"))}>
   932|              <Input
   933|                id="client-cp"
   934|                value={client.cp ?? ""}
   935|                onChange={(e) => { releaseFromVoice("client-cp"); setClient((c) => ({ ...c, cp: e.target.value })) }}
   936|                placeholder="29200"
   937|                autoComplete="postal-code"
   938|                inputMode="numeric"
   939|              />
   940|            </div>
   941|          </div>
   942|          <div className="sm:col-span-2">
   943|            <Label htmlFor="client-raison">Société (si pro)</Label>
   944|            <div className={cn("mt-2 rounded-[var(--radius)]", voiceRing("client-raison"))}>
   945|              <Input
   946|                id="client-raison"
   947|                value={client.raison_sociale ?? ""}
   948|                onChange={(e) => { releaseFromVoice("client-raison"); setClient((c) => ({ ...c, raison_sociale: e.target.value })) }}
   949|                placeholder="Boulangerie Dupont SARL"
   950|                autoComplete="organization"
   951|              />
   952|            </div>
   953|          </div>
   954|          <div className="sm:col-span-2">
   955|            <Label htmlFor="client-email">Email</Label>
   956|            <div className={cn("mt-2 rounded-[var(--radius)]", voiceRing("client-email"))}>
   957|              <Input
   958|                id="client-email"
   959|                type="email"
   960|                value={client.email ?? ""}
   961|                onChange={(e) => { releaseFromVoice("client-email"); setClient((c) => ({ ...c, email: e.target.value })) }}
   962|                placeholder="contact@…"
   963|                autoComplete="email"
   964|              />
   965|            </div>
   966|          </div>
   967|        </div>
   968|      )}
   969|    </div>
   970|  )
   971|}
   972|
   973|function Row({ label, children, bold, accent }: { label: string; children: React.ReactNode; bold?: boolean; accent?: boolean }) {
   974|  return (
   975|    <div className="flex items-baseline justify-between gap-3">
   976|      <dt className={accent ? "text-electric uppercase tracking-wider text-xs font-semibold" : "text-muted text-xs uppercase tracking-wider"}>{label}</dt>
   977|      <dd className={accent ? "font-display text-xl font-bold text-electric" : bold ? "font-display font-semibold" : ""}>{children}</dd>
   978|    </div>
   979|  )
   980|}
   981|
   982|function ArticlePicker({
   983|  query,
   984|  all,
   985|  onPick,
   986|}: {
   987|  query: string
   988|  all: ArticleLite[]
   989|  onPick: (a: ArticleLite) => void
   990|}) {
   991|  const q = query.toLowerCase()
   992|  const matches = all
   993|    .filter((a) => a.nom.toLowerCase().includes(q) && a.nom.toLowerCase() !== q)
   994|    .slice(0, 4)
   995|  if (matches.length === 0) return null
   996|  return (
   997|    <div className="mt-1 flex flex-wrap gap-1">
   998|      {matches.map((a) => (
   999|        <button
  1000|          key={a.id}
  1001|          type="button"
  1002|          onClick={() => onPick(a)}
  1003|          className="text-[11px] rounded-full border border-border bg-surface-2 px-2 py-0.5 text-muted hover:text-electric hover:border-electric/60"
  1004|        >
  1005|          {a.nom} · {formatEUR(a.prix_unitaire_ht ?? 0)}
  1006|        </button>
  1007|      ))}
  1008|    </div>
  1009|  )
  1010|}
  1011|