"use client"
import { useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import { Camera, Video, Mic, Square, Send, Loader2, X, ArrowLeft, ImagePlus, AlertTriangle } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/input"
import { cn } from "@/lib/utils"

/**
 * Signaler une galère de chantier — UX terrain RADICALEMENT simple.
 *
 * Pour l'employé : 3 gros boutons (Photo / Vidéo / Vocal) + un bouton "Envoyer".
 * Pas de menu, pas de form complexe, juste cliquer + parler + envoyer.
 *
 * Sur mobile : capture="environment" pour ouvrir directement la caméra arrière.
 */
export default function Page() {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  const [photos, setPhotos] = useState<File[]>([])
  const [videos, setVideos] = useState<File[]>([])
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [audioDuration, setAudioDuration] = useState(0)
  const [text, setText] = useState("")

  const photoInputRef = useRef<HTMLInputElement>(null)
  const videoInputRef = useRef<HTMLInputElement>(null)

  function addPhotos(e: React.ChangeEvent<HTMLInputElement>) {
    const f = Array.from(e.target.files ?? [])
    if (f.length === 0) return
    setPhotos((prev) => [...prev, ...f].slice(0, 10))
    e.target.value = ""
  }
  function addVideos(e: React.ChangeEvent<HTMLInputElement>) {
    const f = Array.from(e.target.files ?? [])
    if (f.length === 0) return
    setVideos((prev) => [...prev, ...f].slice(0, 3))
    e.target.value = ""
  }

  async function submit() {
    if (photos.length === 0 && videos.length === 0 && !audioBlob && !text.trim()) {
      toast.error("Ajoutez une photo, une vidéo, un vocal ou un mot d'explication")
      return
    }
    startTransition(async () => {
      try {
        const fd = new FormData()
        if (audioBlob) fd.append("audio", audioBlob, "galere.webm")
        photos.forEach((p) => fd.append("photos", p))
        videos.forEach((v) => fd.append("videos", v))
        if (text.trim()) fd.append("text", text.trim())

        const res = await fetch("/api/incidents", { method: "POST", body: fd })
        const data = await res.json() as { ok?: boolean; incident?: { id: string; titre: string; urgency: string }; error?: string; detail?: string }
        if (!res.ok || !data.ok || !data.incident) {
          toast.error("Envoi échoué", { description: data.detail ?? data.error })
          return
        }
        toast.success(`Signalé au patron · ${data.incident.urgency}`, { description: data.incident.titre })
        router.push(`/app/incidents/${data.incident.id}`)
      } catch (e) {
        toast.error("Erreur", { description: e instanceof Error ? e.message : String(e) })
      }
    })
  }

  return (
    <div className="max-w-3xl mx-auto p-6 sm:p-10 space-y-6">
      <Link href="/app/incidents" className="inline-flex items-center gap-1 text-xs text-muted hover:text-electric">
        <ArrowLeft className="h-3 w-3" /> Galères de chantier
      </Link>

      <div className="text-center">
        <div className="mx-auto h-12 w-12 grid place-items-center rounded-2xl border border-wire-red/30 bg-wire-red/10 text-wire-red">
          <AlertTriangle className="h-6 w-6" />
        </div>
        <h1 className="mt-4 font-display text-3xl sm:text-4xl font-bold tracking-tight">
          Une galère sur le chantier ?
        </h1>
        <p className="mt-2 text-muted">Prenez une photo, un vocal. Le patron est prévenu en 5 secondes.</p>
      </div>

      {/* 3 gros boutons */}
      <div className="grid sm:grid-cols-3 gap-3">
        <BigButton
          Icon={Camera}
          label="Photos"
          sub={photos.length > 0 ? `${photos.length} prise(s)` : "Tap → caméra"}
          color="#e63946"
          onClick={() => photoInputRef.current?.click()}
          active={photos.length > 0}
        />
        <BigButton
          Icon={Video}
          label="Vidéos"
          sub={videos.length > 0 ? `${videos.length} clip(s)` : "Court clip"}
          color="#2f6fff"
          onClick={() => videoInputRef.current?.click()}
          active={videos.length > 0}
        />
        <BigVoiceButton
          duration={audioDuration}
          onAudio={(blob, dur) => { setAudioBlob(blob); setAudioDuration(dur) }}
        />
      </div>

      <input ref={photoInputRef} type="file" accept="image/*" capture="environment" multiple className="hidden" onChange={addPhotos} />
      <input ref={videoInputRef} type="file" accept="video/*" capture="environment" multiple className="hidden" onChange={addVideos} />

      {/* Aperçu photos / vidéos */}
      <AnimatePresence>
        {(photos.length > 0 || videos.length > 0) && (
          <motion.div
            initial={{ opacity: 0, y: -6, height: 0 }}
            animate={{ opacity: 1, y: 0, height: "auto" }}
            exit={{ opacity: 0, y: -6, height: 0 }}
            className="overflow-hidden"
          >
            <Card>
              <CardTitle>Pièces jointes</CardTitle>
              <div className="mt-4 grid grid-cols-3 sm:grid-cols-5 gap-2">
                {photos.map((p, i) => (
                  <Thumb key={`p-${i}`} file={p} onRemove={() => setPhotos((prev) => prev.filter((_, idx) => idx !== i))} />
                ))}
                {videos.map((v, i) => (
                  <Thumb key={`v-${i}`} file={v} video onRemove={() => setVideos((prev) => prev.filter((_, idx) => idx !== i))} />
                ))}
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Texte optionnel */}
      <Card>
        <div className="text-xs uppercase tracking-[0.18em] text-muted-2 mb-2">Précision (facultatif)</div>
        <Textarea
          rows={3}
          placeholder="Si besoin, écrivez un mot supplémentaire. Sinon laissez vide, le vocal suffit."
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
      </Card>

      {/* Bouton envoyer */}
      <div className="sticky bottom-4">
        <button
          onClick={submit}
          disabled={pending}
          className={cn(
            "w-full h-16 rounded-2xl bg-electric text-black font-display font-bold text-lg",
            "shadow-[0_18px_60px_-12px_rgba(255,213,0,0.65)]",
            "active:scale-[0.98] transition-transform",
            "disabled:opacity-70",
            "inline-flex items-center justify-center gap-3",
          )}
        >
          {pending ? <Loader2 className="h-6 w-6 animate-spin" /> : <Send className="h-6 w-6" />}
          {pending ? "Le patron est en train d'être prévenu…" : "Envoyer au patron"}
        </button>
      </div>
    </div>
  )
}

function BigButton({ Icon, label, sub, color, onClick, active }: {
  Icon: React.ComponentType<{ className?: string }>
  label: string; sub: string; color: string
  onClick: () => void
  active?: boolean
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "group h-32 rounded-2xl border-2 flex flex-col items-center justify-center gap-2 transition-all active:scale-[0.97]",
        active ? "bg-surface-3" : "bg-surface-2 hover:bg-surface-3",
      )}
      style={{ borderColor: active ? color : "var(--border)" }}
    >
      <div
        className="h-12 w-12 grid place-items-center rounded-xl"
        style={{ background: `${color}1f`, color }}
      >
        <Icon className="h-7 w-7" />
      </div>
      <div>
        <div className="font-display font-bold text-base">{label}</div>
        <div className="text-xs text-muted">{sub}</div>
      </div>
    </button>
  )
}

function BigVoiceButton({ duration, onAudio }: { duration: number; onAudio: (blob: Blob, durationSec: number) => void }) {
  const [recording, setRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const mrRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const startRef = useRef(0)
  const tickRef = useRef<number | null>(null)

  async function toggle() {
    if (recording) {
      mrRef.current?.stop()
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } })
      const mr = new MediaRecorder(stream, { mimeType: pickMime() })
      mrRef.current = mr
      chunksRef.current = []
      mr.ondataavailable = (e) => e.data.size && chunksRef.current.push(e.data)
      mr.onstop = () => {
        stream.getTracks().forEach((t) => t.stop())
        if (tickRef.current) cancelAnimationFrame(tickRef.current)
        setRecording(false)
        const blob = new Blob(chunksRef.current, { type: mr.mimeType || "audio/webm" })
        const dur = Math.round((Date.now() - startRef.current) / 1000)
        onAudio(blob, dur)
      }
      mr.start(250)
      startRef.current = Date.now()
      setRecording(true)
      const tick = () => {
        setRecordingTime(Math.floor((Date.now() - startRef.current) / 1000))
        tickRef.current = requestAnimationFrame(tick)
      }
      tick()
      setTimeout(() => mr.state === "recording" && mr.stop(), 90_000)
    } catch (e) {
      toast.error("Micro inaccessible", { description: e instanceof Error ? e.message : String(e) })
    }
  }

  const has = duration > 0 && !recording
  return (
    <button
      onClick={toggle}
      className={cn(
        "h-32 rounded-2xl border-2 flex flex-col items-center justify-center gap-2 transition-all active:scale-[0.97]",
        recording ? "bg-danger/15 border-danger" : has ? "bg-surface-3 border-success/60" : "bg-surface-2 border-border hover:bg-surface-3",
      )}
    >
      <div
        className={cn(
          "h-12 w-12 grid place-items-center rounded-xl",
          recording ? "bg-danger text-white" : has ? "bg-success/20 text-success" : "bg-electric/20 text-electric",
        )}
      >
        {recording ? <Square className="h-7 w-7" fill="currentColor" /> : <Mic className="h-7 w-7" />}
      </div>
      <div>
        <div className="font-display font-bold text-base">
          {recording ? `Stop (${recordingTime}s)` : has ? `Vocal · ${duration}s` : "Vocal"}
        </div>
        <div className="text-xs text-muted">{recording ? "On vous écoute" : has ? "Tap pour refaire" : "Tap pour parler"}</div>
      </div>
    </button>
  )
}

function Thumb({ file, video, onRemove }: { file: File; video?: boolean; onRemove: () => void }) {
  const url = URL.createObjectURL(file)
  return (
    <div className="relative aspect-square overflow-hidden rounded-lg border border-border bg-surface-2">
      {video ? (
        <video src={url} className="h-full w-full object-cover" muted />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt={file.name} className="h-full w-full object-cover" />
      )}
      <button
        type="button"
        onClick={onRemove}
        aria-label="Retirer"
        className="absolute top-1 right-1 grid h-6 w-6 place-items-center rounded-full bg-black/70 text-white"
      >
        <X className="h-3 w-3" />
      </button>
      {video && (
        <span className="absolute bottom-1 right-1 rounded bg-black/70 px-1.5 py-0.5 text-[10px] text-white">vidéo</span>
      )}
    </div>
  )
}

function pickMime(): string {
  const ok = ["audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus", "audio/mp4"]
  for (const m of ok) if (MediaRecorder.isTypeSupported(m)) return m
  return ""
}

// Petit util icône import depuis lucide alors qu'on n'en a pas besoin direct ici
// (ImagePlus est juste là pour ne pas casser le tree-shake si jamais on l'ajoute)
void ImagePlus
