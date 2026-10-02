/**
 * Shared types for the AI output guardrail.
 *
 * The guardrail never trusts the model: every number and verdict in an AI
 * response is re-checked against values computed in code from the user's
 * trades. Anything that cannot be traced back to the data is corrected,
 * removed, or replaced with a deterministic fallback, and the outcome is
 * recorded in a GuardrailReport that ships with the response.
 */

export type ClaimKind = "money" | "percent" | "count" | "decimal"

export interface NumericClaim {
  kind: ClaimKind
  /** Parsed value, always non-negative (sign is carried separately). */
  value: number
  negative: boolean
  /** Absolute tolerance implied by how precisely the number was written. */
  precision: number
  /** Raw substring the claim was parsed from. */
  raw: string
  /** Character offset of `raw` in the source text. */
  index: number
}

export type IssueKind =
  | "unverified_number"
  | "wrong_entity"
  | "inconsistent_field"
  | "out_of_range"
  | "unknown_reference"

export type IssueSeverity = "error" | "warning" | "info"

export type IssueAction = "corrected" | "removed" | "replaced" | "kept"

export interface GuardrailIssue {
  /** JSON-path-ish location in the AI payload, e.g. `patterns.bestDay`. */
  path: string
  kind: IssueKind
  severity: IssueSeverity
  message: string
  /** What the model said. */
  claim?: string
  /** What the data says. */
  expected?: string
  action: IssueAction
}

export type GuardrailStatus = "verified" | "corrected" | "fallback"

export interface GuardrailReport {
  version: 1
  checkedAt: string
  status: GuardrailStatus
  /** Numeric claims found in free text. */
  claimsChecked: number
  /** Numeric claims that matched a computed value. */
  claimsVerified: number
  /** Structured fields (verdicts, numbers) compared against computed values. */
  fieldsChecked: number
  fieldsCorrected: number
  /** Share of everything checked that was right before repair, 0..1. */
  accuracy: number
  /** Number of model calls made (1 = first answer, 2 = a repair round ran). */
  attempts: number
  usedFallback: boolean
  issues: GuardrailIssue[]
}

/**
 * How strictly a free-text field is held to the data.
 * - strict: descriptive claims ("your Monday WR is 62%"). Unverified numbers
 *   get the sentence removed, and an empty field falls back to deterministic text.
 * - lenient: prescriptive advice ("cap losses at Rs2,000/day"). Targets are
 *   allowed to be new numbers, so unverified values are only noted.
 */
export type FieldMode = "strict" | "lenient"
