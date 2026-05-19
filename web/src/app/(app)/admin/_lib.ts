import { redirect } from "next/navigation"
import { createSupabaseServerClient } from "@/lib/supabase/server"

export const ADMIN_EMAILS = [
  "ayouneslead@gmail.com",
  "djibrilmindset@gmail.com",
  "djibrilsylearn@gmail.com",
]

export async function requireAdmin() {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/connexion?redirect_to=/app/admin")

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, email, full_name")
    .eq("id", user.id)
    .maybeSingle()

  const isAdmin = profile?.role === "admin_dep" || ADMIN_EMAILS.includes((user.email || "").toLowerCase())
  if (!isAdmin) redirect("/app")

  return { supabase, user, profile }
}

export function formatRelative(iso: string | null | undefined): string {
  if (!iso) return "—"
  const d = new Date(iso)
  const diff = Date.now() - d.getTime()
  const min = Math.floor(diff / 60_000)
  if (min < 1) return "à l'instant"
  if (min < 60) return `il y a ${min} min`
  const h = Math.floor(min / 60)
  if (h < 24) return `il y a ${h}h`
  const day = Math.floor(h / 24)
  if (day < 30) return `il y a ${day}j`
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })
}

export function formatEUR(n: number | string | null | undefined): string {
  if (n === null || n === undefined) return "—"
  const v = typeof n === "string" ? Number(n) : n
  if (Number.isNaN(v)) return "—"
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(v)
}
