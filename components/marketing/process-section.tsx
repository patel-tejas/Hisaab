"use client"

import { useEffect, useRef, useState } from "react"
import {
  AnimatePresence,
  motion,
  useInView,
  useReducedMotion,
  useScroll,
  useSpring,
} from "motion/react"
import { Check, Clock3, TriangleAlert } from "lucide-react"
import { cn } from "@/lib/utils"

/*
 * One trade, three beats. A single ticket stays pinned on desktop and
 * changes as the reader scrolls past Log, Read and Refine. On mobile each
 * beat carries its own still of the ticket.
 */

const STEPS = [
  {
    verb: "Log",
    title: "Capture the fill",
    description:
      "Symbol, prices, strategy, and state of mind. Under thirty seconds when it matters.",
    cues: ["Entry", "Exit", "Emotion"],
  },
  {
    verb: "Read",
    title: "See the pattern",
    description:
      "Charts and psychology views reveal what your memory conveniently forgets.",
    cues: ["Equity", "Heatmap", "Mistakes"],
  },
  {
    verb: "Refine",
    title: "Trade cleaner",
    description:
      "Carry forward lessons into the next session. Consistency compounds.",
    cues: ["Lesson", "Next session"],
  },
] as const

const EASE = [0.16, 1, 0.3, 1] as const

/* ------------------------------------------------------------------ */
/* The ticket                                                          */
/* ------------------------------------------------------------------ */

function TicketHead() {
  return (
    <div className="flex items-start justify-between gap-[16px]">
      <div className="min-w-0">
        <p className="truncate font-marketing text-[15px] font-medium text-pure">
          NIFTY 07 OCT 25200 CE
        </p>
        <p className="mt-[2px] font-marketing text-[13px] text-ash">Long, 2 lots</p>
      </div>
      <p className="shrink-0 font-display text-[30px] leading-none text-cyan-signal">+₹3,855</p>
    </div>
  )
}

function LogView({ still }: { still: boolean }) {
  const fields: [string, string][] = [
    ["Entry", "142.50"],
    ["Exit", "168.20"],
    ["Strategy", "Opening range breakout"],
    ["Emotion", "Calm"],
  ]
  return (
    <div className="flex h-full flex-col">
      <TicketHead />
      <dl className="mt-[28px] grid grid-cols-2 gap-x-[16px] gap-y-[20px]">
        {fields.map(([k, v], i) => (
          <motion.div
            key={k}
            className={cn(k === "Strategy" && "col-span-2")}
            initial={still ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.1 + 0.12 * i, ease: EASE }}
          >
            <dt className="font-marketing text-[12px] text-ash">{k}</dt>
            <dd
              className={cn(
                "mt-[6px] rounded-[10px] border px-[12px] py-[10px] font-mono-label text-[15px]",
                k === "Emotion"
                  ? "border-cyan-signal/40 bg-cyan-signal/10 text-cyan-signal"
                  : "border-pure/10 bg-pure/[0.03] text-pure"
              )}
            >
              {v}
            </dd>
          </motion.div>
        ))}
      </dl>
      <p className="mt-auto flex items-center gap-[8px] pt-[24px] font-marketing text-[13px] text-ash">
        <Clock3 className="size-[14px] text-cyan-signal" strokeWidth={1.75} />
        Logged in 24 seconds
      </p>
    </div>
  )
}

// Sample equity, last 12 trades; the final point is the ticket above.
const CURVE = [0, 1.2, 0.6, 2.1, 1.4, 2.9, 2.2, 3.6, 3.1, 2.4, 3.9, 5.2]

function ReadView({ still }: { still: boolean }) {
  const w = 560
  const h = 120
  const pts = CURVE.map((v, i) => [
    (i / (CURVE.length - 1)) * w,
    h - (v / 5.4) * (h - 12) - 6,
  ])
  const d = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ")
  const [lx, ly] = pts[pts.length - 1]
  return (
    <div className="flex h-full flex-col">
      <TicketHead />
      <div className="relative mt-[24px]">
        <svg viewBox={`0 0 ${w} ${h}`} className="h-[120px] w-full overflow-visible" aria-hidden>
          <motion.path
            d={d}
            fill="none"
            stroke="rgba(255,255,255,0.35)"
            strokeWidth="1.5"
            strokeLinejoin="round"
            initial={still ? false : { pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.9, ease: EASE }}
          />
          <motion.circle
            cx={lx}
            cy={ly}
            r="5"
            fill="#00b3dd"
            initial={still ? false : { scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.85, type: "spring", stiffness: 300, damping: 18 }}
          />
        </svg>
        <p className="mt-[8px] font-marketing text-[12px] text-ash">
          This trade, on your last 12
        </p>
      </div>
      <motion.div
        className="mt-auto rounded-[14px] border border-orchid-bloom/30 bg-orchid-bloom/[0.07] p-[16px]"
        initial={still ? false : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 1.0, ease: EASE }}
      >
        <p className="flex items-center gap-[8px] font-marketing text-[13px] font-medium text-orchid-bloom">
          <TriangleAlert className="size-[14px]" strokeWidth={1.75} />
          Pattern found
        </p>
        <p className="mt-[6px] font-marketing text-[14px] leading-[1.5] text-cloud">
          You moved your stop on 3 trades this month. All three closed red.
        </p>
      </motion.div>
    </div>
  )
}

const NEXT = [
  { text: "Stop set before entry, and left there", done: true },
  { text: "No new trades after 2:30 pm", done: false },
  { text: "Three trades, then review", done: false },
]

function RefineView({ still }: { still: boolean }) {
  return (
    <div className="flex h-full flex-col">
      <div>
        <p className="font-marketing text-[12px] text-ash">Lesson carried forward</p>
        <motion.p
          className="mt-[8px] font-display text-[30px] italic leading-[1.15] text-pure"
          initial={still ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: EASE }}
        >
          The stop stays where the plan put it.
        </motion.p>
      </div>
      <motion.div
        className="mt-[20px] flex flex-wrap items-center gap-[8px]"
        initial={still ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.2 }}
      >
        <span className="font-marketing text-[12px] text-ash">Learned from</span>
        {["12 Sep, -₹1,240", "18 Sep, -₹860", "24 Sep, -₹2,110"].map((t) => (
          <span
            key={t}
            className="rounded-full border border-orchid-bloom/30 px-[10px] py-[4px] font-mono-label text-[11px] text-orchid-bloom"
          >
            {t}
          </span>
        ))}
      </motion.div>
      <div className="mt-auto pt-[24px]">
        <p className="font-marketing text-[12px] text-ash">Next session, Wednesday</p>
        <ul className="mt-[12px] flex flex-col gap-[10px]">
          {NEXT.map((n, i) => (
            <motion.li
              key={n.text}
              className="flex items-center gap-[12px] font-marketing text-[14px] text-cloud"
              initial={still ? false : { opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.45, delay: 0.25 + 0.12 * i, ease: EASE }}
            >
              <span
                className={cn(
                  "flex size-[20px] shrink-0 items-center justify-center rounded-[6px] border",
                  n.done
                    ? "border-cyan-signal bg-cyan-signal text-abyss"
                    : "border-pure/25"
                )}
              >
                {n.done && <Check className="size-[12px]" strokeWidth={3} />}
              </span>
              {n.text}
            </motion.li>
          ))}
        </ul>
      </div>
    </div>
  )
}

const VIEWS = [LogView, ReadView, RefineView]

function Ticket({
  step,
  still,
  className,
}: {
  step: number
  still: boolean
  className?: string
}) {
  const View = VIEWS[step]
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-[24px] border border-pure/10 bg-[#0c0f13] p-[24px] shadow-[0_30px_80px_rgba(0,20,30,0.45),inset_0_1px_0_rgba(255,255,255,0.06)] sm:p-[28px]",
        className
      )}
    >
      {/* Perforated edge: this is a ticket, not a card */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-[24px] top-0 h-px"
        style={{
          backgroundImage:
            "linear-gradient(90deg, rgba(0,179,221,0.7) 50%, transparent 50%)",
          backgroundSize: "10px 1px",
        }}
      />
      <View still={still} />
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Section                                                             */
/* ------------------------------------------------------------------ */

function Beat({
  index,
  onEnter,
  active,
}: {
  index: number
  onEnter: (i: number) => void
  active: boolean
}) {
  const ref = useRef<HTMLLIElement>(null)
  const inView = useInView(ref, { margin: "-45% 0px -45% 0px" })
  const reduce = useReducedMotion() ?? false
  const item = STEPS[index]

  useEffect(() => {
    if (inView) onEnter(index)
  }, [inView, index, onEnter])

  return (
    <li
      ref={ref}
      id={`beat-${item.verb.toLowerCase()}`}
      className="relative py-[40px] lg:flex lg:min-h-[64vh] lg:items-center lg:py-0"
    >
      <div className="lg:pl-[40px]">
        <p
          className={cn(
            "font-mono-label text-[13px] tracking-[0.08em] transition-colors duration-500",
            active ? "text-cyan-signal" : "text-ash"
          )}
        >
          {item.verb}
        </p>
        <h3
          className={cn(
            "mt-[12px] font-display text-[clamp(2.25rem,4.5vw,3.5rem)] leading-[1.05] tracking-[-0.02em] transition-colors duration-500",
            active ? "text-pure" : "text-pure lg:text-pure/30"
          )}
        >
          {item.title}
        </h3>
        <p className="mt-[16px] max-w-[400px] font-marketing text-[17px] font-light leading-[1.6] text-ash">
          {item.description}
        </p>
        <ul className="mt-[20px] flex flex-wrap gap-[8px]">
          {item.cues.map((c) => (
            <li
              key={c}
              className="rounded-full border border-pure/10 px-[12px] py-[6px] font-marketing text-[12px] text-cloud/80"
            >
              {c}
            </li>
          ))}
        </ul>

        {/* Mobile: each beat shows its own frame of the ticket */}
        <div className="mt-[28px] lg:hidden">
          <Ticket step={index} still={reduce} className="h-[400px]" />
        </div>
      </div>
    </li>
  )
}

export function ProcessSection() {
  const [active, setActive] = useState(0)
  const reduce = useReducedMotion() ?? false
  const beatsRef = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({
    target: beatsRef,
    offset: ["start 55%", "end 55%"],
  })
  const rail = useSpring(scrollYProgress, { stiffness: 120, damping: 28 })

  return (
    <section
      id="how-it-works"
      className="relative overflow-x-clip px-[20px] py-[120px] sm:px-[32px] lg:py-[140px]"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{
          background:
            "radial-gradient(ellipse 50% 35% at 18% 55%, rgba(0,179,221,0.08) 0%, transparent 65%)",
        }}
      />

      <div className="relative z-[1] mx-auto w-full max-w-[1200px]">
        <header className="max-w-[640px]">
          <p className="font-marketing text-[16px] text-cyan-signal">From fill to feedback</p>
          <h2 className="mt-[16px] pb-[4px] font-display text-[clamp(2.75rem,7vw,5.5rem)] leading-[1] tracking-[-0.03em] text-pure">
            Three beats.
            <span className="block italic text-pure/55">One cleaner session.</span>
          </h2>
        </header>

        <div className="mt-[48px] grid lg:mt-[24px] lg:grid-cols-[minmax(0,6fr)_minmax(0,5fr)] lg:gap-[64px]">
          {/* Desktop: the pinned ticket */}
          <div className="hidden lg:block">
            <div className="sticky top-[calc(50vh-230px)] py-[40px]">
              <div className="mb-[16px] flex gap-[24px]" role="tablist" aria-label="Beats">
                {STEPS.map((s, i) => (
                  <button
                    key={s.verb}
                    type="button"
                    role="tab"
                    aria-selected={active === i}
                    onClick={() =>
                      document
                        .getElementById(`beat-${s.verb.toLowerCase()}`)
                        ?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" })
                    }
                    className={cn(
                      "relative pb-[8px] font-marketing text-[14px] transition-colors duration-300",
                      active === i ? "text-pure" : "text-fog hover:text-ash"
                    )}
                  >
                    {s.verb}
                    {active === i && (
                      <motion.span
                        layoutId="beat-tab"
                        className="absolute inset-x-0 bottom-0 h-px bg-cyan-signal"
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                      />
                    )}
                  </button>
                ))}
              </div>
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={active}
                  initial={reduce ? false : { opacity: 0, rotateX: -8, y: 16 }}
                  animate={{ opacity: 1, rotateX: 0, y: 0 }}
                  exit={reduce ? undefined : { opacity: 0, rotateX: 8, y: -12 }}
                  transition={{ duration: 0.4, ease: EASE }}
                  style={{ transformPerspective: 1200 }}
                >
                  <Ticket step={active} still={reduce} className="h-[420px]" />
                </motion.div>
              </AnimatePresence>
            </div>
          </div>

          <div ref={beatsRef} className="relative">
            {/* Progress rail, desktop only */}
            <div aria-hidden className="absolute bottom-[12vh] left-0 top-[12vh] hidden w-px bg-pure/10 lg:block">
              <motion.div
                className="h-full w-full origin-top bg-cyan-signal"
                style={{ scaleY: reduce ? 1 : rail }}
              />
            </div>
            <ol className="divide-y divide-pure/10 lg:divide-y-0">
              {STEPS.map((s, i) => (
                <Beat key={s.verb} index={i} onEnter={setActive} active={active === i} />
              ))}
            </ol>
          </div>
        </div>
      </div>

      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[160px] bg-gradient-to-b from-transparent to-[#090a0b]"
      />
    </section>
  )
}
