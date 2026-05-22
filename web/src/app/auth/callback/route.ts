/**
 * /auth/callback — Supabase Auth PKCE callback + invite/recovery token_hash handler.
 *
 * Flux concernés :
 *  - Invite collaborateur (admin.auth.admin.inviteUserByEmail) → ?code=...
 *    → exchange code → redirect /reinitialisation (init password)
 *  - Reset password (resetPasswordForEmail)                   → ?code=...
 *    → exchange code → redirect /reinitialisation
 *  - Email confirm signup                                     → ?token_hash=...&type=signup
 *    → verifyOtp → redirect /app
 *
 * Sans ce handler, le ?code Supabase est perdu par le middleware → l'employé
 * invité atterrit sur /connexion sans pouvoir définir son mot de passe.
 */
import { type EmailOtpType } from "@supabase/supabase-js"
import { type NextRequest, NextResponse } from "next/server"
import { createSupabaseServerClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")
  const token_hash = searchParams.get("token_hash")
  const type = searchParams.get("type") as EmailOtpType | null
  const next = searchParams.get("next") ?? "/app"

  // Validation next pour éviter open redirect : path interne uniquement.
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/app"

  const supabase = await createSupabaseServerClient()

  // PKCE flow (invite, password reset, OAuth)
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(new URL(safeNext, origin))
    }
    return NextResponse.redirect(new URL(`/connexion?error=${encodeURIComponent(error.message)}`, origin))
  }

  // OTP / email confirm flow
  if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash })
    if (!error) {
      return NextResponse.redirect(new URL(safeNext, origin))
    }
    return NextResponse.redirect(new URL(`/connexion?error=${encodeURIComponent(error.message)}`, origin))
  }

  return NextResponse.redirect(new URL("/connexion?error=invalid_link", origin))
}
