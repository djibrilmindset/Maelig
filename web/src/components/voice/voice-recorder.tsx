"use client"
import { useEffect, useRef, useState } from "react"
import { Mic, Square, Loader2, Sparkles } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { ExtractedDevis } from "@/lib/llm/dashscope"

interface Result {
  raw: string
  corrected: string
  language?: string
  extracted: ExtractedDevis
}

export function VoiceRecorder({
  onResult,
  className,
  large = true,
}: {
  onResult: (r: Result) => void
  className?: string
  large?: boolean
}) {
  const [recording, setRecording] = useState(false)
  const [transcribing, setTranscribing] = useState(false)
  const [seconds, setSeconds] = useState(0)
  const [level, setLevel] = useState(0)
  const chunksRef = useRef<Blob[]>([])
  const mediaRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const tickRef = useRef<number | null>(null)
  const tStartRef = useRef<number>(0)

  useEffect(() => () => stopStream(), [])

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
