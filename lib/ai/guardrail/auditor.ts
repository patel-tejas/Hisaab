import { extractClaims, normalizeText, splitSentences } from "./claims"
import { FactSheet, formatClaimValue } from "./facts"
import type {
  FieldMode,
  GuardrailIssue,
  GuardrailReport,
  GuardrailStatus,
  IssueSeverity,
} from "./types"

/**
 * A group of named things (weekdays, strategies…) where the data has a
 * definite best and worst. Used to catch "Friday is your best day" when the
 * data says Monday.
 */
export interface EntityGroup {
  /** Nouns that tie a superlative to this group, e.g. ["day", "weekday"]. */
  nouns: string[]
  entities: string[]
  best: string | null
  worst: string | null
}

const BEST_WORDS = ["best", "strongest", "most profitable", "top", "highest-earning", "highest earning", "most reliable"]
const WORST_WORDS = ["worst", "weakest", "least profitable", "costliest", "most costly", "biggest drag", "lowest-earning", "lowest earning"]

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

function mentions(text: string, name: string): boolean {
  if (!name) return false
  return new RegExp(`(?<![A-Za-z0-9])${escapeRe(name)}(?![A-Za-z0-9])`, "i").test(text)
}

function superlativeRe(words: string[], nouns: string[]): RegExp {
  const w = words.map(escapeRe).join("|")
  const n = nouns.map(escapeRe).join("|")
  // "best day", "best trading day", "most profitable setup of the week"
  return new RegExp(`\\b(?:${w})\\s+(?:[\\w-]+\\s+){0,2}?(?:${n})s?\\b`, "i")
}

/**
 * Collects every check made on one AI response, repairs what it can, and
 * produces the GuardrailReport. One auditor per response.
 */
export class Auditor {
  readonly issues: GuardrailIssue[] = []
  claimsChecked = 0
  claimsVerified = 0
  fieldsChecked = 0
  fieldsCorrected = 0

  constructor(
    readonly facts: FactSheet,
    readonly groups: EntityGroup[] = []
  ) {}

  private issue(i: GuardrailIssue) {
    this.issues.push(i)
  }

  /** Errors that a repair round should fix: wrong numbers, wrong entities, wrong verdicts. */
  errorCount(): number {
    return this.issues.filter((i) => i.severity === "error").length
  }

  /**
   * Check one sentence. Returns the problems found without recording them,
   * so callers can decide whether the sentence survives.
   */
  private inspectSentence(sentence: string): { problems: Omit<GuardrailIssue, "path" | "action">[]; claims: number; verified: number } {
    const problems: Omit<GuardrailIssue, "path" | "action">[] = []
    const claims = extractClaims(sentence)
    let verified = 0

    for (const claim of claims) {
      const m = this.facts.match(claim)
      if (m.ok) {
        verified++
      } else {
        problems.push({
          kind: "unverified_number",
          severity: "error",
          message: `"${claim.raw}" does not match any value computed from your trades.`,
          claim: claim.raw,
          expected:
            m.nearest !== undefined && m.label
              ? `closest is ${m.label} = ${formatClaimValue(claim.kind, m.nearest)}`
              : undefined,
        })
      }
    }

    const clauses = normalizeText(sentence).split(/[,;:]|\b(?:but|while|whereas|although|however|unlike)\b/i)
    for (const group of this.groups) {
      if (group.entities.length < 2) continue
      for (const clause of clauses) {
        const named = group.entities.filter((e) => mentions(clause, e))
        if (named.length !== 1) continue
        const [name] = named
        if (group.best && superlativeRe(BEST_WORDS, group.nouns).test(clause) && name.toLowerCase() !== group.best.toLowerCase()) {
          problems.push({
            kind: "wrong_entity",
            severity: "error",
            message: `Calls ${name} the best ${group.nouns[0]}, but the data says ${group.best}.`,
            claim: name,
            expected: group.best,
          })
        }
        if (group.worst && superlativeRe(WORST_WORDS, group.nouns).test(clause) && name.toLowerCase() !== group.worst.toLowerCase()) {
          problems.push({
            kind: "wrong_entity",
            severity: "error",
            message: `Calls ${name} the worst ${group.nouns[0]}, but the data says ${group.worst}.`,
            claim: name,
            expected: group.worst,
          })
        }
      }
    }

    return { problems, claims: claims.length, verified }
  }

  /**
   * Verify a free-text field sentence by sentence.
   * strict: sentences with a wrong number or entity are dropped; if nothing
   *         survives, `fallback` (deterministic text) is used instead.
   * lenient: everything is kept; unverified numbers are noted as info.
   */
  text(path: string, value: string | undefined | null, mode: FieldMode, fallback?: string): string {
    const text = (value ?? "").trim()
    if (!text) return fallback ?? ""

    const kept: string[] = []
    let removed = 0
    for (const sentence of splitSentences(text)) {
      const { problems, claims, verified } = this.inspectSentence(sentence)
      this.claimsChecked += claims
      this.claimsVerified += verified

      if (problems.length === 0) {
        kept.push(sentence)
        continue
      }
      if (mode === "lenient") {
        for (const p of problems) {
          // A new number in advice is a target, not a claim; a wrong "best X" is still wrong.
          const severity: IssueSeverity = p.kind === "unverified_number" ? "info" : "warning"
          this.issue({ ...p, path, severity, action: "kept" })
        }
        kept.push(sentence)
        continue
      }
      removed++
      for (const p of problems) this.issue({ ...p, path, action: "removed" })
    }

    if (kept.length === 0) {
      if (fallback !== undefined && removed > 0) {
        this.issue({
          path,
          kind: "unverified_number",
          severity: "warning",
          message: "Replaced with a statement computed directly from your trades.",
          action: "replaced",
        })
      }
      return fallback ?? ""
    }
    return kept.join(" ")
  }

  /** Verify each item of a list; strict lists drop failing items and top up from `fallback`. */
  list(path: string, items: string[] | undefined, mode: FieldMode, fallback: string[] = [], max = 5): string[] {
    const out: string[] = []
    ;(items ?? []).forEach((item, i) => {
      const checked = this.text(`${path}[${i}]`, item, mode)
      if (checked) out.push(checked)
    })
    if (out.length === 0) return fallback.slice(0, max)
    return out.slice(0, max)
  }

  /**
   * A field that must name a specific entity (e.g. patterns.bestDay must name
   * the best weekday). Wrong or missing entity → replaced with `fallback`.
   */
  mustMention(path: string, value: string | undefined, expected: string | null, fallback: string): string {
    const text = (value ?? "").trim()
    if (!expected) return this.text(path, text, "strict", fallback)
    this.fieldsChecked++
    if (!mentions(text, expected)) {
      this.fieldsCorrected++
      this.issue({
        path,
        kind: "wrong_entity",
        severity: "error",
        message: `Should be about ${expected}, which is what the data shows.`,
        claim: text.slice(0, 120) || undefined,
        expected,
        action: "replaced",
      })
      return fallback
    }
    return this.text(path, text, "strict", fallback)
  }

  /**
   * A structured value that code can compute exactly. The computed value
   * always wins; a mismatch is recorded so the report shows the model was off.
   */
  field<T extends string | number | boolean>(
    path: string,
    actual: T | undefined | null,
    expected: T,
    opts: { tolerance?: number; label?: string; severity?: IssueSeverity } = {}
  ): T {
    this.fieldsChecked++
    const same =
      typeof expected === "number" && typeof actual === "number"
        ? Math.abs(actual - expected) <= (opts.tolerance ?? 0)
        : typeof expected === "string" && typeof actual === "string"
          ? actual.trim().toLowerCase() === expected.toLowerCase()
          : actual === expected
    if (!same) {
      this.fieldsCorrected++
      this.issue({
        path,
        kind: "inconsistent_field",
        severity: opts.severity ?? "error",
        message: `${opts.label ?? path} was ${actual === undefined || actual === null ? "missing" : `"${actual}"`}; the data gives "${expected}".`,
        claim: actual === undefined || actual === null ? undefined : String(actual),
        expected: String(expected),
        action: "corrected",
      })
    }
    return expected
  }

  /** Record an issue found by caller-specific logic. */
  note(issue: GuardrailIssue) {
    if (issue.action === "corrected" || issue.action === "replaced" || issue.action === "removed") {
      this.fieldsCorrected++
    }
    this.fieldsChecked++
    this.issue(issue)
  }

  report(args: { attempts: number; usedFallback: boolean }): GuardrailReport {
    const total = this.claimsChecked + this.fieldsChecked
    const correct = this.claimsVerified + (this.fieldsChecked - this.fieldsCorrected)
    const accuracy = total > 0 ? Math.round((correct / total) * 1000) / 1000 : 1
    const changed = this.issues.some((i) => i.action !== "kept")
    const status: GuardrailStatus = args.usedFallback ? "fallback" : changed ? "corrected" : "verified"
    return {
      version: 1,
      checkedAt: new Date().toISOString(),
      status,
      claimsChecked: this.claimsChecked,
      claimsVerified: this.claimsVerified,
      fieldsChecked: this.fieldsChecked,
      fieldsCorrected: this.fieldsCorrected,
      accuracy,
      attempts: args.attempts,
      usedFallback: args.usedFallback,
      issues: this.issues.slice(0, 40),
    }
  }
}

/** Turn the errors from a first pass into feedback the model can act on. */
export function feedbackFromIssues(issues: GuardrailIssue[], max = 12): string {
  return issues
    .filter((i) => i.severity === "error")
    .slice(0, max)
    .map((i) => `- ${i.path}: ${i.message}${i.expected ? ` (${i.expected})` : ""}`)
    .join("\n")
}
