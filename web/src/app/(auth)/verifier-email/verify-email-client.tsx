"use client"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Mail, RefreshCw, LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import { createSupabaseBrowserClient } from "@/lib/supabase/client"

const COOLDOWN_SECONDS = 60

export function VerifyEmailClient({ email }: { email: string }) {
  const router = useRouter()
  const [resending, setResending] = useState(false)
  const [cooldown, setCooldown] = useState(0)
  const [checking, setChecking] = useState(false)

  useEffect(() => {
    if (cooldown <= 0) return
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000)
    return () => clearTimeout(t)
  }, [cooldown])

  // Polling silencieux toutes les 6s : si l'user clique le lien dans un autre onglet,
  // on détecte la confirmation et on bascule sur /app sans qu'il revienne ici.
  useEffect(() => {
    const interval = setInterval(async () => {
      const supabase = createSupabaseBrowserClient()
      const { data } = await supabase.auth.getUser()
      if (data.user?.email_confirmed_at) {
        router.replace("/app")
      }
    }, 6000)
    return () => clearInterval(interval)
  }, [router])

  async function handleResend() {
    setResending(true)
    const supabase = createSupabaseBrowserClient()
    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/app`,
      },
    })
    setResending(false)
    if (error) {
      toast.error("Renvoi impossible", { description: error.message })
      return
    }
    toast.success("Email renvoyé", { description: "Vérifiez votre boîte mail" })
    setCooldown(COOLDOWN_SECONDS)
  }

  async function handleCheckNow() {
    setChecking(true)
    const supabase = createSupabaseBrowserClient()
    const { data, error } = await supabase.auth.getUser()
    setChecking(false)
    if (error || !data.user) {
      toast.error("Session expirée", { description: "Reconnectez-vous" })
      router.replace("/connexion")
      return
    }
    if (data.user.email_confirmed_at) {
      toast.success("Email confirmé 🎉")
      router.replace("/app")
    } else {
      toast.info("Pas encore confirmé", {
        description: "Cliquez sur le lien dans votre email puis réessayez",
      })
    }
  }

  async function handleSignOut() {
    const supabase = createSupabaseBrowserClient()
    await supabase.auth.signOut()
    router.replace("/connexion")
  }

  return (
    <div className="mt-6 flex flex-col gap-3">
      <Button
        onClick={handleResend}
        disabled={resending || cooldown > 0}
        loading={resending}
        iconLeft={<Mail className="h-4 w-4" />}
        className="w-full"
      >
        {cooldown > 0 ? `Renvoyer dans ${cooldown}s` : "Renvoyer l'email"}
      </Button>
      <Button
        onClick={handleCheckNow}
        loading={checking}
        variant="ghost"
        iconLeft={<RefreshCw className="h-4 w-4" />}
        className="w-full"
      >
        J&apos;ai cliqué, vérifier maintenant
      </Button>
      <button
        onClick={handleSignOut}
        className="mt-2 inline-flex items-center justify-center gap-2 text-xs text-muted hover:text-foreground transition-colors"
      >
        <LogOut className="h-3 w-3" />
        Se déconnecter
      </button>
    </div>
  )
}
