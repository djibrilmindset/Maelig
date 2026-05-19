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

      <p className="mt-6 text-center text-xs text-muted-2">
        Mauvaise adresse ?{" "}
        <Link href="/connexion" className="text-electric hover:underline">
          Revenir à la connexion
        </Link>
      </p>
    </div>
  )
}
