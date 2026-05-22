"use client"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import { ArrowRight, Building2, KeyRound, Mail, User } from "lucide-react"
import { createSupabaseBrowserClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input, Label, FieldError } from "@/components/ui/input"

// P1-2 audit 2026-05-20 — Politique mot de passe stricte (compliance B2B).
//   - 12 chars minimum
//   - 3 catégories sur 4 (min/maj/chiffre/spécial)
//   - non commun (dictionnaire ~5k)
//   - ne contient pas l'email ni le nom
//   - pas de séquences (1234, qwerty) ni répétitions (aaaa)
// La validation détaillée se fait via @/lib/security/password côté serveur ET front.
import { checkPasswordStrength } from "@/lib/security/password"

const schema = z.object({
  fullName: z.string().min(2, "Indiquez votre nom").max(120),
  company: z.string().min(2, "Nom de l'entreprise").max(120),
  email: z.string().email("Email invalide").max(255),
  password: z.string()
    .min(12, "12 caractères minimum (sécurité données client)")
    .max(72, "72 caractères maximum"),
})
type FormValues = z.infer<typeof schema>

export default function InscriptionPage() {
  const router = useRouter()
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { fullName: "", company: "", email: "", password: "" },
  })

  const onSubmit = async (values: FormValues) => {
    // P1-2 — Validation password stricte (côté front, doublée côté back par Supabase)
    const pw = checkPasswordStrength(values.password, { email: values.email, name: values.fullName })
    if (!pw.ok) {
      toast.error("Mot de passe trop faible", { description: pw.hint ?? "Renforcez votre mot de passe." })
      return
    }
    // P1-1 : pré-flight rate limit (IP + email) anti credential stuffing
    const pre = await fetch("/api/auth/preflight", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "signup", email: values.email }),
    })
    if (pre.status === 429 || pre.status === 423) {
      toast.error("Accès bloqué", { description: "Trop de tentatives. Attendez 15 minutes." })
      return
    }
    const supabase = createSupabaseBrowserClient()
    const { data: signUp, error } = await supabase.auth.signUp({
      email: values.email,
      password: values.password,
      options: {
        // Fix 2026-05-22 : confirmation email passe par /auth/callback pour
        // exchangeCodeForSession server-side, sinon ?code Supabase est perdu.
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent("/app")}`,
        data: {
          full_name: values.fullName,
          company: values.company,
        },
      },
    })
    void fetch("/api/auth/event", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({
        event: error ? "signup_fail" : "signup",
        email: values.email,
        user_id: signUp?.user?.id,
        metadata: error ? { reason: error.message?.slice(0, 120) } : undefined,
      }),
    }).catch(() => {})
    if (error) {
      toast.error("Inscription impossible", { description: error.message })
      return
    }
    toast.success("Compte créé 🎉", { description: "Vérifiez vos mails pour activer votre compte." })
    router.replace("/connexion?after_signup=1")
  }

  return (
    <div>
      <span className="inline-flex items-center gap-2 rounded-full border border-electric/30 bg-electric/10 px-3 py-1 text-xs font-medium text-electric">
        14 jours gratuits · sans carte bancaire
      </span>
      <h1 className="mt-4 font-display text-3xl font-bold tracking-tight">Créez votre compte DEP</h1>
      <p className="mt-2 text-sm text-muted">
        Déjà inscrit ?{" "}
        <Link href="/connexion" className="text-electric hover:underline">
          Connectez-vous
        </Link>
      </p>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-5">
        <div>
          <Label htmlFor="fullName">Votre nom complet</Label>
          <div className="relative mt-2">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
            <Input id="fullName" placeholder="Maelig Dupont" className="pl-9" invalid={!!errors.fullName} {...register("fullName")} />
          </div>
          <FieldError>{errors.fullName?.message}</FieldError>
        </div>

        <div>
          <Label htmlFor="company">Nom de l&apos;entreprise</Label>
          <div className="relative mt-2">
            <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
            <Input id="company" placeholder="Électricité Dupont" className="pl-9" invalid={!!errors.company} {...register("company")} />
          </div>
          <FieldError>{errors.company?.message}</FieldError>
        </div>

        <div>
          <Label htmlFor="email">Email professionnel</Label>
          <div className="relative mt-2">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
            <Input id="email" type="email" autoComplete="email" placeholder="vous@entreprise.fr" className="pl-9" invalid={!!errors.email} {...register("email")} />
          </div>
          <FieldError>{errors.email?.message}</FieldError>
        </div>

        <div>
          <Label htmlFor="password">Mot de passe</Label>
          <div className="relative mt-2">
            <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
            <Input id="password" type="password" autoComplete="new-password" placeholder="8 caractères minimum" className="pl-9" invalid={!!errors.password} {...register("password")} />
          </div>
          <FieldError>{errors.password?.message}</FieldError>
        </div>

        <Button type="submit" loading={isSubmitting} className="w-full" iconRight={<ArrowRight className="h-4 w-4" />}>
          Démarrer mes 14 jours
        </Button>
        <p className="text-center text-xs text-muted-2">
          En continuant, vous acceptez nos{" "}
          <Link href="/cgv" className="underline">CGV</Link> et{" "}
          <Link href="/confidentialite" className="underline">Politique de confidentialité</Link>.
        </p>
      </form>
    </div>
  )
}
