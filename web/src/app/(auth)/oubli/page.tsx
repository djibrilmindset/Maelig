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

const schema = z.object({ email: z.string().email("Email invalide") })
type FormValues = z.infer<typeof schema>

export default function OubliPage() {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async ({ email }: FormValues) => {
    const supabase = createSupabaseBrowserClient()
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reinitialisation`,
    })
    if (error) {
      toast.error("Envoi impossible", { description: error.message })
      return
    }
    toast.success("Email envoyé", { description: "Cliquez sur le lien dans votre boîte mail." })
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
