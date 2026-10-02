import { rs } from "../insights/prompt"
import type { PlannerContext } from "./context"
import { planSchema, type DailyPlan } from "./types"

/** A daily plan built only from computed stats. Always passes the guardrail. */
export function fallbackPlan(ctx: PlannerContext): DailyPlan {
  const m = ctx.metrics
  const s = m.signals
  const focus = ctx.focusStrategy
  const avoid = ctx.avoidStrategy
  const worstEmotion = [...m.emotions].reverse().find((e) => e.pnl < 0 && e.key !== "Unknown")
  const tilt = m.afterLossStreaks.find((a) => a.count >= 2 && a.winRate < m.winRate)
  const topSymbol = m.symbols?.[0]

  return planSchema.parse({
    greeting: ctx.today
      ? `Happy ${ctx.todayName}. Historically this day has given you ${rs(ctx.today.pnl)} across ${ctx.today.count} trades.`
      : `Happy ${ctx.todayName}. Let's keep today selective.`,
    focusStrategy: focus
      ? {
          name: focus.key,
          reason: `${focus.key} has made ${rs(focus.pnl)} over ${focus.count} trades with a ${focus.winRate}% win rate.`,
          winRate: `${focus.winRate}%`,
          avgPnl: Math.round(focus.pnl / Math.max(1, focus.count)),
        }
      : undefined,
    avoidStrategy: avoid
      ? { name: avoid.key, reason: `${avoid.key} is down ${rs(avoid.pnl)} over ${avoid.count} trades.` }
      : { name: "None", reason: "No strategy is losing money overall." },
    tradeLimit: {
      max: s?.recommendedMaxTrades ?? 3,
      reason: m.overtrading.highDays > 0
        ? `Days with 1-3 trades win ${m.overtrading.lowDayWR}% vs ${m.overtrading.highDayWR}% on 4+ trade days.`
        : `You average ${s?.avgTradesPerDay ?? 0} trades per trading day.`,
    },
    confidenceThreshold: {
      min: s?.recommendedMinConfidence ?? 3,
      reason: s
        ? `Confidence 4-5 trades win ${s.highConfWinRate}% vs ${m.winRate}% overall.`
        : "Take only setups you would rate highly.",
    },
    bestTimeWindows: ctx.goodWindows.slice(0, 2).map((w) => ({
      time: w.key,
      reason: `${w.count} trades, ${w.winRate}% win rate, ${rs(w.pnl)} total.`,
    })),
    emotionalAdvice: worstEmotion
      ? {
          watchFor: worstEmotion.key,
          tip: `Trades taken while ${worstEmotion.key.toLowerCase()} lost ${rs(worstEmotion.pnl)}; step away when you notice it.`,
        }
      : { watchFor: "Impatience", tip: "Tag your emotional state on every trade so patterns show up." },
    keyRules: [
      `Max ${s?.recommendedMaxTrades ?? 3} trades today.`,
      tilt
        ? `Stop after ${tilt.streak} consecutive losses (next-trade win rate drops to ${tilt.winRate}%).`
        : "Stop after 2 consecutive losses.",
      focus ? `Default to ${focus.key} setups.` : "Only take A+ setups.",
    ],
    streakAdvice:
      m.currentStreak > 0
        ? `You are on a ${m.currentStreak}-trade ${m.streakType} streak; keep size normal either way.`
        : "",
    marketFocus: topSymbol
      ? `${topSymbol.key} is your best symbol at ${rs(topSymbol.pnl)} over ${topSymbol.count} trades.`
      : "",
  })
}
