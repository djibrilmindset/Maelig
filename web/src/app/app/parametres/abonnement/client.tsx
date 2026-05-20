"use client"
import { useState, useTransition } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input, Label } from "@/components/ui/input"

export function Subscribe() {
  const [pending, startTransition] = useTransition()
  function go() {
    startTransition(async () => {
      const res = await fetch("/api/stripe/checkout", { method: "POST", body: JSON.stringify({}) })
      const data = await res.json()
      if (data.url) window.location.href = data.url
      else toast.error("Stripe", { description: data.error ?? "Configuration manquante" })
    })
  }
  return (
    <Button onClick={go} loading={pending}>Démarrer mon abonnement</Button>
  )
}

export function SyncSeats({ current, disabled }: { current: number; disabled?: boolean }) {
  const [seats, setSeats] = useState(current)
  const [pending, startTransition] = useTransition()
  function go() {
    startTransition(async () => {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        body: JSON.stringify({ slave_seats: seats }),
      })
      const data = await res.json()
      if (data.url) window.location.href = data.url
      else toast.error("Stripe", { description: data.error ?? "Configuration manquante" })
    })
  }
  return (
    <div className="mt-4 flex items-end gap-3">
      <div>
        <Label>Nombre d&apos;esclaves</Label>
        <Input
          type="number"
          min="0"
          max="50"
          value={seats}
          disabled={disabled}
          onChange={(e) => setSeats(Math.max(0, Number(e.target.value)))}
          className="mt-2 w-28"
        />
      </div>
      <Button onClick={go} loading={pending} disabled={disabled}>Mettre à jour</Button>
    </div>
  )
}
