"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Send, Mail, Key, UserPlus, RotateCcw, FlaskConical } from "lucide-react"
import { Card, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input, Label } from "@/components/ui/input"

type Template = "test_transactional" | "magic_link" | "reset_password" | "invite"

const TEMPLATES: Array<{ id: Template; label: string; sub: string; Icon: typeof Send }> = [
  { id: "test_transactional", label: "Email test", sub: "vérifie SMTP + reputation domaine", Icon: FlaskConical },
  { id: "magic_link", label: "Lien magique", sub: "même flow qu'à la connexion", Icon: Mail },
  { id: "reset_password", label: "Reset password", sub: "flow oubli mot de passe", Icon: RotateCcw },
  { id: "invite", label: "Invitation employé", sub: "même email que /équipe", Icon: UserPlus },
]

export function TestEmailPanel({ defaultRecipient }: { defaultRecipient: string }) {
  const router = useRouter()
  const [recipient, setRecipient] = useState(defaultRecipient)
  const [template, setTemplate] = useState<Template>("test_transactional")
  const [sending, setSending] = useState(false)

  async function handleSend() {
    if (!recipient.includes("@")) {
      toast.error("Email invalide")
      return
    }
    setSending(true)
    try {
      const res = await fetch("/api/admin/test-email", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ recipient, template }),
      })
      const json = await res.json()
      if (!res.ok) {
        toast.error("Envoi échoué", { description: json.error ?? "Erreur inconnue" })
      } else {
        toast.success("Email envoyé", { description: `Template ${template} → ${recipient}` })
        router.refresh()
      }
    } catch (e) {
      toast.error("Erreur réseau", { description: e instanceof Error ? e.message : "" })
    } finally {
      setSending(false)
    }
  }

  return (
    <Card className="!p-6">
      <CardTitle className="flex items-center gap-2">
        <FlaskConical className="h-5 w-5 text-electric" />
        Tester un envoi
      </CardTitle>
      <CardDescription className="mt-1">
        Choisis le template, l&apos;adresse de réception, puis envoie. Le log apparaît en dessous.
      </CardDescription>

      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
        {TEMPLATES.map((t) => {
          const is = template === t.id
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTemplate(t.id)}
              className={`text-left rounded-[var(--radius)] border p-4 transition-all ${
                is
                  ? "border-electric bg-electric/5 ring-2 ring-electric/30"
                  : "border-border bg-surface-2/30 hover:bg-surface-2/60"
              }`}
            >
              <div className="flex items-center gap-2">
                <t.Icon className={`h-4 w-4 ${is ? "text-electric" : "text-muted"}`} />
                <span className="text-sm font-semibold">{t.label}</span>
              </div>
              <p className="mt-1 text-xs text-muted">{t.sub}</p>
            </button>
          )
        })}
      </div>

      <div className="mt-6">
        <Label htmlFor="recipient">Adresse de réception</Label>
        <div className="relative mt-2">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
          <Input
            id="recipient"
            type="email"
            placeholder="moi@entreprise.fr"
            className="pl-9"
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
          />
        </div>
        <p className="mt-1 text-xs text-muted">
          Astuce : utiliser un Gmail / Outlook / Yahoo perso pour vérifier que ça n&apos;atterrit pas en spam.
        </p>
      </div>

      <div className="mt-5 flex flex-col sm:flex-row gap-2">
        <Button onClick={handleSend} loading={sending} iconLeft={<Send className="h-4 w-4" />} className="flex-1">
          Envoyer le test
        </Button>
        <Button
          variant="ghost"
          iconLeft={<Key className="h-4 w-4" />}
          onClick={() => window.open("https://supabase.com/dashboard/project/_/auth/templates", "_blank")}
        >
          Templates Supabase
        </Button>
      </div>
    </Card>
  )
}
