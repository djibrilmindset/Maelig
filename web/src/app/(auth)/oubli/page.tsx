"use client"
import Link from "next/link"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import { ArrowLeft, Mail } from "lucide-react"
import { createSupabaseBrowserClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input, Label, FieldError } from "@/components/ui/input"

const schema = z.object({ email: z.string().email("Email invalide").max(255) })
type FormValues = z.infer<typeof schema>

export default function OubliPage() {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async ({ email }: FormValues) => {
    const pre = await fetch("/api/auth/preflight", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "password_reset", email }),
    })
    if (pre.status === 429 || pre.status === 423) {
      toast.error("Trop de demandes", { description: "Attendez 1h ou contactez support." })
      return
    }
    const supabase = createSupabaseBrowserClient()
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      // Fix 2026-05-22 : passe par /auth/callback (PKCE exchange server-side)
      // sinon la page /reinitialisation n'a pas de session pour updateUser.
      redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent("/reinitialisation")}`,
    })
    // P1 audit — Tracé même si error pour détecter enumeration attacks
    void fetch("/api/auth/event", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ event: "reset_request", email, metadata: { error: error?.message ?? null } }),
    }).catch(() => {})
    if (error) {
      // P1 — Réponse identique success/error pour empêcher email enumeration
      toast.success("Email envoyé", { description: "Si ce compte existe, vous recevrez un lien." })
      return
    }
    toast.success("Email envoyé", { description: "Si ce compte existe, vous recevrez un lien." })
  }

  return (
    <div>
      <Link href="/connexion" className="inline-flex items-center gap-2 text-xs text-muted hover:text-electric">
        <ArrowLeft className="h-3 w-3" /> retour
      </Link>
      <h1 className="mt-4 font-display text-3xl font-bold tracking-tight">Réinitialiser le mot de passe</h1>
      <p className="mt-2 text-sm text-muted">
        Indiquez votre email, nous vous envoyons un lien pour en choisir un nouveau.
      </p>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-5">
        <div>
          <Label htmlFor="email">Email</Label>
          <div className="relative mt-2">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
            <Input id="email" type="email" placeholder="vous@entreprise.fr" className="pl-9" invalid={!!errors.email} {...register("email")} />
          </div>
          <FieldError>{errors.email?.message}</FieldError>
        </div>

        <Button type="submit" loading={isSubmitting} className="w-full">
          M&apos;envoyer le lien
        </Button>
      </form>
    </div>
  )
}
