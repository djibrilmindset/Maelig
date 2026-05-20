"use client"
import Link from "next/link"
import { useState, useTransition } from "react"
import { Download, Mail, Pencil, Send, Trash2, Receipt, Check, X, ShieldCheck } from "lucide-react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/input"
import { approveSlaveDevis, rejectSlaveDevis, changeDevisStatut, deleteDevis, convertDevisToFacture } from "@/lib/actions/devis"

export function DevisActions({ devisId, statut }: { devisId: string; statut: string }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [rejectMode, setRejectMode] = useState(false)
  const [rejectReason, setRejectReason] = useState("")

  function call(fn: () => Promise<unknown>, msg: string) {
    startTransition(async () => {
      try {
        await fn()
        toast.success(msg)
        router.refresh()
      } catch (e) {
        toast.error("Erreur", { description: e instanceof Error ? e.message : String(e) })
      }
    })
  }

  return (
    <div className="space-y-3">
      {/* Validation patron (esclave a créé) */}
      {statut === "en_attente_validation_patron" && (
        <div className="rounded-xl border border-warning/30 bg-warning/5 p-4">
          <div className="flex items-center gap-2 text-warning text-sm font-semibold uppercase tracking-[0.16em]">
            <ShieldCheck className="h-4 w-4" /> Validation requise
          </div>
          <p className="mt-1 text-sm text-muted">
            Un collaborateur a préparé ce devis. Vérifiez puis validez : il partira au client dans la foulée.
          </p>
          {!rejectMode ? (
            <div className="mt-3 flex flex-wrap gap-2">
              <Button onClick={() => call(() => approveSlaveDevis(devisId), "Validé et envoyé au client 🚀")} loading={pending}>
                <Check className="h-4 w-4" /> Valider et envoyer
              </Button>
              <Button variant="ghost" onClick={() => setRejectMode(true)} disabled={pending}>
                <X className="h-4 w-4" /> Rejeter
              </Button>
              <Button variant="secondary" asChild>
                <Link href={`/app/devis/nouveau?id=${devisId}`}><Pencil className="h-4 w-4" /> Modifier d&apos;abord</Link>
              </Button>
            </div>
          ) : (
            <div className="mt-3 space-y-2">
              <Textarea
                placeholder="Pourquoi ce devis n'est-il pas bon ? (le collaborateur verra votre message)"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={2}
              />
              <div className="flex gap-2">
                <Button
                  variant="danger"
                  onClick={() => rejectReason.trim() && call(() => rejectSlaveDevis(devisId, rejectReason), "Rejet envoyé au collaborateur")}
                  loading={pending}
                  disabled={!rejectReason.trim()}
                >
                  Confirmer le rejet
                </Button>
                <Button variant="ghost" onClick={() => { setRejectMode(false); setRejectReason("") }}>Annuler</Button>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <Button asChild variant="secondary"><Link href={`/app/devis/nouveau?id=${devisId}`}><Pencil className="h-4 w-4" /> Modifier</Link></Button>
        <Button asChild variant="secondary"><Link href={`/api/devis/${devisId}/pdf`} target="_blank"><Download className="h-4 w-4" /> Télécharger PDF</Link></Button>
        <Button variant="secondary" onClick={() => call(() => changeDevisStatut(devisId, "en_attente_validation"), "Renvoyé au client")} loading={pending}>
          <Mail className="h-4 w-4" /> Renvoyer au client
        </Button>
        {statut === "signe_non_paye" && (
          <Button onClick={() => call(() => convertDevisToFacture(devisId), "Facture créée")} loading={pending}>
            <Receipt className="h-4 w-4" /> Convertir en facture
          </Button>
        )}
        {statut === "brouillon" && (
          <Button onClick={() => call(() => changeDevisStatut(devisId, "en_attente_validation"), "Envoyé au client 🚀")} loading={pending}>
            <Send className="h-4 w-4" /> Envoyer au client
          </Button>
        )}
        <Button
          variant="danger"
          onClick={() => {
            if (confirm("Supprimer ce devis définitivement ?")) {
              call(async () => { await deleteDevis(devisId); router.push("/app") }, "Supprimé")
            }
          }}
          loading={pending}
        >
          <Trash2 className="h-4 w-4" /> Supprimer
        </Button>
      </div>
    </div>
  )
}
