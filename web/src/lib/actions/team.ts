"use server"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { supabaseAdmin } from "@/lib/supabase/admin"

const InviteSchema = z.object({
  email: z.string().email(),
  full_name: z.string().min(2),
  telephone: z.string().optional(),
  langue_maternelle: z.string().min(2).max(12).default("fr"),
  titre_poste: z.string().optional(),
})

export async function inviteSlave(input: unknown) {
  const data = InviteSchema.parse(input)
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("not_authenticated")
  const { data: profile } = await supabase.from("profiles").select("org_id, role").eq("id", user.id).maybeSingle()
  if (!profile?.org_id) throw new Error("no_org")
  if (profile.role !== "owner" && profile.role !== "admin_dep") throw new Error("forbidden_only_owner")

  const admin = supabaseAdmin()

  // 1) Generate an invite link (Supabase Auth admin)
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  // Fix 2026-05-22 : invité atterrit sur /auth/callback (échange code PKCE)
  // puis /reinitialisation pour définir son mot de passe initial. Sans ça,
  // le middleware /app redirige vers /connexion en perdant le ?code Supabase
  // → l'employé ne peut jamais se connecter.
  const { data: invite, error: inviteErr } = await (admin.auth as any).admin.inviteUserByEmail(
    data.email,
    {
      redirectTo: `${baseUrl}/auth/callback?next=${encodeURIComponent("/reinitialisation")}`,
      data: {
        full_name: data.full_name,
        invited_org_id: profile.org_id,
        telephone: data.telephone ?? null,
        langue_maternelle: data.langue_maternelle,
        titre_poste: data.titre_poste ?? null,
      },
    },
  )
  if (inviteErr) throw new Error(inviteErr.message)

  // 2) If user already exists, update their profile to slave
  const userId = invite?.user?.id
  if (userId) {
    await admin.from("profiles").upsert({
      id: userId,
      org_id: profile.org_id,
      role: "slave",
      full_name: data.full_name,
      email: data.email,
      telephone: data.telephone ?? null,
      langue_maternelle: data.langue_maternelle,
      titre_poste: data.titre_poste ?? null,
      invited_by: user.id,
    } as never)
  }

  revalidatePath("/app/parametres/equipe")
  return { ok: true }
}

export async function removeSlave(slaveId: string) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("not_authenticated")
  const { data: profile } = await supabase.from("profiles").select("org_id, role").eq("id", user.id).maybeSingle()
  if (profile?.role !== "owner" && profile?.role !== "admin_dep") throw new Error("forbidden")

  // Soft remove : detach org_id (Supabase auth user keeps but org link gone)
  const { error } = await supabaseAdmin()
    .from("profiles")
    .update({ org_id: null })
    .eq("id", slaveId)
    .eq("org_id", profile.org_id!)
  if (error) throw new Error(error.message)

  revalidatePath("/app/parametres/equipe")
  return { ok: true }
}

export async function updateMyProfile(input: { full_name?: string; telephone?: string; langue_maternelle?: string; langue_affichage?: string; titre_poste?: string }) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("not_authenticated")
  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: input.full_name ?? undefined,
      telephone: input.telephone ?? undefined,
      langue_maternelle: input.langue_maternelle ?? undefined,
      langue_affichage: input.langue_affichage ?? undefined,
      titre_poste: input.titre_poste ?? undefined,
    } as never)
    .eq("id", user.id)
  if (error) throw new Error(error.message)
  revalidatePath("/app/parametres")
  return { ok: true }
}
