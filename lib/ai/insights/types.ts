import { z } from "zod"

export const ANALYSIS_WINDOW_DAYS = 365
export const TRADE_HARD_CAP = 500
export const MIN_TRADES_FOR_INSIGHTS = 3
export const RATE_LIMIT_MS = 15 * 60 * 1000
export const GROQ_MODEL = "llama-3.3-70b-versatile"
export const GROQ_TIMEOUT_MS = 45_000

export interface InsightTrade {
  id: string
  date: string
  type: string
  symbol: string
  strategy: string
  pnl: number
  pnlPercent: number
  entryTime: string | null
  exitTime: string | null
  entryConfidence: number
  satisfaction: number
  emotionalState: string | null
  quantity: number
  mistakes: string[]
  createdAt: string | null
}

export interface BucketStat {
  key: string
  pnl: number
  count: number
  wins: number
  winRate: number
}

export interface ConfidenceBucket {
  level: number
  count: number
  wins: number
  pnl: number
  winRate: number
}

export interface EquityPoint {
  date: string
  pnl: number
  cumulative: number
}

export interface WhatIfMetric {
  id: string
  label: string
  currentPnl: number
  projectedPnl: number
  difference: number
  tradeCount: number
}

export interface SkillScores {
  risk: number
  psychology: number
  consistency: number
  edge: number
  discipline: number
}

export interface InsightsMetrics {
  totalTrades: number
  totalPnl: number
  winRate: number
  winCount: number
  lossCount: number
  avgPnl: number
  biggestWin: number
  biggestLoss: number
  maxDrawdown: number
  sharpeRatio: number
  currentStreak: number
  streakType: "win" | "loss" | ""
  avgRecoveryTrades: number
  recoveryInstances: number
  equityCurve: EquityPoint[]
  strategies: BucketStat[]
  dayOfWeek: BucketStat[]
  emotions: BucketStat[]
  confidenceBuckets: ConfidenceBucket[]
  overtrading: {
    lowDays: number
    highDays: number
    lowDayWR: number
    highDayWR: number
    lowDayAvgPnl: number
    highDayAvgPnl: number
  }
  afterLossStreaks: { streak: number; count: number; winRate: number }[]
  whatIf: WhatIfMetric[]
  duration: {
    shortCount: number
    longCount: number
    shortWR: number
    longWR: number
    timedCount: number
  }
  emotionalTrend: {
    avgSatFirst: number
    avgSatSecond: number
    avgConfFirst: number
    avgConfSecond: number
  }
  mistakes: { mistake: string; count: number; totalPnl: number }[]
  skillScores: SkillScores
  thisMonth: { trades: number; pnl: number; days: number; dailyAvg: number }
  lastMonth: { trades: number; pnl: number }
  dataRange: {
    from: string
    to: string
    fromIso: string
    toIso: string
    totalDays: number
    totalTrades: number
  }
}

const riskLevel = z.enum(["low", "medium", "high"]).catch("medium")
const trendLevel = z.enum(["improving", "declining", "stable"]).catch("stable")
const traderLevel = z.enum(["beginner", "intermediate", "advanced", "expert"]).catch("beginner")

export const actionItemSchema = z.object({
  text: z.string(),
  priority: z.enum(["high", "quick-win", "long-term"]).optional(),
})

export const insightsPayloadSchema = z.object({
  overallSummary: z.string().default(""),
  strengths: z.array(z.string()).max(5).default([]),
  weaknesses: z.array(z.string()).max(5).default([]),
  patterns: z.object({
    bestSetup: z.string().default(""),
    worstSetup: z.string().default(""),
    bestDay: z.string().default(""),
    emotionalInsight: z.string().default(""),
    streakAnalysis: z.string().default(""),
  }).default({
    bestSetup: "",
    worstSetup: "",
    bestDay: "",
    emotionalInsight: "",
    streakAnalysis: "",
  }),
  confidenceCalibration: z.object({
    finding: z.string().default(""),
    optimalConfidence: z.string().default(""),
    overconfidenceBias: z.boolean().default(false),
  }).optional(),
  lossRecovery: z.object({
    finding: z.string().default(""),
    avgTradesToRecover: z.number().default(0),
    advice: z.string().default(""),
  }).optional(),
  overtradingAnalysis: z.object({
    finding: z.string().default(""),
    optimalTradesPerDay: z.string().default(""),
    isOvertrading: z.boolean().default(false),
  }).optional(),
  sequentialPatterns: z.object({
    finding: z.string().default(""),
    tiltRisk: riskLevel,
    advice: z.string().default(""),
  }).optional(),
  whatIfScenarios: z.array(z.object({
    scenario: z.string(),
    currentPnl: z.number(),
    projectedPnl: z.number(),
    difference: z.number(),
    advice: z.string().default(""),
    assumptions: z.string().optional(),
  })).max(3).default([]),
  tradeDuration: z.object({
    finding: z.string().default(""),
    optimalDuration: z.string().default(""),
    advice: z.string().default(""),
  }).optional(),
  personalizedRules: z.array(z.string()).max(5).default([]),
  performanceForecast: z.object({
    projection: z.string().default(""),
    monthEndTarget: z.number().default(0),
    confidence: riskLevel,
  }).optional(),
  emotionalTrend: z.object({
    finding: z.string().default(""),
    trend: trendLevel,
    burnoutRisk: riskLevel,
    advice: z.string().default(""),
  }).optional(),
  riskScore: z.object({
    overall: z.number().default(50),
    maxDrawdown: z.number().default(0),
    sharpeRatio: z.number().default(0),
    assessment: z.string().default(""),
    advice: z.string().default(""),
  }).optional(),
  actionItems: z.array(z.union([z.string(), actionItemSchema])).max(5).default([]),
  traderLevel: traderLevel,
  confidenceScore: z.number().min(0).max(100).default(50),
})

export type InsightsPayload = z.infer<typeof insightsPayloadSchema>
export type ActionItem = z.infer<typeof actionItemSchema>

export interface AiInsightsApiResponse {
  ready: boolean
  stale?: boolean
  generatedAt?: string
  summary?: string
  rateLimited?: boolean
  retryAfterMs?: number
  metrics?: InsightsMetrics
  insights?: InsightsPayload
  dataRange?: InsightsMetrics["dataRange"]
  parseError?: boolean
}
