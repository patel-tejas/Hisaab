"use client"

import dynamic from "next/dynamic"
import { Check } from "lucide-react"
import { HisaabLogo } from "@/components/marketing/hisaab-logo"

const Grainient = dynamic(() => import("@/components/Grainient"), {
  ssr: false,
  loading: () => <div className="h-full w-full bg-[#e8f0fa]" />,
})

const HIGHLIGHTS = [
  "Trade analytics & equity curves",
  "Psychology & mistake tracking",
  "Dhan broker sync, zero busywork",
] as const

type AuthSplitShellProps = {
  children: React.ReactNode
  headline?: React.ReactNode
  /** Sonner-style floating notice (e.g. Try demo) — top-right of form panel */
  floatingNotice?: React.ReactNode
}

/** Split auth layout — Grainient brand panel + white form (Serin-style). */
export function AuthSplitShell({
  children,
  headline = (
    <>
      Own every trade.
      <br />
      Review with clarity.
      <br />
      <span className="text-void/45">Trade cleaner.</span>
    </>
  ),
  floatingNotice,
}: AuthSplitShellProps) {
  return (
    <div className="grid min-h-svh bg-pure lg:grid-cols-2">
      {/* Brand panel */}
      <aside className="relative hidden min-h-svh overflow-hidden lg:block">
        <div className="absolute inset-0">
          <Grainient
            color1="#d1c9ff"
            color2="#90b8f0"
            color3="#e8f4fc"
            timeSpeed={0.2}
            colorBalance={0}
            warpStrength={1}
            warpFrequency={5}
            warpSpeed={1.4}
            warpAmplitude={50}
            blendAngle={8}
            blendSoftness={0.45}
            rotationAmount={380}
            noiseScale={2}
            grainAmount={0.06}
            grainScale={2}
            grainAnimated={false}
            contrast={1.15}
            gamma={1}
            saturation={1}
            centerX={0}
            centerY={0}
            zoom={0.85}
          />
        </div>

        <div className="relative z-10 flex h-full flex-col px-10 py-10 xl:px-14">
          <HisaabLogo tone="dark" />

          <div className="relative my-auto max-w-[440px] py-12">
            {/* Cloudy blue frost behind copy */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-[-20%] -z-10"
              style={{
                background:
                  "radial-gradient(ellipse 70% 60% at 40% 40%, rgba(144,184,240,0.45) 0%, rgba(232,244,252,0.35) 45%, transparent 72%)",
                WebkitBackdropFilter: "blur(24px) saturate(1.15)",
                backdropFilter: "blur(24px) saturate(1.15)",
                maskImage:
                  "radial-gradient(ellipse 70% 65% at 40% 40%, black 25%, transparent 78%)",
                WebkitMaskImage:
                  "radial-gradient(ellipse 70% 65% at 40% 40%, black 25%, transparent 78%)",
              }}
            />

            <h2 className="font-display text-[clamp(2.4rem,4vw,3.4rem)] leading-[1.05] tracking-[-0.02em] text-void">
              {headline}
            </h2>

            <ul className="mt-10 space-y-4">
              {HIGHLIGHTS.map((item) => (
                <li
                  key={item}
                  className="flex items-center gap-3 font-marketing text-[16px] text-void/75"
                >
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-cyan-signal/25 text-deep-iris">
                    <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </aside>

      {/* Form panel */}
      <main className="relative flex min-h-svh flex-col bg-pure">
        {floatingNotice ? (
          <div className="absolute right-4 top-4 z-20 sm:right-6 sm:top-6">
            {floatingNotice}
          </div>
        ) : null}
        <div className="flex items-center px-6 pt-6 lg:hidden">
          <HisaabLogo tone="dark" />
        </div>
        <div className="flex flex-1 flex-col justify-center px-6 py-10 sm:px-12 lg:px-16 xl:px-24">
          <div className="mx-auto w-full max-w-[420px]">{children}</div>
        </div>
      </main>
    </div>
  )
}
