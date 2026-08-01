export type HeroPeriod = "morning" | "evening" | "night"

export const HERO_PERIODS: readonly HeroPeriod[] = ["morning", "evening", "night"]

export const HERO_BACKGROUNDS: Record<HeroPeriod, string> = {
  morning: "/herobg-morning.png",
  evening: "/herobg-evening.png",
  night: "/herobg-night.png",
}

export const HERO_PERIOD_LABELS: Record<HeroPeriod, string> = {
  morning: "Morning",
  evening: "Evening",
  night: "Night",
}

/** Local-time hero art: morning default, evening 5–8pm, night after 8pm (until 5am). */
export function getHeroPeriod(date: Date = new Date()): HeroPeriod {
  const hour = date.getHours()
  if (hour >= 17 && hour < 20) return "evening"
  if (hour >= 20 || hour < 5) return "night"
  return "morning"
}

export function nextHeroPeriod(current: HeroPeriod): HeroPeriod {
  const i = HERO_PERIODS.indexOf(current)
  return HERO_PERIODS[(i + 1) % HERO_PERIODS.length]
}
