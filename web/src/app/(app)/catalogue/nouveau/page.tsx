"use client"
import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { toast } from "sonner"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { Card, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input, Label, Textarea } from "@/components/ui/input"
import { saveArticle } from "@/lib/actions/articles"

export default function NouveauArticlePage() {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [form, setForm] = useState({
    nom: "", description: "", ref: "", unite: "u", prix_unitaire_ht: 0, categorie: "",
  })

  function submit() {
    startTransition(async () => {
      try {
        await saveArticle(form)
        toast.success("Article ajouté")
        router.push("/app/catalogue")
      } catch (e) {
        toast.error("Erreur", { description: e instanceof Error ? e.message : String(e) })
      }
    })
  }

  return (
    <div className="max-w-2xl mx-auto p-6 sm:p-10 space-y-6">
      <Link href="/app/catalogue" className="inline-flex items-center gap-1 text-xs text-muted hover:text-electric">
        <ArrowLeft className="h-3 w-3" /> Catalogue
      </Link>
      <CardTitle>Nouvel article</CardTitle>
      <Card>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <Label>Nom *</Label>
            <Input className="mt-2" value={form.nom} onChange={(e) => setForm((f) => ({ ...f, nom: e.target.value }))} placeholder="Prise 16A étanche IP44" />
          </div>
          <div>
            <Label>Catégorie</Label>
            <Input className="mt-2" value={form.categorie} onChange={(e) => setForm((f) => ({ ...f, categorie: e.target.value }))} placeholder="Prise / Tableau / Câblage…" />
          </div>
          <div>
            <Label>Référence interne</Label>
            <Input className="mt-2" value={form.ref} onChange={(e) => setForm((f) => ({ ...f, ref: e.target.value }))} placeholder="PRIS-16A-IP44" />
          </div>
          <div>
            <Label>Unité</Label>
            <Input className="mt-2" value={form.unite} onChange={(e) => setForm((f) => ({ ...f, unite: e.target.value }))} />
          </div>
          <div>
            <Label>Prix unitaire HT (€)</Label>
            <Input className="mt-2" type="number" step="0.01" min="0" value={form.prix_unitaire_ht} onChange={(e) => setForm((f) => ({ ...f, prix_unitaire_ht: Number(e.target.value) }))} />
          </div>
          <div className="sm:col-span-2">
            <Label>Description</Label>
            <Textarea className="mt-2" rows={3} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
          </div>
        </div>
        <div className="mt-6 flex gap-2">
          <Button loading={pending} onClick={submit}>Enregistrer</Button>
          <Button variant="ghost" onClick={() => router.back()}>Annuler</Button>
        </div>
      </Card>
    </div>
  )
}
