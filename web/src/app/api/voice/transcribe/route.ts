import { NextResponse } from "next/server"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { transcribeAudioFromUrl } from "@/lib/llm/asr"
import { correctFR, extractDevisFromTranscript } from "@/lib/llm/dashscope"
import { clarifyTranscript } from "@/lib/llm/clarify"
import { limitVoice, limitVoiceDaily, checkLimits, tooManyRequests } from "@/lib/ratelimit"
import { checkMagic, safeExtFromMime } from "@/lib/security/file-magic"

const MAX_AUDIO_BYTES = 25 * 1024 * 1024

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
  if (file.size > MAX_AUDIO_BYTES)
    return NextResponse.json({ error: "audio_too_large", limit_mb: MAX_AUDIO_BYTES / 1024 / 1024 }, { status: 413 })

  // P1-8 audit 2026-05-20 — Magic byte verification (anti spoofed MIME)
  const magic = await checkMagic(file, "audio", file.type)
  if (!magic.ok) {
    return NextResponse.json({ error: "audio_invalid", reason: magic.reason }, { status: 415 })
  }
  // Validation langue (anti injection dans le call ASR provider)
  // Pattern borné max 6 chars (xx ou xx-XX) — ReDoS-safe.
  // eslint-disable-next-line security/detect-unsafe-regex
  if (language && !/^[a-z]{2,3}(?:-[A-Z]{2})?$/.test(language)) {
    return NextResponse.json({ error: "bad_language_tag" }, { status: 400 })
  }

  const admin = supabaseAdmin()
  // crypto.randomUUID() = safe (pas de path traversal possible). org_id provient
  // de profile (server-trusted), pas du form. Extension dérivée du MIME, pas du
  // filename user.
  // Strip suffix codec pour storage (Supabase Storage refuse certains MIME multi-segment)
  const cleanMime = (file.type || "audio/webm").split(";")[0].trim()
  const filename = `${profile.org_id}/${Date.now()}-${crypto.randomUUID()}.${safeExtFromMime(cleanMime)}`
  const buf = Buffer.from(await file.arrayBuffer())

  const { error: upErr } = await admin.storage.from("audio").upload(filename, buf, {
    contentType: cleanMime,
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

  // ===== PIPELINE 3-étapes (séquentiel, demande user 2026-05-20) =====
  // 1. ASR brut (qwen3-asr-flash, $0.005/min, ~3s)
  // 2. Correction + traduction FR propre (qwen-turbo, $0.05/1M tokens, ~1.5s)
  //    → garantit que l'extraction se fait sur du français propre
  // 3. Extraction structurée articles + client + adresse (qwen-plus, $0.40/1M, ~2s)
  // Total : ~6-7s, coût ~$0.00003 par devis
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

  // ÉTAPE 2 — Correction + traduction FR propre AVANT extraction
  // Si la langue détectée n'est pas FR, correctFR traduit aussi. Cf. dashscope.ts.
  let corrected = rawText
  try {
    corrected = await correctFR(rawText, { orgId: profile.org_id, userId: user.id })
  } catch (e) {
    console.warn("[transcribe] correctFR failed, fallback rawText:", e instanceof Error ? e.message : e)
  }

  // ÉTAPE 3 — Extraction structurée sur le CORRIGÉ (français propre)
  // Clarification optionnelle en parallèle (questions à poser au user si ambigu)
  const articleNames = (articles ?? []).map((a) => a.nom)
  const [extracted, clarification] = await Promise.all([
    extractDevisFromTranscript(corrected, articleNames).catch((e) => {
      console.warn("[transcribe] extract failed:", e instanceof Error ? e.message : e)
      return { items: [] as const }
    }),
    clarifyTranscript(corrected, { knownArticles: articleNames }).catch(() => null),
  ])

  // Store transcription record (audit + replay debugging)
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
    llm_used: "qwen3-asr-flash → qwen-turbo (correct/translate) → qwen-plus (extract)",
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

// guessExt remplacé par safeExtFromMime (lib/security/file-magic).
