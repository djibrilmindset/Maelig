/**
 * ASR (Speech-to-Text) via DashScope's paraformer model.
 * Endpoint: synchronous wav/mp3 transcription for short clips (<2 min).
 * For longer clips, switch to async batch (paraformer-v2-async).
 *
 * Audio uploaded to Supabase Storage → public signed URL → DashScope async job → poll → result.
 */

const BASE = "https://dashscope-intl.aliyuncs.com/api/v1/services/audio/asr/transcription"
const KEY = process.env.DASHSCOPE_API_KEY

export async function transcribeAudioFromUrl(audioUrl: string, languageHint?: string): Promise<{ text: string; language?: string; raw: unknown }> {
  if (!KEY) throw new Error("DASHSCOPE_API_KEY not configured")

  // Submit async job
  const submit = await fetch(BASE, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${KEY}`,
      "X-DashScope-Async": "enable",
    },
    body: JSON.stringify({
      model: "paraformer-v2",
      input: { file_urls: [audioUrl] },
      parameters: {
        language_hints: languageHint ? [languageHint] : ["fr", "en", "ar", "es"],
        disfluency_removal_enabled: true,
        // Build punctuation in
      },
    }),
  })

  if (!submit.ok) {
    const err = await submit.text().catch(() => "")
    throw new Error(`[asr-submit] ${submit.status} ${err.slice(0, 200)}`)
  }
  const submitData = (await submit.json()) as { output: { task_id: string } }
  const taskId = submitData.output?.task_id
  if (!taskId) throw new Error("[asr] no task_id returned")

  // Poll
  const start = Date.now()
  const TIMEOUT_MS = 60_000
  while (Date.now() - start < TIMEOUT_MS) {
    await new Promise((r) => setTimeout(r, 1500))
    const poll = await fetch(`https://dashscope-intl.aliyuncs.com/api/v1/tasks/${taskId}`, {
      headers: { Authorization: `Bearer ${KEY}` },
    })
    if (!poll.ok) continue
    const data = (await poll.json()) as {
      output: {
        task_status: "PENDING" | "RUNNING" | "SUCCEEDED" | "FAILED"
        results?: Array<{ transcription_url?: string; transcription?: { text?: string; sentences?: Array<{ text: string }> } }>
      }
    }
    const status = data.output?.task_status
    if (status === "FAILED") throw new Error("[asr] task FAILED")
    if (status !== "SUCCEEDED") continue
    const result = data.output?.results?.[0]
    // Sometimes returns transcription_url to download
    if (result?.transcription_url) {
      const t = await fetch(result.transcription_url)
      if (t.ok) {
        const j = (await t.json()) as { transcripts?: Array<{ text: string }>; properties?: { audio_language?: string } }
        return {
          text: j.transcripts?.map((s) => s.text).join(" ") ?? "",
          language: j.properties?.audio_language,
          raw: data,
        }
      }
    }
    const inline = result?.transcription
    if (inline) {
      return {
        text: inline.text ?? inline.sentences?.map((s) => s.text).join(" ") ?? "",
        raw: data,
      }
    }
    return { text: "", raw: data }
  }
  throw new Error("[asr] timeout")
}
