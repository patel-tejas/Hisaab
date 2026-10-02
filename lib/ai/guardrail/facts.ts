import type { ClaimKind, NumericClaim } from "./types"

interface Fact {
  value: number
  label: string
}

export interface FactMatch {
  ok: boolean
  /** Label of the fact the claim matched, or of the closest fact when it did not. */
  label?: string
  nearest?: number
}

/**
 * The set of numbers an AI answer is allowed to cite, each with a label.
 * Built in code from the computed metrics, so a claim that matches nothing
 * here was invented (or miscalculated) by the model.
 */
export class FactSheet {
  private facts: Record<ClaimKind, Fact[]> = { money: [], percent: [], count: [], decimal: [] }

  /** Counts up to this value are accepted without a matching fact (bucket bounds, thresholds). */
  smallCountFloor = 4

  add(kind: ClaimKind, value: number | null | undefined, label: string): this {
    if (value === null || value === undefined || !Number.isFinite(value)) return this
    this.facts[kind].push({ value: Math.abs(value), label })
    return this
  }

  money(value: number | null | undefined, label: string) {
    return this.add("money", value, label)
  }
  percent(value: number | null | undefined, label: string) {
    return this.add("percent", value, label)
  }
  count(value: number | null | undefined, label: string) {
    return this.add("count", value, label)
  }
  decimal(value: number | null | undefined, label: string) {
    return this.add("decimal", value, label)
  }

  size(): number {
    return Object.values(this.facts).reduce((s, f) => s + f.length, 0)
  }

  private tolerance(kind: ClaimKind, claim: NumericClaim, fact: number): number {
    switch (kind) {
      case "money":
        // Written precision (Rs1.2k → ±50), 1% rounding drift, and at least Rs2.
        return Math.max(claim.precision, Math.abs(fact) * 0.01, 2)
      case "percent":
        // Win rates are rounded to whole percents before the model sees them.
        return Math.max(claim.precision, 1)
      case "count":
        return 0
      case "decimal":
        return Math.max(claim.precision, Math.abs(fact) * 0.02, 0.01)
    }
  }

  match(claim: NumericClaim): FactMatch {
    if (claim.kind === "count" && claim.value <= this.smallCountFloor) return { ok: true, label: "small count" }
    if (claim.value === 0) return { ok: true, label: "zero" }

    const pool = claim.kind === "decimal" ? [...this.facts.decimal, ...this.facts.percent] : this.facts[claim.kind]

    let nearest: Fact | undefined
    let nearestDiff = Infinity
    for (const fact of pool) {
      const diff = Math.abs(fact.value - claim.value)
      if (diff <= this.tolerance(claim.kind, claim, fact.value)) {
        return { ok: true, label: fact.label }
      }
      if (diff < nearestDiff) {
        nearestDiff = diff
        nearest = fact
      }
    }
    return { ok: false, label: nearest?.label, nearest: nearest?.value }
  }
}

export function formatClaimValue(kind: ClaimKind, value: number): string {
  switch (kind) {
    case "money":
      return `Rs${Math.round(value).toLocaleString("en-IN")}`
    case "percent":
      return `${value}%`
    default:
      return String(value)
  }
}
