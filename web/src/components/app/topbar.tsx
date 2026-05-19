"use client"
import Link from "next/link"
import { useState } from "react"
import { Menu, X, FilePlus2 } from "lucide-react"
import { DepMark } from "@/components/brand/dep-logo"
import { Button } from "@/components/ui/button"

export function MobileTopbar() {
  const [open, setOpen] = useState(false)
  return (
    <div className="lg:hidden sticky top-0 z-40 flex items-center justify-between gap-3 border-b border-border bg-background/85 backdrop-blur px-4 py-3">
      <div className="flex items-center gap-2">
        <button
          aria-label="Menu"
          onClick={() => setOpen((v) => !v)}
          className="grid h-9 w-9 place-items-center rounded-md border border-border bg-surface-2"
        >
          {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </button>
        <DepMark size={26} />
      </div>
      <Button asChild size="sm" variant="primary">
        <Link href="/app/devis/nouveau">
          <FilePlus2 className="h-4 w-4" /> Devis
        </Link>
      </Button>
    </div>
  )
}
