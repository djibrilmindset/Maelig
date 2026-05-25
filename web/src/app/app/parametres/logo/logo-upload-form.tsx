"use client"

import { useActionState, useRef } from "react"
import { Upload, AlertCircle, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { uploadLogoAction } from "./actions"

export function LogoUploadForm() {
  const [state, formAction, pending] = useActionState(uploadLogoAction, { ok: false })
  const formRef = useRef<HTMLFormElement>(null)

  return (
    <form ref={formRef} action={formAction} encType="multipart/form-data">
      <div className="text-xs uppercase tracking-wider text-muted mb-3">
        Télécharger un logo
      </div>

      <label
        htmlFor="logo-upload"
        className="flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-border bg-surface-2 p-10 cursor-pointer hover:border-electric/50 hover:bg-surface-3 transition-colors"
      >
        <Upload className="h-8 w-8 text-muted-2" />
        <div className="text-center">
          <div className="text-sm font-medium">Cliquez pour choisir un fichier</div>
          <div className="text-xs text-muted-2 mt-1">PNG, JPG ou SVG · Max 2 Mo</div>
        </div>
      </label>

      <input
        id="logo-upload"
        name="logo"
        type="file"
        accept="image/png,image/jpeg,image/svg+xml,image/webp"
        className="block w-full mt-3 text-sm text-foreground file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border file:border-border file:bg-surface-2 file:text-sm file:text-foreground hover:file:bg-surface-3 cursor-pointer"
        required
      />

      <div className="mt-4 flex items-center justify-between">
        <div>
          {state?.error && (
            <p className="text-xs text-danger inline-flex items-center gap-1">
              <AlertCircle className="h-3 w-3" /> {state.error}
            </p>
          )}
          {state?.ok && (
            <p className="text-xs text-success inline-flex items-center gap-1">
              <Check className="h-3 w-3" /> Logo mis à jour ✅
            </p>
          )}
        </div>
        <Button type="submit" disabled={pending}>
          <Upload className="h-4 w-4" /> {pending ? "Envoi..." : "Envoyer le logo"}
        </Button>
      </div>
    </form>
  )
}
