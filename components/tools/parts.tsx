import type React from "react"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

/** Label above, input, optional hint below. Value stays a string so half-typed numbers aren't mangled. */
export function NumberField({
  id,
  label,
  value,
  onChange,
  prefix,
  suffix,
  hint,
  placeholder,
}: {
  id: string
  label: string
  value: string
  onChange: (v: string) => void
  prefix?: string
  suffix?: string
  hint?: string
  placeholder?: string
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        {prefix && (
          <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-muted-foreground">
            {prefix}
          </span>
        )}
        <Input
          id={id}
          inputMode="decimal"
          autoComplete="off"
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          className={cn("numeric", prefix && "pl-8", suffix && "pr-10")}
        />
        {suffix && (
          <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-muted-foreground">
            {suffix}
          </span>
        )}
      </div>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
}

export function ResultRow({
  label,
  value,
  tone,
  big,
}: {
  label: string
  value: React.ReactNode
  tone?: "good" | "bad"
  big?: boolean
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-border/40 py-2.5 last:border-b-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span
        className={cn(
          "numeric text-right font-medium",
          big ? "text-2xl" : "text-base",
          tone === "good" && "text-[var(--success)]",
          tone === "bad" && "text-[var(--destructive)]"
        )}
      >
        {value}
      </span>
    </div>
  )
}

/** Shown before any input, and for a validation message. */
export function ResultNote({ children, tone }: { children: React.ReactNode; tone?: "warn" | "error" }) {
  return (
    <p
      className={cn(
        "rounded-xl border px-3 py-2.5 text-sm",
        tone === "error"
          ? "border-[var(--destructive)]/30 bg-[var(--destructive)]/5 text-[var(--destructive)]"
          : tone === "warn"
            ? "border-[var(--warning)]/30 bg-[var(--warning)]/5 text-[var(--warning)]"
            : "border-border/60 bg-muted/30 text-muted-foreground"
      )}
    >
      {children}
    </p>
  )
}
