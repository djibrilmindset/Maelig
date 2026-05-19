import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatEUR(value: number | null | undefined, opts: Intl.NumberFormatOptions = {}) {
  const v = Number(value ?? 0)
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    ...opts,
  }).format(v)
}

export function formatDateFR(value: string | Date | null | undefined) {
  if (!value) return "—"
  const d = typeof value === "string" ? new Date(value) : value
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(d)
}

export function relativeFR(value: string | Date | null | undefined) {
  if (!value) return ""
  const d = typeof value === "string" ? new Date(value) : value
  const diff = Math.round((d.getTime() - Date.now()) / 86_400_000)
  if (Math.abs(diff) < 1) return "aujourd'hui"
  const rtf = new Intl.RelativeTimeFormat("fr-FR", { numeric: "auto" })
  return rtf.format(diff, "day")
}

export function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

export function initials(name?: string | null) {
  if (!name) return "??"
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]!.toUpperCase())
    .join("")
}
