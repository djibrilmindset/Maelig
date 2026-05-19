import type { ReactNode } from "react"

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <div className="glass rounded-[var(--radius-lg)] border border-dashed border-border p-10 text-center">
      {icon ? (
        <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-full border border-border bg-surface-2">
          {icon}
        </div>
      ) : null}
      <h3 className="font-display text-xl font-semibold tracking-tight">{title}</h3>
      {description ? <p className="mt-2 text-sm text-muted max-w-md mx-auto">{description}</p> : null}
      {action ? <div className="mt-6 flex justify-center">{action}</div> : null}
    </div>
  )
}
