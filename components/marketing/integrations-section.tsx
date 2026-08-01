"use client"

import Image from "next/image"
import { useEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"

type OrbitLogo = {
  name: string
  src: string
  x: number
  y: number
  size: number
  /** degrees — slight left/right tilt */
  tilt: number
  blur?: number
  opacity?: number
  live?: boolean
  ghost?: boolean
  /** float animation duration (s) */
  floatDur: number
  /** float delay (s) */
  floatDelay: number
}

const ORBIT: OrbitLogo[] = [
  {
    name: "Dhan",
    src: "/dhan_logo.jpg",
    x: 22,
    y: 28,
    size: 64,
    tilt: -8,
    live: true,
    floatDur: 4.2,
    floatDelay: 0,
  },
  {
    name: "Zerodha",
    src: "/zerodha_logo.png",
    x: 72,
    y: 24,
    size: 58,
    tilt: 10,
    floatDur: 4.8,
    floatDelay: 0.4,
  },
  {
    name: "Groww",
    src: "/groww_logo.png",
    x: 82,
    y: 48,
    size: 56,
    tilt: -6,
    floatDur: 5.1,
    floatDelay: 0.8,
  },
  {
    name: "Upstox",
    src: "/upstox_logo.png",
    x: 68,
    y: 72,
    size: 54,
    tilt: 7,
    floatDur: 4.5,
    floatDelay: 0.2,
  },
  {
    name: "Angel One",
    src: "/angelone_logo.png",
    x: 28,
    y: 70,
    size: 56,
    tilt: -11,
    floatDur: 5.4,
    floatDelay: 0.6,
  },
  {
    name: "Fyers",
    src: "/fyers_logo.jpg",
    x: 14,
    y: 48,
    size: 52,
    tilt: 9,
    floatDur: 4.6,
    floatDelay: 1,
  },
  {
    name: "Zerodha",
    src: "/zerodha_logo.png",
    x: 48,
    y: 10,
    size: 40,
    tilt: -5,
    blur: 1.5,
    opacity: 0.45,
    ghost: true,
    floatDur: 5.6,
    floatDelay: 0.3,
  },
  {
    name: "Groww",
    src: "/groww_logo.png",
    x: 90,
    y: 30,
    size: 36,
    tilt: 8,
    blur: 2,
    opacity: 0.4,
    ghost: true,
    floatDur: 5.2,
    floatDelay: 0.9,
  },
  {
    name: "Dhan",
    src: "/dhan_logo.jpg",
    x: 88,
    y: 68,
    size: 38,
    tilt: -7,
    blur: 1.5,
    opacity: 0.4,
    ghost: true,
    floatDur: 4.9,
    floatDelay: 0.5,
  },
  {
    name: "Upstox",
    src: "/upstox_logo.png",
    x: 50,
    y: 88,
    size: 36,
    tilt: 6,
    blur: 2,
    opacity: 0.35,
    ghost: true,
    floatDur: 5.5,
    floatDelay: 1.1,
  },
  {
    name: "Angel One",
    src: "/angelone_logo.png",
    x: 8,
    y: 72,
    size: 34,
    tilt: -9,
    blur: 2.5,
    opacity: 0.35,
    ghost: true,
    floatDur: 5,
    floatDelay: 0.7,
  },
  {
    name: "Fyers",
    src: "/fyers_logo.jpg",
    x: 10,
    y: 22,
    size: 36,
    tilt: 5,
    blur: 2,
    opacity: 0.4,
    ghost: true,
    floatDur: 4.7,
    floatDelay: 0.15,
  },
]

function BrokerTile({
  logo,
  open,
  delayMs,
}: {
  logo: OrbitLogo
  open: boolean
  delayMs: number
}) {
  const left = open ? logo.x : 50
  const top = open ? logo.y : 50
  const baseOpacity = logo.opacity ?? 1

  return (
    <div
      className={cn("absolute z-[2]", !logo.ghost && "group")}
      style={{
        left: `${left}%`,
        top: `${top}%`,
        width: logo.size,
        height: logo.size,
        opacity: open ? baseOpacity : 0,
        transform: `translate(-50%, -50%) scale(${open ? 1 : 0.35}) rotate(${open ? logo.tilt : 0}deg)`,
        filter: logo.blur ? `blur(${logo.blur}px)` : undefined,
        pointerEvents: logo.ghost || !open ? "none" : "auto",
        transition: `left 0.9s cubic-bezier(0.22, 1, 0.36, 1) ${delayMs}ms, top 0.9s cubic-bezier(0.22, 1, 0.36, 1) ${delayMs}ms, opacity 0.7s ease ${delayMs}ms, transform 0.9s cubic-bezier(0.22, 1, 0.36, 1) ${delayMs}ms`,
      }}
    >
      {/* Soft float — only when expanded */}
      <div
        className={cn(open && "animate-orbit-float")}
        style={
          open
            ? {
                animationDuration: `${logo.floatDur}s`,
                animationDelay: `${logo.floatDelay}s`,
              }
            : undefined
        }
      >
        {!logo.ghost && (
          <span className="pointer-events-none absolute -top-9 left-1/2 z-20 -translate-x-1/2 whitespace-nowrap rounded-full bg-void/90 px-2.5 py-1 font-marketing text-[12px] font-medium text-pure opacity-0 shadow-[0_6px_20px_rgba(0,0,0,0.35)] ring-1 ring-pure/10 transition-all duration-200 group-hover:-translate-y-0.5 group-hover:opacity-100">
            {logo.name}
          </span>
        )}

        <div
          className={cn(
            "aspect-square h-full w-full overflow-hidden rounded-[22%] bg-pure shadow-[0_8px_28px_rgba(0,0,0,0.35)] ring-1 ring-pure/10 transition-transform duration-200 ease-out",
            !logo.ghost && "group-hover:scale-110",
            logo.live &&
              "ring-2 ring-cyan-signal/50 shadow-[0_0_28px_rgba(0,179,221,0.25)]"
          )}
        >
          <Image
            src={logo.src}
            alt={logo.ghost ? "" : logo.name}
            width={logo.size}
            height={logo.size}
            className="h-full w-full object-cover"
            draggable={false}
          />
        </div>
      </div>
    </div>
  )
}

/** Hub-and-spoke integrations — explode on scroll into view, retract on scroll away. */
export function IntegrationsSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const el = sectionRef.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        setOpen(entry.isIntersecting)
      },
      { threshold: 0.35, rootMargin: "0px 0px -8% 0px" }
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <section
      ref={sectionRef}
      id="integrations"
      className="relative flex min-h-[100svh] flex-col items-center justify-center overflow-x-clip px-5 py-28 sm:px-8"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#0a0b0e] via-[#080a10] to-[#0f1011]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-[#0a0b0e] to-transparent"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-b from-transparent to-obsidian"
      />

      <div className="relative z-[1] mx-auto flex w-full max-w-[1100px] flex-col items-center text-center">
        <p className="font-mono-label text-[11px] font-medium uppercase tracking-[0.2em] text-cyan-signal/80">
          Integrations
        </p>
        <h2 className="mx-auto mt-4 max-w-[720px] px-2 font-display text-[clamp(2.25rem,5vw,3.75rem)] leading-[1.05] tracking-[-0.03em] text-pure">
          Sync from the brokers you already use
        </h2>
        <p className="mx-auto mt-5 max-w-[440px] font-marketing text-[17px] font-light leading-[1.5] text-ash">
          Dhan is live today. More Indian brokers are on the way — same quiet import, zero
          busywork.
        </p>
      </div>

      <div className="relative z-[1] mx-auto mt-12 flex w-full max-w-[720px] justify-center">
        <div className="relative mx-auto aspect-square w-full max-w-[520px] sm:max-w-[580px]">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-[8%] rounded-full transition-opacity duration-700"
            style={{
              opacity: open ? 1 : 0.35,
              background:
                "radial-gradient(circle at 50% 50%, rgba(0,179,221,0.22) 0%, rgba(30,80,120,0.1) 35%, transparent 68%)",
            }}
          />

          {ORBIT.map((logo, i) => (
            <BrokerTile
              key={`${logo.name}-${i}`}
              logo={logo}
              open={open}
              delayMs={logo.ghost ? 120 + (i % 6) * 35 : 40 + (i % 6) * 55}
            />
          ))}

          <div className="absolute left-1/2 top-1/2 z-20 h-[96px] w-[96px] -translate-x-1/2 -translate-y-1/2 sm:h-[112px] sm:w-[112px]">
            <div className="aspect-square h-full w-full overflow-hidden rounded-[22%] bg-pure shadow-[0_12px_40px_rgba(0,179,221,0.35),0_0_0_1px_rgba(255,255,255,0.12)]">
              <Image
                src="/hisaab_logo.png"
                alt="Hisaab"
                width={112}
                height={112}
                className="h-full w-full object-cover"
                priority
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
