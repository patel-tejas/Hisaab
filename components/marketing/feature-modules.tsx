"use client"

import { useEffect, useRef, useState } from "react"
import {
  AnimatePresence,
  motion,
  useInView,
  useReducedMotion,
} from "motion/react"
import {
  BarChart3,
  Brain,
  CalendarDays,
  Check,
  GitCompare,
  Link2,
  Sparkles,
  type LucideIcon,
} from "lucide-react"
import { cn } from "@/lib/utils"

/*
 * "Ledger index": the six modules read like the index page of a journal.
 * One row is open at a time and its specimen (a small, real rendering of
 * that module's view, fed with sample data) sits beside it on desktop and
 * opens inline on mobile.
 */

type ModuleKey =
  | "analytics"
  | "psychology"
  | "calendar"
  | "strategies"
  | "forecast"
  | "broker"

type FeatureModule = {
  key: ModuleKey
  title: string
  description: string
  icon: LucideIcon
  label: string
  hint: string
}

const MODULES: FeatureModule[] = [
  {
    key: "analytics",
    title: "Analytics",
    description:
      "Equity curves, win rates, expectancy, and symbol breakdowns. Clarity without noise.",
    icon: BarChart3,
    label: "Equity curve",
    hint: "P&L over time",
  },
  {
    key: "psychology",
    title: "Psychology",
    description:
      "Log emotion, confidence, and mistakes. See which mental states actually pay.",
    icon: Brain,
    label: "Mood map",
    hint: "Emotion vs outcome",
  },
  {
    key: "calendar",
    title: "Calendar",
    description:
      "A heatmap of every session so your best and worst days are impossible to miss.",
    icon: CalendarDays,
    label: "Session heatmap",
    hint: "Daily trading activity",
  },
  {
    key: "strategies",
    title: "Strategies",
    description:
      "Compare setups side by side. Know what to repeat, and what to retire.",
    icon: GitCompare,
    label: "Strategy split",
    hint: "Win rate by setup",
  },
  {
    key: "forecast",
    title: "Forecast",
    description:
      "AI insights that surface patterns in your journal, not generic market chatter.",
    icon: Sparkles,
    label: "AI recap",
    hint: "Session insights",
  },
  {
    key: "broker",
    title: "Broker sync",
    description:
      "Connect Dhan and import fills automatically. Less typing, more reviewing.",
    icon: Link2,
    label: "Dhan import",
    hint: "One-click trade sync",
  },
]

const EASE = [0.16, 1, 0.3, 1] as const
const AUTO_ADVANCE_MS = 5200

const inr = (n: number) =>
  `${n < 0 ? "-" : "+"}₹${Math.abs(n).toLocaleString("en-IN")}`

/* ------------------------------------------------------------------ */
/* Specimens                                                           */
/* ------------------------------------------------------------------ */

// 30 sessions of sample cumulative P&L (₹). Ends at +48,210.
const EQUITY = [
  0, 1840, 1220, 3410, 5020, 4310, 6890, 6120, 8740, 11020, 10180, 12650,
  15210, 14020, 16880, 19440, 18120, 21760, 24310, 23080, 26550, 29870,
  28640, 32120, 35480, 34210, 38920, 42150, 45330, 48210,
]

function equityPath(w: number, h: number) {
  const max = Math.max(...EQUITY)
  const min = Math.min(...EQUITY)
  return EQUITY.map((v, i) => {
    const x = (i / (EQUITY.length - 1)) * w
    const y = h - ((v - min) / (max - min)) * (h - 8) - 4
    return `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`
  }).join(" ")
}

function AnalyticsSpecimen({ still }: { still: boolean }) {
  const line = equityPath(320, 140)
  return (
    <div className="flex h-full flex-col">
      <div>
        <p className="font-display text-[44px] leading-[1.05] text-pure">
          {inr(48210)}
        </p>
        <p className="mt-[4px] font-marketing text-[13px] text-ash">
          Net P&amp;L over 30 sessions
        </p>
      </div>
      <svg
        viewBox="0 0 320 140"
        preserveAspectRatio="none"
        className="mt-[24px] h-[150px] w-full overflow-visible"
        aria-hidden
      >
        <defs>
          <linearGradient id="fm-equity-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#00b3dd" stopOpacity="0.28" />
            <stop offset="100%" stopColor="#00b3dd" stopOpacity="0" />
          </linearGradient>
        </defs>
        <motion.path
          d={`${line} L320 140 L0 140 Z`}
          fill="url(#fm-equity-fill)"
          initial={still ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.5 }}
        />
        <motion.path
          d={line}
          fill="none"
          stroke="#00b3dd"
          strokeWidth="2"
          strokeLinejoin="round"
          initial={still ? false : { pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.1, ease: EASE }}
        />
      </svg>
      <dl className="mt-auto grid grid-cols-3 gap-[16px] pt-[24px]">
        {[
          ["Win rate", "57.4%"],
          ["Expectancy", "₹1,607"],
          ["Profit factor", "1.82"],
        ].map(([k, v]) => (
          <div key={k}>
            <dt className="font-marketing text-[12px] text-ash">{k}</dt>
            <dd className="mt-[4px] font-mono-label text-[18px] text-pure">{v}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}

const MOODS = [
  { mood: "Calm", avg: 2140, n: 41 },
  { mood: "Confident", avg: 1320, n: 28 },
  { mood: "Bored", avg: -380, n: 12 },
  { mood: "Anxious", avg: -910, n: 17 },
  { mood: "FOMO", avg: -1760, n: 9 },
]

function PsychologySpecimen({ still }: { still: boolean }) {
  const max = 2200
  return (
    <div className="flex h-full flex-col">
      <p className="font-marketing text-[13px] text-ash">
        Average P&amp;L per trade, by the emotion you logged
      </p>
      <ul className="mt-[24px] flex flex-1 flex-col justify-center gap-[16px]">
        {MOODS.map((m, i) => {
          const pct = (Math.abs(m.avg) / max) * 50
          const up = m.avg >= 0
          return (
            <li
              key={m.mood}
              className="grid grid-cols-[88px_minmax(0,1fr)_76px] items-center gap-[12px]"
            >
              <span className="font-marketing text-[14px] text-cloud">{m.mood}</span>
              <span className="relative h-[10px]">
                <span className="absolute inset-y-[-6px] left-1/2 w-px bg-pure/15" />
                <motion.span
                  className={cn(
                    "absolute top-0 h-full rounded-full",
                    up ? "left-1/2 origin-left bg-cyan-signal" : "right-1/2 origin-right bg-orchid-bloom/80"
                  )}
                  style={{ width: `${pct}%` }}
                  initial={still ? false : { scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ duration: 0.7, delay: 0.08 * i, ease: EASE }}
                />
              </span>
              <span
                className={cn(
                  "text-right font-mono-label text-[13px]",
                  up ? "text-cyan-signal" : "text-orchid-bloom"
                )}
              >
                {inr(m.avg)}
              </span>
            </li>
          )
        })}
      </ul>
      <p className="mt-[24px] font-marketing text-[13px] text-ash">
        Calm trades earned <span className="text-pure">₹3,900 more</span> per trade than FOMO trades.
      </p>
    </div>
  )
}

// September sample: 4 weeks × 5 weekdays, ₹ P&L. 0 = no trades.
const SESSIONS = [
  [1240, -820, 2310, 0, 640],
  [-1960, 3180, 910, 9420, -410],
  [460, 0, -3740, 1520, 2080],
  [2890, 1130, -690, 4210, 1760],
]

function cellStyle(v: number) {
  if (v === 0) return { background: "rgba(255,255,255,0.04)" }
  const a = Math.min(1, Math.abs(v) / 6000) * 0.75 + 0.18
  return v > 0
    ? { background: `rgba(0,179,221,${a})` }
    : { background: `rgba(221,144,216,${a})` }
}

function CalendarSpecimen({ still }: { still: boolean }) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-baseline justify-between">
        <p className="font-display text-[30px] leading-[1.1] text-pure">September</p>
        <p className="font-marketing text-[13px] text-ash">19 sessions traded</p>
      </div>
      <div className="mt-[20px] grid grid-cols-5 gap-[8px]">
        {["Mon", "Tue", "Wed", "Thu", "Fri"].map((d) => (
          <span key={d} className="font-mono-label text-[11px] text-fog">
            {d}
          </span>
        ))}
        {SESSIONS.flat().map((v, i) => (
          <motion.span
            key={i}
            title={v === 0 ? "No trades" : inr(v)}
            className={cn(
              "aspect-[4/3] rounded-[8px]",
              v === 9420 && "ring-1 ring-pure/70 ring-offset-2 ring-offset-[#0c0f13]"
            )}
            style={cellStyle(v)}
            initial={still ? false : { opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: 0.025 * i, ease: EASE }}
          />
        ))}
      </div>
      <div className="mt-auto grid grid-cols-2 gap-[16px] pt-[24px]">
        <div>
          <p className="font-marketing text-[12px] text-ash">Best day, Thu 11</p>
          <p className="mt-[4px] font-mono-label text-[18px] text-cyan-signal">{inr(9420)}</p>
        </div>
        <div>
          <p className="font-marketing text-[12px] text-ash">Worst day, Wed 17</p>
          <p className="mt-[4px] font-mono-label text-[18px] text-orchid-bloom">{inr(-3740)}</p>
        </div>
      </div>
    </div>
  )
}

const SETUPS = [
  { name: "Opening range breakout", win: 62, trades: 47, verdict: "Repeat" },
  { name: "VWAP reclaim", win: 55, trades: 31, verdict: "Repeat" },
  { name: "Gap fade", win: 41, trades: 22, verdict: "Watch" },
  { name: "News spike chase", win: 27, trades: 15, verdict: "Retire" },
]

function StrategiesSpecimen({ still }: { still: boolean }) {
  return (
    <div className="flex h-full flex-col">
      <p className="font-marketing text-[13px] text-ash">Win rate by setup, last 90 days</p>
      <ul className="mt-[24px] flex flex-1 flex-col justify-center gap-[20px]">
        {SETUPS.map((s, i) => (
          <li key={s.name}>
            <div className="flex items-baseline justify-between gap-[12px]">
              <span className="truncate font-marketing text-[14px] text-cloud">{s.name}</span>
              <span
                className={cn(
                  "shrink-0 font-mono-label text-[11px] uppercase tracking-[0.12em]",
                  s.verdict === "Repeat" && "text-cyan-signal",
                  s.verdict === "Watch" && "text-ash",
                  s.verdict === "Retire" && "text-orchid-bloom"
                )}
              >
                {s.verdict}
              </span>
            </div>
            <div className="mt-[8px] flex items-center gap-[12px]">
              <motion.span
                className={cn(
                  "block h-[6px] origin-left rounded-full",
                  s.verdict === "Retire" ? "bg-orchid-bloom/80" : "bg-cyan-signal"
                )}
                style={{ width: `${s.win * 1.25}%` }}
                initial={still ? false : { scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: 0.7, delay: 0.1 * i, ease: EASE }}
              />
              <span className="shrink-0 font-mono-label text-[13px] text-pure">{s.win}%</span>
              <span className="shrink-0 font-marketing text-[12px] text-fog">{s.trades} trades</span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

const INSIGHTS = [
  "7 of your 9 losing trades this week opened after 2:30 pm.",
  "Trades you logged as Calm returned 2.4x the ones logged as FOMO.",
  "You moved your stop on 3 trades. All three closed red.",
]

function ForecastSpecimen({ still }: { still: boolean }) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-[12px]">
        <span className="flex size-[32px] items-center justify-center rounded-full bg-cyan-signal/15 text-cyan-signal">
          <Sparkles className="size-[16px]" strokeWidth={1.75} />
        </span>
        <div>
          <p className="font-marketing text-[14px] text-pure">Weekly recap</p>
          <p className="font-marketing text-[12px] text-ash">Week of 22 September</p>
        </div>
      </div>
      <ol className="mt-[28px] flex flex-1 flex-col gap-[20px]">
        {INSIGHTS.map((t, i) => (
          <motion.li
            key={t}
            className="border-l-2 border-cyan-signal/40 pl-[16px] font-display text-[22px] leading-[1.25] text-cloud"
            initial={still ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.25 + 0.35 * i, ease: EASE }}
          >
            {t}
          </motion.li>
        ))}
      </ol>
      <p className="mt-[24px] flex items-center gap-[8px] font-marketing text-[12px] text-ash">
        <Check className="size-[14px] text-cyan-signal" strokeWidth={2} />
        Every number is checked against your own trades
      </p>
    </div>
  )
}

const FILLS = [
  { t: "09:21", sym: "NIFTY 07 OCT 25200 CE", side: "BUY", qty: 150, px: "142.50" },
  { t: "09:48", sym: "NIFTY 07 OCT 25200 CE", side: "SELL", qty: 150, px: "168.20" },
  { t: "10:12", sym: "HDFCBANK", side: "BUY", qty: 40, px: "1,712.35" },
  { t: "11:05", sym: "HDFCBANK", side: "SELL", qty: 40, px: "1,726.90" },
  { t: "13:34", sym: "BANKNIFTY 28 OCT FUT", side: "SELL", qty: 35, px: "56,418.00" },
]

function BrokerSpecimen({ still }: { still: boolean }) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between">
        <p className="font-marketing text-[14px] text-pure">Dhan, today</p>
        <p className="font-marketing text-[12px] text-ash">5 fills found</p>
      </div>
      <ul className="mt-[20px] flex flex-1 flex-col gap-[8px]">
        {FILLS.map((f, i) => (
          <motion.li
            key={f.t}
            className="grid grid-cols-[40px_minmax(0,1fr)_auto] items-center gap-[12px] rounded-[10px] bg-pure/[0.04] px-[12px] py-[9px]"
            initial={still ? false : { opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.12 * i, ease: EASE }}
          >
            <span className="font-mono-label text-[11px] text-fog">{f.t}</span>
            <span className="flex min-w-0 items-baseline gap-[8px]">
              <span
                className={cn(
                  "w-[34px] shrink-0 font-mono-label text-[11px]",
                  f.side === "BUY" ? "text-cyan-signal" : "text-orchid-bloom"
                )}
              >
                {f.side}
              </span>
              <span className="truncate font-marketing text-[13px] text-cloud">{f.sym}</span>
              <span className="hidden shrink-0 font-mono-label text-[11px] text-fog sm:inline">
                x{f.qty}
              </span>
            </span>
            <span className="font-mono-label text-[13px] text-pure">{f.px}</span>
          </motion.li>
        ))}
      </ul>
      <motion.p
        className="mt-[20px] flex items-center gap-[8px] font-marketing text-[13px] text-cloud"
        initial={still ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.8 }}
      >
        <span className="flex size-[20px] items-center justify-center rounded-full bg-cyan-signal text-abyss">
          <Check className="size-[12px]" strokeWidth={3} />
        </span>
        Imported as 2 closed trades and 1 open position
      </motion.p>
    </div>
  )
}

const SPECIMENS: Record<ModuleKey, (p: { still: boolean }) => React.JSX.Element> = {
  analytics: AnalyticsSpecimen,
  psychology: PsychologySpecimen,
  calendar: CalendarSpecimen,
  strategies: StrategiesSpecimen,
  forecast: ForecastSpecimen,
  broker: BrokerSpecimen,
}

function SpecimenFrame({
  mod,
  still,
  className,
}: {
  mod: FeatureModule
  still: boolean
  className?: string
}) {
  const Specimen = SPECIMENS[mod.key]
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-[24px] border border-pure/10 bg-[#0c0f13] shadow-[0_30px_80px_rgba(0,20,30,0.45),inset_0_1px_0_rgba(255,255,255,0.06)]",
        className
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 80% 55% at 85% 0%, rgba(0,179,221,0.12) 0%, transparent 65%)",
        }}
      />
      <div className="relative flex items-center justify-between gap-[12px] border-b border-pure/[0.07] px-[24px] py-[16px]">
        <div className="flex min-w-0 items-center gap-[10px]">
          <mod.icon className="size-[16px] shrink-0 text-cyan-signal" strokeWidth={1.75} />
          <p className="truncate font-marketing text-[14px] text-pure">{mod.label}</p>
          <p className="hidden truncate font-marketing text-[13px] text-fog sm:block">{mod.hint}</p>
        </div>
        <p className="shrink-0 font-marketing text-[11px] text-fog">Sample data</p>
      </div>
      <div className="relative h-[calc(100%-53px)] p-[24px] sm:p-[28px]">
        <Specimen still={still} />
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Section                                                             */
/* ------------------------------------------------------------------ */

export function FeatureModules() {
  const [active, setActive] = useState(0)
  const [touched, setTouched] = useState(false)
  const [hovering, setHovering] = useState(false)
  const reduce = useReducedMotion() ?? false
  const rootRef = useRef<HTMLDivElement>(null)
  const inView = useInView(rootRef, { amount: 0.35 })

  // Walk the index on its own until the reader picks a module.
  useEffect(() => {
    if (reduce || touched || hovering || !inView) return
    // On small screens the specimen opens inline; moving it under a reader's thumb is rude.
    if (!window.matchMedia("(min-width: 1024px)").matches) return
    const id = window.setTimeout(
      () => setActive((i) => (i + 1) % MODULES.length),
      AUTO_ADVANCE_MS
    )
    return () => window.clearTimeout(id)
  }, [active, reduce, touched, hovering, inView])

  const pick = (i: number) => {
    setTouched(true)
    setActive(i)
  }

  const current = MODULES[active]

  return (
    <div ref={rootRef}>
      <header className="max-w-[760px]">
        <h2 className="font-display text-[clamp(2.75rem,7vw,5.5rem)] leading-[0.98] tracking-[-0.025em] text-pure">
          Everything that belongs in a journal
        </h2>
        <p className="mt-[20px] font-marketing text-[18px] font-light text-ash">
          Six modules. One quiet ledger.
        </p>
      </header>

      <div className="mt-[56px] grid gap-[48px] lg:mt-[72px] lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:gap-[72px]">
        <ul
          className="border-b border-pure/10"
          onMouseEnter={() => setHovering(true)}
          onMouseLeave={() => setHovering(false)}
        >
          {MODULES.map((mod, i) => {
            const isActive = i === active
            return (
              <li key={mod.key} className="relative border-t border-pure/10">
                {isActive && (
                  <motion.span
                    layoutId="fm-active-rule"
                    aria-hidden
                    className="absolute left-0 top-[-1px] h-px w-full bg-cyan-signal"
                    transition={{ type: "spring", stiffness: 260, damping: 30 }}
                  />
                )}
                <button
                  type="button"
                  aria-expanded={isActive}
                  aria-controls={`fm-panel-${mod.key}`}
                  onClick={() => pick(i)}
                  onFocus={() => pick(i)}
                  onMouseEnter={() => !reduce && setActive(i)}
                  className="group grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-[16px] py-[20px] text-left outline-none focus-visible:ring-2 focus-visible:ring-cyan-signal/60 sm:py-[24px]"
                >
                  <span
                    className={cn(
                      "font-display text-[clamp(2rem,4.2vw,3rem)] leading-[1.1] tracking-[-0.015em] transition-colors duration-300",
                      isActive ? "text-pure" : "text-pure/35 group-hover:text-pure/70"
                    )}
                  >
                    {mod.title}
                  </span>
                  <mod.icon
                    className={cn(
                      "size-[20px] transition-all duration-300",
                      isActive
                        ? "translate-x-0 text-cyan-signal opacity-100"
                        : "-translate-x-[6px] text-ash opacity-0 group-hover:opacity-60"
                    )}
                    strokeWidth={1.5}
                  />
                </button>

                <div
                  id={`fm-panel-${mod.key}`}
                  className={cn(
                    "grid transition-[grid-template-rows] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]",
                    isActive ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                  )}
                >
                  <div className="overflow-hidden">
                    <p className="max-w-[440px] pb-[24px] font-marketing text-[16px] font-light leading-[1.6] text-ash">
                      {mod.description}
                    </p>
                    {/* Mobile and tablet: the specimen opens in place */}
                    {isActive && (
                      <div className="pb-[28px] lg:hidden">
                        <SpecimenFrame mod={mod} still={reduce} className="h-[440px]" />
                      </div>
                    )}
                  </div>
                </div>
              </li>
            )
          })}
        </ul>

        {/* Desktop: one specimen stage that follows the open row */}
        <div className="hidden lg:block">
          <div className="sticky top-[112px]">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={current.key}
                initial={reduce ? false : { opacity: 0, y: 14, filter: "blur(6px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                exit={reduce ? undefined : { opacity: 0, y: -10, filter: "blur(6px)" }}
                transition={{ duration: 0.35, ease: EASE }}
              >
                <SpecimenFrame mod={current} still={reduce} className="h-[500px]" />
              </motion.div>
            </AnimatePresence>
            <div className="mt-[16px] flex gap-[6px]" aria-hidden>
              {MODULES.map((m, i) => (
                <span
                  key={m.key}
                  className={cn(
                    "h-[2px] flex-1 rounded-full transition-colors duration-500",
                    i === active ? "bg-cyan-signal" : "bg-pure/10"
                  )}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
