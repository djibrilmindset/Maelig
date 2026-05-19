import { NextResponse } from "next/server"
import { z } from "zod"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { supabaseAdmin } from "@/lib/supabase/admin"

const ADMIN_EMAILS = ["ayouneslead@gmail.com", "djibrilmindset@gmail.com"]

const Body = z.object({
  recipient: z.string().email(),
  template: z.enum(["test_transactional", "magic_link", "reset_password", "invite"]),
})

export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle()
  const isAdmin = profile?.role === "admin_dep" || ADMIN_EMAILS.includes((user.email || "").toLowerCase())
  if (!isAdmin) return NextResponse.json({ error: "forbidden" }, { status: 403 })

  const parsed = Body.safeParse(await req.json().catch(() => ({})))
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const { recipient, template } = parsed.data
  const admin = supabaseAdmin()
  const baseUrl = req.headers.get("origin") ?? process.env.NEXT_PUBLIC_SITE_URL ?? "https://dep-electrique.vercel.app"

  let status: "sent" | "failed" = "sent"
  let errorMessage: string | null = null
  let responsePayload: Record<string, unknown> = {}

  try {
    if (template === "magic_link") {
      const { data, error } = await admin.auth.admin.generateLink({
        type: "magiclink",
        email: recipient,
        options: { redirectTo: `${baseUrl}/app` },
      })
      if (error) throw error
      responsePayload = { link: data.properties?.action_link ?? null }
    } else if (template === "reset_password") {
      const { error } = await admin.auth.resetPasswordForEmail(recipient, {
        redirectTo: `${baseUrl}/reinitialisation`,
      })
      if (error) throw error
    } else if (template === "invite") {
      const { error } = await admin.auth.admin.inviteUserByEmail(recipient, {
        redirectTo: `${baseUrl}/app`,
      })
      if (error) throw error
    } else {
      // test_transactional : on simule un signup OTP qui déclenche le SMTP
      const { error } = await admin.auth.admin.generateLink({
        type: "signup",
        email: recipient,
        password: crypto.randomUUID(),
        options: { redirectTo: `${baseUrl}/app` },
      })
      // Tolère "user already registered" : on tombe sur reset à la place
      if (error && /already (registered|exists)/i.test(error.message)) {
        const { error: e2 } = await admin.auth.resetPasswordForEmail(recipient, {
          redirectTo: `${baseUrl}/reinitialisation`,
        })
        if (e2) throw e2
        responsePayload = { note: "user existait déjà → reset envoyé à la place" }
      } else if (error) {
        throw error
      }
    }
  } catch (e) {
    status = "failed"
    errorMessage = e instanceof Error ? e.message : String(e)
  }

  await admin.from("email_test_log").insert({
    sender_user_id: user.id,
    recipient_email: recipient,
    template,
    provider: "supabase_smtp",
    status,
    error_message: errorMessage,
    request_payload: { template, recipient },
    response_payload: responsePayload,
  })

  if (status === "failed") {
    return NextResponse.json({ ok: false, error: errorMessage }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
