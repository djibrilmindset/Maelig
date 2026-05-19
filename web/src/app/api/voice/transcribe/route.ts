import { NextResponse } from "next/server"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { transcribeAudioFromUrl } from "@/lib/llm/asr"
import { correctFR, extractDevisFromTranscript } from "@/lib/llm/dashscope"
import { clarifyTranscript } from "@/lib/llm/clarify"
import { limitVoice, limitVoiceDaily, checkLimits, tooManyRequests } from "@/lib/ratelimit"

export const runtime = "nodejs"
export const maxDuration = 60

export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

  const { data: profile } = await supabase
    .from("profiles")
    .select("org_id, role")
    .eq("id", user.id)
    .maybeSingle()
  if (!profile?.org_id) return NextResponse.json({ error: "no_org" }, { status: 403 })

  // Rate limit : 10/min/user + 100/jour/org (protection LLM cost)
  const rl = await checkLimits(
    { ratelimit: limitVoice, key: user.id },
    { ratelimit: limitVoiceDaily, key: profile.org_id },
  )
  if (!rl.success) return tooManyRequests(rl)

  const form = await req.formData().catch(() => null)
  if (!form) return NextResponse.json({ error: "form_required" }, { status: 400 })

  const file = form.get("audio") as File | null
  const language = (form.get("language") as string | null) || undefined
  if (!file || file.size === 0) return NextResponse.json({ error: "audio_missing" }, { status: 400 })
  if (file.size > 25 * 1024 * 1024)
    return NextResponse.json({ error: "audio_too_large", limit_mb: 25 }, { status: 413 })

  const admin = supabaseAdmin()
  const filename = `${profile.org_id}/${Date.now()}-${crypto.randomUUID()}.${guessExt(file.type)}`
  const buf = Buffer.from(await file.arrayBuffer())

  const { error: upErr } = await admin.storage.from("audio").upload(filename, buf, {
    contentType: file.type || "audio/webm",
    upsert: false,
  })
  if (upErr) return NextResponse.json({ error: "upload_failed", detail: upErr.message }, { status: 500 })

  const { data: signed } = await admin.storage.from("audio").createSignedUrl(filename, 60 * 30)
  const audioUrl = signed?.signedUrl
  if (!audioUrl) return NextResponse.json({ error: "signing_failed" }, { status: 500 })

  // Known article names from this org for better extraction
  const { data: articles } = await supabase
    .from("articles")
    .select("nom, prix_unitaire_ht")
    .eq("org_id", profile.org_id)
    .eq("archived", false)
    .order("usage_count", { ascending: false })
    .limit(120)

  let rawText = ""
  let langDetected: string | undefined
  try {
    const tr = await transcribeAudioFromUrl(audioUrl, language)
    rawText = tr.text
    langDetected = tr.language
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: "asr_failed", detail: msg }, { status: 502 })
  }

  // Parallel: correct + extract + clarify
  const articleNames = (articles ?? []).map((a) => a.nom)
  const [corrected, extracted, clarification] = await Promise.all([
    correctFR(rawText).catch(() => rawText),
    extractDevisFromTranscript(rawText, articleNames).catch(() => ({ items: [] as const })),
    clarifyTranscript(rawText, { knownArticles: articleNames }).catch(() => null),
  ])

  // Store transcription record
  await admin.from("audio_transcriptions").insert({
    org_id: profile.org_id,
    user_id: user.id,
    audio_url: filename,
    audio_size_bytes: buf.byteLength,
    lang_detected: langDetected ?? null,
    text_brut: rawText,
    text_corrige: corrected,
    text_traduit: corrected,
    articles_extracts: extracted as object,
    llm_used: "qwen-plus+qwen-turbo+paraformer-v2",
  })

  return NextResponse.json({
    ok: true,
    raw: rawText,
    corrected,
    language: langDetected,
    extracted,
    clarification,
  })
}

function guessExt(mime: string): string {
  if (mime.includes("webm")) return "webm"
  if (mime.includes("mp4") || mime.includes("m4a")) return "m4a"
  if (mime.includes("mpeg") || mime.includes("mp3")) return "mp3"
  if (mime.includes("wav")) return "wav"
  if (mime.includes("ogg")) return "ogg"
  return "webm"
}
