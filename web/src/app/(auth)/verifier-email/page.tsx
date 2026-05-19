import { redirect } from "next/navigation"
import Link from "next/link"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { VerifyEmailClient } from "./verify-email-client"

export const dynamic = "force-dynamic"

export default async function VerifierEmailPage() {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect("/connexion")

  const provider = (user.app_metadata?.provider as string) ?? "email"

  // Déjà confirmé OU OAuth → on file directement dans l'app
  if (user.email_confirmed_at || provider !== "email") {
    redirect("/app")
  }

  return (
    <div>
      <span className="inline-flex items-center gap-2 rounded-full border border-wire-blue/30 bg-wire-blue/10 px-3 py-1 text-xs font-medium text-wire-blue">
        Étape finale · 1 clic dans votre boîte mail
      </span>
      <h1 className="mt-4 font-display text-3xl font-bold tracking-tight">
        Vérifiez votre email
      </h1>
      <p className="mt-3 text-sm text-muted leading-relaxed">
        On vient d&apos;envoyer un lien de confirmation à{" "}
        <strong className="text-foreground">{user.email}</strong>.
        Cliquez dessus et vous serez connecté automatiquement.
      </p>

      <div className="mt-8 rounded-[var(--radius)] border border-border bg-surface/40 p-5">
        <h3 className="font-display text-sm font-semibold text-foreground">
          Rien reçu après 2 minutes ?
        </h3>
        <ul className="mt-2 space-y-1 text-xs text-muted">
          <li>· Vérifiez vos spams ou onglet « Promotions »</li>
          <li>· Vérifiez que vous avez tapé la bonne adresse</li>
          <li>· Demandez un nouveau lien ci-dessous</li>
        </ul>
      </div>

      <VerifyEmailClient email={user.email!} />

      <div className="relative my-6 text-center text-xs text-muted">
        <span className="bg-background px-3 relative z-10">ou plus rapide</span>
        <div className="absolute inset-x-0 top-1/2 h-px bg-border -z-0" />
      </div>

      <div className="rounded-[var(--radius)] border border-electric/20 bg-electric/5 p-4">
        <p className="text-sm font-medium text-foreground">
          Connectez-vous directement avec votre compte
        </p>
        <p className="mt-1 text-xs text-muted">
          Plus besoin de mot de passe ni de vérification email
        </p>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <Link
            href="/connexion?force_oauth=google"
            className="inline-flex items-center justify-center gap-2 rounded-[10px] border border-border bg-white text-[#1f1f1f] h-10 px-4 text-sm font-medium hover:bg-[#f8f9fa] transition-colors"
          >
            Continuer avec Google
          </Link>
          <Link
            href="/connexion?force_oauth=apple"
            className="inline-flex items-center justify-center gap-2 rounded-[10px] border border-white/10 bg-black text-white h-10 px-4 text-sm font-medium hover:bg-[#1a1a1a] transition-colors"
          >
            Continuer avec Apple
          </Link>
        </div>
      </div>

      <p className="mt-6 text-center text-xs text-muted-2">
        Mauvaise adresse ?{" "}
        <Link href="/connexion" className="text-electric hover:underline">
          Revenir à la connexion
        </Link>
      </p>
    </div>
  )
}
