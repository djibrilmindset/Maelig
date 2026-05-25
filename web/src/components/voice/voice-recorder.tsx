"use client"
import { useEffect, useRef, useState } from "react"
import { Mic, Square, Loader2, Sparkles } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import type { ExtractedDevis } from "@/lib/llm/dashscope"
import type { Clarification } from "@/lib/llm/clarify"
import { useLiveTranscript } from "@/lib/use-live-transcript"

interface Result {
  raw: string
  corrected: string
  language?: string
  extracted: ExtractedDevis
  clarification?: Clarification | null
  _diagnostic?: {
    pipeline?: string
    extract_error?: string | null
    extract_fallback_used?: boolean
    clarify_error?: string | null
  }
}

export interface PartialResult {
  text: string                  // texte LIVE en cours (peut changer)
  extracted: ExtractedDevis     // extraction partielle à appliquer (merge dans parent)
}

export function VoiceRecorder({
  onResult,
  onPartialResult,
  className,
  large = true,
}: {
  onResult: (r: Result) => void
  /** Appelé pendant l'enregistrement à chaque pause (~1.5s) avec extraction partielle. */
  onPartialResult?: (p: PartialResult) => void
  className?: string
  large?: boolean
}) {
  const [recording, setRecording] = useState(false)
  const [transcribing, setTranscribing] = useState(false)
  const [seconds, setSeconds] = useState(0)
  const [level, setLevel] = useState(0)
  const [extractingLive, setExtractingLive] = useState(false)
  const chunksRef = useRef<Blob[]>([])
  const mediaRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const tickRef = useRef<number | null>(null)
  const tStartRef = useRef<number>(0)
  const lastExtractedTextRef = useRef<string>("")

  const live = useLiveTranscript({ lang: "fr-FR" })

  useEffect(() => () => stopStream(), [])

  // ===== STREAMING LIVE : extraction partielle à chaque pause (≥1.2s sans nouveau mot) =====
  // Tant qu'on enregistre, on accumule le texte du browser (live.finalText + live.interim).
  // Quand l'utilisateur fait une pause naturelle, on POST le texte cumulé à /api/voice/extract-text.
  // Le parent reçoit l'extraction partielle via onPartialResult et met à jour les champs en live.
  useEffect(() => {
    if (!recording || !onPartialResult || !live.isSupported) return
    const pauseMs = live.msSinceLastWord ?? 0
    if (pauseMs < 1200) return
    const fullText = (live.finalText + (live.interim ? " " + live.interim : "")).trim()
    if (!fullText || fullText.length < 8) return
    if (fullText === lastExtractedTextRef.current) return // déjà extrait
    lastExtractedTextRef.current = fullText
    setExtractingLive(true)
    fetch("/api/voice/extract-text", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: fullText }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data?.ok && data.extracted) {
          onPartialResult({ text: fullText, extracted: data.extracted })
        }
      })
      .catch(() => { /* silent */ })
      .finally(() => setExtractingLive(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [live.msSinceLastWord, recording, onPartialResult, live.isSupported])

  function stopStream() {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    if (tickRef.current) cancelAnimationFrame(tickRef.current)
    tickRef.current = null
  }

  async function start() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      })
      streamRef.current = stream
      const mr = new MediaRecorder(stream, { mimeType: pickMimeType() })
      mediaRef.current = mr
      chunksRef.current = []
      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }
      mr.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: mr.mimeType || "audio/webm" })
        chunksRef.current = []
        stopStream()
        await upload(blob)
      }
      mr.start(250)
      setRecording(true)
      tStartRef.current = Date.now()
      lastExtractedTextRef.current = ""
      // Démarre la transcription LIVE browser en parallèle (si supporté)
      live.reset()
      live.start()
      animate(stream)
      // Auto-stop at 120s safeguard
      setTimeout(() => mr.state === "recording" && stop(), 120_000)
    } catch (e) {
      toast.error("Micro inaccessible", { description: e instanceof Error ? e.message : String(e) })
    }
  }

  function stop() {
    if (mediaRef.current && mediaRef.current.state !== "inactive") {
      mediaRef.current.stop()
    }
    live.stop()
    setRecording(false)
  }

  function animate(stream: MediaStream) {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    const ctx = new AC()
    const source = ctx.createMediaStreamSource(stream)
    const analyser = ctx.createAnalyser()
    analyser.fftSize = 256
    source.connect(analyser)
    analyserRef.current = analyser
    const data = new Uint8Array(analyser.frequencyBinCount)
    const tick = () => {
      analyser.getByteTimeDomainData(data)
      let sum = 0
      for (let i = 0; i < data.length; i++) {
        const v = (data[i] - 128) / 128
        sum += v * v
      }
      const rms = Math.sqrt(sum / data.length)
      setLevel(Math.min(1, rms * 4))
      setSeconds(Math.floor((Date.now() - tStartRef.current) / 1000))
      tickRef.current = requestAnimationFrame(tick)
    }
    tick()
  }

  async function upload(blob: Blob) {
    setTranscribing(true)
    try {
      const fd = new FormData()
      fd.append("audio", blob, `chantier-${Date.now()}.webm`)
      const res = await fetch("/api/voice/transcribe", { method: "POST", body: fd })
      const data = (await res.json()) as Partial<Result> & { error?: string; detail?: string }
      if (!res.ok || data.error) {
        toast.error("Transcription échouée", { description: data.detail ?? data.error })
        return
      }
      onResult({
        raw: data.raw ?? "",
        corrected: data.corrected ?? "",
        language: data.language,
        extracted: data.extracted ?? { items: [] },
        clarification: data.clarification ?? null,
        _diagnostic: data._diagnostic,
      })
    } catch (e) {
      toast.error("Erreur réseau", { description: e instanceof Error ? e.message : String(e) })
    } finally {
      setTranscribing(false)
    }
  }

  return (
    <div className={cn("flex flex-col items-center gap-3", className)}>
      <button
        type="button"
        disabled={transcribing}
        onClick={recording ? stop : start}
        aria-label={recording ? "Arrêter l'enregistrement" : "Démarrer l'enregistrement"}
        className={cn(
          "relative grid place-items-center rounded-full transition-transform active:scale-95",
          large ? "h-32 w-32" : "h-20 w-20",
          recording
            ? "bg-danger text-white"
            : "bg-gradient-to-br from-electric to-electric-deep text-black",
          transcribing && "opacity-70",
          "shadow-[0_18px_60px_-12px_rgba(255,213,0,0.6)]",
        )}
      >
        {recording &&
          [0.4, 0.7, 1.05].map((s, i) => (
            <span
              key={i}
              className="absolute inset-0 rounded-full border border-danger/40"
              style={{
                transform: `scale(${1 + level * s})`,
                transition: "transform 60ms ease-out",
                opacity: 0.6 - i * 0.15,
              }}
            />
          ))}
        {transcribing ? (
          <Loader2 className={cn("animate-spin", large ? "h-12 w-12" : "h-8 w-8")} />
        ) : recording ? (
          <Square className={cn(large ? "h-12 w-12" : "h-8 w-8")} fill="currentColor" />
        ) : (
          <Mic className={cn(large ? "h-12 w-12" : "h-8 w-8")} />
        )}
      </button>

      <div className="text-center min-h-[2rem]">
        {recording ? (
          <p className="text-sm">
            <span className="font-mono text-foreground">{formatSeconds(seconds)}</span>{" "}
            <span className="text-muted">· parlez normalement…</span>
            {extractingLive && (
              <span className="ml-2 inline-flex items-center gap-1 text-[11px] text-electric">
                <Sparkles className="h-3 w-3 animate-pulse" />
                je remplis…
              </span>
            )}
          </p>
        ) : transcribing ? (
          <p className="text-sm text-muted inline-flex items-center gap-2">
            <Sparkles className="h-3.5 w-3.5 text-electric" />
            On écoute, on corrige, on structure…
          </p>
        ) : (
          <p className="text-sm text-muted">Appuyez pour décrire votre chantier.</p>
        )}
      </div>

      {/* PANNEAU LIVE : ce que le browser entend en direct (Web Speech API).
          Visible pendant l'enregistrement uniquement. Donne confiance à l'user :
          "ah oui il a bien capté ce que je viens de dire". */}
      {recording && live.isSupported && (
        <div className="w-full max-w-xl rounded-[var(--radius)] border border-electric/40 bg-electric/5 px-4 py-3 text-left">
          <div className="text-[10px] uppercase tracking-[0.16em] text-electric mb-1.5">Vous dites</div>
          <p className="text-sm leading-relaxed text-foreground/90 min-h-[1.5rem]">
            {live.finalText ? (
              <span>{live.finalText}</span>
            ) : null}
            {live.interim ? (
              <span className="text-muted italic"> {live.interim}</span>
            ) : null}
            {!live.finalText && !live.interim && (
              <span className="text-muted italic">en attente de votre voix…</span>
            )}
          </p>
        </div>
      )}
      {recording && !live.isSupported && (
        <p className="text-[11px] text-muted-2 text-center">
          (Aperçu live indisponible sur ce navigateur — la transcription complète arrivera après le stop.)
        </p>
      )}
    </div>
  )
}

function pickMimeType(): string {
  const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus", "audio/mp4"]
  for (const c of candidates) if (MediaRecorder.isTypeSupported(c)) return c
  return ""
}

function formatSeconds(s: number) {
  const m = Math.floor(s / 60)
  const ss = s % 60
  return `${m.toString().padStart(2, "0")}:${ss.toString().padStart(2, "0")}`
}
