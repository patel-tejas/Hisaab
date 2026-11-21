import { inr } from "./format"

/**
 * Pure maths behind the Tools page. No React, no I/O.
 * Each function validates its inputs and returns `{ ok: false, error }` rather
 * than throwing or returning NaN, so the UI can show a plain message.
 */

export type Fail = { ok: false; error: string }
export type Direction = "long" | "short"

const positive = (n: number | undefined): n is number => n !== undefined && Number.isFinite(n) && n > 0

// ── Position size ────────────────────────────────────────────────────────────

export interface PositionSizeInput {
  capital?: number
  riskPercent?: number
  entry?: number
  stop?: number
  target?: number
  /** Contract lot size. When set, quantity is rounded down to whole lots. */
  lotSize?: number
}

export interface PositionSize {
  ok: true
  direction: Direction
  riskAmount: number
  riskPerUnit: number
  quantity: number
  lots: number | null
  /** quantity x entry. For futures this is notional value, not the margin needed. */
  positionValue: number
  positionPercentOfCapital: number
  /** What you actually lose if the stop is hit at this quantity (<= riskAmount after rounding). */
  maxLoss: number
  reward: { perUnit: number; amount: number; ratio: number } | null
  warnings: string[]
}

export function positionSize(i: PositionSizeInput): PositionSize | Fail {
  if (!positive(i.capital)) return { ok: false, error: "Enter your account capital." }
  if (!positive(i.riskPercent) || i.riskPercent > 100) return { ok: false, error: "Risk per trade must be between 0 and 100%." }
  if (!positive(i.entry)) return { ok: false, error: "Enter the entry price." }
  if (!positive(i.stop)) return { ok: false, error: "Enter the stop-loss price." }
  if (i.entry === i.stop) return { ok: false, error: "Stop loss can't equal the entry price." }
  if (i.lotSize !== undefined && !positive(i.lotSize)) return { ok: false, error: "Lot size must be a positive number." }

  const direction: Direction = i.stop < i.entry ? "long" : "short"
  const riskAmount = (i.capital * i.riskPercent) / 100
  const riskPerUnit = Math.abs(i.entry - i.stop)
  const rawQty = riskAmount / riskPerUnit

  let quantity: number
  let lots: number | null = null
  if (i.lotSize) {
    lots = Math.floor(rawQty / i.lotSize)
    quantity = lots * i.lotSize
  } else {
    quantity = Math.floor(rawQty)
  }

  const warnings: string[] = []
  if (quantity === 0) {
    const needed = i.lotSize ? i.lotSize * riskPerUnit : riskPerUnit
    warnings.push(
      i.lotSize
        ? `Your risk budget is smaller than the loss on one lot at this stop (one lot risks about ${inr(needed)}). Widen the budget or tighten the stop.`
        : "Your risk budget is smaller than the loss on a single unit at this stop."
    )
  }

  const positionValue = quantity * i.entry
  const positionPercentOfCapital = (positionValue / i.capital) * 100
  if (positionPercentOfCapital > 100) {
    warnings.push("Position value is larger than your capital. That needs margin or leverage.")
  }

  let reward: PositionSize["reward"] = null
  if (positive(i.target)) {
    const perUnit = direction === "long" ? i.target - i.entry : i.entry - i.target
    if (perUnit > 0) {
      reward = { perUnit, amount: perUnit * quantity, ratio: perUnit / riskPerUnit }
    } else {
      warnings.push(`Target is on the wrong side of entry for a ${direction}.`)
    }
  }

  return {
    ok: true,
    direction,
    riskAmount,
    riskPerUnit,
    quantity,
    lots,
    positionValue,
    positionPercentOfCapital,
    maxLoss: quantity * riskPerUnit,
    reward,
    warnings,
  }
}

// ── Risk : reward ────────────────────────────────────────────────────────────

export interface RiskRewardInput {
  entry?: number
  stop?: number
  target?: number
  quantity?: number
}

export interface RiskReward {
  ok: true
  direction: Direction
  riskPerUnit: number
  rewardPerUnit: number
  /** Reward divided by risk: 2 means "1 : 2". */
  ratio: number
  /** Win rate at which this setup breaks even before costs: risk / (risk + reward). */
  breakevenWinRate: number
  amounts: { risk: number; reward: number } | null
}

export function riskReward(i: RiskRewardInput): RiskReward | Fail {
  if (!positive(i.entry)) return { ok: false, error: "Enter the entry price." }
  if (!positive(i.stop)) return { ok: false, error: "Enter the stop-loss price." }
  if (!positive(i.target)) return { ok: false, error: "Enter the target price." }
  if (i.entry === i.stop) return { ok: false, error: "Stop loss can't equal the entry price." }

  const direction: Direction = i.stop < i.entry ? "long" : "short"
  const riskPerUnit = Math.abs(i.entry - i.stop)
  const rewardPerUnit = direction === "long" ? i.target - i.entry : i.entry - i.target
  if (rewardPerUnit <= 0) {
    return { ok: false, error: `For a ${direction}, the target must be ${direction === "long" ? "above" : "below"} entry.` }
  }

  return {
    ok: true,
    direction,
    riskPerUnit,
    rewardPerUnit,
    ratio: rewardPerUnit / riskPerUnit,
    breakevenWinRate: (riskPerUnit / (riskPerUnit + rewardPerUnit)) * 100,
    amounts: positive(i.quantity)
      ? { risk: riskPerUnit * i.quantity, reward: rewardPerUnit * i.quantity }
      : null,
  }
}

// ── Compounding ──────────────────────────────────────────────────────────────

export const MAX_COMPOUNDING_PERIODS = 600

export interface CompoundingInput {
  principal?: number
  /** Return per period, in percent. May be negative, but not -100 or lower. */
  ratePercent?: number
  periods?: number
  /** Added at the end of every period (after growth). */
  contribution?: number
}

export interface CompoundingRow {
  period: number
  balance: number
  contributed: number
}

export interface Compounding {
  ok: true
  finalValue: number
  contributed: number
  gain: number
  rows: CompoundingRow[]
}

export function compounding(i: CompoundingInput): Compounding | Fail {
  if (!positive(i.principal)) return { ok: false, error: "Enter the starting capital." }
  if (i.ratePercent === undefined || !Number.isFinite(i.ratePercent) || i.ratePercent <= -100) {
    return { ok: false, error: "Enter a return per period above -100%." }
  }
  if (i.periods === undefined || !Number.isInteger(i.periods) || i.periods < 1 || i.periods > MAX_COMPOUNDING_PERIODS) {
    return { ok: false, error: `Periods must be a whole number from 1 to ${MAX_COMPOUNDING_PERIODS}.` }
  }
  const contribution = i.contribution ?? 0
  if (!Number.isFinite(contribution) || contribution < 0) return { ok: false, error: "Contribution can't be negative." }

  const g = 1 + i.ratePercent / 100
  let balance = i.principal
  let contributed = i.principal
  const rows: CompoundingRow[] = []
  for (let p = 1; p <= i.periods; p++) {
    balance = balance * g + contribution
    contributed += contribution
    rows.push({ period: p, balance, contributed })
  }
  return { ok: true, finalValue: balance, contributed, gain: balance - contributed, rows }
}

/** The gain needed to get back to even after losing `lossPercent` of capital. 50% loss needs a 100% gain. */
export function recoveryGainPercent(lossPercent: number): number | null {
  if (!Number.isFinite(lossPercent) || lossPercent <= 0 || lossPercent >= 100) return null
  return (lossPercent / (100 - lossPercent)) * 100
}

// ── F&O lots ─────────────────────────────────────────────────────────────────

/**
 * NSE index derivatives lot sizes.
 * Source: NSE circular NSE/FAOP/70616 (3 Oct 2025), effective 28 Oct 2025.
 * Lot sizes are revised periodically, so the UI tells people to confirm with
 * their broker. Sensex is deliberately absent: a revision was reported for
 * January 2027 but not confirmed from a primary source.
 */
export const INDEX_LOTS = [
  { symbol: "NIFTY", name: "Nifty 50", lotSize: 65 },
  { symbol: "BANKNIFTY", name: "Nifty Bank", lotSize: 30 },
  { symbol: "FINNIFTY", name: "Nifty Financial Services", lotSize: 60 },
  { symbol: "MIDCPNIFTY", name: "Nifty Midcap Select", lotSize: 120 },
  { symbol: "NIFTYNXT50", name: "Nifty Next 50", lotSize: 25 },
] as const

export const INDEX_LOTS_SOURCE = {
  circular: "NSE/FAOP/70616",
  effective: "28 Oct 2025",
} as const

export interface LotInput {
  lotSize?: number
  lots?: number
  /** Price per unit: option premium or futures price. */
  price?: number
  stopPoints?: number
  targetPoints?: number
}

export interface LotResult {
  ok: true
  quantity: number
  /** quantity x price. For an option buyer this is the premium paid; for futures it is notional, not margin. */
  value: number
  /** Rupees gained or lost for every 1-point move in the price. Equals quantity. */
  rupeesPerPoint: number
  atStop: number | null
  atTarget: number | null
}

export function lotCalc(i: LotInput): LotResult | Fail {
  if (!positive(i.lotSize)) return { ok: false, error: "Pick an index or enter a lot size." }
  if (!positive(i.lots) || !Number.isInteger(i.lots)) return { ok: false, error: "Lots must be a whole number above zero." }
  if (!positive(i.price)) return { ok: false, error: "Enter the price per unit." }

  const quantity = i.lotSize * i.lots
  return {
    ok: true,
    quantity,
    value: quantity * i.price,
    rupeesPerPoint: quantity,
    atStop: positive(i.stopPoints) ? quantity * i.stopPoints : null,
    atTarget: positive(i.targetPoints) ? quantity * i.targetPoints : null,
  }
}
