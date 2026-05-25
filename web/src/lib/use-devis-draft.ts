"use client"

import { useEffect, useRef, useState } from "react"

/**
 * Auto-save d'un brouillon de devis dans localStorage.
 *
 * Sauve toutes les 800ms après le dernier changement (debounce).
 * Restaure au mount si présent et non expiré (7j).
 *
 * Conçu pour utilisateurs seniors : zéro action requise, sauvegarde silencieuse,
 * retour automatique exactement là où ils étaient.
 */

const DRAFT_TTL_MS = 7 * 24 * 60 * 60 * 1000 // 7 jours
const DEBOUNCE_MS = 800

interface DraftEnvelope<T> {
  savedAt: number
  data: T
}

export interface UseDevisDraftResult<T> {
  hydrated: T | null
  lastSavedAt: Date | null
  clearDraft: () => void
}

export function useDevisDraft<T>(key: string, value: T, opts?: { enabled?: boolean }): UseDevisDraftResult<T> {
  const enabled = opts?.enabled !== false
  const [hydrated, setHydrated] = useState<T | null>(null)
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isFirstRun = useRef(true)

  // Hydratation au mount
  useEffect(() => {
    if (!enabled || typeof window === "undefined") return
    try {
      const raw = window.localStorage.getItem(key)
      if (!raw) return
      const env = JSON.parse(raw) as DraftEnvelope<T>
      if (!env?.savedAt || Date.now() - env.savedAt > DRAFT_TTL_MS) {
        window.localStorage.removeItem(key)
        return
      }
      setHydrated(env.data)
      setLastSavedAt(new Date(env.savedAt))
    } catch {
      // corrupted → ignore
    }
  }, [key, enabled])

  // Auto-save debounced sur chaque changement de value
  useEffect(() => {
    if (!enabled || typeof window === "undefined") return
    if (isFirstRun.current) {
      isFirstRun.current = false
      return
    }
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      try {
        const env: DraftEnvelope<T> = { savedAt: Date.now(), data: value }
        window.localStorage.setItem(key, JSON.stringify(env))
        setLastSavedAt(new Date(env.savedAt))
      } catch {
        // quota / privacy mode → silent
      }
    }, DEBOUNCE_MS)
    return () => {
      if (timer.current) clearTimeout(timer.current)
    }
  }, [key, value, enabled])

  // Save immédiat avant fermeture page
  useEffect(() => {
    if (!enabled || typeof window === "undefined") return
    const onLeave = () => {
      try {
        const env: DraftEnvelope<T> = { savedAt: Date.now(), data: value }
        window.localStorage.setItem(key, JSON.stringify(env))
      } catch {
        // ignore
      }
    }
    window.addEventListener("beforeunload", onLeave)
    window.addEventListener("pagehide", onLeave)
    return () => {
      window.removeEventListener("beforeunload", onLeave)
      window.removeEventListener("pagehide", onLeave)
    }
  }, [key, value, enabled])

  function clearDraft() {
    if (typeof window === "undefined") return
    try {
      window.localStorage.removeItem(key)
    } catch {
      // ignore
    }
    setHydrated(null)
    setLastSavedAt(null)
  }

  return { hydrated, lastSavedAt, clearDraft }
}

export function formatSavedAgo(d: Date | null): string {
  if (!d) return ""
  const sec = Math.floor((Date.now() - d.getTime()) / 1000)
  if (sec < 5) return "à l'instant"
  if (sec < 60) return `il y a ${sec} s`
  const min = Math.floor(sec / 60)
  if (min < 60) return `il y a ${min} min`
  const h = Math.floor(min / 60)
  if (h < 24) return `il y a ${h} h`
  return d.toLocaleDateString("fr-FR")
}
