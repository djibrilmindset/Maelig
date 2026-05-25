"use client"

import { useCallback, useEffect, useRef, useState } from "react"

/**
 * Transcription LIVE via Web Speech API (gratuit, instantané, dans le navigateur).
 *
 * Conçu pour rouler EN PARALLÈLE de MediaRecorder :
 *   - SpeechRecognition donne le texte en temps réel pendant que l'utilisateur parle
 *   - MediaRecorder garde l'audio pour le pipeline final serveur (qwen-asr) plus fiable
 *
 * Compatibilité :
 *   - Chrome/Edge desktop/Android : ✅ excellent FR
 *   - Safari iOS 14.5+ : ⚠️ partiel (continuous limité)
 *   - Firefox : ❌ pas de support natif → isSupported = false, on retombe sur ASR serveur
 *
 * Le hook expose `interim` (texte en cours, peut changer) et `final` (validé, accumulé).
 */

// Browser SpeechRecognition types (pas dans lib.dom standard)
interface SpeechRecognitionAlternative {
  transcript: string
  confidence: number
}
interface SpeechRecognitionResult {
  isFinal: boolean
  length: number
  [index: number]: SpeechRecognitionAlternative
}
interface SpeechRecognitionResultList {
  length: number
  [index: number]: SpeechRecognitionResult
}
interface SpeechRecognitionEvent {
  resultIndex: number
  results: SpeechRecognitionResultList
}
interface SpeechRecognitionErrorEvent {
  error: string
  message?: string
}
interface SpeechRecognition extends EventTarget {
  lang: string
  continuous: boolean
  interimResults: boolean
  maxAlternatives: number
  start(): void
  stop(): void
  abort(): void
  onresult: ((e: SpeechRecognitionEvent) => void) | null
  onerror: ((e: SpeechRecognitionErrorEvent) => void) | null
  onend: (() => void) | null
  onaudiostart: (() => void) | null
  onspeechstart: (() => void) | null
  onspeechend: (() => void) | null
}
interface SpeechRecognitionConstructor {
  new (): SpeechRecognition
}

function getSpeechRecognition(): SpeechRecognitionConstructor | null {
  if (typeof window === "undefined") return null
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionConstructor
    webkitSpeechRecognition?: SpeechRecognitionConstructor
  }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

export interface UseLiveTranscriptResult {
  isSupported: boolean
  isListening: boolean
  interim: string        // texte en cours de reconnaissance (peut changer)
  finalText: string      // texte cumulé validé depuis le start()
  start: () => void
  stop: () => void
  reset: () => void
  /** Délai (ms) depuis le dernier mot. Sert à détecter une pause pour déclencher extraction partielle. */
  msSinceLastWord: number | null
}

export function useLiveTranscript(opts?: { lang?: string }): UseLiveTranscriptResult {
  const lang = opts?.lang ?? "fr-FR"
  const recRef = useRef<SpeechRecognition | null>(null)
  const supportedRef = useRef<boolean | null>(null)
  const [isListening, setIsListening] = useState(false)
  const [interim, setInterim] = useState("")
  const [finalText, setFinalText] = useState("")
  const [lastWordAt, setLastWordAt] = useState<number | null>(null)
  const [now, setNow] = useState(Date.now())

  if (supportedRef.current === null) {
    supportedRef.current = getSpeechRecognition() !== null
  }
  const isSupported = supportedRef.current

  // Tick toutes les 200ms pour calculer msSinceLastWord côté consommateur
  useEffect(() => {
    if (!isListening) return
    const id = setInterval(() => setNow(Date.now()), 200)
    return () => clearInterval(id)
  }, [isListening])

  const start = useCallback(() => {
    const Ctor = getSpeechRecognition()
    if (!Ctor) return
    try {
      const r = new Ctor()
      r.lang = lang
      r.continuous = true
      r.interimResults = true
      r.maxAlternatives = 1

      r.onresult = (e: SpeechRecognitionEvent) => {
        let nextInterim = ""
        let appended = ""
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const res = e.results[i]
          const alt = res[0]
          if (!alt) continue
          if (res.isFinal) {
            appended += alt.transcript
          } else {
            nextInterim += alt.transcript
          }
        }
        if (appended) {
          setFinalText((prev) => (prev ? prev + " " : "") + appended.trim())
        }
        setInterim(nextInterim.trim())
        setLastWordAt(Date.now())
      }

      r.onerror = (ev: SpeechRecognitionErrorEvent) => {
        // 'no-speech' / 'aborted' = normal, on ne log que les vrais erreurs
        if (ev.error !== "no-speech" && ev.error !== "aborted") {
          console.warn("[useLiveTranscript] error:", ev.error, ev.message)
        }
      }

      // Auto-restart pour continuous (certains browsers coupent après silence)
      r.onend = () => {
        if (recRef.current === r) {
          // Si on a pas explicitement stoppé, on relance
          try { r.start() } catch { setIsListening(false) }
        }
      }

      recRef.current = r
      r.start()
      setIsListening(true)
      setLastWordAt(Date.now())
    } catch (e) {
      console.warn("[useLiveTranscript] start failed:", e)
      setIsListening(false)
    }
  }, [lang])

  const stop = useCallback(() => {
    const r = recRef.current
    recRef.current = null // empêche onend auto-restart
    setIsListening(false)
    if (r) {
      try { r.stop() } catch { /* ignore */ }
    }
  }, [])

  const reset = useCallback(() => {
    setFinalText("")
    setInterim("")
    setLastWordAt(null)
  }, [])

  // Cleanup
  useEffect(() => {
    return () => {
      const r = recRef.current
      recRef.current = null
      if (r) {
        try { r.stop() } catch { /* ignore */ }
      }
    }
  }, [])

  const msSinceLastWord = lastWordAt ? now - lastWordAt : null

  return { isSupported, isListening, interim, finalText, start, stop, reset, msSinceLastWord }
}
