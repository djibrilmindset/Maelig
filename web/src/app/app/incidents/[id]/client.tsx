"use client"
import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Send, Check, AlertTriangle } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Textarea, Label } from "@/components/ui/input"

export function IncidentReply({ incidentId, isOwner, currentStatut }: { incidentId: string; isOwner: boolean; currentStatut: string }) {
  const router = useRouter()
  const [text, setText] = useState("")
  const [pending, startTransition] = useTransition()
  const [statut, setStatut] = useState<string>(currentStatut)

  function send(newStatut?: string) {
    if (!text.trim() && !newStatut) return
    startTransition(async () => {
      try {
        const res = await fetch(`/api/incidents/${incidentId}/respond`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: text || "(changement de statut)", statut: newStatut ?? statut }),
        })
        const data = await res.json()
        if (!res.ok) {
          toast.error("Envoi échoué", { description: data.detail ?? data.error })
          return
        }
        toast.success("Envoyé")
        setText("")
        router.refresh()
      } catch (e) {
        toast.error("Erreur", { description: e instanceof Error ? e.message : String(e) })
      }
    })
  }

  return (
    <div className="mt-6 border-t border-border pt-5 space-y-3">
      <Label htmlFor="reply">Votre réponse {isOwner ? "(sera traduite dans la langue de l'employé)" : "(visible par le patron)"}</Label>
      <Textarea
        id="reply"
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={3}
        placeholder={isOwner ? "Ce que vous voulez dire à votre employé. DEP traduit." : "Précision ou réponse au patron."}
      />

      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={() => send()} loading={pending} disabled={!text.trim()}>
          <Send className="h-4 w-4" /> Envoyer
        </Button>
        {isOwner && currentStatut !== "resolu" && (
          <Button variant="secondary" onClick={() => { setStatut("resolu"); send("resolu") }} loading={pending}>
            <Check className="h-4 w-4" /> Marquer résolu
          </Button>
        )}
        {isOwner && currentStatut !== "escalade" && (
          <Button variant="ghost" onClick={() => { setStatut("escalade"); send("escalade") }} loading={pending}>
            <AlertTriangle className="h-4 w-4" /> Escalader
          </Button>
        )}
      </div>
    </div>
  )
}
