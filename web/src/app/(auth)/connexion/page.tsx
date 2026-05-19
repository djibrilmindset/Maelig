"use client"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Suspense, useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import { ArrowRight, KeyRound, Mail } from "lucide-react"
import { createSupabaseBrowserClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input, Label, FieldError } from "@/components/ui/input"
import { OAuthButtons } from "@/components/auth/oauth-buttons"

const schema = z.object({
  email: z.string().email("Email invalide"),
  password: z.string().min(6, "6 caractères minimum"),
})

type FormValues = z.infer<typeof schema>

export default function ConnexionPage() {
  return (
    <div>
      <h1 className="font-display text-3xl font-bold tracking-tight">Bon retour.</h1>
      <p className="mt-2 text-sm text-muted">
        Pas encore de compte ?{" "}
        <Link href="/inscription" className="text-electric hover:underline">
          Démarrez vos 14 jours gratuits
        </Link>
      </p>

      <div className="mt-8">
        <OAuthButtons mode="login" />
        <div className="relative my-6 text-center text-xs text-muted">
          <span className="bg-background px-3 relative z-10">ou avec votre email</span>
          <div className="absolute inset-x-0 top-1/2 h-px bg-border -z-0" />
        </div>
      </div>

      <Suspense fallback={<div className="text-sm text-muted">Chargement du formulaire…</div>}>
        <ConnexionInner />
      </Suspense>
    </div>
  )
}

function ConnexionInner() {
  const router = useRouter()
  const params = useSearchParams()
  const [magicSent, setMagicSent] = useState(false)

  // Auto-déclenche l'OAuth si /connexion?force_oauth=google|apple
  // (utilisé par /verifier-email pour "Continuer avec ... à la place")
  useEffect(() => {
    const force = params.get("force_oauth")
    if (force !== "google" && force !== "apple") return
    const supabase = createSupabaseBrowserClient()
    supabase.auth.signInWithOAuth({
      provider: force,
      options: {
        redirectTo: `${window.location.origin}/app`,
        queryParams: force === "google" ? { access_type: "offline", prompt: "consent" } : undefined,
      },
    }).then(({ error }) => {
      if (error) toast.error(`Connexion ${force} impossible`, { description: error.message })
    })
  }, [params])

  const { register, handleSubmit, formState: { errors, isSubmitting }, getValues } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "" },
  })

  const onSubmit = async (data: FormValues) => {
    const supabase = createSupabaseBrowserClient()
    const { error } = await supabase.auth.signInWithPassword(data)
    if (error) {
      toast.error("Connexion impossible", { description: error.message })
      return
    }
    toast.success("Bienvenue 👋")
    router.replace(params.get("redirect_to") ?? "/app")
  }

  const sendMagicLink = async () => {
    const email = getValues("email")
    if (!email || !z.string().email().safeParse(email).success) {
      toast.error("Entrez d'abord votre email")
      return
    }
    const supabase = createSupabaseBrowserClient()
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/app` },
    })
    if (error) {
      toast.error("Envoi impossible", { description: error.message })
      return
    }
    setMagicSent(true)
    toast.success("Lien magique envoyé", { description: "Regardez vos mails." })
  }

  return (
    <div>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div>
          <Label htmlFor="email">Email</Label>
          <div className="relative mt-2">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="vous@entreprise.fr"
              className="pl-9"
              invalid={!!errors.email}
              {...register("email")}
            />
          </div>
          <FieldError>{errors.email?.message}</FieldError>
        </div>

        <div>
          <Label htmlFor="password">Mot de passe</Label>
          <div className="relative mt-2">
            <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              className="pl-9"
              invalid={!!errors.password}
              {...register("password")}
            />
          </div>
          <FieldError>{errors.password?.message}</FieldError>
          <Link href="/oubli" className="mt-2 inline-block text-xs text-muted hover:text-electric">
            Mot de passe oublié ?
          </Link>
        </div>

        <Button type="submit" loading={isSubmitting} className="w-full" iconRight={<ArrowRight className="h-4 w-4" />}>
          Se connecter
        </Button>

        <div className="relative my-6 text-center text-xs text-muted">
          <span className="bg-background px-3 relative z-10">ou</span>
          <div className="absolute inset-x-0 top-1/2 h-px bg-border -z-0" />
        </div>

        <Button
          type="button"
          variant="secondary"
          onClick={sendMagicLink}
          className="w-full"
          disabled={magicSent}
        >
          {magicSent ? "Lien envoyé · regardez vos mails" : "Recevoir un lien magique par email"}
        </Button>
      </form>
    </div>
  )
}
