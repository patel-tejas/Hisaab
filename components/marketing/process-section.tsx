"use client"

import { useEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"

const STEPS = [
  {
    step: "01",
    verb: "Log",
    title: "Capture the fill",
    description:
      "Symbol, prices, strategy, and state of mind — under thirty seconds when it matters.",
    cue: "Entry · Exit · Emotion",
  },
  {
    step: "02",
    verb: "Read",
    title: "See the pattern",
    description:
      "Charts and psychology views reveal what your memory conveniently forgets.",
    cue: "Equity · Heatmap · Mistakes",
  },
  {
    step: "03",
    verb: "Refine",
    title: "Trade cleaner",
    description:
      "Carry forward lessons into the next session. Consistency compounds.",
    cue: "Lesson → Next session",
  },
] as const

/** Full-viewport process — ledger spine journey, not a card grid. */
export function ProcessSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const [active, setActive] = useState(0)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const el = sectionRef.current
    if (!el) return

    let frame = 0
    const onScroll = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        const rect = el.getBoundingClientRect()
        const view = window.innerHeight
        const total = rect.height + view
        const traveled = view - rect.top
        const p = Math.min(1, Math.max(0, traveled / total))
        setProgress(p)
        setActive(Math.min(STEPS.length - 1, Math.floor(p * STEPS.length * 0.95)))
      })
    }

    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener("scroll", onScroll)
    }
  }, [])

  return (
    <section
      ref={sectionRef}
      id="how-it-works"
      className="relative flex min-h-[100svh] flex-col justify-center overflow-x-clip px-5 py-24 sm:px-8"
    >
      {/* Local accents only — base atmosphere comes from shared wrapper */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-50"
        style={{
          background:
            "radial-gradient(ellipse 55% 40% at 90% 65%, rgba(75,73,170,0.12) 0%, transparent 60%)",
        }}
      />

      {/* Giant atmospheric watermark */}
      <p
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-[12%] -translate-x-1/2 select-none font-display text-[clamp(5rem,22vw,16rem)] leading-none tracking-[-0.06em] text-pure/[0.03]"
      >
        Process
      </p>

      <div className="relative z-[1] mx-auto w-full max-w-[1100px]">
        <header className="max-w-[520px]">
          <p className="font-mono-label text-[11px] font-medium uppercase tracking-[0.2em] text-cyan-signal/80">
            From fill to feedback
          </p>
          <h2 className="mt-4 font-display text-[clamp(2.5rem,6vw,4.5rem)] leading-[0.95] tracking-[-0.03em] text-pure">
            Three beats.
            <br />
            <span className="italic text-pure/55">One cleaner session.</span>
          </h2>
        </header>

        {/* Desktop: horizontal journey with SVG spine */}
        <div className="relative mt-16 hidden lg:block">
          <svg
            aria-hidden
            className="absolute left-0 top-[52px] h-[3px] w-full overflow-visible"
            viewBox="0 0 1000 4"
            preserveAspectRatio="none"
          >
            <line
              x1="40"
              y1="2"
              x2="960"
              y2="2"
              stroke="rgba(245,245,247,0.08)"
              strokeWidth="1.5"
            />
            <line
              x1="40"
              y1="2"
              x2={40 + progress * 920}
              y2="2"
              stroke="url(#process-spine)"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
            <defs>
              <linearGradient id="process-spine" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#00b3dd" />
                <stop offset="100%" stopColor="#847dff" />
              </linearGradient>
            </defs>
          </svg>

          <ol className="grid grid-cols-3 gap-8">
            {STEPS.map((item, i) => {
              const isActive = active === i
              const isPast = active > i
              return (
                <li key={item.step} className="relative pt-4">
                  <button
                    type="button"
                    onClick={() => setActive(i)}
                    className="group flex w-full flex-col text-left"
                  >
                    <span
                      className={cn(
                        "relative z-[1] mb-10 flex h-7 w-7 items-center justify-center rounded-full border transition-all duration-500",
                        isActive || isPast
                          ? "border-cyan-signal bg-cyan-signal/20 shadow-[0_0_24px_rgba(0,179,221,0.35)]"
                          : "border-pure/20 bg-obsidian"
                      )}
                    >
                      <span
                        className={cn(
                          "h-2 w-2 rounded-full transition-colors duration-500",
                          isActive || isPast ? "bg-cyan-signal" : "bg-pure/25"
                        )}
                      />
                    </span>

                    <span
                      className={cn(
                        "font-mono-label text-[12px] tracking-[0.18em] transition-colors duration-500",
                        isActive ? "text-cyan-signal" : "text-ash"
                      )}
                    >
                      {item.step} · {item.verb}
                    </span>

                    <h3
                      className={cn(
                        "mt-3 font-display text-[clamp(1.75rem,3vw,2.35rem)] leading-[1.05] tracking-[-0.02em] transition-colors duration-500",
                        isActive ? "text-pure" : "text-pure/40"
                      )}
                    >
                      {item.title}
                    </h3>

                    <p
                      className={cn(
                        "mt-4 max-w-[280px] font-marketing text-[15px] font-light leading-[1.55] transition-all duration-500",
                        isActive ? "translate-y-0 text-ash opacity-100" : "translate-y-1 text-ash/50 opacity-70"
                      )}
                    >
                      {item.description}
                    </p>

                    <span
                      className={cn(
                        "mt-6 inline-flex w-fit rounded-full border px-3 py-1 font-mono-label text-[10px] uppercase tracking-[0.14em] transition-all duration-500",
                        isActive
                          ? "border-cyan-signal/35 bg-cyan-signal/10 text-cyan-signal"
                          : "border-pure/10 text-fog"
                      )}
                    >
                      {item.cue}
                    </span>
                  </button>
                </li>
              )
            })}
          </ol>
        </div>

        {/* Mobile / tablet: vertical spine */}
        <ol className="relative mt-14 space-y-0 lg:hidden">
          <div
            aria-hidden
            className="absolute bottom-4 left-[13px] top-4 w-px bg-pure/10"
          />
          <div
            aria-hidden
            className="absolute left-[13px] top-4 w-px origin-top bg-gradient-to-b from-cyan-signal to-iris-gleam transition-transform duration-300"
            style={{
              height: "calc(100% - 2rem)",
              transform: `scaleY(${0.15 + progress * 0.85})`,
            }}
          />

          {STEPS.map((item, i) => {
            const isActive = active === i
            return (
              <li
                key={item.step}
                className="relative flex gap-5 py-7 first:pt-0 last:pb-0"
              >
                <span
                  className={cn(
                    "relative z-[1] mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border transition-all duration-500",
                    isActive
                      ? "border-cyan-signal bg-cyan-signal/20 shadow-[0_0_20px_rgba(0,179,221,0.3)]"
                      : "border-pure/20 bg-[#0a121c]"
                  )}
                >
                  <span
                    className={cn(
                      "h-2 w-2 rounded-full",
                      isActive ? "bg-cyan-signal" : "bg-pure/30"
                    )}
                  />
                </span>
                <div>
                  <p
                    className={cn(
                      "font-mono-label text-[11px] tracking-[0.18em]",
                      isActive ? "text-cyan-signal" : "text-ash"
                    )}
                  >
                    {item.step} · {item.verb}
                  </p>
                  <h3 className="mt-2 font-display text-[28px] leading-[1.05] text-pure">
                    {item.title}
                  </h3>
                  <p className="mt-3 max-w-[360px] font-marketing text-[15px] font-light leading-[1.55] text-ash">
                    {item.description}
                  </p>
                  <span className="mt-4 inline-flex rounded-full border border-pure/10 px-3 py-1 font-mono-label text-[10px] uppercase tracking-[0.14em] text-fog">
                    {item.cue}
                  </span>
                </div>
              </li>
            )
          })}
        </ol>
      </div>

      {/* Soft dissolve into the next section */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-48 bg-gradient-to-b from-transparent via-[#090a0b]/40 to-[#090a0b]"
      />
    </section>
  )
}
