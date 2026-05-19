import { redirect } from "next/navigation"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { Sidebar } from "@/components/app/sidebar"
import { MobileTopbar } from "@/components/app/topbar"

export const dynamic = "force-dynamic"

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/connexion")

  // OAuth (Google/Apple) → email déjà vérifié par le provider.
  // Email/password → bloquer tant que email_confirmed_at est null.
  const provider = (user.app_metadata?.provider as string) ?? "email"
  if (provider === "email" && !user.email_confirmed_at) {
    redirect("/verifier-email")
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, email, role, org_id")
    .eq("id", user.id)
    .maybeSingle()

  const { data: org } = profile?.org_id
    ? await supabase.from("orgs").select("nom, subscription_status, trial_ends_at, logo_url").eq("id", profile.org_id).maybeSingle()
    : { data: null }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar profile={profile} org={org} />
      <div className="flex-1 min-w-0 flex flex-col">
        <MobileTopbar />
        <main className="flex-1 overflow-x-hidden">{children}</main>
      </div>
    </div>
  )
}
