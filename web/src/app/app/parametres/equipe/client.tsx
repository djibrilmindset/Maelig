"use client"
import { useState, useTransition } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input, Label } from "@/components/ui/input"
import { inviteSlave } from "@/lib/actions/team"
import { getLanguageOptions } from "@/lib/langues"

export function InviteForm() {
  const [pending, startTransition] = useTransition()
  const [form, setForm] = useState({
    email: "",
    full_name: "",
    telephone: "",
    langue_maternelle: "fr",
    titre_poste: "",
  })

  function submit() {
    if (!form.email || !form.full_name) {
      toast.error("Email et nom requis")
      return
    }
    startTransition(async () => {
      try {
        await inviteSlave(form)
        toast.success("Invitation envoyée 📨", { description: form.email })
        setForm({ email: "", full_name: "", telephone: "", langue_maternelle: "fr", titre_poste: "" })
      } catch (e) {
        toast.error("Erreur", { description: e instanceof Error ? e.message : String(e) })
      }
    })
  }

  return (
    <div className="mt-4 grid sm:grid-cols-2 gap-3">
      <div>
        <Label>Nom complet</Label>
        <Input className="mt-2" value={form.full_name} onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))} placeholder="Moussa Diallo" />
      </div>
      <div>
        <Label>Email pro</Label>
        <Input type="email" className="mt-2" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} placeholder="moussa@…" />
      </div>
      <div>
        <Label>Téléphone direct</Label>
        <Input type="tel" className="mt-2" value={form.telephone} onChange={(e) => setForm((f) => ({ ...f, telephone: e.target.value }))} placeholder="06 12 34 56 78" />
      </div>
      <div>
        <Label>Titre poste</Label>
        <Input className="mt-2" value={form.titre_poste} onChange={(e) => setForm((f) => ({ ...f, titre_poste: e.target.value }))} placeholder="Électricien · Apprenti…" />
      </div>
      <div className="sm:col-span-2">
        <Label>Langue maternelle (pour traduction auto)</Label>
        <select
          className="mt-2 flex h-11 w-full rounded-[var(--radius)] border border-border bg-surface px-4 py-2 text-sm"
          value={form.langue_maternelle}
          onChange={(e) => setForm((f) => ({ ...f, langue_maternelle: e.target.value }))}
        >
          {getLanguageOptions().map(({ group, items }) => (
            <optgroup key={group} label={group}>
              {items.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.flag} {l.name_fr} · {l.native}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
        <p className="mt-2 text-xs text-muted">
          Chaque message qu&apos;il envoie sera traduit en français pour vous. Vos messages, traduits dans sa langue pour lui.
        </p>
      </div>
      <div className="sm:col-span-2">
        <Button loading={pending} onClick={submit}>Envoyer l&apos;invitation</Button>
      </div>
    </div>
  )
}
