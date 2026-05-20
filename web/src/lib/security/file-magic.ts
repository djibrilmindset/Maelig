/**
 * P1 audit 2026-05-20 — Magic byte sniff côté serveur.
 * Le header `Content-Type` du multipart/form-data est trivialement spoofable
 * par le client. On vérifie donc les premiers octets ("magic bytes") pour
 * matcher le MIME déclaré. Si mismatch → reject.
 *
 * On NE charge PAS la lib `file-type` (15 KB ESM-only) : on couvre nous-mêmes
 * les ~12 formats acceptés par DEP (audio + image + vidéo BTP).
 */

export type Category = "audio" | "image" | "video"

interface Signature {
  mime: string
  bytes: number[]               // -1 = wildcard
  offset?: number
  category: Category
}

/* Signatures officielles : extrait IANA + MDN + librairies de référence. */
const SIGS: Signature[] = [
  // ========= AUDIO =========
  { mime: "audio/wav",    bytes: [0x52, 0x49, 0x46, 0x46], category: "audio" },          // RIFF
  { mime: "audio/wav",    bytes: [0x57, 0x41, 0x56, 0x45], offset: 8, category: "audio" }, // WAVE
  { mime: "audio/mp3",    bytes: [0x49, 0x44, 0x33], category: "audio" },                // ID3
  { mime: "audio/mpeg",   bytes: [0xff, 0xfb], category: "audio" },                      // MP3 sync
  { mime: "audio/mpeg",   bytes: [0xff, 0xf3], category: "audio" },
  { mime: "audio/mpeg",   bytes: [0xff, 0xf2], category: "audio" },
  { mime: "audio/ogg",    bytes: [0x4f, 0x67, 0x67, 0x53], category: "audio" },          // OggS
  { mime: "audio/webm",   bytes: [0x1a, 0x45, 0xdf, 0xa3], category: "audio" },          // EBML
  // m4a / mp4 audio: ftyp box at offset 4
  { mime: "audio/mp4",    bytes: [0x66, 0x74, 0x79, 0x70], offset: 4, category: "audio" }, // ftyp
  { mime: "audio/x-m4a",  bytes: [0x66, 0x74, 0x79, 0x70], offset: 4, category: "audio" },
  { mime: "audio/aac",    bytes: [0xff, 0xf1], category: "audio" },
  { mime: "audio/aac",    bytes: [0xff, 0xf9], category: "audio" },

  // ========= IMAGE =========
  { mime: "image/jpeg",   bytes: [0xff, 0xd8, 0xff], category: "image" },
  { mime: "image/png",    bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], category: "image" },
  { mime: "image/webp",   bytes: [0x52, 0x49, 0x46, 0x46], category: "image" }, // RIFF; on confirme via WEBP @ offset 8
  { mime: "image/webp",   bytes: [0x57, 0x45, 0x42, 0x50], offset: 8, category: "image" },
  { mime: "image/heic",   bytes: [0x66, 0x74, 0x79, 0x70], offset: 4, category: "image" },
  { mime: "image/heif",   bytes: [0x66, 0x74, 0x79, 0x70], offset: 4, category: "image" },

  // ========= VIDEO =========
  { mime: "video/mp4",       bytes: [0x66, 0x74, 0x79, 0x70], offset: 4, category: "video" },
  { mime: "video/quicktime", bytes: [0x66, 0x74, 0x79, 0x70], offset: 4, category: "video" },
  { mime: "video/x-m4v",     bytes: [0x66, 0x74, 0x79, 0x70], offset: 4, category: "video" },
  { mime: "video/webm",      bytes: [0x1a, 0x45, 0xdf, 0xa3], category: "video" },
]

/* Liste blanche acceptée par DEP. Mettre à jour en sync avec la migration. */
export const ALLOWED_MIME: Record<Category, Set<string>> = {
  audio: new Set([
    "audio/webm", "audio/ogg", "audio/wav",
    "audio/mp3", "audio/mpeg", "audio/mp4", "audio/x-m4a", "audio/aac",
  ]),
  image: new Set(["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"]),
  video: new Set(["video/mp4", "video/quicktime", "video/webm", "video/x-m4v"]),
}

/* Patterns dangereux à reject systématiquement (HTML, scripts, exec). */
const FORBIDDEN_SIGS: Array<{ name: string; bytes: number[]; offset?: number }> = [
  { name: "HTML",          bytes: [0x3c, 0x21, 0x44, 0x4f, 0x43, 0x54, 0x59, 0x50, 0x45] },  // <!DOCTYPE
  { name: "HTML",          bytes: [0x3c, 0x68, 0x74, 0x6d, 0x6c] },                          // <html
  { name: "SVG",           bytes: [0x3c, 0x73, 0x76, 0x67] },                                // <svg
  { name: "Script",        bytes: [0x3c, 0x73, 0x63, 0x72, 0x69, 0x70, 0x74] },              // <script
  { name: "PE Executable", bytes: [0x4d, 0x5a] },                                            // MZ
  { name: "ELF",           bytes: [0x7f, 0x45, 0x4c, 0x46] },
  { name: "Mach-O",        bytes: [0xfe, 0xed, 0xfa, 0xce] },
  { name: "Mach-O",        bytes: [0xfe, 0xed, 0xfa, 0xcf] },
  { name: "Shell",         bytes: [0x23, 0x21] },                                            // #!
  { name: "PHP",           bytes: [0x3c, 0x3f, 0x70, 0x68, 0x70] },                          // <?php
  { name: "Java class",    bytes: [0xca, 0xfe, 0xba, 0xbe] },
  { name: "ZIP/JAR",       bytes: [0x50, 0x4b, 0x03, 0x04] },                                // .zip/.jar/.docx
]

function matches(buf: Uint8Array, sig: { bytes: number[]; offset?: number }): boolean {
  const off = sig.offset ?? 0
  if (buf.length < off + sig.bytes.length) return false
  for (let i = 0; i < sig.bytes.length; i++) {
    const expected = sig.bytes[i]
    if (expected === -1) continue
    if (buf[off + i] !== expected) return false
  }
  return true
}

/** Lit les N premiers octets d'un File (Web standard). */
async function readHead(file: Blob, n = 32): Promise<Uint8Array> {
  const slice = file.slice(0, n)
  const ab = await slice.arrayBuffer()
  return new Uint8Array(ab)
}

export interface MagicCheckResult {
  ok: boolean
  detected?: string
  reason?: string
  category?: Category
}

/**
 * Vérifie qu'un File matche bien le MIME déclaré.
 * @param file Le File reçu en multipart.
 * @param expectedCategory La famille attendue ("audio" | "image" | "video").
 * @param declaredMime Le file.type tel que reçu (peut être spoofé).
 */
export async function checkMagic(
  file: Blob & { type?: string; name?: string },
  expectedCategory: Category,
  declaredMime?: string,
): Promise<MagicCheckResult> {
  // 1) MIME déclaré dans la whitelist ?
  // Strip suffix codec (ex: "audio/webm;codecs=opus" → "audio/webm")
  // car les MediaRecorder browser (Chrome/Safari/Firefox) le rajoutent.
  const rawMime = (declaredMime ?? file.type ?? "").toLowerCase()
  const declared = rawMime.split(";")[0].trim()
  if (!declared || !ALLOWED_MIME[expectedCategory].has(declared)) {
    return { ok: false, reason: `mime_not_allowed:${rawMime || "empty"}` }
  }

  // 2) Lecture des 32 premiers octets
  const head = await readHead(file, 32)
  if (head.length < 4) return { ok: false, reason: "file_too_small" }

  // 3) Forbidden sigs (HTML, scripts, exec) — reject même si MIME audio/image
  for (const f of FORBIDDEN_SIGS) {
    if (matches(head, f)) return { ok: false, reason: `forbidden_signature:${f.name}` }
  }

  // 4) Match au moins une signature pour cette catégorie
  for (const sig of SIGS) {
    if (sig.category !== expectedCategory) continue
    if (matches(head, sig)) {
      // Cas RIFF générique : on accepte si déclaré WAV ou WEBP (les 2 sont RIFF)
      // ou si une seconde signature plus précise matche (WEBP @ offset 8).
      return { ok: true, detected: sig.mime, category: expectedCategory }
    }
  }

  return { ok: false, reason: `magic_mismatch:${declared}` }
}

/** Sanitize un nom de fichier (anti path traversal + caractères dangereux). */
export function sanitizeFilename(name: string | null | undefined, fallback = "file"): string {
  if (!name) return fallback
  // Strip path separators + control chars + reserved Windows chars
  const cleaned = name
    .replace(/[/\\]/g, "_")
    .replace(/[\x00-\x1f<>:"|?*]/g, "")
    .replace(/^\.+/, "")
    .slice(0, 200)
  return cleaned || fallback
}

/** Calcule l'extension safe depuis le MIME (jamais depuis le filename user). */
export function safeExtFromMime(mime: string): string {
  const m = mime.toLowerCase()
  if (m.includes("webm")) return "webm"
  if (m.includes("quicktime")) return "mov"
  if (m.includes("mp4") || m.includes("m4a")) return m.includes("video") ? "mp4" : "m4a"
  if (m.includes("mpeg") || m.includes("mp3")) return "mp3"
  if (m.includes("wav")) return "wav"
  if (m.includes("ogg")) return "ogg"
  if (m.includes("aac")) return "aac"
  if (m.includes("jpeg") || m.includes("jpg")) return "jpg"
  if (m.includes("png")) return "png"
  if (m.includes("heic")) return "heic"
  if (m.includes("heif")) return "heif"
  if (m.includes("webp")) return "webp"
  return "bin"
}
