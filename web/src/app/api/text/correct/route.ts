import { NextResponse } from "next/server"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { correctFR } from "@/lib/llm/dashscope"

export const runtime = "nodejs"
export const maxDuration = 20

export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  const { data: profile } = await supabase
    .from("profiles")
    .select("org_id")
    .eq("id", user.id)
    .maybeSingle()
  if (!profile?.org_id) return NextResponse.json({ error: "no_org" }, { status: 403 })

  const body = await req.json().catch(() => null) as { text?: string } | null
  const text = (body?.text ?? "").trim()
  if (!text) return NextResponse.json({ error: "text_required" }, { status: 400 })
  if (text.length > 5000) return NextResponse.json({ error: "text_too_long" }, { status: 413 })

  try {
    const corrected = await correctFR(text)
    await supabaseAdmin().from("text_corrections").insert({
      org_id: profile.org_id,
      user_id: user.id,
      raw: text,
      corrected,
      llm_used: "qwen-turbo",
    })
    return NextResponse.json({ ok: true, corrected, changed: corrected !== text })
  } catch (e) {
    return NextResponse.json({ error: "correction_failed", detail: String(e) }, { status: 502 })
  }
}
