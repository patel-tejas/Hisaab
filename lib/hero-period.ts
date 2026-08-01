export type HeroPeriod = "morning" | "afternoon" | "evening" | "night"

export const HERO_PERIODS: readonly HeroPeriod[] = [
  "morning",
  "afternoon",
  "evening",
  "night",
]

export const HERO_BACKGROUNDS: Record<HeroPeriod, string> = {
  morning: "/herobg-morning.png",
  afternoon: "/herobg-afternoon.png",
  evening: "/herobg-evening.png",
  night: "/herobg-night.png",
}

export const HERO_PERIOD_LABELS: Record<HeroPeriod, string> = {
  morning: "Morning",
  afternoon: "Afternoon",
  evening: "Evening",
  night: "Night",
}

/**
 * Local-time hero art:
 * morning 5–12, afternoon 12–17, evening 17–20, night 20–5.
 */
export function getHeroPeriod(date: Date = new Date()): HeroPeriod {
  const hour = date.getHours()
  if (hour >= 5 && hour < 12) return "morning"
  if (hour >= 12 && hour < 17) return "afternoon"
  if (hour >= 17 && hour < 20) return "evening"
  return "night"
}

export function nextHeroPeriod(current: HeroPeriod): HeroPeriod {
  const i = HERO_PERIODS.indexOf(current)
  return HERO_PERIODS[(i + 1) % HERO_PERIODS.length]
}
