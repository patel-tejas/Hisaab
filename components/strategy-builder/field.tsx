"use client";

/**
 * Small form primitives for the builder, sized on Hisaab's px spacing
 * tokens (`h-32` = 32px; `h-8` is 8px here, see globals.css, which is also
 * why nothing here uses the `sm` size of Button or SelectTrigger).
 */

import type React from "react";

import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function Field({
  label,
  hint,
  defaulted,
  error,
  className,
  children,
}: {
  label: string;
  hint?: string;
  /** Eve picked this value without the user saying so. */
  defaulted?: boolean;
  error?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={cn("flex min-w-0 flex-col gap-1.5", className)}>
      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {label}
        {defaulted && (
          <span
            title="Eve chose this value; check it"
            className="rounded bg-[var(--warning)]/15 px-1 text-[10px] font-medium text-[var(--warning)]"
          >
            default
          </span>
        )}
      </span>
      {children}
      {error ? (
        <span className="text-[11px] text-[var(--destructive)]">{error}</span>
      ) : hint ? (
        <span className="text-[11px] text-muted-foreground">{hint}</span>
      ) : null}
    </label>
  );
}

export function Choice<T extends string>({
  value,
  options,
  onChange,
  labels,
  invalid,
  className,
  ariaLabel,
}: {
  value: T;
  options: readonly T[];
  onChange: (v: T) => void;
  labels?: Partial<Record<T, string>>;
  invalid?: boolean;
  className?: string;
  ariaLabel?: string;
}) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as T)}>
      <SelectTrigger
        aria-label={ariaLabel}
        aria-invalid={invalid || undefined}
        // The trigger sets its height with data-[size=…]; override in the
        // same form so a passed height (e.g. data-[size=default]:h-7) wins.
        className={cn("w-full min-w-0 text-xs data-[size=default]:h-32", className)}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o} value={o} className="text-xs">
            {labels?.[o] ?? o}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function NumberInput({
  value,
  onChange,
  min,
  max,
  step,
  invalid,
  className,
  ariaLabel,
  allowEmpty,
}: {
  value: number | null;
  onChange: (v: number | null) => void;
  min?: number;
  max?: number;
  step?: number;
  invalid?: boolean;
  className?: string;
  ariaLabel?: string;
  allowEmpty?: boolean;
}) {
  return (
    <input
      type="number"
      inputMode="decimal"
      aria-label={ariaLabel}
      aria-invalid={invalid || undefined}
      value={value ?? ""}
      min={min}
      max={max}
      step={step ?? "any"}
      onChange={(e) => {
        const raw = e.target.value;
        if (raw === "") {
          if (allowEmpty) onChange(null);
          return;
        }
        const n = Number(raw);
        if (Number.isFinite(n)) onChange(n);
      }}
      className={cn(
        "h-32 w-full min-w-0 rounded-md border border-input bg-transparent px-2.5 font-mono text-xs tabular-nums outline-none dark:bg-input/30",
        "focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50",
        "aria-invalid:border-[var(--destructive)]",
        className,
      )}
    />
  );
}

export function TimeInput({
  value,
  onChange,
  invalid,
  ariaLabel,
}: {
  value: string;
  onChange: (v: string) => void;
  invalid?: boolean;
  ariaLabel?: string;
}) {
  return (
    <input
      type="time"
      aria-label={ariaLabel}
      aria-invalid={invalid || undefined}
      value={value}
      min="09:15"
      max="15:30"
      onChange={(e) => e.target.value && onChange(e.target.value)}
      className={cn(
        "h-32 w-full min-w-0 rounded-md border border-input bg-transparent px-2.5 font-mono text-xs outline-none dark:bg-input/30",
        "focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50",
        "aria-invalid:border-[var(--destructive)]",
      )}
    />
  );
}

export function Section({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-12 border-b border-border/60 py-20 first:pt-0 last:border-b-0 last:pb-0">
      <div className="flex items-start justify-between gap-12">
        <div>
          <h3 className="text-sm font-medium">{title}</h3>
          {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
