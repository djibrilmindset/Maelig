/**
 * Sentry init partagé client/server/edge.
 * Si SENTRY_DSN absent → init désactivé (pas de crash, pas d'overhead).
 *
 * Free tier Sentry : 5 000 errors / mois, gardés 30 jours. Suffisant MVP.
 */
import * as Sentry from "@sentry/nextjs"

export function initSentry(scope: "client" | "server" | "edge") {
  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN
  if (!dsn) return
  Sentry.init({
    dsn,
    environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "development",
    tracesSampleRate: scope === "server" ? 0.05 : 0.1,
    profilesSampleRate: 0,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: scope === "client" ? 0.2 : 0,
    sendDefaultPii: false,
    beforeSend(event) {
      // Anonymise emails
      if (event.user?.email) event.user.email = "[redacted]"
      return event
    },
  })
}
