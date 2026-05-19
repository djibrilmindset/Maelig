"use client"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import { createSupabaseBrowserClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input, Label, FieldError } from "@/components/ui/input"

const schema = z.object({ password: z.string().min(8, "8 caractères minimum") })
type FormValues = z.infer<typeof schema>

export default function ReinitPage() {
  const router = useRouter()
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async ({ password }: FormValues) => {
    const supabase = createSupabaseBrowserClient()
    const { error } = await supabase.auth.updateUser({ password })
    if (error) {
      toast.error("Échec", { description: error.message })
      return
    }
    toast.success("Mot de passe mis à jour")
    router.replace("/app")
  }

  return (
    <div>
      <h1 className="font-display text-3xl font-bold tracking-tight">Nouveau mot de passe</h1>
      <p className="mt-2 text-sm text-muted">Choisissez un mot de passe solide (≥ 8 caractères).</p>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-5">
        <div>
          <Label htmlFor="password">Mot de passe</Label>
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            className="mt-2"
            invalid={!!errors.password}
            {...register("password")}
          />
          <FieldError>{errors.password?.message}</FieldError>
        </div>
        <Button type="submit" loading={isSubmitting} className="w-full">Valider</Button>
      </form>
    </div>
  )
}
