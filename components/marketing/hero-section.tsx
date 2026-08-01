"use client"

import Image from "next/image"
import Link from "next/link"
import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"
import {
  HERO_BACKGROUNDS,
  HERO_PERIOD_LABELS,
  nextHeroPeriod,
  type HeroPeriod,
} from "@/lib/hero-period"

type HeroSectionProps = {
  period: HeroPeriod
  onPeriodChange: (period: HeroPeriod) => void
  ready?: boolean
}

export function HeroSection({
  period,
  onPeriodChange,
  ready = true,
}: HeroSectionProps) {
  const [parallaxY, setParallaxY] = useState(0)
  const src = HERO_BACKGROUNDS[period]

  useEffect(() => {
    let frame = 0
    const onScroll = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        const y = Math.min(window.scrollY, window.innerHeight)
        setParallaxY(y * 0.35)
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
    <section className="relative h-[100svh] max-h-[100svh] overflow-hidden bg-obsidian">
      <div
        className="absolute inset-0 will-change-transform"
        style={{ transform: `translate3d(0, ${-parallaxY}px, 0)` }}
        aria-hidden
      >
        <div className="relative h-[120%] w-full">
          <Image
            key={src}
            src={src}
            alt=""
            fill
            priority
            sizes="100vw"
            className={cn(
              "object-cover object-[center_30%] transition-opacity duration-700",
              ready ? "opacity-100" : "opacity-0"
            )}
          />
        </div>
      </div>

      {/* Soft wash + deep blend into the next full-viewport section */}
      <div className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-b from-void/35 via-void/10 to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[1] h-[55%] bg-gradient-to-b from-transparent via-obsidian/55 to-obsidian" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[1] h-24 bg-gradient-to-b from-transparent to-obsidian" />

      {/* Bigger centered hero */}
      <div
        className={cn(
          "relative z-[2] mx-auto flex h-full max-w-[1100px] flex-col items-center justify-center px-5 text-center transition-opacity duration-500 sm:px-8",
          ready ? "opacity-100" : "opacity-0"
        )}
      >
        <div className="relative isolate flex w-full max-w-[920px] flex-col items-center px-8 py-12 sm:px-16 sm:py-16">
          {/* Cloudy sky frost — soft blue haze, no hard edges */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-[-12%] -z-10"
            style={{
              background:
                "radial-gradient(ellipse 70% 55% at 50% 45%, rgba(100,160,210,0.35) 0%, rgba(140,185,220,0.18) 40%, transparent 72%)",
              WebkitBackdropFilter: "blur(28px) saturate(1.2)",
              backdropFilter: "blur(28px) saturate(1.2)",
              maskImage:
                "radial-gradient(ellipse 65% 55% at 50% 45%, black 20%, transparent 75%)",
              WebkitMaskImage:
                "radial-gradient(ellipse 65% 55% at 50% 45%, black 20%, transparent 75%)",
            }}
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-[5%] -z-10"
            style={{
              background:
                "radial-gradient(ellipse 55% 45% at 50% 48%, rgba(255,255,255,0.14) 0%, transparent 70%)",
              filter: "blur(20px)",
            }}
          />

          <h1 className="animate-reveal relative max-w-[10ch] font-display text-[clamp(3.25rem,9.5vw,6.75rem)] leading-[0.92] tracking-[-0.03em] text-balance text-pure drop-shadow-[0_1px_18px_rgba(20,40,70,0.35)] sm:max-w-none">
            <em className="italic">Own</em> every trade you take
          </h1>

          <p className="animate-reveal-delay relative mt-7 max-w-[560px] font-marketing text-[18px] font-light leading-[1.55] text-pretty text-pure/90 drop-shadow-[0_1px_12px_rgba(20,40,70,0.3)] sm:text-[20px] sm:leading-[1.5]">
            Hisaab is a trading journal for serious process — log fills, track psychology,
            and review performance without the noise.
          </p>

          <div className="animate-reveal-delay-2 relative mt-12 flex items-center justify-center">
            <Link
              href="/sign-in"
              className={cn(
                "inline-flex items-center rounded-2xl px-5 py-2.5 font-marketing text-[15px] font-medium transition-opacity duration-200 hover:opacity-90",
                "bg-pure text-void",
                "shadow-[inset_0_1px_0_rgba(255,255,255,0.85),0_6px_20px_rgba(0,0,0,0.12)]"
              )}
            >
              Try the demo
            </Link>
          </div>
        </div>
      </div>

      {/* Scene switcher */}
      <div className="absolute bottom-7 right-5 z-[3] sm:bottom-9 sm:right-8">
        <button
          type="button"
          onClick={() => onPeriodChange(nextHeroPeriod(period))}
          className="flex h-11 w-11 items-center justify-center rounded-full border border-transparent bg-transparent text-silver backdrop-blur-0 transition-[background-color,border-color,box-shadow,transform,backdrop-filter,color] duration-200 ease-out hover:border-pure/15 hover:bg-pure/12 hover:text-pure hover:shadow-[0_4px_20px_rgba(0,0,0,0.2)] hover:backdrop-blur-md active:scale-90 active:bg-pure/18"
          aria-label={`Switch background scene. Current: ${HERO_PERIOD_LABELS[period]}`}
          title={`${HERO_PERIOD_LABELS[period]} — tap to cycle`}
        >
          {period === "morning" && <SunIcon />}
          {period === "afternoon" && <AfternoonIcon />}
          {period === "evening" && <SunsetIcon />}
          {period === "night" && <MoonIcon />}
        </button>
      </div>
    </section>
  )
}

function SunIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="3.25" stroke="currentColor" strokeWidth="1.4" />
      {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
        <circle
          key={deg}
          cx={12 + Math.cos((deg * Math.PI) / 180) * 7.5}
          cy={12 + Math.sin((deg * Math.PI) / 180) * 7.5}
          r="1.1"
          fill="currentColor"
        />
      ))}
    </svg>
  )
}

/** Bright midday sun — fuller disc, shorter rays */
function AfternoonIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.4" />
      {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => {
        const rad = (deg * Math.PI) / 180
        return (
          <line
            key={deg}
            x1={12 + Math.cos(rad) * 6.2}
            y1={12 + Math.sin(rad) * 6.2}
            x2={12 + Math.cos(rad) * 8.4}
            y2={12 + Math.sin(rad) * 8.4}
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
          />
        )
      })}
    </svg>
  )
}

function SunsetIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 17.5h16M6.5 17.5a5.5 5.5 0 0 1 11 0"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      <path
        d="M12 4v3M5.5 9l1.2 1.2M17.3 10.2 18.5 9M4 13.5h2M18 13.5h2"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  )
}

function MoonIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M19.5 14.2A7.2 7.2 0 0 1 9.8 4.5 7.2 7.2 0 1 0 19.5 14.2Z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </svg>
  )
}
